import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { ClassFileNode, ClassNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const fixture = (context: TestContext, files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-members-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, module: 'NodeNext' } }));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text);
  return new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'main.ts'));
};
const classNamed = (entities: readonly unknown[], name: string) => {
  const entity = entities.find(
    (candidate) => (candidate instanceof ClassNode || candidate instanceof ClassFileNode) && candidate.name === name,
  );
  assert.ok(entity instanceof ClassNode || entity instanceof ClassFileNode, name);
  return entity;
};

it('TM13 B3b: gap85 consumes StoreConfig and AllocationFailure through signatures', async () => {
  const root = join(import.meta.dirname, 'repros-analyzer/85-classfile-method-signature-types');
  const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'src/server.ts'));
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true);
  const store = classNamed(result.entities, 'LeaseStore');
  assert.equal(store.members?.constructors.length, 1);
  assert.deepEqual(store.methods, ['allocate', 'list']);
  const mind = await TypedMind.create();
  assert.deepEqual(mind.check(result.tmdContent).diagnostics, []);
  const noConstructor = result.tmdContent.replace(/^ {2}constructor: .*\n/m, '');
  assert.notEqual(noConstructor, result.tmdContent);
  assert.deepEqual(
    mind.check(noConstructor).diagnostics.map((finding) => finding.message),
    ["Orphaned entity 'StoreConfig'"],
  );
  const noReturn = result.tmdContent.replace('Lease | AllocationFailure', 'Lease');
  assert.notEqual(noReturn, result.tmdContent);
  assert.deepEqual(
    mind.check(noReturn).diagnostics.map((finding) => finding.message),
    ["Orphaned entity 'AllocationFailure'"],
  );
});

it('TM13 B3b: source method and constructor origins survive conversion', async (context) => {
  const analysis = fixture(context, {
    'main.ts': 'import { Store } from "./store.js"; export function main() { return Store; }',
    'left.ts': 'export interface Config { left: string; }',
    'right.ts': 'export interface Config { right: number; }',
    'store.ts': `import type { Config as Left } from './left.js';
import type { Config as Right } from './right.js';
export class Store {
  constructor(left: Left);
  constructor(right: Right);
  constructor(config: Left | Right) {}
  convert(value: Left): Right;
  convert(value: Right): Left;
  convert(value: Left | Right): Left | Right { return value; }
  pick<T extends Left>(value: T): T { return value; }
  static staticCall(value: Right): Left { return {left: ''}; }
  arrow = (value: Right): Left => ({left: ''});
  protected protectedCall(value: Left): Right { return {right: 1}; }
  private hidden(value: Right): Left { return {left: ''}; }
  get current(): Left { return {left: ''}; }
  set current(value: Right) {}
  rest(...values: Right[]): void {}
  literal(value: "left  /*literal*/  right"): "a  b" { return 'a  b'; }
}`,
  });
  const source = analysis.modules.find((module) => module.filePath.endsWith('/store.ts'))?.classes[0];
  assert.ok(source);
  assert.equal(source.constructors?.length, 3);
  assert.equal(source.constructors?.[0]?.parameters[0]?.typeInfo?.references[0]?.origin.kind, 'project');
  assert.equal(source.methods.find((method) => method.name === 'rest')?.parameters[0]?.isRest, true);
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true, JSON.stringify(result.errors));
  const store = classNamed(result.entities, 'Store');
  assert.deepEqual(store.methods, [
    'convert',
    'convert',
    'convert',
    'pick',
    'staticCall',
    'arrow',
    'protectedCall',
    'rest',
    'literal',
    'current',
  ]);
  const constructors = store.members?.constructors;
  assert.equal(constructors?.length, 3);
  assert.ok(result.tmdContent.includes('constructor: "(right: RightFile.Config)"'));
  assert.ok(result.tmdContent.includes('...values: RightFile.Config[]'));
  assert.ok(result.tmdContent.includes('left  /*literal*/  right'));
  assert.ok(result.tmdContent.includes('a  b'));
  assert.ok(result.tmdContent.includes('pick<T extends Config>'));
  assert.ok(result.tmdContent.includes('current(value: RightFile.Config) => Config'));
  assert.deepEqual((await TypedMind.create()).check(result.tmdContent).diagnostics, []);
  const withPrivate = new TypeScriptToTypedMindConverter({ includePrivateMembers: true }).convert(analysis);
  assert.ok(classNamed(withPrivate.entities, 'Store').methods.includes('hidden'));
});

it('TM13 B3b: constructor visibility follows member policy and parameter properties keep their types', (context) => {
  const analysis = fixture(context, {
    'main.ts': `export interface Config { value: string; }
export class PrivateStore { private constructor(config: Config) {} }
export class ProtectedStore { protected constructor(config: Config) {} }
export class PublicStore { constructor(private readonly config: Config, label = 'ready') {} }
export function main() { return [PrivateStore, ProtectedStore, PublicStore]; }`,
  });
  for (const includePrivateMembers of [false, true]) {
    const result = new TypeScriptToTypedMindConverter({ includePrivateMembers }).convert(analysis);
    assert.equal(classNamed(result.entities, 'PrivateStore').members?.constructors.length ?? 0, includePrivateMembers ? 1 : 0);
    assert.equal(classNamed(result.entities, 'ProtectedStore').members?.constructors.length, 1);
    assert.equal(classNamed(result.entities, 'PublicStore').members?.constructors.length, 1);
    assert.ok(result.tmdContent.includes('(config: Config, label?: any)'));
  }
});
