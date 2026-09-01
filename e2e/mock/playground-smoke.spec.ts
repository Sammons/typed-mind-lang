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

// Shared type for the editor + parser globals every test below reaches
// into. Kept minimal — only the surface these tests actually call.
type PlaygroundWindow = Window & {
  typedMindBrowser?: {
    check(source: string): {
      valid: boolean;
      diagnostics: readonly { message: string; suppression?: { reason: string } }[];
    };
    detectFormat(source: string): { format: string };
  };
  typedMindEditor?: { getValue(): string; setValue(value: string): void };
  PLAYGROUND_EXAMPLES?: Record<string, { longform: string; shortform: string }>;
};

const waitForReady = async (page: import('@playwright/test').Page) => {
  await page.goto(`${BASE_URL}/playground.html`, { waitUntil: 'networkidle' });
  // typedmind-ready fires once assets/js/typedmind-browser-init.js awaits
  // TypedMindBrowser.create() (wasm loaded via the import-map-resolved
  // web-tree-sitter.js + same-origin grammar.wasm/web-tree-sitter.wasm).
  await page.waitForFunction(() => typeof (window as unknown as PlaygroundWindow).typedMindBrowser !== 'undefined', {
    timeout: 15_000,
  });
  // window.typedMindEditor is set synchronously by the Monaco `require`
  // callback (typedmind-monaco-simple.js), which can still be mid-flight
  // when `typedmind-ready` fires from the other, independent async load
  // path (typedmind-browser-init.js). Both must be up before a test drives
  // the editor.
  await page.waitForFunction(() => typeof (window as unknown as PlaygroundWindow).typedMindEditor !== 'undefined', {
    timeout: 15_000,
  });
};

test.describe('TypedMind playground browser smoke', () => {
  test('loads, becomes ready, and validates a known-good and known-bad snippet', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await waitForReady(page);

    const goodResult = await page.evaluate((source) => {
      return (window as unknown as PlaygroundWindow).typedMindBrowser!.check(source);
    }, KNOWN_GOOD_SNIPPET);
    expect(goodResult.valid).toBe(true);

    const badResult = await page.evaluate((source) => {
      return (window as unknown as PlaygroundWindow).typedMindBrowser!.check(source);
    }, KNOWN_BAD_SNIPPET);
    expect(badResult.valid).toBe(false);

    // No uncaught page errors (a wrong wasm MIME surfaces as a rejected
    // WebAssembly.instantiateStreaming promise here, not as a normal
    // check()-returned diagnostic).
    expect(pageErrors).toEqual([]);
  });

  // typed-mind-lang#125: the bundled default document (TYPEDMIND_EXAMPLES,
  // typedmind-monaco-simple.js) used `fields: [...]` array syntax and
  // `entryPoint:` instead of `entry:` — 11 diagnostics before any user
  // action. This pins the fresh-load state: the editor's own initial
  // content (whatever loaded, no interaction) must check clean.
  //
  // The default document deliberately demonstrates `suppress` (one
  // orphaned-entity finding is suppressed, not absent) — per RFC-TM-8 §8
  // "suppressed-not-silenced," a suppressed finding legitimately keeps its
  // severity and stays in `diagnostics` while excluded from `valid`'s error
  // count. The bar this test enforces is the same one the Problems panel
  // enforces after the typedmind-monaco-simple.js fix: zero UNSUPPRESSED
  // diagnostics, and `valid: true`.
  test('default document on fresh load has zero diagnostics', async ({ page }) => {
    await waitForReady(page);

    const result = await page.evaluate(() => {
      const win = window as unknown as PlaygroundWindow;
      const source = win.typedMindEditor!.getValue();
      return win.typedMindBrowser!.check(source);
    });

    const unsuppressed = result.diagnostics.filter((diagnostic) => diagnostic.suppression === undefined);
    expect(unsuppressed).toEqual([]);
    expect(result.valid).toBe(true);
  });

  // typed-mind-lang#127 (part 1): three of the four "Load Example" samples
  // were byte-identical placeholders (only Todo App was distinct). Each of
  // the four must be a genuinely distinct document, and each must parse
  // clean in whichever form the toggle is currently showing.
  test('all four Load Example samples are distinct and parse clean', async ({ page }) => {
    await waitForReady(page);

    const examples = await page.evaluate(() => (window as unknown as PlaygroundWindow).PLAYGROUND_EXAMPLES!);
    const keys = ['todo-app', 'microservices', 'react-app', 'api-gateway'];
    expect(Object.keys(examples).sort()).toEqual(keys.sort());

    for (const form of ['longform', 'shortform'] as const) {
      const contents = keys.map((key) => examples[key][form]);
      // Pairwise distinctness: no two examples share the same content in
      // either form.
      const unique = new Set(contents);
      expect(unique.size).toBe(keys.length);

      for (const key of keys) {
        const result = await page.evaluate(({ src }) => (window as unknown as PlaygroundWindow).typedMindBrowser!.check(src), {
          src: examples[key][form],
        });
        expect(result.diagnostics, `${key} (${form}) should parse with zero diagnostics`).toEqual([]);
      }
    }
  });

  // typed-mind-lang#127 (part 2): loading an example never synced the
  // Longform/Shortform toggle indicator to the actual syntax of the loaded
  // document. Selecting each example (in Longform-active state, the
  // playground's default) must load content whose OWN detected format
  // agrees with the visibly active toggle button.
  test('loading an example keeps the format toggle in sync with the loaded syntax', async ({ page }) => {
    await waitForReady(page);

    // Longform is active by default (playground.html: `.toggle-btn.active`
    // on the Longform button) — confirm that starting state, then exercise
    // the example selector without touching the toggle.
    const initialActiveSyntax = await page.evaluate(() =>
      document.querySelector('.syntax-toggle .toggle-btn.active')?.getAttribute('data-syntax'),
    );
    expect(initialActiveSyntax).toBe('longform');

    for (const key of ['todo-app', 'microservices', 'react-app', 'api-gateway']) {
      await page.selectOption('#exampleSelect', key);
      const activeSyntax = await page.evaluate(() =>
        document.querySelector('.syntax-toggle .toggle-btn.active')?.getAttribute('data-syntax'),
      );
      const { detected, loaded } = await page.evaluate(() => {
        const win = window as unknown as PlaygroundWindow;
        const source = win.typedMindEditor!.getValue();
        return { detected: win.typedMindBrowser!.detectFormat(source).format, loaded: source };
      });
      expect(loaded.length, `${key} should have loaded non-empty content`).toBeGreaterThan(0);
      expect(detected, `${key}: loaded content's detected format should match the active toggle (${activeSyntax})`).toBe(activeSyntax);
    }
  });

  // typed-mind-lang#128: toggling format on an empty document replaced it
  // with the full default Todo-app sample instead of staying empty.
  test('toggling format on an empty document stays empty', async ({ page }) => {
    await waitForReady(page);

    await page.evaluate(() => {
      (window as unknown as PlaygroundWindow).typedMindEditor!.setValue('');
    });
    const beforeToggle = await page.evaluate(() => (window as unknown as PlaygroundWindow).typedMindEditor!.getValue());
    expect(beforeToggle).toBe('');

    // Click whichever toggle button isn't already active.
    await page.evaluate(() => {
      const active = document.querySelector('.syntax-toggle .toggle-btn.active');
      const activeSyntax = active?.getAttribute('data-syntax');
      const target = Array.from(document.querySelectorAll('.syntax-toggle .toggle-btn')).find(
        (button) => button.getAttribute('data-syntax') !== activeSyntax,
      ) as HTMLElement | undefined;
      target?.click();
    });

    const afterToggle = await page.evaluate(() => (window as unknown as PlaygroundWindow).typedMindEditor!.getValue());
    expect(afterToggle).toBe('');
  });

  // typed-mind-lang#126 regression, exercised end-to-end through the real
  // playground toggle button (not just the lib/typed-mind unit test): a
  // Program whose entry point never resolved (here: a typo'd `entryPoint:`
  // key, the exact shape reported) must fail the toggle loudly — the
  // editor's content must NOT be silently replaced with a corrupted
  // version, and must NOT fall back to the unrelated default sample either.
  test('toggling a document with an unresolved Program entry point does not silently corrupt or replace it', async ({ page }) => {
    await waitForReady(page);

    const brokenEntryDoc = `program TodoApp {
  entryPoint: models
  version: "1.0.0"
}

file models {
  path: "models.ts"
  exports: [Todo]
}

dto Todo {
  description: "Todo entity"
}
`;

    await page.evaluate((source) => {
      (window as unknown as PlaygroundWindow).typedMindEditor!.setValue(source);
    }, brokenEntryDoc);

    // Ensure Longform is the active/current form so the toggle click below
    // exercises the shortform emission path (programToShortform) that
    // #126 fixed.
    const activeSyntax = await page.evaluate(() =>
      document.querySelector('.syntax-toggle .toggle-btn.active')?.getAttribute('data-syntax'),
    );
    expect(activeSyntax).toBe('longform');

    await page.click('.syntax-toggle .toggle-btn[data-syntax="shortform"]');

    const afterToggle = await page.evaluate(() => (window as unknown as PlaygroundWindow).typedMindEditor!.getValue());

    // Never the exact corrupted tokens #126 reported: shortform emission
    // used to glue an unseparated `v` onto the version (`->  v1.0.0`, note
    // the double space and no real entry token before it), which reparsed
    // into `entry: v1` and a truncated `version: .0.0` — a bare `.0.0`
    // right after the `version:` key with no leading digit, distinct from
    // the correct, intact `version: "1.0.0"` / `version: 1.0.0`.
    expect(afterToggle).not.toMatch(/->\s{2,}v\d/);
    expect(afterToggle).not.toMatch(/entry:\s*v\d+$/m);
    expect(afterToggle).not.toMatch(/version:\s*\.\d/);
    // Never the unrelated default Todo-app sample silently swapped in
    // (typed-mind-lang#128's failure mode reapplied to a genuine error): the
    // default sample's file is named `models` with a `models.ts` path and
    // exports [Todo, CreateTodoInput, TodoService] — the broken-entry
    // fixture above uses the same `models` file name deliberately (so this
    // assertion instead pins on the sample's distinguishing TodoService/
    // CreateTodoInput content, which the fixture never mentions).
    expect(afterToggle).not.toContain('CreateTodoInput');
    expect(afterToggle).not.toContain('TodoService');
    // The original content must still be present, untouched: the refusal
    // path leaves the editor as-is rather than emitting a partial or
    // reformatted document.
    expect(afterToggle).toBe(brokenEntryDoc);
  });
});
