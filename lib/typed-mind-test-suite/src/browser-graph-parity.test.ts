// RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1) — the node-graph half of
// the playground's two-layer parity check (FAQ Q2: "verdict parity is a
// property of the code graph + wasm, not of the browser"). This test imports
// the tsc-emitted dist-browser/browser.js entry under Node (passing
// wasmBytes, same wasm the CLI path uses) and runs check() over all 38
// website snippets — combined with their supplementary content exactly as
// build.js:34-49 combines them for the site's own validateSnippets() step —
// asserting verdict equality against the CLI path (@sammons/typed-mind's
// TypedMind.create()) on the same combined inputs. Same code (the browser
// facade composes the identical TypedMindParser/AstValidator/computeLinks
// classes the CLI path uses), same wasm: this pins the graph. The browser-
// specific properties (module loading, import map, wasm MIME) are pinned
// separately by the headless Playwright smoke (e2e/mock, doc FAQ Q2).
//
// Precondition: `pnpm --dir lib/typed-mind run build:browser` must have run
// (dist-browser/browser.js present) — same precondition check-browser-graph.mjs
// has. `pnpm run ci` sequences check:browser-graph (which builds it) before
// this test suite runs.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { WASM_PATH } from './wasm-path.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SNIPPETS_DIR = join(REPO_ROOT, 'lib', 'typed-mind-static-website', 'snippets');
const SUPPLEMENTARY_DIR = join(REPO_ROOT, 'lib', 'typed-mind-static-website', 'snippets-supplementary');
const BROWSER_ENTRY = join(REPO_ROOT, 'lib', 'typed-mind', 'dist-browser', 'browser.js');

// Mirrors build.js's combineWithSupplementary: supplementary content (if any)
// first, then the snippet's own content, so the snippet can reference
// entities defined in the supplementary file.
const combineWithSupplementary = (snippetPath: string): string => {
  const snippetContent = readFileSync(snippetPath, 'utf8');
  const supplementaryPath = join(SUPPLEMENTARY_DIR, basename(snippetPath));
  if (!existsSync(supplementaryPath)) {
    return snippetContent;
  }
  const supplementaryContent = readFileSync(supplementaryPath, 'utf8');
  return `${supplementaryContent.trim()}\n\n${snippetContent.trim()}`;
};

interface BrowserCheckOutcome {
  readonly valid: boolean;
  readonly diagnostics: readonly { code: string; severity: string; message: string; span: unknown }[];
}

interface TypedMindBrowserModule {
  readonly TypedMindBrowser: {
    create(options: { wasmBytes: Uint8Array }): Promise<{ check(source: string): BrowserCheckOutcome }>;
  };
}

describe('browser/CLI verdict parity over the website snippet corpus (RFC-TM-7 §2)', () => {
  const snippetFiles = readdirSync(SNIPPETS_DIR).filter((file) => file.endsWith('.tmd'));

  it('covers exactly the 38 website snippets', () => {
    assert.equal(snippetFiles.length, 38);
  });

  it('dist-browser/browser.js has been built', () => {
    assert.ok(
      existsSync(BROWSER_ENTRY),
      `${BROWSER_ENTRY} does not exist — run \`pnpm --dir lib/typed-mind run build:browser\` before this test`,
    );
  });

  for (const file of snippetFiles) {
    it(`matches the CLI verdict: ${file}`, async () => {
      const combined = combineWithSupplementary(join(SNIPPETS_DIR, file));

      const cli = await TypedMind.create({ wasmPath: WASM_PATH });
      const cliResult = cli.check(combined);

      const wasmBytes = readFileSync(WASM_PATH);
      const browserModule = (await import(BROWSER_ENTRY)) as TypedMindBrowserModule;
      const browser = await browserModule.TypedMindBrowser.create({ wasmBytes });
      const browserResult = browser.check(combined);

      assert.equal(browserResult.valid, cliResult.valid, `valid mismatch for ${file}`);
      assert.deepEqual(
        browserResult.diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          severity: diagnostic.severity,
          message: diagnostic.message,
        })),
        cliResult.diagnostics.map((diagnostic) => ({ code: diagnostic.code, severity: diagnostic.severity, message: diagnostic.message })),
        `diagnostics mismatch for ${file}`,
      );
    });
  }
});
