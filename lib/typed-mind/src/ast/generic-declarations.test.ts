import assert from 'node:assert/strict';
import { it } from 'node:test';
import { parseHeritageText } from '../pipeline/parse-heritage-text.ts';
import { parseSignatureText } from '../pipeline/parse-signature-text.ts';
import { ClassFileNode } from './class-file-node.ts';
import { ClassNode } from './class-node.ts';

const span = { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } };
const common = { name: 'Child', span, raw: '', sourceForm: 'shortform' as const, methods: [] };

it('G.1 heritage preserves generic bases, qualified arguments and Array constructor identity', () => {
  for (const name of ['Array', 'ReadonlyArray', 'Owner.Base']) {
    const reference = parseHeritageText(`${name}<Map<string, T>>`);
    assert.equal(reference.kind, 'named');
    if (reference.kind === 'named') {
      assert.equal(reference.base.name, name);
      assert.equal(reference.args.length, 1);
      assert.equal(reference.args[0]?.kind, 'generic');
    }
  }
  for (const input of ['Base<T', 'Base<T>, Other', 'T[]', '"Base"', '{ key: Base }', 'Base trailing']) {
    const reference = parseHeritageText(input);
    assert.equal(reference.kind, 'opaque', input);
    if (reference.kind === 'opaque') assert.equal(reference.text, input);
  }
});

it('G.1 canonical heritage derives enumerable legacy fields for Class and ClassFile', () => {
  const heritage = { extends: parseHeritageText('Owner.Base<T>'), implements: [parseHeritageText('Owner.Contract<T>')] };
  const structured = new ClassNode({ ...common, heritage });
  assert.deepEqual(structured.heritage, heritage);
  assert.equal(structured.extends, 'Owner.Base');
  assert.deepEqual(structured.implements, ['Owner.Contract']);
  for (const node of [
    new ClassNode({ ...common, extends: 'Base', implements: ['Contract'] }),
    new ClassFileNode({ ...common, extends: 'Base', implements: ['Contract'], path: 'child.ts', imports: [], exports: [] }),
  ]) {
    const serialized = JSON.parse(JSON.stringify(node));
    assert.equal(serialized.extends, 'Base');
    assert.deepEqual(serialized.implements, ['Contract']);
    assert.equal('typeParameters' in serialized, false);
    assert.equal(Object.prototype.propertyIsEnumerable.call(node, 'extends'), true);
    assert.equal(Object.prototype.propertyIsEnumerable.call(node, 'implements'), true);
    assert.equal(node.heritage.extends?.kind, 'named');
    if (node.heritage.extends?.kind === 'named') assert.deepEqual(node.heritage.extends.args, []);
  }
});

it('G.1 signatures share complete generic metadata, including comments and async trailing commas', () => {
  const result = parseSignatureText('async <const/*separator*/T extends Map<string, Other> = Default,>(value: T) => T');
  assert.equal(result.kind, 'parsed');
  if (result.kind !== 'parsed') return;
  assert.equal(result.signature.async, true);
  assert.deepEqual(result.signature.typeParameterNames, ['T']);
  const parameter = result.signature.typeParameters?.[0];
  assert.deepEqual(parameter?.modifiers, ['const']);
  assert.equal(parameter?.constraint?.kind, 'generic');
  assert.equal(parameter?.defaultType?.kind, 'named');
  assert.equal(parameter?.raw, 'const/*separator*/T extends Map<string, Other> = Default');
});
