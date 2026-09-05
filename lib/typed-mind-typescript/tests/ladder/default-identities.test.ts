import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { ClassFileNode, ClassNode, ConstantsNode, FileNode, FunctionNode, ProgramNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const fixture = (context: TestContext, source: string, overrides: Record<string, string> = {}) => {
  const project = mkdtempSync(join(tmpdir(), 'tm13-default-identities-'));
  context.after(() => rmSync(project, { recursive: true, force: true }));
  writeFileSync(join(project, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, module: 'NodeNext' } }));
  writeFileSync(join(project, 'value.ts'), source);
  writeFileSync(join(project, 'other.ts'), 'import another from "./value.js"; export const other = { value: another };');
  writeFileSync(
    join(project, 'main.ts'),
    'import alias, { value as named } from "./value.js"; import { other } from "./other.js"; export function main() { return [alias, named, other]; }',
  );
  for (const [name, content] of Object.entries(overrides)) writeFileSync(join(project, name), content);
  const analysis = new TypeScriptAnalyzer(project).analyzeFromEntrypoint(join(project, 'main.ts'));
  return { analysis, converted: new TypeScriptToTypedMindConverter().convert(analysis) };
};

it('TM13 D: default identifier aliases resolve one declaration across importers', async (context) => {
  for (const source of [
    'export const value = { read() { return 1; } }; export default value;',
    'export const value = () => 1; export default value;',
    'export function value() { return 1; } export default value;',
    'export class value {} export default value;',
  ]) {
    const { converted } = fixture(context, source);
    assert.equal(converted.success, true);
    const defaults = converted.entities.filter((entity) => entity.name.endsWith('.default'));
    assert.equal(defaults.length, 1);
    const target = defaults[0];
    assert.ok(target instanceof ConstantsNode || target instanceof FunctionNode || target instanceof ClassNode);
    assert.equal(target.name, 'ValueFile.default');
    const owner = converted.entities.find((entity) => entity.name === 'ValueFile');
    assert.ok(owner instanceof FileNode);
    assert.deepEqual(owner.exports, ['ValueFile.default']);
    const main = converted.entities.find((entity) => entity instanceof FileNode && entity.path === 'main.ts');
    assert.ok(main instanceof FileNode);
    assert.ok(main.imports.includes('ValueFile.default'));
    assert.equal(
      converted.entities.some((entity) => entity.name === 'value'),
      false,
    );
    assert.equal(
      converted.entities.some((entity) => entity instanceof ClassFileNode && entity.name === 'ValueFile.default'),
      false,
    );
    const findings = (await TypedMind.create()).check(converted.tmdContent).diagnostics;
    assert.deepEqual(
      findings.filter((finding) => /qualified|multi-exported|unknown/.test(finding.code)),
      [],
    );
  }
});

it('TM13 D: gap 88 closes file and initializer-call orphans through real references', async () => {
  const project = join(import.meta.dirname, 'repros-analyzer', '88-export-assignment-default');
  const analysis = new TypeScriptAnalyzer(project).analyzeFromEntrypoint(join(project, 'src', 'index.ts'));
  const converted = new TypeScriptToTypedMindConverter().convert(analysis);
  const app = converted.entities.find((entity) => entity.name === 'HealthFile.default');
  assert.ok(app instanceof ConstantsNode);
  assert.deepEqual(app.calls, ['buildHealthStatus']);
  const mind = await TypedMind.create();
  assert.deepEqual(mind.check(converted.tmdContent).diagnostics, []);
  const removed = converted.tmdContent.replace('  ~> [buildHealthStatus]', '');
  assert.ok(mind.check(removed).diagnostics.some((finding) => finding.message === "Orphaned entity 'buildHealthStatus'"));
  const noImport = converted.tmdContent.replace('[HealthFile.default, namedHelper]', '[namedHelper]');
  assert.notEqual(noImport, converted.tmdContent);
  assert.deepEqual(
    mind
      .check(noImport)
      .diagnostics.map((finding) => finding.message)
      .sort(),
    ["Orphaned entity 'HealthFile.default'", "Orphaned file 'HealthFile' - none of its exports are imported"],
  );
});

it('TM13 D: same-named defaults in separate files remain distinct and traversal stable', async (context) => {
  const { analysis, converted } = fixture(context, 'const app = { value: 1 }; export default app;', {
    'other.ts': 'const app = { value: 2 }; export default app;',
    'main.ts': 'import left from "./value.js"; import right from "./other.js"; export function main() { return [left, right]; }',
  });
  assert.deepEqual(
    converted.entities
      .filter((entity) => entity.name.endsWith('.default'))
      .map((entity) => entity.name)
      .sort(),
    ['OtherFile.default', 'ValueFile.default'],
  );
  const reversed = new TypeScriptToTypedMindConverter().convert({ ...analysis, modules: [...analysis.modules].reverse() });
  assert.equal(reversed.tmdContent, converted.tmdContent);
  assert.deepEqual((await TypedMind.create()).check(converted.tmdContent).diagnostics, []);
});

it('TM13 D: source declarations reserve their name before a default owner is generated', (context) => {
  const { converted } = fixture(context, 'export const value = { value: 1 }; export const ValueFile = 1; export default value;');
  assert.ok(converted.entities.some((entity) => entity instanceof ConstantsNode && entity.name === 'ValueFile'));
  const owner = converted.entities.find((entity) => entity instanceof FileNode && entity.path === 'value.ts');
  assert.ok(owner instanceof FileNode);
  assert.notEqual(owner.name, 'ValueFile');
  assert.ok(converted.entities.some((entity) => entity.name === `${owner.name}.default`));
});

it('TM13 D: local public aliases and default clauses converge across named and default imports', async (context) => {
  for (const declaration of [
    'const value = () => 1; const renamed = 9;',
    'function value() { return 1; }',
    'class value {}',
    'const value = { read() { return 1; } };',
  ]) {
    for (const exports of ['export { value as default, value as renamed };', 'export { value as renamed }; export default value;']) {
      const { converted } = fixture(context, `${declaration} ${exports}`, {
        'other.ts': 'import { renamed as another } from "./value.js"; export function other() { return another; }',
        'main.ts':
          'import alias, { renamed as named } from "./value.js"; import { other } from "./other.js"; export function main() { return [alias, named, other]; }',
      });
      assert.equal(converted.success, true);
      const owner = converted.entities.find((entity) => entity instanceof FileNode && entity.path === 'value.ts');
      assert.ok(owner instanceof FileNode);
      assert.deepEqual(owner.exports, ['ValueFile.default']);
      assert.equal(converted.entities.filter((entity) => entity.name === 'ValueFile.default').length, 1);
      assert.equal(
        converted.entities.some((entity) => entity.name === 'renamed'),
        false,
      );
      for (const path of ['main.ts', 'other.ts']) {
        const importer = converted.entities.find((entity) => entity instanceof FileNode && entity.path === path);
        assert.ok(importer instanceof FileNode);
        assert.equal(importer.imports.filter((name) => name === 'ValueFile.default').length, 1);
        assert.equal(importer.imports.includes('renamed'), false);
      }
      assert.deepEqual((await TypedMind.create()).check(converted.tmdContent).diagnostics, []);
    }
  }
});

it('TM13 D: anonymous defaults stay explicitly unsupported without malformed output identities', async (context) => {
  for (const source of ['export default function() { return 1; }', 'export default class {}']) {
    const { analysis, converted } = fixture(context, source, {
      'main.ts': 'import alias from "./value.js"; export function main() { return alias; }',
    });
    assert.equal(analysis.diagnostics.filter((diagnostic) => diagnostic.category === 'unsupported-default-export').length, 1);
    assert.equal(
      converted.entities.some((entity) => entity.name.includes('<anonymous>') || entity.name.endsWith('.default')),
      false,
    );
    assert.deepEqual(
      (await TypedMind.create()).check(converted.tmdContent).diagnostics.filter((finding) => finding.code === 'syntax/error'),
      [],
    );
  }
});

it('TM13 D: local named aliases alone retain the source declaration and canonical program export', async (context) => {
  for (const declaration of ['const value = () => 1;', 'function value() { return 1; }', 'class value {}', 'const value = 1;']) {
    const { analysis } = fixture(context, `${declaration} export { value as renamed };`, {
      'main.ts': 'import { renamed } from "./value.js"; export function main() { return renamed; }',
    });
    const converted = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(converted.success, true);
    const main = converted.entities.find((entity) => entity instanceof FileNode && entity.path === 'main.ts');
    assert.ok(main instanceof FileNode);
    assert.deepEqual(main.imports, ['value']);
    assert.equal(converted.entities.filter((entity) => entity.name === 'value').length, 1);
    assert.deepEqual(
      (await TypedMind.create())
        .check(converted.tmdContent)
        .diagnostics.filter((finding) => /unknown|qualified|multi-exported|syntax/.test(finding.code)),
      [],
    );
  }
  const { analysis } = fixture(context, 'const value = () => 1; export { value as renamed }; export default value;');
  const valueModule = analysis.modules.find((module) => module.filePath.endsWith('/value.ts'));
  assert.ok(valueModule);
  const converted = new TypeScriptToTypedMindConverter().convert({ ...analysis, entryPoints: [valueModule.filePath] });
  const program = converted.entities.find((entity) => entity instanceof ProgramNode);
  assert.ok(program instanceof ProgramNode);
  assert.deepEqual(program.exports, ['ValueFile.default']);
});
