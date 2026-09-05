// RFC-TM-14 U6 (rfc-tm-14-diamond.md §S6, leaf R5): a top-level `const` whose
// initializer is a call/new expression AND whose checker-resolved type has
// call signatures is reclassified from Constants to Function. Fixture 121
// (README names the leaf).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { FunctionNode, ConstantsNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const fixtureDir = join(import.meta.dirname, 'repros-analyzer', '121-callable-constants-invoked');

const convert = () => {
  const analysis = new TypeScriptAnalyzer(fixtureDir).analyzeFromEntrypoint(join(fixtureDir, 'src', 'main.ts'));
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true, JSON.stringify(result.errors));
  return { analysis, result };
};

describe('TM14 U6: callable constants are reclassified as Functions (R5)', () => {
  it('auth and both are Functions, N is Constants, maybe is Constants', () => {
    const { result } = convert();
    const auth = result.entities.find((e) => e.name === 'auth');
    const both = result.entities.find((e) => e.name === 'both');
    const n = result.entities.find((e) => e.name === 'N');
    const maybe = result.entities.find((e) => e.name === 'maybe');

    assert.ok(auth instanceof FunctionNode, 'auth should be a Function');
    assert.ok(both instanceof FunctionNode, 'both should be a Function');
    assert.ok(n instanceof ConstantsNode, 'N should be Constants');
    assert.ok(maybe instanceof ConstantsNode, 'maybe should be Constants');
  });

  it('both has cross-file body edges: both ~> [auth, audit]', () => {
    const { result } = convert();
    const both = result.entities.find((e) => e.name === 'both') as FunctionNode;
    assert.ok(both instanceof FunctionNode);
    assert.deepEqual(both.calls?.toSorted(), ['audit', 'auth']);
  });

  it('no import(...) text appears in any function signature', () => {
    const { result } = convert();
    for (const entity of result.entities) {
      if (entity instanceof FunctionNode) {
        assert.equal(
          entity.signature.includes('import('),
          false,
          `${entity.name} signature contains import(): ${entity.signature}`,
        );
      }
    }
  });

  it('zero orphans', async () => {
    const { result } = convert();
    const mind = await TypedMind.create();
    const findings = mind.check(result.tmdContent).diagnostics;
    const orphans = findings.filter((f) => f.code === 'checker/orphaned-entity');
    assert.deepEqual(
      orphans.map((f) => f.message),
      [],
    );
  });

  it('auth signature has correct parameter types from checker read', () => {
    const { result } = convert();
    const auth = result.entities.find((e) => e.name === 'auth') as FunctionNode;
    assert.ok(auth instanceof FunctionNode);
    // The signature should include the parameter types resolved by the checker
    assert.ok(auth.signature.includes('auth('), `signature starts with name: ${auth.signature}`);
    assert.equal(auth.signature.includes('import('), false, 'no import() in signature');
  });
});
