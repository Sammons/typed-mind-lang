import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { DtoNode } from '../ast/dto-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const createParser = () => TypedMindParser.create({ wasmPath: join(import.meta.dirname, '../../grammar/grammar.wasm') });

it('G.2 names-only declaration heads parse all five kinds, qualified names and final EOF', async () => {
  const parser = await createParser();
  for (const [source, kind, name] of [
    ['Owner.Pair<T, U> %', 'DTO', 'Owner.Pair'],
    ['Owner.Alias<T, U> = Map<T, U>', 'TypeDef', 'Owner.Alias'],
    ['Owner.choose<T, U> :: choose(value: T) => U', 'Function', 'Owner.choose'],
    ['Owner.Child<T, U> <: Base<T>, Contract<U>', 'Class', 'Owner.Child'],
    ['Owner.Child<T, U> #: child.ts <: Base<T>, Contract<U>', 'ClassFile', 'Owner.Child'],
  ]) {
    for (const suffix of ['', '\n']) {
      const outcome = parser.parse(source + suffix);
      assert.deepEqual(outcome.diagnostics, [], source + suffix);
      const entity = outcome.entities[0];
      assert.equal(entity?.kind, kind);
      assert.equal(entity?.name, name);
      assert.ok(
        entity instanceof DtoNode ||
          entity instanceof TypeDefNode ||
          entity instanceof FunctionNode ||
          entity instanceof ClassNode ||
          entity instanceof ClassFileNode,
      );
      assert.deepEqual(
        entity.typeParameters?.map((parameter) => parameter.name),
        ['T', 'U'],
      );
      if (entity instanceof ClassNode || entity instanceof ClassFileNode) {
        assert.equal(entity.extends, 'Base');
        assert.deepEqual(entity.implements, ['Contract']);
        assert.equal(entity.heritage.extends?.kind, 'named');
        if (entity.heritage.extends?.kind === 'named') assert.equal(entity.heritage.extends.args.length, 1);
      }
    }
  }
});

it('G.2 longform headers and repeated full parameter and heritage properties preserve order and roles', async () => {
  const parser = await createParser();
  for (const header of ['dto', 'typedef', 'function', 'class', 'classfile']) {
    const outcome = parser.parse(`${header} Owner.Generic<T> {\n}\n`);
    assert.deepEqual(outcome.diagnostics, [], header);
    assert.equal((outcome.entities[0] as DtoNode).typeParameters?.[0]?.name, 'T');
  }
  const sigil = parser.parse('Owner.Child<T> #: child.ts <: Base<T> {\n}\n');
  assert.deepEqual(sigil.diagnostics, []);
  assert.equal((sigil.entities[0] as ClassFileNode).typeParameters?.[0]?.name, 'T');
  const full = parser.parse(
    'dto Owner.Pair {\n typeParameter: "out T extends Constraint = Default"\n typeParameter: "U = Map<T, Other>"\n extends: "Base<T>"\n extends: "OtherBase<U>"\n}\nclass Owner.Child {\n typeParameter: "T"\n implements: "Contract<T>"\n implements: "OtherContract<T>"\n}\n',
  );
  assert.deepEqual(full.diagnostics, []);
  const dto = full.entities[0];
  assert.ok(dto instanceof DtoNode);
  assert.deepEqual(
    dto.typeParameters?.map((parameter) => parameter.name),
    ['T', 'U'],
  );
  assert.deepEqual(dto.typeParameters?.[0]?.modifiers, ['out']);
  assert.equal(dto.typeParameters?.[0]?.constraint?.kind, 'named');
  assert.equal(dto.typeParameters?.[1]?.defaultType?.kind, 'generic');
  assert.equal(dto.extendsReferences?.length, 2);
  const child = full.entities[1];
  assert.ok(child instanceof ClassNode);
  assert.equal(child.heritage.extends, undefined);
  assert.deepEqual(child.implements, ['Contract', 'OtherContract']);
});

it('G.2 unsupported heads and malformed or conflicting properties have explicit local diagnostics', async () => {
  const parser = await createParser();
  for (const source of ['Pair<T extends Base> %', 'Pair<T = Default> %', 'File<T> @ file.ts:', 'Pair <T> %']) {
    assert.ok(
      parser.parse(`${source}\n`).diagnostics.some((diagnostic) => diagnostic.code.startsWith('syntax/')),
      source,
    );
  }
  for (const [source, code] of [
    ['Enum<T> = enum [One]', 'semantics/unsupported-generic-declaration'],
    ['file Entry {\n typeParameter: "T"\n}', 'semantics/unsupported-generic-declaration'],
    ['dto Pair<T> {\n typeParameter: "U"\n}', 'semantics/conflicting-type-parameters'],
    ['dto Pair {\n typeParameter: "T extends"\n}', 'semantics/invalid-type-parameter'],
    ['class Child {\n extends: "Base"\n extends: "Other"\n}', 'semantics/multiple-class-bases'],
  ]) {
    assert.ok(
      parser.parse(`${source}\n`).diagnostics.some((diagnostic) => diagnostic.code === code),
      source,
    );
  }
});
