import assert from 'node:assert/strict';
import { it } from 'node:test';
import { rewriteTypeReferences } from './type-reference-rewrite.ts';
import type { ParsedTypeText, TypeReferenceOccurrence } from './types.ts';

const infoFor = (text: string, names: readonly string[]): ParsedTypeText => ({
  text,
  source: { filePath: '/project/example.ts', start: 0, end: text.length },
  references: names.map((name, index) => {
    const start = text.indexOf(name);
    return {
      writtenName: name,
      source: { filePath: '/project/example.ts', start, end: start + name.length },
      start,
      end: start + name.length,
      origin: { kind: 'project', declaration: { filePath: `/project/${index}.ts`, name, start: 0, end: 10 } },
    };
  }),
});
const replacement = (occurrence: TypeReferenceOccurrence): string => `Owner.${occurrence.writtenName}`;

it('TM13 A2: structural type rewrites preserve untouched source bytes and callable return unions', () => {
  for (const [text, names, expected] of [
    ['Map< Model[],\n Other | "Model">', ['Model', 'Other'], 'Map< Owner.Model[],\n Owner.Other | "Model">'],
    ['(item: Model) => Result | Failure', ['Model', 'Result', 'Failure'], '(item: Owner.Model) => Owner.Result | Owner.Failure'],
    [
      '<T extends Model = Other>(item: T) => Result',
      ['Model', 'Other', 'Result'],
      '<T extends Owner.Model = Owner.Other>(item: T) => Owner.Result',
    ],
    ['Array<Model>', ['Array', 'Model'], 'Owner.Array<Owner.Model>'],
    ['((item: Model) => Result)[]', ['Model', 'Result'], '((item: Owner.Model) => Owner.Result)[]'],
    // RFC-TM-14 S7: inline object-literal members are emitted as DTO fields,
    // so their `key: type` slots are structural.
    ['{ property: Model }', ['Model'], '{ property: Owner.Model }'],
    [
      "{ readonly list: Model[]; 'quoted'?: Array<Other>,\n nested: { inner: Result } }",
      ['Model', 'Other', 'Result'],
      "{ readonly list: Owner.Model[]; 'quoted'?: Array<Owner.Other>,\n nested: { inner: Owner.Result } }",
    ],
    ['Omit<Model, "k"> & { extra: Other }', ['Model', 'Other'], 'Omit<Owner.Model, "k"> & { extra: Owner.Other }'],
  ] as const) {
    const info = infoFor(text, names);
    const result = rewriteTypeReferences(info, replacement);
    assert.equal(result.text, expected);
    assert.equal(result.applied.length, names.length);
    assert.deepEqual(result.unsupported, []);
    assert.equal(info.text, text);
  }
});

it('TM13 A2: opaque text and labels never become structural reference replacements', () => {
  for (const text of [
    '{ run(item: Model): void }',
    '{ [key: string]: Model }',
    'T extends Model ? Yes : No',
    '(Model: string = Model) => string',
  ]) {
    const info = infoFor(text, ['Model']);
    const result = rewriteTypeReferences(info, replacement);
    assert.equal(result.text, text);
    assert.deepEqual(result.applied, []);
    assert.deepEqual(result.unsupported, info.references);
  }
  const info = infoFor('<Model>(item: Model) => Model', ['Model']);
  const references = info.references.map((reference) => ({
    ...reference,
    origin: { ...reference.origin, kind: 'type-parameter' as const },
  }));
  const bound = rewriteTypeReferences({ ...info, references }, replacement);
  assert.equal(bound.text, info.text);
  assert.deepEqual(bound.unsupported, []);
});

it('TM13 A2: stale and overlapping occurrence metadata cannot partially rewrite a slot', () => {
  const info = infoFor('Model | Other', ['Model', 'Other']);
  const references = info.references.map((reference, index) => (index === 1 ? { ...reference, start: 1 } : reference));
  const result = rewriteTypeReferences({ ...info, references }, replacement);
  assert.equal(result.text, info.text);
  assert.deepEqual(result.applied, []);
  const first = info.references[0];
  assert.ok(first);
  const duplicate = rewriteTypeReferences({ ...info, references: [...info.references, first] }, replacement);
  assert.equal(duplicate.text, info.text);
  assert.deepEqual(duplicate.applied, []);
});
