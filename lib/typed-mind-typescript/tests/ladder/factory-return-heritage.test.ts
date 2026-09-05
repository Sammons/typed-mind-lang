import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { ClassFileNode, ClassNode, printHeritage, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const fixture = (context: TestContext, files: Record<string, string>, preferClassFile = false) => {
  const project = mkdtempSync(join(tmpdir(), 'tm13-heritage-'));
  context.after(() => rmSync(project, { recursive: true, force: true }));
  writeFileSync(join(project, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, module: 'NodeNext' } }));
  for (const [name, source] of Object.entries(files)) writeFileSync(join(project, name), source);
  const analysis = new TypeScriptAnalyzer(project).analyzeFromEntrypoint(join(project, 'main.ts'));
  const converter = new TypeScriptToTypedMindConverter({ preferClassFile });
  return { analysis, converter, converted: converter.convert(analysis) };
};

it('TM13 H: named factory returns use the actual class identity through imported aliases', async (context) => {
  const { analysis, converted } = fixture(context, {
    'base.ts': 'export class Widget {} export const factory = (): typeof Widget => Widget;',
    'main.ts': 'import { factory as renamed } from "./base.js"; export class Derived extends renamed() {}',
  });
  const parsed = analysis.modules.flatMap((module) => module.classes).find((cls) => cls.name === 'Derived');
  const base = analysis.modules.flatMap((module) => module.classes).find((cls) => cls.name === 'Widget');
  assert.deepEqual(parsed?.factoryHeritage?.[0]?.origin, { kind: 'project', declaration: base?.declaration });
  assert.equal(parsed?.extendsTypeInfo?.[0]?.text, 'renamed()');
  assert.equal(parsed?.extends[0], 'renamed', 'legacy source representation is retained separately from resolved heritage');
  const derived = converted.entities.find((entity) => entity.name === 'Derived');
  assert.ok(derived instanceof ClassNode);
  assert.equal(derived.extends, 'Widget');
  const diagnostics = (await TypedMind.create()).check(converted.tmdContent).diagnostics;
  assert.deepEqual(
    diagnostics.filter((finding) => /extends/.test(finding.message)),
    [],
  );
});

it('TM13 H: ClassFile heritage resolves the named return and a forged range cannot borrow it', (context) => {
  const { analysis, converter, converted } = fixture(
    context,
    {
      'base.ts': 'export class Widget {} export function factory(): typeof Widget { return Widget; }',
      'derived.ts': 'import { factory } from "./base.js"; export class Derived extends factory() {}',
      'main.ts': 'import { Derived } from "./derived.js"; export const run = () => new Derived();',
    },
    true,
  );
  const derived = converted.entities.find((entity) => entity.name === 'Derived');
  assert.ok(derived instanceof ClassFileNode);
  assert.equal(derived.extends, 'Widget');
  const modified = {
    ...analysis,
    modules: analysis.modules.map((module) => ({
      ...module,
      classes: module.classes.map((cls) => ({
        ...cls,
        factoryHeritage: cls.factoryHeritage?.map((entry) =>
          entry.origin.kind === 'project'
            ? {
                ...entry,
                origin: { ...entry.origin, declaration: { ...entry.origin.declaration, start: entry.origin.declaration.start + 1 } },
              }
            : entry,
        ),
      })),
    })),
  };
  const rejected = converter.convert(modified);
  const unresolved = rejected.entities.find((entity) => entity.name === 'Derived');
  assert.ok(unresolved instanceof ClassNode || unresolved instanceof ClassFileNode);
  assert.equal(unresolved.extends, undefined);
  assert.equal(unresolved.heritage.extends?.kind, 'opaque');
  assert.equal(unresolved.heritage.extends && printHeritage(unresolved.heritage.extends), 'factory()');
  assert.ok(rejected.warnings.some((warning) => /not uniquely emitted/.test(warning.message)));
});

it('TM13 H: same-file lexical declarations cannot share a returned-class identity', (context) => {
  const { converted } = fixture(context, {
    'main.ts':
      'export class Hidden {} export function factory() { class Hidden {} return Hidden; } export class Derived extends factory() {}',
  });
  const derived = converted.entities.find((entity) => entity.name === 'Derived');
  assert.ok(derived instanceof ClassNode);
  assert.equal(derived.extends, undefined);
  assert.equal(derived.heritage.extends?.kind, 'opaque');
  assert.equal(derived.heritage.extends && printHeritage(derived.heritage.extends), 'factory()');
  assert.ok(converted.warnings.some((warning) => /not uniquely emitted/.test(warning.message)));
});

it('TM13 H: anonymous structural union and missing factory returns retain explicit uncertainty', async (context) => {
  const { analysis, converted } = fixture(context, {
    'main.ts': `
      export class Widget {}
      export class Other {}
      export const anonymous = () => class {};
      export function structural(): new () => { value: string } { throw 0; }
      export function union(): typeof Widget | typeof Other { return Widget; }
      export class A extends anonymous() {}
      export class B extends structural() {}
      export class C extends union() {}
      export class D extends missing() {}
    `,
  });
  const classes = analysis.modules.flatMap((module) => module.classes).filter((cls) => ['A', 'B', 'C', 'D'].includes(cls.name));
  assert.equal(classes.length, 4);
  assert.ok(classes.every((cls) => cls.factoryHeritage?.[0]?.origin.kind === 'unresolved'));
  assert.equal(analysis.diagnostics.filter((diagnostic) => diagnostic.category === 'unresolved-factory-heritage').length, 4);
  const diagnostics = (await TypedMind.create()).check(converted.tmdContent).diagnostics;
  assert.equal(diagnostics.filter((diagnostic) => diagnostic.code === 'checker/unsupported-heritage').length, 4);
  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === 'checker/unknown-base-class'),
    false,
  );
  assert.deepEqual(
    converted.entities
      .filter((entity) => entity instanceof ClassNode)
      .map((entity) => entity.name)
      .sort(),
    ['A', 'B', 'C', 'D', 'Other', 'Widget'],
  );
  assert.ok(
    classes.every((cls) =>
      converted.entities.some(
        (entity) =>
          entity instanceof ClassNode &&
          entity.name === cls.name &&
          entity.extends === undefined &&
          entity.heritage.extends?.kind === 'opaque' &&
          printHeritage(entity.heritage.extends) === cls.extendsTypeInfo?.[0]?.text,
      ),
    ),
  );
});

it('TM13 H: a nested derived class cannot overwrite a same-named outer class', (context) => {
  const { converted } = fixture(context, {
    'main.ts':
      'export class Base {} export const factory = () => Base; export class Derived {} export function nested() { class Derived extends factory() {} return Derived; }',
  });
  const derived = converted.entities.filter((entity) => entity instanceof ClassNode && entity.name === 'Derived');
  assert.equal(derived.length, 2);
  assert.deepEqual(
    derived.map((entity) =>
      entity instanceof ClassNode && entity.heritage.extends !== undefined ? printHeritage(entity.heritage.extends) : undefined,
    ),
    [undefined, 'factory()'],
  );
  assert.ok(converted.warnings.some((warning) => /source 'Derived' was not uniquely emitted/.test(warning.message)));
});
