import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';

const analyze = (context: TestContext, files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-a2-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries({
    'tsconfig.json': JSON.stringify({
      compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', moduleDetection: 'legacy', strict: true },
      include: ['*.ts'],
    }),
    ...files,
  })) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), content);
  }
  return new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'index.ts'));
};

it('TM13 A2: project type references follow actual source modules without fabricated import edges', (context) => {
  const analysis = analyze(context, {
    'index.ts': 'export interface Uses { model: GlobalModel; again: GlobalModel; external: AmbientRecordUnique; missing: Missing }',
    'global.ts': 'interface GlobalModel { dependency: OtherModel }',
    'other.ts': 'interface OtherModel { cycle: GlobalModel }',
    'ambient.d.ts': 'interface AmbientRecordUnique { value: string }',
  });
  assert.deepEqual(analysis.modules.map((module) => basename(module.filePath)).sort(), ['global.ts', 'index.ts', 'other.ts']);
  assert.deepEqual(analysis.moduleGraph, []);
  assert.equal(analysis.diagnostics.filter((diagnostic) => diagnostic.category === 'unrepresented-type-source').length, 1);
});

it('TM13 A2: external occurrences retain public aliases defaults namespace members and subpath bindings', (context) => {
  const analysis = analyze(context, {
    'index.ts':
      'import DefaultThing, {Public as Renamed} from "test-package/sub"; import * as pkg from "test-package/sub"; export interface Uses { a: Renamed; b: DefaultThing; c: pkg.Public; d: import("test-package/sub").Public }',
    'node_modules/test-package/package.json': JSON.stringify({ name: 'test-package', exports: { './sub': { types: './sub.d.ts' } } }),
    'node_modules/test-package/sub.d.ts':
      'declare class Internal { value: string } export {Internal as Public}; export default class PrivateDefault {}',
  });
  const fields = analysis.modules[0]?.interfaces[0]?.properties ?? [];
  assert.deepEqual(
    fields.map((property) => property.typeInfo?.references[0]?.externalBinding),
    [
      { specifier: 'test-package/sub', exportName: 'Public' },
      { specifier: 'test-package/sub', exportName: 'default' },
      { specifier: 'test-package/sub', exportName: 'Public' },
      { specifier: 'test-package/sub', exportName: 'Public' },
    ],
  );
  assert.equal(analysis.modules.length, 1);
});
