// RFC-TM-14 §S4 R3a (rfc-tm-14-diamond.md): the `property:` member —
// `"[readonly] name[?]: Type"` — parses, round-trips through both forms,
// projects into the honest-field equality bar (G-7), walks at the member
// position, and is checked by check-class-members' property arm.

import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { honestFieldsAcrossToggleOf, honestFieldsOf } from '../emitter/honest-fields.ts';
import { quoteStringLiteral } from '../emitter/quote-string-literal.ts';
import { SyntaxEmitter } from '../emitter/syntax-emitter.ts';
import { TypedMind } from '../typed-mind.ts';
import { parseQuotedTypeExpr } from './parse-quoted-signature.ts';
import { walkEntityTypeReferences } from './type-reference-walk.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const wasmPath = join(import.meta.dirname, '../../grammar/grammar.wasm');
const semantic = (entity: EntityNode) => {
  const { sourceForm: _sourceForm, ...fields } = honestFieldsAcrossToggleOf(entity);
  return fields;
};
const classOf = (entities: readonly EntityNode[]) => {
  const entity = entities.find((candidate) => candidate instanceof ClassNode || candidate instanceof ClassFileNode);
  assert.ok(entity instanceof ClassNode || entity instanceof ClassFileNode);
  return entity;
};

it('TM14 U4: property members parse, print and round-trip through both forms', async () => {
  const parser = await TypedMindParser.create({ wasmPath });
  const source = [
    'StoreFile @ store.ts:',
    'class StoreFile.Store<T> {',
    `  method: ${quoteStringLiteral('run(value: T) => Result')}`,
    `  property: ${quoteStringLiteral('readonly slots: Slots')}`,
    `  property: ${quoteStringLiteral('marker?: Marker')}`,
    `  property: ${quoteStringLiteral('readonly items?: readonly Item[]')}`,
    `  property: ${quoteStringLiteral('label: "say \\"hi\\"" | Other')}`,
    `  property: ${quoteStringLiteral('lookup: Map<string, T>')}`,
    '}',
  ].join('\n');
  const original = parser.parse(source);
  assert.deepEqual(original.diagnostics, [], source);
  const cls = classOf(original.entities);
  assert.deepEqual(
    cls.members?.properties.map(({ name, optionality, readonly, typeExpr }) => [name, optionality, readonly, typeExpr.kind]),
    [
      ['slots', 'none', true, 'named'],
      ['marker', 'question', false, 'named'],
      ['items', 'question', true, 'array'],
      ['label', 'none', false, 'union'],
      ['lookup', 'none', false, 'generic'],
    ],
  );
  assert.deepEqual(cls.methods, ['run']);
  let current = original;
  for (const forceForm of ['shortform', 'longform', 'shortform'] as const) {
    const emitted = new SyntaxEmitter().emitWithDiagnostics(current, { forceForm });
    assert.deepEqual(emitted.diagnostics, []);
    // Shortform has no property slot: the class promotes to longform.
    assert.ok(emitted.text.includes('class StoreFile.Store {'), emitted.text);
    assert.ok(emitted.text.includes('property: "readonly slots: Slots"'), emitted.text);
    assert.ok(emitted.text.includes('property: "marker?: Marker"'), emitted.text);
    const reparsed = parser.parse(emitted.text.trimEnd());
    assert.deepEqual(reparsed.diagnostics, [], emitted.text);
    assert.deepEqual(reparsed.entities.map(semantic), original.entities.map(semantic));
    current = reparsed;
  }
});

it('TM14 U4: honestFieldsOf equality includes properties', async () => {
  const parser = await TypedMindParser.create({ wasmPath });
  const withProperty = parser.parse('class Store {\n  property: "slots: Slots"\n}');
  const withOther = parser.parse('class Store {\n  property: "slots: Other"\n}');
  const withoutProperty = parser.parse('class Store {\n  method: "run() => void"\n}');
  assert.notDeepEqual(honestFieldsOf(classOf(withProperty.entities)), honestFieldsOf(classOf(withOther.entities)));
  assert.notDeepEqual(honestFieldsOf(classOf(withProperty.entities)), honestFieldsOf(classOf(withoutProperty.entities)));
  assert.deepEqual(
    honestFieldsOf(classOf(withProperty.entities)),
    honestFieldsOf(classOf(parser.parse('class Store {\n  property:   "slots: Slots"\n}').entities)),
  );
});

it('TM14 U4: property types are walked at the member position with binders and real columns', async () => {
  const parser = await TypedMindParser.create({ wasmPath });
  const payload = 'label: "say \\"hi\\"" | Box<Slots, T>';
  const source = [
    'class Store<T> {',
    `  property: ${quoteStringLiteral(payload)}`,
    `  property: ${quoteStringLiteral('kind: Marker')}`,
    '}',
  ].join('\n');
  const parsed = parser.parse(source);
  assert.deepEqual(parsed.diagnostics, []);
  const seen: [string, string][] = [];
  walkEntityTypeReferences(classOf(parsed.entities), {
    reference: (node, _args, position) => {
      seen.push([node.name, position]);
      const line = source.split('\n')[node.span.start.line - 1];
      assert.equal(line?.slice(node.span.start.column - 1, node.span.end.column - 1), node.name);
    },
  });
  assert.deepEqual(seen, [
    ['Box', 'member-signature'],
    ['Slots', 'member-signature'],
    ['Marker', 'member-signature'],
  ]);
});

it('TM14 U4: the property payload grammar rejects what it cannot carry', () => {
  const span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
  const parse = (payload: string) => parseQuotedTypeExpr(quoteStringLiteral(payload), span, span);
  assert.equal(parse('slots: Slots')?.name, 'slots');
  assert.equal(parse('readonly: boolean')?.name, 'readonly');
  assert.equal(parse('readonly?: boolean')?.optionality, 'question');
  for (const payload of ['slots', 'slots:', ': Slots', 'slots Slots', '"quoted": Slots', 'a.b: Slots', 'static x: Slots', '']) {
    assert.equal(parse(payload), undefined, payload);
  }
});

it('TM14 U4: property members are checked: unknown types, opaque types and orphan credit', async () => {
  const mind = await TypedMind.create({ wasmPath });
  const document = (property: string) =>
    [
      'program App {',
      '  type: Program',
      '  entry: StoreFile',
      '  version: 1.0.0',
      '}',
      'StoreFile @ store.ts:',
      '  <- [Store]',
      '  -> [Store]',
      'class Store {',
      `  property: ${quoteStringLiteral(property)}`,
      '}',
      'Slots %',
      '  - a: string',
      'Marker = "none" | "question"',
    ].join('\n');
  const messages = (property: string) => mind.check(document(property)).diagnostics.map((finding) => `${finding.code}: ${finding.message}`);
  assert.deepEqual(messages('slots: Slots | Marker'), []);
  assert.deepEqual(messages('slots: Slots'), ["checker/orphaned-entity: Orphaned entity 'Marker'"]);
  assert.deepEqual(messages('slots: Missing'), [
    "checker/orphaned-entity: Orphaned entity 'Slots'",
    "checker/orphaned-entity: Orphaned entity 'Marker'",
    "checker/generic-unknown-type: Generic declaration 'Store' references undefined type 'Missing'",
  ]);
  // A callable property type re-parses like an opaque signature: no warning.
  assert.deepEqual(messages('slots: (marker: Marker) => Slots'), []);
  assert.deepEqual(messages('slots: [Slots, Marker]'), [
    "checker/orphaned-entity: Orphaned entity 'Slots'",
    "checker/orphaned-entity: Orphaned entity 'Marker'",
    "checker/unsupported-member-signature: Property 'slots' in 'Store' is retained as opaque type text",
  ]);
  assert.deepEqual(messages('bad name: Slots'), [
    'semantics/invalid-member-property: Invalid property member in \'Store\'; spell it "[readonly] name[?]: Type".',
    "checker/orphaned-entity: Orphaned entity 'Slots'",
    "checker/orphaned-entity: Orphaned entity 'Marker'",
  ]);
});
