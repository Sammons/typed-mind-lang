import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
import { ClassFileNode, ClassNode, DtoNode, FunctionNode, printHeritage, TypeDefNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';

const convert = (source: string) => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-g-source-'));
  try {
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'esnext', module: 'esnext' }, include: ['index.ts'] }),
    );
    writeFileSync(join(root, 'index.ts'), source);
    const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'index.ts'));
    const result = new TypeScriptToTypedMindConverter().convert(analysis);
    return { analysis, result };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

it('G.5 source parameters and instantiated heritage survive every declaration lane', () => {
  const { result } = convert(`export interface Model { value: string }
export interface Box<out T extends Model = Model> { item: T }
export type Pair<A, B> = { left: A; right: B };
export type Alias<in T extends Model = Model> = (value: T) => Model;
export class Parent<T> {}
export class Child<const T extends Model = Model> extends Parent<T> implements Box<T> { item: T; }
export function choose<const T extends Model = Model>(value: T): T { return value; }
`);
  assert.equal(result.success, true, JSON.stringify(result.errors));
  const box = result.entities.find((entity) => entity.name === 'Box');
  assert.ok(box instanceof DtoNode);
  assert.deepEqual(box.typeParameters?.[0]?.modifiers, ['out']);
  assert.equal(box.typeParameters?.[0]?.constraint?.kind, 'named');
  const pair = result.entities.find((entity) => entity.name === 'Pair');
  assert.ok(pair instanceof DtoNode);
  assert.deepEqual(
    pair.typeParameters?.map((parameter) => parameter.name),
    ['A', 'B'],
  );
  const alias = result.entities.find((entity) => entity.name === 'Alias');
  assert.ok(alias instanceof TypeDefNode);
  assert.deepEqual(alias.typeParameters?.[0]?.modifiers, ['in']);
  const child = result.entities.find((entity) => entity.name === 'Child');
  assert.ok(child instanceof ClassNode || child instanceof ClassFileNode);
  assert.deepEqual(child.typeParameters?.[0]?.modifiers, ['const']);
  assert.ok(child.heritage.extends !== undefined);
  assert.equal(printHeritage(child.heritage.extends), 'Parent<T>');
  assert.deepEqual(child.heritage.implements.map(printHeritage), ['Box<T>']);
  const parent = result.entities.find((entity) => entity.name === 'Parent');
  assert.ok(parent instanceof ClassFileNode || parent instanceof ClassNode);
  assert.deepEqual(
    parent.typeParameters?.map((parameter) => parameter.name),
    ['T'],
  );
  const choose = result.entities.find((entity) => entity.name === 'choose');
  assert.ok(choose instanceof FunctionNode);
  assert.deepEqual(choose.typeParameters?.[0]?.modifiers, ['const']);
  assert.equal(choose.input, undefined);
  assert.equal(choose.output, undefined);
  assert.equal(
    result.entities.some((entity) => ['T', 'A', 'B'].includes(entity.name)),
    false,
  );
});

it('G.5 original generic DTO alias and function fixtures now check with exact empty diagnostic sets', async () => {
  const mind = await TypedMind.create();
  for (const name of ['68-generic-type-parameters', '95-generic-function-type-parameter']) {
    const root = join(import.meta.dirname, '../tests/ladder/repros-analyzer', name);
    const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'src/index.ts'));
    const result = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(result.success, true);
    assert.deepEqual(mind.check(result.tmdContent).diagnostics, [], name);
    assert.equal(
      result.entities.some((entity) => ['T', 'A', 'B'].includes(entity.name)),
      false,
    );
  }
});

it('G.5 parameter normalization preserves literal spaces and diagnoses physical multiline literals without dropping facts', () => {
  const { result } = convert(
    'export type Value<out T = "a   b"> = T;\nexport interface Child<out T extends\n /* split */ string = "x  y"> { value: T }\n',
  );
  assert.equal(result.success, true);
  const value = result.entities.find((entity) => entity.name === 'Value');
  assert.ok(value instanceof TypeDefNode);
  assert.deepEqual(value.typeParameters?.[0]?.defaultType?.kind === 'literal' && value.typeParameters[0].defaultType.value, 'a   b');
  assert.match(result.tmdContent, /a {3}b/);
  const invalid = convert('export interface Bad<out T extends `first\nsecond`> { value: T }');
  assert.equal(invalid.result.success, false);
  assert.ok(invalid.result.errors.some((error) => error.message.includes('unsupported-multiline-literal')));
  const bad = invalid.result.entities.find((entity) => entity.name === 'Bad');
  assert.ok(bad instanceof DtoNode);
  assert.deepEqual(bad.typeParameters?.[0]?.modifiers, ['out']);
  assert.equal(bad.typeParameters?.[0]?.constraint?.kind, 'opaque');
  assert.equal(bad.typeParameters?.[0]?.constraint?.kind === 'opaque' && bad.typeParameters[0].constraint.text, '`first\nsecond`');
});

it('G.5 existing nested mixin selection retains full call text and selected source identity separately', () => {
  const { analysis, result } = convert(`export class Base {}
function inner<T>(base: T) { return base; }
function outer<T>(base: T) { return base; }
export class Child extends outer(inner(Base)) {}
`);
  const source = analysis.modules.flatMap((module) => module.classes).find((cls) => cls.name === 'Child');
  assert.equal(source?.extendsTypeInfo?.[0]?.text, 'outer(inner(Base))');
  const selected = source?.mixinHeritage?.[0]?.base;
  assert.equal(selected?.text, 'Base');
  assert.equal(selected?.references[0]?.origin.kind, 'project');
  const child = result.entities.find((entity) => entity.name === 'Child');
  assert.ok(child instanceof ClassNode || child instanceof ClassFileNode);
  assert.equal(child.extends, 'Base');
  assert.equal(child.heritage.extends?.kind, 'named');
});
