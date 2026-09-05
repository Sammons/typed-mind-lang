import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
import { ClassFileNode, ClassNode, FileNode, FunctionNode, QualifiedNameResolver, TypedMind } from '@sammons/typed-mind';
import type { ParsedClass, ParsedFunction, ParsedModule, ParsedTypeAlias, TypeScriptProjectAnalysis } from './types.ts';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';

const fn = (name: string, inline = false): ParsedFunction => ({
  name,
  signature: `${name}() => void`,
  parameters: inline ? [{ name: 'input', type: '{ value: string }', isOptional: false, hasDefaultValue: false }] : [],
  returnType: 'void',
  isAsync: false,
  description: undefined,
  decorators: [],
  bodyReferences: [],
});
const cls = (name: string, base?: string, implemented?: string): ParsedClass => ({
  name,
  isAbstract: false,
  extends: base === undefined ? [] : [base],
  implements: implemented === undefined ? [] : [implemented],
  methods: [],
  properties: [],
  decorators: [],
  description: undefined,
});
const alias = (name: string): ParsedTypeAlias => ({ name, type: '{ value: string }', description: undefined });
const module = (file: string, values: Partial<ParsedModule> = {}): ParsedModule => ({
  filePath: `/project/${file}`,
  imports: [],
  exports: [],
  functions: [],
  classes: [],
  interfaces: [],
  types: [],
  constants: [],
  enums: [],
  dynamicImportSpecifiers: [],
  selfInvokedFunctionNames: [],
  hasTopLevelCallbackRegistration: false,
  ...values,
});
const exported = (name: string, type: 'type' | 'class' | 'function') => ({ name, type, isDefault: false, source: undefined });
const analysis = (modules: readonly ParsedModule[], entries: readonly string[] = ['/project/a/main.ts']): TypeScriptProjectAnalysis => ({
  modules,
  entryPoints: entries,
  projectRoot: '/project',
  projectConfig: {},
  diagnostics: [],
  moduleGraph: [],
  sstHandlerReferences: [],
});

const adversarialModules = (): readonly ParsedModule[] => [
  module('a/main.ts', {
    functions: [fn('handler', true)],
    exports: [exported('handler', 'function')],
    imports: [
      { specifier: 'react', namedImports: [], defaultImport: undefined, namespaceImport: undefined, isTypeOnly: false },
      { specifier: 'react2', namedImports: [], defaultImport: undefined, namespaceImport: undefined, isTypeOnly: false },
    ],
  }),
  module('b/main.ts', { functions: [fn('handler')], exports: [exported('handler', 'function')] }),
  module('source.ts', {
    types: ['MainApp', 'AMainFile', 'HandlerInput', 'HandlerInput2', 'React', 'Error', 'TsShape', 'User__Name'].map(alias),
    exports: ['MainApp', 'AMainFile', 'HandlerInput', 'HandlerInput2', 'React', 'Error', 'TsShape', 'User__Name'].map((name) =>
      exported(name, 'type'),
    ),
  }),
  module('failure.ts', { classes: [cls('Failure', 'Error', 'ts.Shape')], exports: [exported('Failure', 'class')] }),
  module('a/widget.ts', { classes: [cls('Widget')], exports: [exported('Widget', 'class')] }),
  module('b/widget.ts', { classes: [cls('Widget')], exports: [exported('Widget', 'class')] }),
  module('a/types.ts', { types: [alias('Config')], exports: [exported('Config', 'type')] }),
  module('b/types.ts', { types: [alias('Config')], exports: [exported('Config', 'type')] }),
];

it('TM13 E: all generated identity lanes are unique and traversal-order stable', () => {
  const modules = adversarialModules();
  const converter = new TypeScriptToTypedMindConverter();
  const first = converter.convert(analysis(modules));
  assert.deepEqual(first.errors, []);
  const second = converter.convert(analysis([...modules].reverse().map((item) => ({ ...item, imports: [...item.imports].reverse() }))));
  assert.deepEqual(second.errors, []);
  assert.deepEqual(
    first.entities.map((entity) => [entity.kind, entity.name]).sort(),
    second.entities.map((entity) => [entity.kind, entity.name]).sort(),
  );
  const names = first.entities.map((entity) => entity.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.includes('MainApp2'));
  assert.ok(names.includes('HandlerInput3'));
  assert.ok(names.includes('React2'));
  assert.ok(names.includes('React22'));
  assert.ok(names.includes('Error2'));
  assert.ok(names.includes('TsShape2'));
  assert.ok(names.includes('BMainFile.handler'));
  assert.ok(first.entities.some((entity) => entity instanceof ClassFileNode && entity.name === 'Failure' && entity.extends === 'Error2'));
  const reset = converter.convert(
    analysis([module('a/main.ts', { functions: [fn('handler')], exports: [exported('handler', 'function')] })]),
  );
  assert.ok(reset.entities.some((entity) => entity.name === 'MainApp'));
});

it('TM13 E: every qualified entity has its emitted owner', async () => {
  const result = new TypeScriptToTypedMindConverter().convert(analysis(adversarialModules()));
  const names = new QualifiedNameResolver(new Map(result.entities.map((entity) => [entity.name, entity])));
  for (const entity of result.entities.filter((entity) => entity.name.includes('.'))) {
    assert.equal(names.resolve(entity.name).kind, 'entity', entity.name);
    const owner = names.target(entity.name.slice(0, entity.name.lastIndexOf('.')));
    assert.ok(owner instanceof FileNode || owner instanceof ClassFileNode, entity.name);
  }
  assert.ok(result.entities.some((entity) => entity instanceof ClassFileNode && entity.name === 'Widget'));
  assert.ok(result.entities.some((entity) => entity instanceof ClassNode && entity.name === 'WidgetFile.Widget'));
  assert.ok(result.entities.some((entity) => entity instanceof FileNode && entity.name === 'TypesFile'));
  const language = await TypedMind.create();
  assert.deepEqual(language.parseWithCst(result.tmdContent).diagnostics, []);
});

it('TM13 E: generated double underscores are retired without changing user names', () => {
  const result = new TypeScriptToTypedMindConverter().convert(analysis(adversarialModules()));
  assert.deepEqual(
    result.entities.filter((entity) => entity.name.includes('__')).map((entity) => entity.name),
    ['User__Name'],
  );
  assert.ok(result.entities.some((entity) => entity instanceof FunctionNode && entity.name === 'BMainFile.handler'));
});

it('TM13 E: a real owned-member use consumes its file while unused private members stay orphaned', async () => {
  const language = await TypedMind.create();
  const source =
    'File @ file.ts:\nFile.Private %\nFile.Unused %\nUnusedFile @ unused.ts:\nUnusedFile.Private %\nConsumer %\n  - value: File.Private\n';
  const result = language.check(source);
  assert.equal(
    result.diagnostics.some((error) => error.message.includes("Orphaned file 'File'")),
    false,
  );
  assert.ok(result.diagnostics.some((error) => error.message.includes("Orphaned file 'UnusedFile'")));
  assert.ok(result.diagnostics.some((error) => error.message === "Orphaned entity 'File.Unused'"));
  assert.ok(result.diagnostics.some((error) => error.message === "Orphaned entity 'UnusedFile.Private'"));
  const withoutUse = language.check(source.replace('  - value: File.Private\n', ''));
  assert.ok(withoutUse.diagnostics.some((error) => error.message.includes("Orphaned file 'File'")));
});

it('TM13 E: private collision owners do not fabricate exports', () => {
  const result = new TypeScriptToTypedMindConverter({ generatePrograms: false }).convert(
    analysis([module('a/private.ts', { classes: [cls('Hidden')] }), module('b/private.ts', { classes: [cls('Hidden')] })], []),
  );
  assert.deepEqual(result.errors, []);
  const owner = result.entities.find((entity) => entity.name === 'BPrivateFile');
  assert.ok(owner instanceof FileNode);
  assert.deepEqual(owner.exports, []);
  const names = new QualifiedNameResolver(new Map(result.entities.map((entity) => [entity.name, entity])));
  assert.equal(names.resolve('BPrivateFile.Hidden').kind, 'entity');
  const imported = names.resolve('BPrivateFile.Hidden', { importingFile: 'Other' });
  assert.equal(imported.kind, 'unresolved');
  if (imported.kind === 'unresolved') assert.equal(imported.reason, 'private-member');
});

it('TM13 E: lossy and numeric paths still produce valid distinct generated names', async () => {
  const modules = ['1/123.ts', 'one-two/main.ts', 'one_two/main.ts'].map((file) =>
    module(file, { functions: [fn('run')], exports: [exported('run', 'function')] }),
  );
  const result = new TypeScriptToTypedMindConverter().convert(analysis(modules, ['/project/1/123.ts']));
  assert.deepEqual(result.errors, []);
  assert.equal(new Set(result.entities.map((entity) => entity.name)).size, result.entities.length);
  const language = await TypedMind.create();
  assert.deepEqual(language.parseWithCst(result.tmdContent).diagnostics, []);
});

it('TM13 E: namespace import stubs share source reservations and import their actual identity', () => {
  const modules = [
    module('a/main.ts', {
      imports: [{ specifier: './dep', namedImports: [], defaultImport: undefined, namespaceImport: 'Ns', isTypeOnly: false }],
    }),
    module('source.ts', { types: [alias('Ns')], exports: [exported('Ns', 'type')] }),
    module('a/dep.ts', { functions: [fn('run')], exports: [exported('run', 'function')] }),
  ];
  const result = new TypeScriptToTypedMindConverter().convert(analysis(modules));
  assert.deepEqual(result.errors, []);
  assert.ok(result.entities.some((entity) => entity instanceof ClassNode && entity.name === 'Ns2'));
  const owner = result.entities.find((entity) => entity instanceof FileNode && entity.path === 'a/main.ts');
  assert.ok(owner instanceof FileNode);
  assert.ok(owner.imports.includes('Ns2'));
  assert.equal(owner.imports.includes('Ns'), false);
});

it('TM13 E: distinct lexical declarations cannot silently share one source allocation key', () => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-e-identity-'));
  try {
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'esnext', module: 'esnext' }, include: ['index.ts'] }),
    );
    writeFileSync(join(root, 'index.ts'), 'export class Hidden {}\nexport function factory() { class Hidden {} return Hidden; }\n');
    const source = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'index.ts'));
    const declarations = source.modules.flatMap((item) => item.classes.filter((item) => item.name === 'Hidden'));
    assert.equal(declarations.length, 2);
    assert.notDeepEqual(declarations[0]?.declaration, declarations[1]?.declaration);
    const result = new TypeScriptToTypedMindConverter().convert(source);
    assert.equal(result.errors.filter((error) => error.message.includes("Distinct source declarations named 'Hidden'")).length, 1);

    // Canonical overload identities are one declaration identity, not a
    // lexical collision. Existing overload emission policy is unchanged.
    writeFileSync(
      join(root, 'index.ts'),
      'export function go(x: string): void;\nexport function go(x: number): void;\nexport function go(x: unknown): void {}\n',
    );
    const overloaded = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'index.ts'));
    const identities = overloaded.modules.flatMap((item) => item.functions.map((item) => item.declaration));
    assert.equal(identities.length, 3);
    assert.deepEqual(identities, [identities[0], identities[0], identities[0]]);
    assert.equal(
      new TypeScriptToTypedMindConverter()
        .convert(overloaded)
        .errors.some((error) => error.message.includes('Distinct source declarations')),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
