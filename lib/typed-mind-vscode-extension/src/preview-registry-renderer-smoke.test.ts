// RFC-TM-5 §3 (rfc-tm-5-diamond.md) — pin-safety check for the Q3 dependency
// flip. `@sammons/typed-mind` and `@sammons/typed-mind-lsp` are now
// `workspace:*` (this Quantum), but `@sammons/typed-mind-renderer` stays
// pinned at the last-published `^0.2.1` until RFC-TM-6 merges — the preview
// command (src/extension.ts) still `require`s DSLChecker from
// `@sammons/typed-mind` and AdvancedTypedMindRenderer from
// `@sammons/typed-mind-renderer` exactly as it did before this RFC (the
// preview's AST migration is Q4). This test exercises that same require +
// check + parse + render call sequence and asserts it resolves the renderer
// from the npm registry tarball the `^0.2.1` pin resolves — NOT the workspace
// copy, which is already 1.0.0-divergent (exercising the workspace copy here
// would validate the wrong artifact, per the doc's Q3 check list: "the
// preview smoke runs against the renderer registry tarball the pin
// resolves"). The workspace copy gets its own preview smoke in RFC-TM-5 Q4
// once the preview migrates onto the AST-consuming renderer API.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const fixturePath = join(packageDir, 'architecture.tmd');
const require = createRequire(import.meta.url);

describe('preview command against the pinned renderer registry tarball (RFC-TM-5 §3)', () => {
  it('resolves @sammons/typed-mind-renderer from the npm registry (.pnpm store), not the workspace package', () => {
    const rendererEntryPath = require.resolve('@sammons/typed-mind-renderer');
    assert.match(
      rendererEntryPath,
      /node_modules\/\.pnpm\/@sammons\+typed-mind-renderer@0\.2\.1\//,
      `@sammons/typed-mind-renderer resolved to ${rendererEntryPath}, expected the ^0.2.1 registry tarball in the pnpm store (the workspace copy is 1.0.0-divergent and would validate the wrong artifact)`,
    );
  });

  it('produces webview HTML from the same require/check/parse/render sequence extension.ts uses', async () => {
    // Mirrors src/extension.ts's handlePreview: require the bridge checker
    // from @sammons/typed-mind and the renderer from the pinned
    // @sammons/typed-mind-renderer, check+parse the document, then render.
    // extension.ts allows preview to proceed even when check() reports
    // errors ("Preview anyway?") — the fixture here has known orphan
    // findings (activate/deactivate aren't referenced elsewhere), which is
    // fine: this check's job is proving the pinned renderer produces
    // webview HTML, not proving the fixture is a clean architecture.
    const { DSLChecker } = require('@sammons/typed-mind') as {
      DSLChecker: new () => { check: (content: string) => unknown; parse: (content: string) => unknown };
    };
    const { AdvancedTypedMindRenderer } = require('@sammons/typed-mind-renderer') as {
      AdvancedTypedMindRenderer: new (
        options: Record<string, unknown>,
      ) => { setProgramGraph: (graph: unknown) => void; generateStaticHTML: () => string | Promise<string> };
    };

    const content = readFileSync(fixturePath, 'utf8');
    const checker = new DSLChecker();
    checker.check(content);
    const graph = checker.parse(content);

    const renderer = new AdvancedTypedMindRenderer({
      enableVirtualization: true,
      enableInteractiveFeatures: true,
      enablePatternRecognition: true,
      themePreference: 'dark',
    });
    renderer.setProgramGraph(graph);
    const html = await renderer.generateStaticHTML();

    assert.equal(typeof html, 'string');
    assert.match(html, /<html/i, 'renderer output does not look like an HTML document');
    assert.ok(html.length > 0, 'renderer produced empty output');
  });
});
