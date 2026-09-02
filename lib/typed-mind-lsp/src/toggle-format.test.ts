// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — toggleFormat drops the Result box: the
// facade's toggleFormat/detectFormat are plain synchronous methods, no
// `_tag`/`.value`/`.error` unwrapping (legacy server.ts:696-711).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { QUOTE_SWAP_CODE, TypedMind } from '@sammons/typed-mind';
import { handleToggleFormat } from './toggle-format.ts';

const SOURCE = `AppEntry @ src/index.ts:
  -> [start]
`;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '..', '..', '..');
const scenariosDir = join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios');

describe('handleToggleFormat (RFC-TM-5 §1)', () => {
  it('returns newText from the facade toggleFormat call directly, with no Result-box unwrapping', async () => {
    const typedMind = await TypedMind.create();
    const result = handleToggleFormat(typedMind, SOURCE, { uri: 'file:///test.tmd' });
    assert.equal(typeof result.newText, 'string');
    assert.equal(result.newText.length > 0, true);
    assert.equal(result.error, undefined);
  });

  it('processes only the selected line range when a range is provided', async () => {
    const typedMind = await TypedMind.create();
    const multiline = `${SOURCE}\nSecondEntity ^ "unrelated dependency"\n`;
    const fullResult = handleToggleFormat(typedMind, multiline, { uri: 'file:///test.tmd' });
    const rangedResult = handleToggleFormat(typedMind, multiline, { uri: 'file:///test.tmd', range: { start: 0, end: 1 } });
    assert.notEqual(rangedResult.newText, fullResult.newText);
  });

  // Defect fix (same-day follow-up to PR #122, independent post-merge review
  // finding) — params.uri must resolve @import statements end to end, the
  // same way the CLI's filePath argument does for parse()/check(). Before
  // the fix, handleToggleFormat never passed params.uri through at all, so
  // AuthService (defined only in the imported module) silently vanished.
  it('resolves @import statements end to end via params.uri (real file:// URI, not a synthetic path)', async () => {
    const typedMind = await TypedMind.create();
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const uri = pathToFileURL(path).toString();
    const result = handleToggleFormat(typedMind, source, { uri });
    assert.equal(result.error, undefined);
    assert.equal(result.newText.includes('AuthFile'), true);
  });

  // Regression guard for the PR #123 review blocker (comment id=20118): a
  // range-scoped toggle's newText replaces ONLY the selected lines, so
  // resolving imports there would splice the entire imported module into a
  // small selection replacement — duplicating imported entities into the
  // document as local text. Range toggles must stay in single-document mode
  // even when params.uri is a valid file:// URI for an import-bearing file.
  it('a range-scoped toggle never resolves imports, even with a valid file:// URI', async () => {
    const typedMind = await TypedMind.create();
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const uri = pathToFileURL(path).toString();
    // A small selection that includes the @import line — the reviewer's
    // repro shape: before the fix, this 4-line selection's replacement text
    // ballooned with the imported module's three entities.
    const result = handleToggleFormat(typedMind, source, { uri, range: { start: 0, end: 3 } });
    assert.equal(result.error, undefined);
    // AuthFile only exists in the imported module — its absence proves the
    // range path stayed in single-document mode.
    assert.equal(result.newText.includes('AuthFile'), false);
  });

  it('a non-file:// URI (untitled buffer) falls back to single-document mode instead of throwing', async () => {
    const typedMind = await TypedMind.create();
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const result = handleToggleFormat(typedMind, source, { uri: 'untitled:Untitled-1' });
    assert.equal(result.error, undefined);
    // AuthFile only exists in the imported module (unlike AuthService, which
    // scenario-20 also references locally) — its absence proves imports
    // stayed unresolved rather than the conversion silently succeeding.
    assert.equal(result.newText.includes('AuthFile'), false);
  });

  // Issue #130, PR #141 review blocker 2 — the response.diagnostics field
  // was computed and forwarded but nothing downstream ever read it (the
  // VS Code extension's response type omitted the field entirely). This
  // guards the handler's OWN forwarding contract in isolation: given a
  // toggleFormatWithDiagnostics call that returns diagnostics, the request
  // response must carry them verbatim.
  //
  // A real quote-swap cannot be driven end-to-end from PARSED `.tmd` source
  // here: the grammar's string token has no escape production at all (per
  // quote-string-literal.ts's own header comment), so no source text this
  // handler could parse ever contains the embedded `"` the swap fires on —
  // confirmed by direct probe (`Status = "he said \"hi\""` fails to parse
  // with a `syntax/error`, never reaches the emitter). The swap is reachable
  // only via a synthetically-constructed AST (a converter, an LSP code
  // action), which `TypedMind.toggleFormatWithDiagnostics` cannot be handed
  // directly (it always parses `source` itself). A minimal fake standing in
  // for the one method `handleToggleFormat` actually calls is therefore the
  // right shape for this unit: it proves the PLUMBING (forward whatever the
  // facade returns), which is exactly what blocker 2 found broken — the
  // emitter-diagnostics.test.ts / toggle-quote-fixture.test.ts suites in
  // lib/typed-mind already prove the facade computes real diagnostics for a
  // real (AST-constructed) swap.
  it('forwards diagnostics from toggleFormatWithDiagnostics verbatim onto the response', () => {
    const fakeDiagnostic = {
      code: QUOTE_SWAP_CODE,
      severity: 'warning' as const,
      span: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
      message:
        "'purpose' on 'Foo' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character",
    };
    const fakeTypedMind = {
      toggleFormatWithDiagnostics: () => ({ text: 'Foo % "a quoted phrase"', diagnostics: [fakeDiagnostic] }),
      // Cast: handleToggleFormat's only call against `typedMind` is
      // `toggleFormatWithDiagnostics` — this fake stands in for exactly that
      // one method rather than constructing a real TypedMind (which always
      // re-parses `source` itself and so cannot be made to return a
      // synthetic diagnostic for real parsed input, per this test's own
      // header comment).
    } as unknown as TypedMind;
    const result = handleToggleFormat(fakeTypedMind, SOURCE, { uri: 'file:///test.tmd' });
    assert.deepEqual(result, { newText: 'Foo % "a quoted phrase"', diagnostics: [fakeDiagnostic] });
  });

  it('omits diagnostics from the response entirely when toggleFormatWithDiagnostics returns none (keeps the response shape minimal)', () => {
    const fakeTypedMind = {
      toggleFormatWithDiagnostics: () => ({ text: 'Foo % "a phrase"', diagnostics: [] }),
    } as unknown as TypedMind;
    const result = handleToggleFormat(fakeTypedMind, SOURCE, { uri: 'file:///test.tmd' });
    assert.deepEqual(result, { newText: 'Foo % "a phrase"' });
    assert.equal('diagnostics' in result, false);
  });
});
