// RFC-TM-14 §S4 (rfc-tm-14-diamond.md) Quantum U4b — leaves R3b, R4a, R4b.
// Fixture 118 (`repros-analyzer/118-opaque-leaf-references`) mirrors the live
// shapes: a constructor payload carrying an inline object (core
// `run-parameter-node.ts:16`), an `Omit<..> & { ... }` alias (webhookstorage
// `tenant-billing.ts`, `PersistedTenantRecord`) and a `(typeof X)[number]`
// alias (core `check-codes.ts:140`, `CheckCode`). Every check below FAILED on
// `origin/main` before the walker change (the two orphans the fixture README
// records) and passes after; the leaf-under-test is isolated by deleting the
// other carriers from the emitted document, never by suppression.

import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { ClassFileNode, type Span, TypedMind, walkClassMemberTypeReferences } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const root = join(import.meta.dirname, 'repros-analyzer/118-opaque-leaf-references');
const convert = () => {
  const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'src/main.ts'));
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true);
  assert.deepEqual(result.warnings, []);
  return result.tmdContent;
};
const messages = (mind: TypedMind, source: string) =>
  mind.check(source).diagnostics.map((finding) => `${finding.code}: ${finding.message}`);
const without = (source: string, pattern: RegExp) => {
  const edited = source.replace(pattern, '');
  assert.notEqual(edited, source, String(pattern));
  return edited;
};
const CONSTRUCTOR_LINE = /^ {2}constructor: .*\n/m;
const PERSISTED_LINE = /^Persisted = .*\n/m;
const PARAM_BLOCK = /^classfile Param \{[\s\S]*?\n\}\n/m;

it('TM14 U4: opaque inline-object constructor arguments yield references', async () => {
  const mind = await TypedMind.create();
  const source = convert();
  assert.match(source, /^ {2}constructor: "\(args: Base & \{ kind: Legacy \}\)"$/m);
  assert.deepEqual(messages(mind, source), []);
  // R3b in isolation: with the alias carrier gone, the constructor payload is
  // the only remaining use of `Legacy`.
  const constructorOnly = without(source, PERSISTED_LINE);
  assert.deepEqual(messages(mind, constructorOnly), []);
  assert.deepEqual(messages(mind, without(constructorOnly, CONSTRUCTOR_LINE)), ["checker/orphaned-entity: Orphaned entity 'Legacy'"]);
  // Spans map through the quoted payload's textOffsets to the real columns.
  const parsed = mind.parse(source);
  const param = parsed.entities.find((entity) => entity.name === 'Param');
  assert.ok(param instanceof ClassFileNode);
  const spans = new Map<string, Span>();
  walkClassMemberTypeReferences(param, { reference: (node) => spans.set(node.name, node.span) });
  assert.deepEqual([...spans.keys()], ['Base', 'Legacy']);
  for (const [name, span] of spans) {
    const line = source.split('\n')[span.start.line - 1];
    assert.equal(line?.slice(span.start.column - 1, span.end.column - 1), name);
  }
  assert.deepEqual(
    parsed.links.referencedBy('Legacy').map((reference) => reference.from),
    ['Param', 'Persisted'],
  );
});

it('TM14 U4: opaque inline-object members yield references', async () => {
  const mind = await TypedMind.create();
  const source = convert();
  assert.match(
    source,
    /^Persisted = Omit<Base, "id"> & \{ id: string; tier\?: Legacy; send\(cmd: Base\): Promise<Legacy>; "quoted-key": string \}$/m,
  );
  // R4a in isolation: with the constructor carrier gone, the alias's inline
  // object is the only remaining use of `Legacy`.
  const aliasOnly = without(source, CONSTRUCTOR_LINE);
  assert.deepEqual(messages(mind, aliasOnly), []);
  // The rejected controls (`{ [k: string]: Legacy }`, `{ get x(): Legacy }`)
  // stay in the document and contribute nothing: deleting Persisted and Param
  // leaves Legacy orphaned.
  const controlsOnly = without(without(source, PARAM_BLOCK), PERSISTED_LINE).replace('<- [Param, codeCount]', '<- [codeCount]');
  assert.match(controlsOnly, /IndexControl = .*\{ \[k: string\]: Legacy \}/);
  assert.match(controlsOnly, /AccessorControl = .*\{ get x\(\): Legacy \}/);
  assert.deepEqual(messages(mind, controlsOnly.replace(/\) => Param$/m, ') => void')), [
    "checker/orphaned-entity: Orphaned entity 'Legacy'",
  ]);
});

it('TM14 U4: a parenthesized type query references its value without a generic finding', async () => {
  const mind = await TypedMind.create();
  const source = convert();
  assert.match(source, /^Code = \(typeof CODES\)\[number\]$/m);
  assert.match(source, /^CODES ! src\/codes\.ts$/m);
  const findings = mind.check(source).diagnostics;
  assert.deepEqual(findings, []);
  // `CodesFile` exports CODES (the export link); `Code` is the type-query use.
  assert.deepEqual(
    mind
      .parse(source)
      .links.referencedBy('CODES')
      .map((reference) => reference.from),
    ['CodesFile', 'Code'],
  );
  // The misspelled control stays silent: no fabricated entity, no
  // `generic-*`/`dto-*` finding; only the real orphan that the lost reference
  // uncovers (non-goal N-tq-unknown).
  const misspelled = source.replace('(typeof CODES)', '(typeof CODEZ)');
  assert.notEqual(misspelled, source);
  const controlFindings = mind.check(misspelled).diagnostics;
  assert.deepEqual(
    controlFindings.map((finding) => `${finding.code}: ${finding.message}`),
    ["checker/orphaned-entity: Orphaned entity 'CODES'"],
  );
  assert.equal(
    controlFindings.some((finding) => finding.code.startsWith('checker/generic-') || finding.code.startsWith('checker/dto-')),
    false,
  );
});
