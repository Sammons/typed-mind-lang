// RFC-TM-10 Q2 (rfc-tm-10-diamond.md) — destructured-parameter naming.
// Check bindings per the Diamond's Q2 line:
//   - D-LEG-5 (issue #66): a destructured parameter's inline object type
//     emitted the parameter NAME as the literal string "undefined"
//     (`parseParameters`'s blind `(param.name as ts.Identifier).text` cast
//     has no `.text` on an ObjectBindingPattern). Fixed by synthesizing a
//     real name: 1-3-element object patterns join their bound property
//     names; 4+ elements, a nested pattern, or any array pattern falls back
//     to a positional synthetic name (`arg0`, `arg1`, ...).
//   - DOC-AMENDMENT (this PR): the Diamond's §5 claim that the duplication
//     half "is resolved as a CONSEQUENCE of D-LEG-1" was only PARTIALLY
//     true. D-LEG-1's kind-resolved `isDTOLikeType` (Q1, PR #70) never
//     added a branch for an INLINE OBJECT-LITERAL type with no enclosing
//     Class/Interface name — it fell through to "DTO-like by elimination"
//     (the old `charAt(0).toUpperCase()` fallback trivially passes for `{`,
//     the same vacuous-pass shape D-LEG-1 fixed for `"`), so `input`/
//     `output` were populated with raw object-literal text the grammar's
//     entity_name-only `input_name`/`output_name` productions cannot
//     parse — a genuine syntax/error, not a benign duplicate. This PR adds
//     a 4th `isDTOLikeType` branch (a type text starting with `{` is not
//     DTO-like), the same disclosed-loss trade D-LEG-1 already made for
//     Class-kind/literal-union types. The richer fix (a synthesized named
//     inline-DTO stub, mirroring D-LEG-2's external-stub mechanism) is
//     tracked as issue #72, out of this item's scope.
//   - SUPERSEDED (tm10-inc2, issue #72 closed): the richer fix landed.
//     `extractInputDTO`/`extractOutputDTO` now synthesize a real DTO for an
//     inline object-literal type instead of leaving `input`/`output`
//     `undefined` — this file's second describe block below asserts the new
//     behavior directly rather than the disclosed-loss trade.
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
const fixtureDir = '30-destructured-params';
const entrypoint = fixturePath(fixtureDir, 'src', 'main.tsx');

const analyze = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(fixtureDir));
  return analyzer.analyzeFromEntrypoint(entrypoint);
};

const convert = () => {
  const analysis = analyze();
  const converter = new TypeScriptToTypedMindConverter();
  const result = converter.convert(analysis);
  assert.equal(result.success, true);
  return result;
};

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return { longform, result: tm.check(longform) };
};

describe('RFC-TM-10 Q2 check — D-LEG-5: destructured-parameter synthesized naming', () => {
  it('web-main-shaped: a single-property destructured parameter synthesizes its joined property name, never "undefined"', () => {
    const result = convert();
    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'PublicHeader') as { signature: string } | undefined;
    assert.notEqual(fn, undefined, 'the PublicHeader function entity must exist');
    assert.equal(fn?.signature.includes('undefined:'), false, 'the parameter name must never render as the literal string "undefined"');
    assert.ok(fn?.signature.includes('current:'), 'the synthesized name must be the destructured property name "current"');
  });

  it('App.tsx-shaped: a two-property destructured parameter joins both property names in declaration order', () => {
    const result = convert();
    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'NavLink') as { signature: string } | undefined;
    assert.notEqual(fn, undefined, 'the NavLink function entity must exist');
    assert.equal(fn?.signature.includes('undefined:'), false);
    assert.ok(fn?.signature.includes('current_label:'), 'a 2-element object pattern joins its property names with "_"');
  });

  it('positional-fallback: a 4-property destructured parameter falls back to a positional synthetic name', () => {
    const result = convert();
    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'Toolbar') as { signature: string } | undefined;
    assert.notEqual(fn, undefined, 'the Toolbar function entity must exist');
    assert.equal(fn?.signature.includes('undefined:'), false);
    assert.ok(fn?.signature.includes('arg0:'), 'a 4+ element object pattern falls back to the positional synthetic name arg0');
  });

  it('positional-fallback: an array-destructured parameter always uses the positional synthetic name', () => {
    const result = convert();
    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'Pair') as { signature: string } | undefined;
    assert.notEqual(fn, undefined, 'the Pair function entity must exist');
    assert.equal(fn?.signature.includes('undefined:'), false);
    assert.ok(fn?.signature.includes('arg0:'), 'array destructuring carries no stable property-name signal, always positional');
  });

  it('control case: a plain identifier parameter is unaffected by the new destructuring branches', () => {
    const result = convert();
    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'Plain') as { signature: string } | undefined;
    assert.notEqual(fn, undefined, 'the Plain function entity must exist');
    assert.ok(fn?.signature.includes('current:'), 'a plain identifier parameter keeps its own name, unchanged');
  });
});

describe('RFC-TM-10 Q2 check — D-LEG-5 amendment (issue #72, SUPERSEDED by tm10-inc2): inline object-literal input/output now synthesizes a real DTO', () => {
  // The Diamond's §5 claim that the duplication half is "resolved as a
  // CONSEQUENCE of D-LEG-1" was only partially true — see this file's header
  // comment and the fixture's own D-LEG-5-amendment comment. D-LEG-5's own PR
  // (Q2) added `isDTOLikeType`'s 4th classification branch excluding any type
  // text starting with `{`, accepting the disclosed loss of the graph edge
  // (same trade D-LEG-1 made for Class-kind and literal-union types).
  //
  // tm10-inc2 (issue #72's own fix, landed after this file's original
  // authoring) REPLACES that disclosed-loss trade with synthesis:
  // `extractInputDTO`/`extractOutputDTO` now detect an inline object-literal
  // type BEFORE `isDTOLikeType` runs and route it through
  // `synthesizeInlineDTO`, so `input`/`output` resolve to a real synthesized
  // DTO entity instead of staying `undefined`. The assertion below is
  // UPDATED (not merely re-verified) to assert the new, richer behavior —
  // the `isDTOLikeType` `{`-prefix branch this describe block's title used to
  // exercise is now unreachable from these two call sites in practice (see
  // that branch's own updated comment in the converter).
  it('previously-unparsable shape now parses AND synthesizes a real DTO: web-main-shaped PublicHeader resolves input to PublicHeaderInput', () => {
    const result = convert();
    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'PublicHeader') as
      | { input: string | undefined; signature: string }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(
      fn?.input,
      'PublicHeaderInput',
      'issue #72 (tm10-inc2) — an inline object-literal type now synthesizes a real DTO, no longer left undefined',
    );
    assert.ok(fn?.signature.includes('{ current?: string }'), 'the inline object type stays visible in the signature TEXT');

    const dto = result.entities.find((e) => e.kind === 'DTO' && e.name === 'PublicHeaderInput') as
      | { fields: readonly { name: string }[] }
      | undefined;
    assert.notEqual(dto, undefined, 'the synthesized PublicHeaderInput DTO must exist as a real entity');
    assert.deepEqual(
      dto?.fields.map((f) => f.name),
      ['current'],
    );
  });

  it('previously-unparsable shape now parses: App.tsx-shaped NavLink and Toolbar emit zero syntax diagnostics', async () => {
    const result = convert();
    const { result: checkResult } = await checkViaLongform(result.entities);
    const codes = checkResult.diagnostics.map((d) => d.code);
    assert.equal(
      codes.some((c) => c.startsWith('syntax/')),
      false,
      'zero syntax diagnostics — an inline object-literal type must never reach the entity_name-only input/output grammar position',
    );
  });

  it('control: a NAMED interface destructured parameter still routes through input, `<- Widget` keeps emitting', () => {
    const result = convert();
    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'DestructuredWidget') as
      | { input: string | undefined }
      | undefined;
    assert.notEqual(fn, undefined, 'the DestructuredWidget function entity must exist');
    assert.equal(
      fn?.input,
      'Widget',
      'a named-interface destructured parameter is the true positive D-LEG-1 preserves — input must still populate',
    );
    assert.ok(result.tmdContent.includes('<- Widget'), 'the named-interface reference still emits its input continuation line');
  });
});
