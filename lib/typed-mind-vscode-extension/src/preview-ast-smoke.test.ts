// RFC-TM-5 §3 Q4 (rfc-tm-5-diamond.md) — the preview command's post-flip smoke.
// This replaces preview-registry-renderer-smoke.test.ts: that test validated
// the require/check/parse/render sequence against the pinned `^0.2.1` registry
// renderer tarball, which is gone now that `@sammons/typed-mind-renderer` is
// `workspace:*` (there is no separate tarball left to validate). This test
// exercises src/extension.ts's actual post-migration sequence instead:
// TypedMind.create() + parse()/check() feeding
// AdvancedTypedMindRenderer.setGraph/setValidationResult (rfc-tm-6-diamond.md
// §2's shipped API) + generateStaticHTML().
//
// Two fixtures are exercised per the doc's Q4 check binding ("webview HTML
// from a fixture .tmd, including a multi-file document exercising import
// resolution"): a single-file fixture (this package's own architecture.tmd)
// and lib/typed-mind-test-suite/scenarios/scenario-20-basic-import.tmd, which
// `@import`s ./imports/shared/auth-module.tmd — parse()/check() must be given
// the fixture's real absolute path so the import resolver can find the
// imported file relative to it, exactly as extension.ts now passes
// editor.document.fileName through.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { AdvancedTypedMindRenderer } from '@sammons/typed-mind-renderer';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const repoRoot = join(packageDir, '..', '..');

const renderFixture = async (absPath: string): Promise<{ html: string; diagnosticCount: number }> => {
  const content = readFileSync(absPath, 'utf8');
  const typedMind = await TypedMind.create();
  const graph = typedMind.parse(content, absPath);
  const { diagnostics } = typedMind.check(content, absPath);

  const renderer = new AdvancedTypedMindRenderer({
    enableVirtualization: true,
    enablePatternRecognition: true,
    themePreference: 'dark',
  });

  await renderer.setGraph(graph);
  await renderer.setValidationResult(diagnostics);
  const html = renderer.generateStaticHTML();

  return { html, diagnosticCount: diagnostics.length };
};

describe('preview command against the workspace renderer (RFC-TM-5 §3 Q4)', () => {
  it('produces webview HTML for a single-file fixture via TypedMind.create() + setGraph/setValidationResult', async () => {
    const fixturePath = join(packageDir, 'architecture.tmd');

    const { html } = await renderFixture(fixturePath);

    assert.equal(typeof html, 'string');
    assert.match(html, /<html/i, 'renderer output does not look like an HTML document');
    assert.ok(html.length > 0, 'renderer produced empty output');
  });

  it('resolves @import across files and produces webview HTML for a multi-file document', async () => {
    // scenario-20-basic-import.tmd imports ./imports/shared/auth-module.tmd
    // relative to its own directory; parse()/check() only follow that import
    // when given the fixture's real absolute path (dirname(filePath) drives
    // the resolver, per lib/typed-mind/src/typed-mind.ts). This mirrors the
    // multi-file behavior extension.ts now supports via editor.document.fileName.
    const fixturePath = join(repoRoot, 'lib/typed-mind-test-suite/scenarios/scenario-20-basic-import.tmd');
    const content = readFileSync(fixturePath, 'utf8');

    const typedMind = await TypedMind.create();
    const graph = typedMind.parse(content, fixturePath);

    // Entities from both the importing document (MainFile/startApp) and the
    // imported document (AuthService et al.) must be present — proof the
    // import actually resolved rather than the parser silently dropping the
    // @import directive.
    const entityNames = graph.entities.map((entity) => entity.name);
    assert.ok(entityNames.includes('MainFile'), 'importing document entity MainFile missing from parsed graph');
    assert.ok(
      entityNames.includes('AuthService'),
      'imported document entity AuthService missing from parsed graph — @import did not resolve',
    );

    const { html } = await renderFixture(fixturePath);

    assert.equal(typeof html, 'string');
    assert.match(html, /<html/i, 'renderer output does not look like an HTML document');
    assert.ok(html.length > 0, 'renderer produced empty output');
  });
});
