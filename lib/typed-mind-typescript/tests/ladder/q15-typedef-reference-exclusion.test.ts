// issue #88 (rfc-tm-10-diamond.md follow-up, tm10-inc4) — RFC-TM-9 §4's
// X-CONV-2 TypeDef exclusion was applied ONLY at `resolveImportToEntity`
// (imports.to), missing from two sibling call sites that build the other
// two reference verbs a TypeDef can just as easily reach: `convertExports`
// (exports.to) and `isDTOLikeType` (input.to/output.to, via
// extractInputDTO/extractOutputDTO). Fixed by extracting a shared
// `isPredictedTypeDef` helper and calling it from all three sites.
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

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return { longform, result: tm.check(longform) };
};

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath('37-typedef-reference-exclusion'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('37-typedef-reference-exclusion', 'src', 'main.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('issue #88: TypeDef excluded from exports.to and input/output.to, not just imports.to', () => {
  it("a TypeDef-predicted export name ('SyntaxFormat') is absent from its File's exports list", () => {
    const result = convert();
    assert.equal(result.success, true);

    const fileEntity = result.entities.find((e) => e.kind === 'File') as { exports: readonly string[] } | undefined;
    assert.notEqual(fileEntity, undefined);
    assert.equal(
      fileEntity?.exports.includes('SyntaxFormat'),
      false,
      `SyntaxFormat (a TypeDef) must not appear in the exports list: ${JSON.stringify(fileEntity?.exports)}`,
    );
  });

  it("detectFormat's TypeDef-typed parameter/return leave input/output undefined, signature text preserved", () => {
    const result = convert();
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'detectFormat') as
      | { input: string | undefined; output: string | undefined; signature: string }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.input, undefined, 'a TypeDef-typed parameter must not populate input');
    assert.equal(fn?.output, undefined, 'a TypeDef-typed return type must not populate output');
    assert.ok(fn?.signature.includes('SyntaxFormat'), 'the TypeDef name stays visible in the signature text');
  });

  it('the TypeDef entity itself is still extracted correctly (only reference-routing changes)', () => {
    const result = convert();
    assert.equal(result.success, true);

    const typeDef = result.entities.find((e) => e.kind === 'TypeDef' && e.name === 'SyntaxFormat');
    assert.notEqual(typeDef, undefined, 'SyntaxFormat must still be extracted as a TypeDef entity');
  });

  it('the full fixture emits with zero reference-to-illegal / input-not-dto / output-not-dto diagnostics', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const { result: checkResult } = await checkViaLongform(result.entities);
    const illegalFindings = checkResult.diagnostics.filter((d) =>
      ['checker/reference-to-illegal', 'checker/input-not-dto', 'checker/output-not-dto'].includes(d.code),
    );
    assert.deepEqual(illegalFindings, [], `zero TypeDef-routing findings expected: ${JSON.stringify(illegalFindings)}`);
  });
});
