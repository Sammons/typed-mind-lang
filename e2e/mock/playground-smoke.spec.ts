// RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1) — the headless browser
// half of the playground's two-layer parity check (FAQ Q2). The node-graph
// parity test (lib/typed-mind-test-suite/src/browser-graph-parity.test.ts)
// pins verdict equality; this smoke pins the properties only a real browser
// exercises: module-script loading, the import map resolving the
// web-tree-sitter bare specifier to the same-origin vendored ESM file, and
// wasm MIME (`WebAssembly.instantiateStreaming` rejects a non-
// application/wasm response, so a passing smoke is the MIME check per the
// doc's own framing).
//
// Runs against the site's OWN `serve.js` on the built `dist/` — the same
// static-file server `pnpm serve` uses locally and structurally identical to
// what Cloudflare Pages serves in prod (FAQ Q5).

import { expect, test } from '@playwright/test';

const BASE_URL = process.env.PLAYGROUND_URL ?? 'http://127.0.0.1:8080';

// Genuinely orphan-clean under the real checker's default (non-skip) orphan
// check — verified directly against TypedMindBrowser.check() (the same
// construction typedmind-browser-init.js uses, no skipOrphanCheck) before
// landing here. This matters because EVERY one of the 38 website snippets
// (lib/typed-mind-static-website/snippets/*.tmd) is only valid with
// --skip-orphan-check (see build.js's validateSnippets(), which passes that
// flag to the CLI) — they are illustrative fragments, not complete programs,
// so none of them work as a "known good, no flags" smoke fixture. The
// original fixture here referenced a DTO ('Todo') that nothing consumed and
// failed with checker/orphaned-entity — a fixture bug, not a facade bug (the
// browser and CLI paths agreed on the same diagnostic). Dependency entities
// are always orphan-exempt (checker/check-orphans.ts), so Program -> File
// <- [Dependency] is the minimal clean shape; mirrors the real, checked-in
// lib/typed-mind-cli/architecture.tmd, one of only two documents in the
// examples-inventory golden set with valid: true.
const KNOWN_GOOD_SNIPPET = `TodoApp -> main v1.0.0

Fs ^ "File system operations"

main @ main.ts:
  <- [Fs]
`;

// Deliberately invalid: references an entity ('Ghost') that is never
// declared anywhere in the document — an orphan/undefined-reference error
// the checker always flags, independent of which specific diagnostic codes
// are wired at any given time.
const KNOWN_BAD_SNIPPET = `TodoApp -> models v1.0.0

models @ models.ts:
  -> [Ghost]
`;

test.describe('TypedMind playground browser smoke', () => {
  test('loads, becomes ready, and validates a known-good and known-bad snippet', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`${BASE_URL}/playground.html`, { waitUntil: 'networkidle' });

    // typedmind-ready fires once assets/js/typedmind-browser-init.js awaits
    // TypedMindBrowser.create() (wasm loaded via the import-map-resolved
    // web-tree-sitter.js + same-origin grammar.wasm/web-tree-sitter.wasm).
    await page.waitForFunction(() => typeof (window as unknown as { typedMindBrowser?: unknown }).typedMindBrowser !== 'undefined', {
      timeout: 15_000,
    });

    const goodResult = await page.evaluate((source) => {
      return (window as unknown as { typedMindBrowser: { check(source: string): { valid: boolean } } }).typedMindBrowser.check(source);
    }, KNOWN_GOOD_SNIPPET);
    expect(goodResult.valid).toBe(true);

    const badResult = await page.evaluate((source) => {
      return (window as unknown as { typedMindBrowser: { check(source: string): { valid: boolean } } }).typedMindBrowser.check(source);
    }, KNOWN_BAD_SNIPPET);
    expect(badResult.valid).toBe(false);

    // No uncaught page errors (a wrong wasm MIME surfaces as a rejected
    // WebAssembly.instantiateStreaming promise here, not as a normal
    // check()-returned diagnostic).
    expect(pageErrors).toEqual([]);
  });
});
