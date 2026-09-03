// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2).
//
// Fixtures 67, 68, 69 — three adjudicated gaps left UNFIXED because each
// repair crosses a layer boundary this rung does not own. Following the
// harness convention (q3-language-adoption.test.ts:153), each check PINS
// the defect with a positive assertion that it is still present and
// annotated, so the day someone fixes it this suite fails loudly and the
// expectation gets re-baselined deliberately rather than drifting.
//
// None of these weaken an existing assertion; all three are new pins.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');

const convert = (fixture: string) => {
  const fixtureDir = join(reprosDir, fixture);
  const analyzer = new TypeScriptAnalyzer(fixtureDir);
  const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

const diagnose = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({
    entities: entities as never,
    imports: [],
    suppressions: [],
    diagnostics: [],
  });
  const tm = await TypedMind.create();
  return tm.check(longform).diagnostics;
};

describe('slat-harness rung, KNOWN GAP 67: implementing a data-shaped interface is unrepresentable', () => {
  it('the converter puts the target in the implements slot, NOT extends (the extractor is correct)', () => {
    const result = convert('67-implements-data-interface');
    assert.equal(result.success, true);
    const noopSpan = result.entities.find((e) => e.name === 'NoopSpan') as { extends?: string; implements?: readonly string[] } | undefined;
    assert.notEqual(noopSpan, undefined, 'NoopSpan must be extracted');
    assert.equal(noopSpan?.extends, undefined, 'the extractor must not misuse the extends slot');
    assert.deepEqual(noopSpan?.implements, ['Span']);
  });

  it('Span is correctly classified DTO because it is data-shaped', () => {
    const result = convert('67-implements-data-interface');
    const span = result.entities.find((e) => e.name === 'Span');
    assert.equal(span?.kind, 'DTO');
  });

  it('KNOWN GAP — the checker still rejects the pair (valid-references.ts:49-52 allows only Class/ClassFile)', async () => {
    const result = convert('67-implements-data-interface');
    const diagnostics = await diagnose(result.entities);
    const finding = diagnostics.find((d) => /Cannot use 'implements' to reference DTO 'Span'/.test(d.message));
    assert.notEqual(
      finding,
      undefined,
      `the implements-to-DTO gap must still be present and annotated; got: ${JSON.stringify(diagnostics.map((d) => d.message))}`,
    );
  });
});

describe('slat-harness rung, KNOWN GAP 68: generic type parameters are unmodeled', () => {
  it('KNOWN GAP — an interface type parameter leaks as an undefined field type', async () => {
    const result = convert('68-generic-type-parameters');
    const diagnostics = await diagnose(result.entities);
    const finding = diagnostics.find((d) => /DTO 'HalEnvelope' field 'data' references undefined type 'T'/.test(d.message));
    assert.notEqual(
      finding,
      undefined,
      `the interface generic-parameter gap must still be present; got: ${JSON.stringify(diagnostics.map((d) => d.message))}`,
    );
  });

  it('KNOWN GAP — the type-alias spelling leaks the same way (a separate converter path)', async () => {
    const result = convert('68-generic-type-parameters');
    const diagnostics = await diagnose(result.entities);
    const leaked = diagnostics.filter((d) => /DTO 'Pair' field '(left|right)' references undefined type '(A|B)'/.test(d.message));
    assert.equal(leaked.length, 2, `both type-alias parameters must still leak; got: ${JSON.stringify(diagnostics.map((d) => d.message))}`);
  });
});

describe('slat-harness rung, KNOWN GAP 69: interface methods are silently dropped', () => {
  it('KNOWN GAP — the method is absent from the emitted DTO fields', () => {
    const result = convert('69-interface-method-dropped');
    assert.equal(result.success, true);
    const repository = result.entities.find((e) => e.name === 'Repository') as
      | { kind?: string; fields?: readonly { name: string }[] }
      | undefined;
    assert.notEqual(repository, undefined, 'Repository must be extracted');
    assert.equal(repository?.kind, 'DTO');
    const fieldNames = (repository?.fields ?? []).map((f) => f.name);
    // The property survives; the method does not. Pinning both halves is
    // what makes this a gap pin rather than a vague "something is missing".
    assert.deepEqual(fieldNames, ['id'], 'the `save` method is dropped — this pins the gap');
  });

  it('KNOWN GAP — and the drop is CHECKER-INVISIBLE (zero diagnostics), which is why it is the severe one', async () => {
    const result = convert('69-interface-method-dropped');
    const diagnostics = await diagnose(result.entities);
    assert.deepEqual(
      diagnostics,
      [],
      `the silent-drop gap reports nothing today; a future fix should make this fail: ${JSON.stringify(diagnostics.map((d) => d.message))}`,
    );
  });
});
