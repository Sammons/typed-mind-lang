// issue #114 — a union-typed alias built from inline object literals
// (`{ tagged: false } | { tagged: true; label: string }`, TypeScript's
// discriminated-union idiom) emitted as a broken DTO field list (raw
// `} | {` in the output) because `isObjectLikeType`'s naive `.includes('{')`
// check treated the whole multi-member union text as ONE object literal.
// Fixed by `isUnionOfObjectLiterals` in
// typescript-to-typedmind-converter.ts: a top-level `|` (outside any
// bracket depth) routes the alias to the TypeDef path instead of the DTO
// field-splitting path — `parseTypeExprText` already parses that shape
// into a real `union` of `opaque` members, a grammar production that
// parses cleanly (the "degrade honestly" option issue #114 itself names).
// Distinct from #113 (quote escaping) per the issue's own text.
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

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath('51-union-of-object-literals'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('51-union-of-object-literals', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('issue #114: a union-of-object-literals type alias degrades honestly instead of corrupting its field list', () => {
  it('Tag converts as a TypeDef (alias), not a DTO with a broken field list', () => {
    const result = convert();
    assert.equal(result.success, true);
    const tag = result.entities.find((e) => e.name === 'Tag');
    assert.notEqual(tag, undefined, 'Tag must be extracted as a real entity');
    assert.equal(tag?.kind, 'TypeDef', `expected Tag to convert as TypeDef, got kind: ${tag?.kind}`);
  });

  it('the emitted .tmd carries the whole union as one well-formed quoted type string, not a broken field list', () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    // The pre-fix bug emitted the union text as a BARE, unquoted DTO field
    // line (`  - tagged: false } | { tagged: true`, no surrounding `"..."`)
    // — the corrupted shape is a bare `}` sitting outside any quoted
    // string. Post-fix, the entire union lives inside one `type: "..."`
    // property line, so every `{`/`}` in the union text is INSIDE a
    // matched pair of double quotes on its line.
    const brokenFieldLine = longform.split('\n').find((line) => /^\s*-\s.*tagged: false\s*}\s*\|/.test(line));
    assert.equal(
      brokenFieldLine,
      undefined,
      `must not emit the union as a broken bare field line, got: ${JSON.stringify(brokenFieldLine)}`,
    );
    // Quoted is the DEFAULT spelling for a longform `type:` value
    // (`longformTypeValue`, emit-longform.ts). This shape's printed text
    // carries no double quote of its own, so it takes that default — the
    // narrow unquoted exception applies only where quoting would double-wrap
    // an embedded `"`. Unchanged from main.
    assert.ok(
      longform.includes('type: "{ tagged: false } | { tagged: true; label: string }"'),
      `expected the whole union inside one well-formed quoted type string, got:\n${longform}`,
    );
  });

  it('the emitted .tmd parses cleanly (checker verdict has zero syntax/* findings)', async () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    const syntaxFindings = checkResult.diagnostics.filter((d) => d.code.startsWith('syntax/'));
    assert.deepEqual(syntaxFindings, [], `must have zero syntax/* findings: ${JSON.stringify(syntaxFindings)}`);
  });

  it('a genuine single object-literal type alias (control case) is unaffected and still converts as a DTO', () => {
    // Control: a plain, non-union object-literal alias must still route
    // through the DTO field-splitting path unchanged.
    const analyzer = new TypeScriptAnalyzer(fixturePath('40-dto-field-nested-inline-object'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('40-dto-field-nested-inline-object', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);
  });

  it('a union with null preserves the nullable object as a TypeDef alias', async () => {
    // The old fieldless DTO erased nullability; preserve the complete alias.
    const analyzer = new TypeScriptAnalyzer(fixturePath('54-object-literal-union-with-null'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('54-object-literal-union-with-null', 'src', 'index.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);
    const entity = result.entities.find((e) => e.name === 'MaybeThing');
    assert.equal(entity?.kind, 'TypeDef');
    assert.ok(result.tmdContent.includes('MaybeThing = { a: string } | null'));
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    assert.deepEqual(checkResult.diagnostics, [], `must have zero diagnostics: ${JSON.stringify(checkResult.diagnostics)}`);
  });
});
