import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { ClassFileNode, ClassNode, ConstantsNode, FileNode, FunctionNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const fixture = (context: TestContext, source: string) => {
  const project = mkdtempSync(join(tmpdir(), 'tm13-default-identities-'));
  context.after(() => rmSync(project, { recursive: true, force: true }));
  writeFileSync(join(project, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, module: 'NodeNext' } }));
  writeFileSync(join(project, 'value.ts'), source);
  writeFileSync(join(project, 'other.ts'), 'import another from "./value.js"; export const other = { value: another };');
  writeFileSync(
    join(project, 'main.ts'),
    'import alias, { value as named } from "./value.js"; import { other } from "./other.js"; export function main() { return [alias, named, other]; }',
  );
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
});
