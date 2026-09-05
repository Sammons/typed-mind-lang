import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { DependencyNode, DtoNode, FileNode, FunctionNode, TypeDefNode, TypedMind } from '@sammons/typed-mind';
import type { TypeScriptProjectAnalysis } from './types.ts';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';

const project = (context: TestContext, files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-exit-types-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries({
    'tsconfig.json': JSON.stringify({
      compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, paths: { 'project-model': ['./model.ts'] } },
      include: ['*.ts'],
    }),
    ...files,
  })) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), text);
  }
  return new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'index.ts'));
};

it('TM13 EXIT: retain exact transitive private type dependencies without fabricated exports', (context) => {
  const analysis = project(context, {
    'index.ts':
      'type Leaf = "a" | "b"; interface PrivateRow { id: string; leaf: Leaf } type Unused = { lost: string }; type Dormant = PrivateUnused; interface PrivateUnused { hidden: string } export function use(row: PrivateRow): PrivateRow { return row; }',
  });
  const converter = new TypeScriptToTypedMindConverter();
  const result = converter.convert(analysis);
  assert.equal(result.success, true);
  assert.ok(result.entities.find((entity) => entity.name === 'PrivateRow') instanceof DtoNode);
  assert.ok(result.entities.find((entity) => entity.name === 'Leaf') instanceof TypeDefNode);
  assert.equal(
    result.entities.some((entity) => ['Unused', 'Dormant', 'PrivateUnused'].includes(entity.name)),
    false,
  );
  const owner = result.entities.find((entity) => entity instanceof FileNode);
  assert.ok(owner instanceof FileNode);
  assert.deepEqual(owner.exports, ['use']);
  const fn = result.entities.find((entity) => entity.name === 'use');
  assert.ok(fn instanceof FunctionNode);
  assert.equal(fn.input, 'PrivateRow');
  assert.deepEqual(converter.convert(analysis), result);
  const withoutUse = project(context, {
    'index.ts':
      'type Leaf = "a" | "b"; interface PrivateRow { id: string; leaf: Leaf } export function use(row: string): string { return row; }',
  });
  assert.equal(
    converter.convert(withoutUse).entities.some((entity) => ['PrivateRow', 'Leaf'].includes(entity.name)),
    false,
  );
});

it('TM13 EXIT: project package bindings use retained source ownership, not duplicate Dependency exports', async (context) => {
  const analysis = project(context, {
    'index.ts':
      'import { Row, State as Phase, hydrate } from "project-model"; export function use(row: Row, state: Phase): Row { return hydrate(row); }',
    'model.ts':
      'export type State = "open" | "closed"; export interface Row { state: State } export function hydrate(row: Row): Row { return row; }',
  });
  const graph = structuredClone(analysis.moduleGraph);
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true);
  const dependency = result.entities.find((entity) => entity instanceof DependencyNode);
  assert.ok(dependency instanceof DependencyNode);
  assert.deepEqual(dependency.exports ?? [], []);
  const importer = result.entities.find((entity) => entity instanceof FileNode && entity.path === 'index.ts');
  assert.ok(importer instanceof FileNode);
  assert.ok(importer.imports.includes('Row'));
  assert.ok(importer.imports.includes('hydrate'));
  assert.equal(importer.imports.includes('State'), false, 'TypeDefs remain illegal File import targets');
  const model = analysis.modules.find((module) => module.filePath.endsWith('/model.ts'));
  const binding = analysis.modules
    .find((module) => module.filePath.endsWith('/index.ts'))
    ?.imports[0]?.bindings?.find((item) => item.localName === 'Phase');
  assert.equal(binding?.exportName, 'State');
  assert.deepEqual(binding?.origin, { kind: 'project', declaration: model?.types[0]?.declaration });
  assert.deepEqual(analysis.moduleGraph, graph, 'binding metadata never invents syntactic graph edges');
  const tm = await TypedMind.create();
  const checked = tm.checkWithParseGate(result.tmdContent);
  assert.deepEqual(
    checked.diagnostics.filter((item) => ['checker/reference-to-illegal', 'checker/multi-exported'].includes(item.code)),
    [],
  );
  const withoutBindingMetadata = {
    ...analysis,
    modules: analysis.modules.map((module) => ({ ...module, imports: module.imports.map(({ bindings: _bindings, ...item }) => item) })),
  };
  const control = new TypeScriptToTypedMindConverter().convert(withoutBindingMetadata);
  assert.ok(tm.checkWithParseGate(control.tmdContent).diagnostics.some((item) => item.code === 'checker/reference-to-illegal'));
});

it('TM13 EXIT: cyclic private collisions use standalone names without private File membership', async (context) => {
  const analysis = project(context, {
    'index.ts': 'export {left} from "./a.js"; export {right} from "./z.js";',
    'a.ts': 'interface Hidden { next?: Hidden; left: string } export function left(value: Hidden): Hidden { return value; }',
    'z.ts': 'interface Hidden { next?: Hidden; right: number } export function right(value: Hidden): Hidden { return value; }',
  });
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  const hidden = result.entities.filter((entity) => entity instanceof DtoNode);
  assert.deepEqual(hidden.map((entity) => entity.name).sort(), ['Hidden', 'ZFileHidden']);
  const right = result.entities.find((entity) => entity.name === 'right');
  assert.ok(right instanceof FunctionNode);
  assert.equal(right.input, 'ZFileHidden');
  const renamed = hidden.find((entity) => entity.name === 'ZFileHidden');
  assert.ok(renamed instanceof DtoNode);
  assert.equal(renamed.fields[0]?.type, 'ZFileHidden');
  for (const entity of result.entities)
    if (entity instanceof FileNode) {
      assert.equal(
        entity.exports.some((name) => hidden.some((dto) => dto.name === name)),
        false,
      );
      assert.equal(
        entity.imports.some((name) => hidden.some((dto) => dto.name === name)),
        false,
      );
    }
  const tm = await TypedMind.create();
  assert.deepEqual(
    tm.checkWithParseGate(result.tmdContent).diagnostics.filter((item) => /qualified|unknown-type|dto-not-found/.test(item.code)),
    [],
  );
});

it('TM13 EXIT: ambiguous and external mixed bindings retain dependency facts and illegal-export controls', async (context) => {
  const analysis = project(context, {
    'index.ts': 'import { Row, State } from "project-model"; export interface Uses { row: Row; state: State }',
    'model.ts': 'export type State = "open" | "closed"; export interface Row { state: State }',
  });
  const mixed: TypeScriptProjectAnalysis = {
    ...analysis,
    modules: analysis.modules.map((module) => ({
      ...module,
      imports: module.imports.map((imp) => ({
        ...imp,
        bindings: imp.bindings?.map((binding) =>
          binding.exportName === 'State'
            ? { ...binding, origin: { kind: 'unresolved', reason: 'ambiguous-declaration' } as const }
            : binding,
        ),
      })),
    })),
  };
  const result = new TypeScriptToTypedMindConverter().convert(mixed);
  const dependency = result.entities.find((entity) => entity instanceof DependencyNode);
  assert.ok(dependency instanceof DependencyNode);
  assert.deepEqual(dependency.exports, ['State']);
  const tm = await TypedMind.create();
  assert.ok(tm.checkWithParseGate(result.tmdContent).diagnostics.some((item) => item.code === 'checker/reference-to-illegal'));
  const external = project(context, {
    'index.ts': 'import { Foreign } from "real-package"; export interface Uses { foreign: Foreign }',
    'node_modules/real-package/package.json': JSON.stringify({ name: 'real-package', types: 'index.d.ts' }),
    'node_modules/real-package/index.d.ts': 'export interface Foreign { value: string }',
  });
  const foreign = new TypeScriptToTypedMindConverter().convert(external);
  assert.ok(foreign.entities.some((entity) => entity instanceof DependencyNode && entity.exports?.includes('Foreign')));
  assert.match(foreign.tmdContent, /RealPackage.Foreign/);
  const illegal = tm.checkWithParseGate('Root -> Index v1.0.0\nIndex @ index.ts:\n  -> [Alias]\nAlias = string\n');
  assert.ok(illegal.diagnostics.some((item) => item.code === 'checker/reference-to-illegal'));
});

it('TM13 EXIT: imported same-name metadata cannot turn a source-private declaration public', (context) => {
  const analysis = project(context, {
    'index.ts': 'import { Row } from "project-model"; export interface Uses { row: Row }',
    'model.ts':
      'export interface Row { publicValue: string } type Hidden = { privateValue: string }; export function use(value: Hidden): Hidden { return value; }',
  });
  const model = analysis.modules.find((module) => module.filePath.endsWith('/model.ts'));
  const hidden = model?.types.find((item) => item.name === 'Hidden')?.declaration;
  assert.ok(hidden);
  const changed: TypeScriptProjectAnalysis = {
    ...analysis,
    modules: analysis.modules.map((module) => ({
      ...module,
      imports: module.imports.map((imp) => ({
        ...imp,
        bindings: imp.bindings?.map((binding) => ({ ...binding, origin: { kind: 'project', declaration: hidden } as const })),
      })),
    })),
  };
  const result = new TypeScriptToTypedMindConverter().convert(changed);
  const owner = result.entities.find((entity) => entity instanceof FileNode && entity.path === 'index.ts');
  assert.ok(owner instanceof FileNode);
  assert.equal(owner.imports.includes('Hidden'), false);
  const dependency = result.entities.find((entity) => entity instanceof DependencyNode);
  assert.ok(dependency instanceof DependencyNode);
  assert.ok(dependency.exports?.includes('Row'));
});

it('TM13 EXIT: only a whole balanced object alias becomes a DTO', (context) => {
  const source = [
    'export type Plain = { value: "}"; nested: { marker: "{" } };',
    'export type Leading = { left: string } & { right: number };',
    'export type Wrapped = Record<string, { value: string }>;',
    'export type Conditional<T> = T extends string ? { yes: string } : { no: number };',
    'export type Callable = () => { value: string };',
    'export interface TenantRecord { tier: string }',
    'type LegacyTenantTier = "paid" | "trial";',
    'type PersistedTenantRecord = Omit<TenantRecord, "tier"> & { tier?: LegacyTenantTier };',
    'export type HydratedTenantRecord = TenantRecord & { tier: string };',
    'export function hydrate(value: PersistedTenantRecord): HydratedTenantRecord { return value as HydratedTenantRecord; }',
  ].join('\n');
  const analysis = project(context, { 'index.ts': source });
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true);
  assert.ok(result.entities.find((entity) => entity.name === 'Plain') instanceof DtoNode);
  for (const name of ['Leading', 'Wrapped', 'Conditional', 'Callable', 'PersistedTenantRecord', 'HydratedTenantRecord']) {
    const entity = result.entities.find((item) => item.name === name);
    assert.ok(entity instanceof TypeDefNode, name);
    assert.equal(entity.variant, 'alias');
    assert.ok(analysis.modules[0]?.types.find((item) => item.name === name)?.typeInfo?.text);
  }
  assert.match(result.tmdContent, /Leading = \{ left: string \} & \{ right: number \}/);
  assert.match(result.tmdContent, /PersistedTenantRecord = Omit<TenantRecord, "tier"> & \{ tier\?: LegacyTenantTier \}/);
  assert.match(result.tmdContent, /HydratedTenantRecord = TenantRecord & \{ tier: string \}/);
  const fn = result.entities.find((entity) => entity.name === 'hydrate');
  assert.ok(fn instanceof FunctionNode);
  assert.equal(fn.input, undefined);
  assert.equal(fn.output, undefined);
});

it('TM13 EXIT: omitted class properties and private members never seed type retention', (context) => {
  const analysis = project(context, {
    'index.ts': [
      'interface PropertyOnly { value: string }',
      'interface PrivateOnly { value: string }',
      'interface PrivateNested { value: string }',
      'interface Selected { dropped: PrivateNested; run(): void }',
      'export class API { field!: PropertyOnly; private hidden(value: PrivateOnly): void {} public run(value: Selected): void {} }',
    ].join('\n'),
  });
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(
    result.entities.some((entity) => ['PropertyOnly', 'PrivateOnly', 'PrivateNested'].includes(entity.name)),
    false,
  );
  assert.equal(
    result.entities.some((entity) => entity.name === 'Selected'),
    true,
  );
  const include = new TypeScriptToTypedMindConverter({ includePrivateMembers: true }).convert(analysis);
  assert.ok(include.entities.some((entity) => entity.name === 'PrivateOnly'));
  assert.equal(
    include.entities.some((entity) => ['PropertyOnly', 'PrivateNested'].includes(entity.name)),
    false,
  );
});

it('TM13 EXIT: folding a project binding preserves the importing File default declaration', (context) => {
  const analysis = project(context, {
    'index.ts': 'import { Row } from "project-model"; export default function run(row: Row): Row { return row; }',
    'model.ts': 'export interface Row { value: string }',
  });
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  const owner = result.entities.find((entity) => entity instanceof FileNode && entity.path === 'index.ts');
  assert.ok(owner instanceof FileNode);
  assert.ok(owner.imports.includes('Row'));
  assert.deepEqual(owner.exports, [`${owner.name}.default`]);
  assert.ok(result.entities.some((entity) => entity.name === `${owner.name}.default` && entity instanceof FunctionNode));
});
