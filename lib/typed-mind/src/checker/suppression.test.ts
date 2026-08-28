// RFC-TM-8 Diamond DAG Q3 check bindings (rfc-tm-8-diamond.md §7/§8, Diamond
// DAG "Q3 — Suppression end-to-end"): both-form parse fixtures; reasonless-
// line error fixture; suppressed-orphan-validates fixture; stale-fails
// fixture; meta-suppression fixture; round-trip deep-equal.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter } from '../emitter/syntax-emitter.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { TypedMind } from '../typed-mind.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

const createParser = async () => TypedMindParser.create({ wasmPath });
const createTypedMind = async () => TypedMind.create({ wasmPath });

// Honest-fields projection (mirrors round-trip.test.ts's honestFieldsOf):
// span/raw are expected to move on a fresh parse, so the deep-equal
// assertion excludes them and compares only the semantic fields.
const honestSuppression = (suppression: { target: string; code: string; reason: string }) => {
  return { target: suppression.target, code: suppression.code, reason: suppression.reason };
};

describe('X-SUPP-1: suppression grammar, both forms', () => {
  it('shortform: suppress line parses with a real target/code/reason and zero syntax/* diagnostics', async () => {
    const parser = await createParser();
    const source = [
      'Main -> Entry',
      'Entry :: () => void',
      'suppress OrphanedHelper checker/orphaned-entity "consumed only by integration tests"',
      '',
    ].join('\n');
    const outcome = parser.parse(source);
    assert.equal(outcome.diagnostics.filter((d) => d.code.startsWith('syntax/')).length, 0);
    assert.equal(outcome.suppressions.length, 1);
    assert.deepEqual(honestSuppression(outcome.suppressions[0] ?? { target: '', code: '', reason: '' }), {
      target: 'OrphanedHelper',
      code: 'checker/orphaned-entity',
      reason: 'consumed only by integration tests',
    });
  });

  it('longform: suppress { ... } block parses one SuppressionNode per entry (the grain ruling), zero syntax/* diagnostics', async () => {
    const parser = await createParser();
    const source = [
      'Main -> Entry',
      'Entry :: () => void',
      'suppress {',
      '  OrphanedHelper checker/orphaned-entity "consumed only by integration tests"',
      '  AnotherOne checker/dto-field-unknown-type "legacy field, tracked in TICKET-42"',
      '}',
      '',
    ].join('\n');
    const outcome = parser.parse(source);
    assert.equal(outcome.diagnostics.filter((d) => d.code.startsWith('syntax/')).length, 0);
    assert.equal(outcome.suppressions.length, 2);
    assert.deepEqual(outcome.suppressions.map(honestSuppression), [
      { target: 'OrphanedHelper', code: 'checker/orphaned-entity', reason: 'consumed only by integration tests' },
      { target: 'AnotherOne', code: 'checker/dto-field-unknown-type', reason: 'legacy field, tracked in TICKET-42' },
    ]);
  });

  it('a reasonless suppression line does not parse (grammar-level error, mandatory quoted reason)', async () => {
    const parser = await createParser();
    const source = ['Main -> Entry', 'Entry :: () => void', 'suppress OrphanedHelper checker/orphaned-entity', ''].join('\n');
    const outcome = parser.parse(source);
    assert.equal(outcome.suppressions.length, 0);
    assert.equal(
      outcome.diagnostics.some((d) => d.code.startsWith('syntax/')),
      true,
      'a reasonless suppress line must surface as a syntax/* diagnostic, not parse clean',
    );
  });

  it('a reasonless suppression entry inside a longform block does not parse', async () => {
    const parser = await createParser();
    const source = ['Main -> Entry', 'Entry :: () => void', 'suppress {', '  OrphanedHelper checker/orphaned-entity', '}', ''].join('\n');
    const outcome = parser.parse(source);
    assert.equal(outcome.suppressions.length, 0);
    assert.equal(
      outcome.diagnostics.some((d) => d.code.startsWith('syntax/')),
      true,
    );
  });
});

// A document that is otherwise fully valid (Program -> File -> Function
// wiring resolves clean, per ast-validator.test.ts's orphanSource fixture)
// with exactly one true orphan: `lonely`, a DTO nothing references.
const orphanSource = [
  'App -> Main v1.0.0',
  'Main @ src/main.ts:',
  '  <- [helper]',
  '  -> [helper]',
  'helper :: () => void',
  'lonely % "unused DTO"',
  'suppress lonely checker/orphaned-entity "consumed only by integration tests"',
  '',
].join('\n');

const unsuppressedOrphanSource = [
  'App -> Main v1.0.0',
  'Main @ src/main.ts:',
  '  <- [helper]',
  '  -> [helper]',
  'helper :: () => void',
  'lonely % "unused DTO"',
  '',
].join('\n');

describe('X-SUPP-3: suppressed-not-silenced checker semantics', () => {
  it('a suppressed orphan validates: the finding stays in output, labeled suppressed with its reason, and is counted', async () => {
    const typedMind = await createTypedMind();
    const result = typedMind.check(orphanSource);
    assert.equal(result.valid, true);
    assert.equal(result.suppressedCount, 1);
    const orphanDiagnostic = result.diagnostics.find((d) => d.code === 'checker/orphaned-entity');
    assert.notEqual(orphanDiagnostic, undefined);
    assert.equal(orphanDiagnostic?.severity, 'error');
    assert.equal(orphanDiagnostic?.suppression?.reason, 'consumed only by integration tests');
  });

  it('an unsuppressed orphan still fails the document (control case: same source, no suppression)', async () => {
    const typedMind = await createTypedMind();
    const result = typedMind.check(unsuppressedOrphanSource);
    assert.equal(result.valid, false);
    assert.equal(result.suppressedCount, 0);
    assert.equal(
      result.diagnostics.some((d) => d.code === 'checker/orphaned-entity'),
      true,
    );
  });

  it('a stale suppression (target finding no longer produced) fails the document via checker/stale-suppression', async () => {
    const typedMind = await createTypedMind();
    // Same document, but `lonely` is now referenced (imported by Main) —
    // check-orphans.ts produces no finding for it this run, so the
    // suppression matches zero findings and is itself flagged stale.
    const source = [
      'App -> Main v1.0.0',
      'Main @ src/main.ts:',
      '  <- [helper, lonely]',
      '  -> [helper]',
      'helper :: () => void',
      'lonely % "no longer unused"',
      'suppress lonely checker/orphaned-entity "no longer needed"',
      '',
    ].join('\n');
    const result = typedMind.check(source);
    assert.equal(result.valid, false);
    assert.equal(result.suppressedCount, 0);
    const stale = result.diagnostics.find((d) => d.code === 'checker/stale-suppression');
    assert.notEqual(stale, undefined);
    assert.equal(stale?.severity, 'error');
  });

  it('a suppression naming an absent target entity is always stale (I-10: absence is exactly the case staleness must see)', async () => {
    const typedMind = await createTypedMind();
    const source = [
      'App -> Main v1.0.0',
      'Main @ src/main.ts:',
      '  <- [helper]',
      '  -> [helper]',
      'helper :: () => void',
      'suppress NoSuchEntity checker/orphaned-entity "target was renamed"',
      '',
    ].join('\n');
    const result = typedMind.check(source);
    assert.equal(result.valid, false);
    const stale = result.diagnostics.find((d) => d.code === 'checker/stale-suppression');
    assert.notEqual(stale, undefined);
  });

  it('a suppression naming checker/stale-suppression itself (meta-suppression) is rejected with its own finding, never silently accepted', async () => {
    const typedMind = await createTypedMind();
    const source = [
      'App -> Main v1.0.0',
      'Main @ src/main.ts:',
      '  <- [helper]',
      '  -> [helper]',
      'helper :: () => void',
      'suppress helper checker/stale-suppression "hide the stale check"',
      '',
    ].join('\n');
    const result = typedMind.check(source);
    assert.equal(result.valid, false);
    const rejected = result.diagnostics.find((d) => d.code === 'checker/meta-suppression-rejected');
    assert.notEqual(rejected, undefined);
    assert.equal(rejected?.severity, 'error');
    // The meta-suppression entry itself is never applied as a live
    // suppression — it cannot also produce a stale-suppression finding for
    // the SAME entry, since it was rejected outright, not evaluated as a
    // normal (code, target) pair.
    assert.equal(result.diagnostics.filter((d) => d.code === 'checker/stale-suppression').length, 0);
  });

  it('suppressed-summary count reflects exactly the findings this run silenced-but-kept, not the suppression count', async () => {
    const typedMind = await createTypedMind();
    // Two DTOs, each orphaned, each suppressed once — the count tracks
    // matched findings, one per suppression here.
    const source = [
      'App -> Main v1.0.0',
      'Main @ src/main.ts:',
      '  <- [helper]',
      '  -> [helper]',
      'helper :: () => void',
      'lonelyOne % "unused DTO one"',
      'lonelyTwo % "unused DTO two"',
      'suppress lonelyOne checker/orphaned-entity "reason one"',
      'suppress lonelyTwo checker/orphaned-entity "reason two"',
      '',
    ].join('\n');
    const result = typedMind.check(source);
    assert.equal(result.valid, true);
    assert.equal(result.suppressedCount, 2);
  });
});

describe('X-SUPP-4: round-trip (parse -> emit -> parse deep-equal), both forms', () => {
  it('shortform suppression line round-trips: emitted source reparses to the same suppression shape', async () => {
    const parser = await createParser();
    const emitter = new SyntaxEmitter();
    const source = [
      'Main -> Entry',
      'Entry :: () => void',
      'suppress OrphanedHelper checker/orphaned-entity "consumed only by integration tests"',
      '',
    ].join('\n');
    const first = parser.parse(source);
    const emitted = emitter.emitShortform(first);
    const second = parser.parse(emitted);
    assert.deepEqual(second.suppressions.map(honestSuppression), first.suppressions.map(honestSuppression));
    assert.equal(second.diagnostics.filter((d) => d.code.startsWith('syntax/')).length, 0);
  });

  it('longform suppression block round-trips: emitted source reparses to the same suppression shape', async () => {
    const parser = await createParser();
    const emitter = new SyntaxEmitter();
    const source = [
      'Main -> Entry',
      'Entry :: () => void',
      'suppress {',
      '  OrphanedHelper checker/orphaned-entity "consumed only by integration tests"',
      '  AnotherOne checker/dto-field-unknown-type "legacy field, tracked in TICKET-42"',
      '}',
      '',
    ].join('\n');
    const first = parser.parse(source);
    const emitted = emitter.emitLongform(first);
    const second = parser.parse(emitted);
    assert.deepEqual(second.suppressions.map(honestSuppression), first.suppressions.map(honestSuppression));
    assert.equal(second.diagnostics.filter((d) => d.code.startsWith('syntax/')).length, 0);
  });

  it('plain emit() (default shortform) preserves suppressions parsed from a longform block', async () => {
    const parser = await createParser();
    const emitter = new SyntaxEmitter();
    const source = [
      'Main -> Entry',
      'Entry :: () => void',
      'suppress {',
      '  OrphanedHelper checker/orphaned-entity "reason text"',
      '}',
      '',
    ].join('\n');
    const first = parser.parse(source);
    const emitted = emitter.emit(first);
    const second = parser.parse(emitted);
    assert.deepEqual(second.suppressions.map(honestSuppression), first.suppressions.map(honestSuppression));
  });
});
