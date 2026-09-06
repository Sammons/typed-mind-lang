// RFC-TM-14 §S4 (rfc-tm-14-diamond.md) Quantum U4a — leaf R3a. Fixture 116
// (`repros-analyzer/116-class-property-types`) mirrors the live core shapes
// `readonly slots: AccumulatorSlots = {}` (entity-accumulator.ts:98),
// `readonly optionalityMarker: OptionalityMarker` (dto-field-node.ts:22) and
// `readonly paramType: RunParameterType` (run-parameter-node.ts:11): a class
// property type reached no emitted slot, so its type was an orphan. The check
// below FAILED on `origin/main` before this change and passes after; the leaf
// is isolated by deleting the property lines from the emitted document.

import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { ClassFileNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const root = join(import.meta.dirname, 'repros-analyzer/116-class-property-types');
const convert = (options?: { includePrivateMembers?: boolean }) => {
  const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'src/main.ts'));
  const result = new TypeScriptToTypedMindConverter(options).convert(analysis);
  assert.equal(result.success, true);
  assert.deepEqual(result.warnings, []);
  return result;
};
const messages = (mind: TypedMind, source: string) =>
  mind.check(source).diagnostics.map((finding) => `${finding.code}: ${finding.message}`);

it('TM14 U4: typed class properties round-trip and reference their types', async () => {
  const mind = await TypedMind.create();
  const result = convert();
  const source = result.tmdContent;
  assert.match(source, /^ {2}property: "readonly slots: Slots"$/m);
  assert.match(source, /^ {2}property: "marker\?: Marker"$/m);
  assert.equal(/hidden/.test(source), false, 'private properties are filtered under default options');
  assert.deepEqual(messages(mind, source), []);
  // The entity carries the members the document prints.
  const node = result.entities.find((entity) => entity.name === 'Node');
  assert.ok(node instanceof ClassFileNode);
  assert.deepEqual(
    node.members?.properties.map(({ name, optionality, readonly, typeExpr }) => [name, optionality, readonly, typeExpr.kind]),
    [
      ['slots', 'none', true, 'named'],
      ['marker', 'question', false, 'named'],
    ],
  );
  // Shortform has no property slot: the class promotes to longform in both
  // forms, and the round-trip keeps every property (honestFieldsOf includes
  // properties; core/pipeline/class-properties.test.ts pins the projection).
  const parsed = mind.parse(source);
  const reparsedNode = parsed.entities.find((entity) => entity.name === 'Node');
  assert.ok(reparsedNode instanceof ClassFileNode);
  assert.deepEqual(
    reparsedNode.members?.properties.map(({ name, optionality, readonly }) => [name, optionality, readonly]),
    [
      ['slots', 'none', true],
      ['marker', 'question', false],
    ],
  );
  assert.deepEqual(
    parsed.links.referencedBy('Marker').map((reference) => reference.from),
    ['Node'],
  );
  // Deleting the two public properties restores both orphans.
  const withoutProperties = source.replace(/^ {2}property: .*\n/gm, '');
  assert.notEqual(withoutProperties, source);
  assert.deepEqual(messages(mind, withoutProperties), [
    "checker/orphaned-entity: Orphaned entity 'Slots'",
    "checker/orphaned-entity: Orphaned entity 'Marker'",
  ]);
  // Private members pass through only under includePrivateMembers (S-17).
  const withPrivate = convert({ includePrivateMembers: true }).tmdContent;
  assert.match(withPrivate, /^ {2}property: "hidden: Marker"$/m);
});
