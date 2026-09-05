import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { ConstantsNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const fixture = (context: TestContext, source: string) => {
  const project = mkdtempSync(join(tmpdir(), 'tm13-initializers-'));
  context.after(() => rmSync(project, { recursive: true, force: true }));
  writeFileSync(
    join(project, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: true, module: 'NodeNext', moduleResolution: 'NodeNext' } }),
  );
  writeFileSync(join(project, 'helpers.ts'), 'export function imported(): string { return "imported"; }');
  writeFileSync(join(project, 'callbacks.ts'), source);
  writeFileSync(join(project, 'main.ts'), 'import { app } from "./callbacks.js"; export function main() { return app; }');
  const analysis = new TypeScriptAnalyzer(project).analyzeFromEntrypoint(join(project, 'main.ts'));
  return { project, analysis, converted: new TypeScriptToTypedMindConverter({ preferClassFile: false }).convert(analysis) };
};

const callbacks = `
import { imported as alias } from './helpers.js';
export function used(): string { return 'used'; }
export function shadowed(): string { return 'global'; }
export function unused(): string { return 'unused'; }
export class Constructed {}
export const app = {
  run() { used(); used(); alias(); return new Constructed(); },
  callback: function namedCallback() { return used(); },
  shadow(shadowed: () => string) { return shadowed(); },
  indirect(receiver: { unused(): string }) { return receiver.unused(); },
  nested() { function separate() { unused(); } return separate; }
};
`;

it('TM13 F: constant initializer call references are recorded without guessed dispatch', async (context) => {
  const { analysis, converted } = fixture(context, callbacks);
  assert.equal(converted.success, true);
  const app = converted.entities.find((entity) => entity.name === 'app');
  assert.ok(app instanceof ConstantsNode);
  assert.deepEqual(app.calls, ['Constructed', 'imported', 'used']);
  const references = analysis.modules.flatMap((module) => module.constants).find((constant) => constant.name === 'app')?.callReferences;
  assert.ok(references);
  assert.equal(
    references.some(
      (reference) =>
        reference.writtenName === 'alias' && reference.origin.kind === 'project' && reference.origin.declaration.name === 'imported',
    ),
    true,
  );
  assert.equal(references.filter((reference) => reference.writtenName === 'shadowed').length, 1);
  assert.equal(
    references.some((reference) => reference.writtenName === 'unused'),
    false,
  );
  const checked = (await TypedMind.create()).check(converted.tmdContent);
  const orphans = checked.diagnostics.filter((finding) => finding.code === 'checker/orphaned-entity').map((finding) => finding.message);
  assert.equal(orphans.includes("Orphaned entity 'used'"), false);
  assert.equal(orphans.includes("Orphaned entity 'Constructed'"), false);
  assert.equal(orphans.includes("Orphaned entity 'unused'"), true);
  assert.equal(orphans.includes("Orphaned entity 'shadowed'"), true);
});

it('TM13 F: unresolved calls and source labels cannot borrow exported function identities', (context) => {
  const { converted } = fixture(context, `${callbacks}\nexport const other = { absent() { missing(); }, label: 'unused' };`);
  const other = converted.entities.find((entity) => entity.name === 'other');
  assert.ok(other instanceof ConstantsNode);
  assert.deepEqual(other.calls, []);
});

it('TM13 F: same-file lexical declarations do not collapse into one callable identity', (context) => {
  const { converted } = fixture(
    context,
    `
    export function helper() { return 'outer'; }
    export function factory() { function helper() { return 'inner'; } return helper(); }
    export const app = { run() { return helper(); } };
  `,
  );
  const app = converted.entities.find((entity) => entity.name === 'app');
  assert.ok(app instanceof ConstantsNode);
  assert.deepEqual(app.calls, []);
});

it('TM13 F: registration callbacks count real helper calls without crediting private constructors', (context) => {
  const { converted } = fixture(
    context,
    `
    class Command { action(callback: () => string) { return this; } }
    export function runBackfill(): string { return 'done'; }
    export const app = new Command().action(function handler() { return runBackfill(); });
  `,
  );
  const app = converted.entities.find((entity) => entity.name === 'app');
  assert.ok(app instanceof ConstantsNode);
  assert.deepEqual(app.calls, ['runBackfill']);
});

it('TM13 F: fixture 88 retains initializer origin before default identity is emitted', () => {
  const project = join(import.meta.dirname, 'repros-analyzer', '88-export-assignment-default');
  const analysis = new TypeScriptAnalyzer(project).analyzeFromEntrypoint(join(project, 'src', 'index.ts'));
  const app = analysis.modules.flatMap((module) => module.constants).find((constant) => constant.name === 'app');
  assert.ok(app);
  const helper = app.callReferences?.find((reference) => reference.writtenName === 'buildHealthStatus');
  assert.equal(helper?.origin.kind, 'project');
  if (helper?.origin.kind === 'project') {
    assert.equal(helper.origin.declaration.name, 'buildHealthStatus');
    assert.equal(helper.origin.declaration.filePath, join(project, 'src', 'routes', 'health.ts'));
  }
});
