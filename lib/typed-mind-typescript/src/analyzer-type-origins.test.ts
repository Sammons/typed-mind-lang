import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { it } from 'node:test';
import type { ParsedTypeText, TypeScriptProjectAnalysis } from './types.ts';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';

const required = <T>(value: T | undefined): T => {
  assert.notEqual(value, undefined);
  return value as T;
};

it('TM13 A1: every retained type slot and generic owner preserves occurrence metadata', () => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-a1-slots-'));
  try {
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'esnext', module: 'esnext' }, include: ['index.ts'] }),
    );
    writeFileSync(
      join(root, 'index.ts'),
      `export interface Model { value: string }
export interface Contract<out T extends Model = Model> { prop: T; method<U extends Model = Model>(value: U): Model }
export interface Child<T extends Model> extends Contract<T> {}
export class Box<const T extends Model = Model> implements Contract<T> {
 prop: T;
 method<U extends Model = Model>(value: U): Model { return value; }
 arrow = <V extends Model>(value: V): Model => value;
 get current(): Model { return this.prop; }
 set current(value: Model) {}
}
export class Derived<T extends Model> extends Box<T> {}
export type Alias<in T extends Model = Model> = (value: T) => Model;
export function go<const T extends Model = Model>(value: T): Model { return value; }
export const arrow = <T extends Model>(value: T): Model => value;
export const setting: Model = { value: '' };
export enum Color { Red }
`,
    );
    const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'index.ts'));
    const module = required(analysis.modules.find((candidate) => candidate.filePath === join(root, 'index.ts')));
    for (const declaration of [
      ...module.interfaces,
      ...module.classes,
      ...module.types,
      ...module.functions,
      ...module.constants,
      ...module.enums,
    ]) {
      assert.equal(declaration.declaration?.name, declaration.name);
      assert.equal(declaration.declaration?.filePath, join(root, 'index.ts'));
    }
    const check = (info: ParsedTypeText | undefined, text: string, names: readonly string[]) => {
      assert.equal(info?.text, text);
      assert.deepEqual(
        info?.references.map((reference) => reference.writtenName),
        names,
      );
      for (const reference of info?.references ?? []) {
        assert.equal(info?.text.slice(reference.start, reference.end), reference.writtenName);
        assert.notEqual(reference.origin.kind, 'unresolved');
      }
    };
    const box = required(module.classes.find((candidate) => candidate.name === 'Box'));
    check(box.implementsTypeInfo?.[0], 'Contract<T>', ['Contract', 'T']);
    check(box.properties[0]?.typeInfo, 'T', ['T']);
    check(module.classes.find((candidate) => candidate.name === 'Derived')?.extendsTypeInfo?.[0], 'Box<T>', ['Box', 'T']);
    check(module.interfaces.find((candidate) => candidate.name === 'Child')?.extendsTypeInfo?.[0], 'Contract<T>', ['Contract', 'T']);
    const owners = [...module.functions, ...module.classes, ...module.interfaces, ...module.types, ...box.methods];
    for (const owner of owners) {
      assert.ok(owner.typeParameters !== undefined, owner.name);
      for (const parameter of owner.typeParameters) {
        assert.equal(
          readFileSync(parameter.declaration.filePath, 'utf8').slice(parameter.declaration.start, parameter.declaration.end),
          parameter.text,
        );
        if (parameter.constraint) check(parameter.constraint, 'Model', ['Model']);
        if (parameter.defaultType) check(parameter.defaultType, 'Model', ['Model']);
      }
    }
    assert.equal(box.typeParameters?.[0]?.text, 'const T extends Model = Model');
    assert.equal(
      module.interfaces.find((candidate) => candidate.name === 'Contract')?.typeParameters?.[0]?.text,
      'out T extends Model = Model',
    );
    assert.equal(module.types[0]?.typeParameters?.[0]?.text, 'in T extends Model = Model');
    for (const method of box.methods) {
      check(method.returnTypeInfo, 'Model', ['Model']);
      assert.ok(method.parameters.every((parameter) => parameter.typeInfo !== undefined));
    }
    check(module.types[0]?.typeInfo, '(value: T) => Model', ['T', 'Model']);
    check(module.constants[0]?.typeInfo, 'Model', ['Model']);
    for (const fn of module.functions) {
      check(fn.parameters[0]?.typeInfo, 'T', ['T']);
      check(fn.returnTypeInfo, 'Model', ['Model']);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it('TM13 A1: referenced package declarations map to real source positions', () => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-a1-project-'));
  try {
    const fixture = resolve(import.meta.dirname, '../tests/ladder/repros-analyzer/81-crosspkg-type-only-dto-field');
    cpSync(fixture, root, { recursive: true, filter: (source) => basename(source) !== 'node_modules' });
    const cli = join(root, 'packages/cli');
    mkdirSync(join(cli, 'node_modules/@fixture'), { recursive: true });
    symlinkSync(join(root, 'packages/core'), join(cli, 'node_modules/@fixture/core'), 'dir');
    const coreSourcePath = join(root, 'packages/core/src/index.ts');
    const coreSource = `${readFileSync(coreSourcePath, 'utf8')}\nexport function lookup(value: string): string;
export function lookup(value: number): number;
export function lookup(value: string | number): string | number { return value; }
export interface NestedModel { topLevel: true }
export namespace Namespace { export interface NestedModel { nested: true } }\n`;
    writeFileSync(coreSourcePath, coreSource);
    const declarationPath = join(root, 'packages/core/dist/index.d.ts');
    writeFileSync(
      declarationPath,
      `${readFileSync(declarationPath, 'utf8')}\nexport declare function lookup(value: string): string;\nexport declare function lookup(value: number): number;\nexport interface NestedModel { topLevel: true }\nexport declare namespace Namespace { interface NestedModel { nested: true } }\n`,
    );
    const entryPath = join(cli, 'src/index.ts');
    writeFileSync(
      entryPath,
      `${readFileSync(entryPath, 'utf8')}\nimport { lookup, Namespace } from '@fixture/core';\nexport type LookupType = typeof lookup;\nexport type Nested = Namespace.NestedModel;\n`,
    );
    const analysis = new TypeScriptAnalyzer(cli).analyzeFromEntrypoint(join(cli, 'src/index.ts'));
    const module = required(analysis.modules.find((candidate) => candidate.filePath === join(cli, 'src/index.ts')));
    const origin = module.interfaces.find((candidate) => candidate.name === 'CliOptions')?.properties[0]?.typeInfo?.references[0]?.origin;
    assert.equal(origin?.kind, 'project', JSON.stringify(origin));
    if (origin?.kind === 'project') {
      assert.equal(origin.declaration.filePath, join(root, 'packages/core/src/index.ts'));
      assert.equal(origin.declaration.name, 'OutputFormat');
      assert.equal(
        readFileSync(origin.declaration.filePath, 'utf8').slice(origin.declaration.start, origin.declaration.end),
        "export type OutputFormat = 'json' | 'yaml' | 'text';",
      );
    }
    const overload = module.types.find((candidate) => candidate.name === 'LookupType')?.typeInfo?.references[0]?.origin;
    assert.equal(overload?.kind, 'project', JSON.stringify(overload));
    if (overload?.kind === 'project') {
      assert.equal(overload.declaration.filePath, coreSourcePath);
      assert.equal(overload.declaration.start, coreSource.indexOf('export function lookup'));
      assert.equal(
        coreSource.slice(overload.declaration.start, overload.declaration.end),
        'export function lookup(value: string): string;',
      );
    }
    const nested = module.types.find((candidate) => candidate.name === 'Nested')?.typeInfo?.references[0]?.origin;
    assert.deepEqual(
      nested,
      { kind: 'unresolved', reason: 'ambiguous-declaration' },
      'nested emitted declarations cannot borrow equal-spelling top-level source identity',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it('TM13 A1: origin-only extraction is byte-identical', () => {
  // Captured with the unmodified analyzer from 8559841, before A1. These
  // fixtures had no complete checked-in output snapshots in the main suite.
  const baseline = JSON.parse(readFileSync(join(import.meta.dirname, 'goldens/type-origins/baseline-8559841.json'), 'utf8'));
  const fixtures = [
    ['77-same-name-interface-two-files', 'main.ts'],
    ['96-same-name-type-alias-two-files', 'index.ts'],
    ['83-generic-base-external-stub', 'index.ts'],
    ['84-function-io-generic-orphan', 'index.ts'],
    ['85-classfile-method-signature-types', 'server.ts'],
    ['68-generic-type-parameters', 'index.ts'],
    ['95-generic-function-type-parameter', 'index.ts'],
  ] as const;
  const metadata = new Set(['declaration', 'typeInfo', 'returnTypeInfo', 'extendsTypeInfo', 'implementsTypeInfo', 'typeParameters']);
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !metadata.has(key))
          .map(([key, child]) => [key, strip(child)]),
      );
    return value;
  };
  for (const [name, entry] of fixtures) {
    const root = resolve(import.meta.dirname, '../tests/ladder/repros-analyzer', name);
    const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'src', entry));
    assert.deepEqual(
      JSON.parse(
        JSON.stringify({
          tmdContent: new TypeScriptToTypedMindConverter().convert(analysis).tmdContent,
          moduleGraph: analysis.moduleGraph,
          diagnostics: analysis.diagnostics.map((diagnostic) => ({
            ...diagnostic,
            message: diagnostic.message.replaceAll(root, '<fixture>'),
            filePath: diagnostic.filePath === undefined ? undefined : relative(root, diagnostic.filePath),
          })),
        }),
      ),
      baseline[name],
    );
    const stripped = strip(analysis) as TypeScriptProjectAnalysis;
    assert.deepEqual(new TypeScriptToTypedMindConverter().convert(analysis), new TypeScriptToTypedMindConverter().convert(stripped), name);
    assert.deepEqual(analysis.moduleGraph, stripped.moduleGraph);
    assert.deepEqual(analysis.diagnostics, stripped.diagnostics);
  }
});
