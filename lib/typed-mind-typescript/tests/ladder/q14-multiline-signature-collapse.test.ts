// RFC-TM-10 follow-up (issue #86, found during tm10-inc2's live ladder
// re-run) — `buildFunctionSignature` (typescript-analyzer.ts) embeds a
// parameter or return type's raw source text verbatim into the `::`
// shortform / `signature:` longform signature. A multi-line-authored type
// (a union or generic type wrapped across lines, the common style
// webhookstorage's `PublicHeader`/`storePayload` use) desyncs the
// grammar's single-line signature production, producing a cascade of
// `Unparsable text` findings that has nothing to do with the actual type.
// The fix whitespace-collapses the signature-embedded text ONLY — a
// signature must never contain a newline — while `input`/`output`
// classification (which reads the raw, multi-line-aware type text
// separately) is unaffected.
//
// This fixture isolates the newline defect from TWO SEPARATE,
// pre-existing, out-of-scope grammar limitations confirmed by isolated
// repro during this item's own investigation, neither caused by or fixed
// by this change: (1) an inline OBJECT-LITERAL type embedded in signature
// text fails to parse even on a single line (braces/semicolons are not
// representable in the `signature` grammar slot at all, independent of
// newlines — the real `storePayload` shape hits this); (2) a
// QUOTED-STRING-LITERAL union in signature text also fails to parse on a
// single line (the `signature` production's `$.string` alternative does
// not compose cleanly with adjacent `_sig_chunk` tokens at a
// `"literal") => ...` boundary). Both are the same "raw text in a slot
// that can't represent it" family as issues #77/#83, filed separately —
// see the tm10-inc3a delta note. This fixture's own multi-line union uses
// NUMERIC literals specifically to avoid gap (2) while still exercising a
// real multi-line union shape.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const extractAndParse = async (entrypointFile: string) => {
  const analyzer = new TypeScriptAnalyzer(fixturePath('36-multiline-signature-collapse'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('36-multiline-signature-collapse', 'src', entrypointFile));
  const converter = new TypeScriptToTypedMindConverter();
  const result = converter.convert(analysis);
  assert.equal(result.success, true, 'extraction must succeed (exportSuccess)');

  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({
    entities: result.entities as never,
    imports: [],
    suppressions: [],
    diagnostics: [],
  });
  const tm = await TypedMind.create();
  const parseResult = tm.check(longform);
  return { entities: result.entities, longform, parseResult };
};

describe('RFC-TM-10 follow-up check — issue #86: multi-line-authored signature types', () => {
  it('a multi-line-authored numeric-literal-union PARAMETER type does not break the signature line', async () => {
    const { longform, parseResult } = await extractAndParse('main.ts');

    const signatureLines = longform.split('\n').filter((line) => line.includes('signature: setView'));
    assert.equal(signatureLines.length, 1, 'setView signature must be exactly one emitted line');
    assert.ok(!signatureLines[0]?.includes('\n'), 'signature line must not contain an embedded newline');

    const unparsable = parseResult.diagnostics.filter((d) => d.code === 'syntax/error');
    assert.deepEqual(
      unparsable.map((d) => d.message),
      [],
      'zero Unparsable text findings from the multi-line union parameter type',
    );
  });

  it('a multi-line-authored generic RETURN type does not break the signature line', async () => {
    const { longform, parseResult } = await extractAndParse('main.ts');

    const signatureLines = longform.split('\n').filter((line) => line.includes('signature: loadWidgets'));
    assert.equal(signatureLines.length, 1, 'loadWidgets signature must be exactly one emitted line');
    assert.ok(!signatureLines[0]?.includes('\n'), 'signature line must not contain an embedded newline');

    const unparsable = parseResult.diagnostics.filter((d) => d.code === 'syntax/error');
    assert.deepEqual(
      unparsable.map((d) => d.message),
      [],
      'zero Unparsable text findings from the multi-line return type',
    );
  });

  it('control: a NAMED interface PARAMETER type resolves input correctly regardless of a multi-line-authored return type', async () => {
    const { entities, longform } = await extractAndParse('main.ts');

    const widgetTransform = (entities as Array<{ name?: string; input?: string; output?: string }>).find(
      (e) => e.name === 'widgetTransform',
    );
    assert.ok(widgetTransform, 'widgetTransform entity must exist');
    assert.equal(widgetTransform?.input, 'Widget', 'input must resolve to the named interface, unaffected by the return-type corruption');

    const signatureLines = longform.split('\n').filter((line) => line.includes('signature: widgetTransform'));
    assert.equal(signatureLines.length, 1, 'widgetTransform signature must be exactly one emitted line');
    assert.ok(!signatureLines[0]?.includes('\n'), 'signature line must not contain an embedded newline');

    // The #86 follow-up this test used to pin as a gap. `output`
    // classification reads `func.returnType` RAW, and `extractOutputDTO`'s
    // `Promise<(.+)>` strip plus `isBareEntityName` guard (issue #77) both
    // operate on that raw string. A multi-line-authored
    // `Promise<\n  WidgetList\n>` never matched the anchored strip at all
    // (`.` does not match a newline), so the wrapper survived into
    // `isBareEntityName`'s `/^[A-Za-z_]\w*$/`, which correctly rejected it —
    // dropping the `output` edge for a type that resolves fine when authored
    // on one line. Same defect FAMILY as issue #77: raw multi-line text
    // hitting a bare-identifier-only classification guard.
    //
    // `extractOutputDTO` now applies `collapseTypeWhitespace` on both sides
    // of the strip, the same meaning-preserving normalization #86 applied to
    // signature text. Whitespace is insignificant between type tokens, so
    // this recovers the edge WITHOUT widening what counts as a bare entity
    // name — `Widget | null` still fails the guard, as the sibling
    // assertions below and the #77 fixtures confirm.
    assert.equal(
      widgetTransform?.output,
      'WidgetList',
      'output must resolve through a multi-line-authored Promise<...> wrapper, same as the single-line spelling',
    );
  });

  it('the fixture parses clean of syntax/* findings end to end', async () => {
    const { parseResult } = await extractAndParse('main.ts');
    const syntaxDiagnostics = parseResult.diagnostics.filter((d) => d.code.startsWith('syntax/'));
    assert.deepEqual(
      syntaxDiagnostics.map((d) => d.message),
      [],
      'zero syntax/* diagnostics remain once signature text is collapsed',
    );
  });
});
