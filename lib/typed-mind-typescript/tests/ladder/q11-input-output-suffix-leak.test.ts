// RFC-TM-10 follow-up (issue #77) — extraction ladder verdict
// (diagnostic-legitimacy-ladder-2026-08-29.md, disposition #7/#8): a
// DTO-like type classified true by isDTOLikeType (D-LEG-1/D-LEG-5) is not
// always a bare identifier — a union with `null`/`undefined`, an array
// suffix, a generic-argument suffix, or a bare function type all pass the
// elimination branch but are illegal in the grammar's bare-entity_name-only
// input_name/output_name slots. Fixed by isBareEntityName guarding
// extractInputDTO/extractOutputDTO: leave input/output undefined for any
// non-bare-identifier shape (the same disclosed-loss trade D-LEG-1/D-LEG-5
// already accepted), never emit text the grammar cannot parse.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('33-input-output-suffix-leak'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('33-input-output-suffix-leak', 'src', 'main.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RFC-TM-10 follow-up check — issue #77: input/output suffix leak', () => {
  it('a union-with-null return type leaves output undefined, signature text preserved', () => {
    const result = convert();
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'lookupTenant') as
      | { output: string | undefined; signature: string }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.output, undefined, 'a union-with-null return type must not populate output');
    assert.ok(fn?.signature.includes('HydratedTenantRecord | null'), 'the union text stays visible in the signature');
  });

  it('an array-suffixed return type leaves output undefined, signature text preserved', () => {
    const result = convert();
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'listApiKeys') as
      | { output: string | undefined; signature: string }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.output, undefined, 'an array-suffixed return type must not populate output');
    assert.ok(fn?.signature.includes('OrganizationApiKey[]'), 'the array-suffixed text stays visible in the signature');
  });

  it('a generic-argument-suffixed parameter type leaves input undefined, signature text preserved', () => {
    const result = convert();
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'makeMiddleware') as
      | { input: string | undefined; signature: string }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.input, undefined, 'a generic-argument-suffixed parameter type must not populate input');
    assert.ok(fn?.signature.includes('MiddlewareHandler<IngestEnv>'), 'the generic-suffixed text stays visible in the signature');
  });

  it('a bare function-type return type leaves output undefined, signature text preserved', () => {
    const result = convert();
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'onReady') as
      | { output: string | undefined; signature: string }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.output, undefined, 'a bare function-type return type must not populate output');
    assert.ok(fn?.signature.includes('() => void'), 'the function-type text stays visible in the signature');
  });

  it('control case: a bare-identifier interface parameter/return type keeps routing through input/output unchanged', () => {
    const result = convert();
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'makeWidget') as
      | { input: string | undefined; output: string | undefined }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.input, 'Widget', 'the original true-positive interface case must be unchanged');
    assert.equal(fn?.output, 'Widget');
  });

  it('the full fixture emits with zero syntax diagnostics', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const { result: checkResult } = await checkViaLongform(result.entities);
    const codes = checkResult.diagnostics.map((d) => d.code);
    assert.equal(
      codes.some((c) => c.startsWith('syntax/')),
      false,
      'zero syntax diagnostics — none of the suffix-leak shapes may desync the parser',
    );
  });
});
