import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassNode, ConstantsNode, DependencyNode, DtoNode, FunctionNode, TypeDefNode } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';

const fixture = (name: string, entry: string) => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../tests/ladder/repros-analyzer', name);
  return new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'src', entry));
};

it('TM13 A2: gaps 77 and 96 resolve actual DTO and alias entities without invalid IO', () => {
  const converter = new TypeScriptToTypedMindConverter();
  const dtoAnalysis = fixture('77-same-name-interface-two-files', 'main.ts');
  const dto = converter.convert(dtoAnalysis);
  assert.equal(dto.success, true);
  const signatures = dto.entities.filter((entity) => entity instanceof FunctionNode);
  const saved = signatures.find((entity) => entity.name === 'saveJob');
  assert.ok(saved instanceof FunctionNode);
  assert.match(saved.signature ?? '', /MainFile\.JobRecord/);
  assert.equal(saved.input, 'MainFile.JobRecord');
  assert.ok(!dto.warnings.some((warning) => /planning result/.test(warning.message)));
  const aliasAnalysis = fixture('96-same-name-type-alias-two-files', 'index.ts');
  const alias = converter.convert(aliasAnalysis);
  const advance = alias.entities.find((entity) => entity.name === 'advance');
  const target = alias.entities.find((entity) => entity.name === 'LifecycleFile.PublishState');
  assert.ok(advance instanceof FunctionNode);
  assert.ok(target instanceof TypeDefNode);
  assert.equal(advance.signature, 'advance(state: PublishState) => LifecycleFile.PublishState');
  assert.equal(advance.output, undefined);
  assert.equal(advance.input, undefined);
  assert.deepEqual(converter.convert(dtoAnalysis), dto, 'repeated conversion after another project has no state leakage');
});

const project = (context: TestContext, files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-a2-converter-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries({
    'tsconfig.json': JSON.stringify({
      compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', strict: true },
      include: ['*.ts'],
    }),
    ...files,
  })) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), content);
  }
  return new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'index.ts'));
};

it('TM13 A2: all structural type slots follow the same origin remap', (context) => {
  const analysis = project(context, {
    'a.ts': 'export interface Model { first: string } export interface Parent { value: string }',
    'z.ts': 'export interface Model { second: number } export interface Parent { run(): void } export interface Child extends Parent {}',
    'index.ts':
      'import {Model as Other, Child} from "./z.js"; import {Model as First} from "./a.js"; export interface Uses { value: Other; first: First; callback: (value: Other) => Other } export type Alias = Other | "Other"; export const configured: Other = { second: 1 }; export function run(value: Other): Other { return value; }',
  });
  const converted = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(converted.success, true);
  const uses = converted.entities.find((entity) => entity.name === 'Uses');
  assert.ok(uses instanceof DtoNode);
  assert.match(converted.tmdContent, /value: ZFile.Model/);
  assert.match(converted.tmdContent, /first: Model/);
  const configured = converted.entities.find((entity) => entity.name === 'configured');
  assert.ok(configured instanceof ConstantsNode);
  assert.equal(configured.schema, 'ZFile.Model');
  const run = converted.entities.find((entity) => entity.name === 'run');
  assert.ok(run instanceof FunctionNode);
  assert.equal(run.input, 'ZFile.Model');
  assert.equal(run.output, 'ZFile.Model');
  assert.equal(run.signature, 'run(value: ZFile.Model) => ZFile.Model');
  const child = converted.entities.find((entity) => entity.name === 'Child');
  assert.ok(child instanceof ClassNode, 'rewritten heritage preserves inherited method-bearing classification');
  assert.equal(child.extends, 'ZFile.Parent');
  assert.ok(!converted.warnings.some((warning) => /planning result/.test(warning.message)));
});

it('TM13 A2: aliases and literals with equal spelling do not cross-rewrite', (context) => {
  const analysis = project(context, {
    'index.ts':
      'import {Public as Local} from "test-package/sub"; export interface Public { local: string } export interface Uses { external: Local; local: Public; literal: "Local"; opaque: { Local: Local } }',
    'node_modules/test-package/package.json': JSON.stringify({ name: 'test-package', exports: { './sub': { types: './sub.d.ts' } } }),
    'node_modules/test-package/sub.d.ts': 'declare class Internal { value: string } export {Internal as Public};',
  });
  const converted = new TypeScriptToTypedMindConverter().convert(analysis);
  const dependency = converted.entities.find((entity) => entity instanceof DependencyNode);
  assert.ok(dependency instanceof DependencyNode);
  assert.ok(dependency.exports?.includes('Public'));
  assert.match(converted.tmdContent, new RegExp(`external: ${dependency.name}\\.Public`));
  assert.match(converted.tmdContent, /local: Public/);
  assert.match(converted.tmdContent, /literal: "Local"/);
  assert.ok(converted.warnings.some((warning) => /unsupported syntax/.test(warning.message)));
});

it('TM13 A2: forged and ambiguous source identities cannot borrow emitted names', (context) => {
  const analysis = project(context, {
    'index.ts':
      'export interface Model { a: string } export function nested() { interface Model { b: number } class Holder { value!: Model } return Holder; }',
  });
  const converted = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.ok(converted.errors.some((error) => /Distinct source declarations/.test(error.message)));
  const holder = converted.entities.find((entity) => entity.name === 'Holder');
  assert.ok(holder instanceof ClassNode);
  assert.ok(converted.warnings.some((warning) => /no uniquely emitted declaration/.test(warning.message)));
});
