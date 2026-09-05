import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';

const analyze = (context: TestContext, source: string) => {
  const project = mkdtempSync(join(tmpdir(), 'tm13-default-'));
  context.after(() => rmSync(project, { recursive: true, force: true }));
  writeFileSync(join(project, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, module: 'NodeNext' } }));
  writeFileSync(join(project, 'remote.ts'), 'export const remote = { value: 1 };');
  writeFileSync(join(project, 'main.ts'), source);
  const analysis = new TypeScriptAnalyzer(project).analyzeFromEntrypoint(join(project, 'main.ts'));
  const module = analysis.modules.find((candidate) => candidate.filePath === join(project, 'main.ts'));
  assert.ok(module);
  return { analysis, module };
};

it('TM13 D: identifier default assignments retain exact local declaration identity and kind', (context) => {
  for (const [source, kind] of [
    ['function value() { return 1; } export default value;', 'function'],
    ['const value = () => 1; export default value;', 'function'],
    ['class value {} export default value;', 'class'],
    ['const value = { run() { return 1; } }; export default value;', 'constant'],
    ['export default value; const value = { run() { return 1; } };', 'constant'],
  ]) {
    const { module } = analyze(context, source);
    const declaration = [...module.functions, ...module.classes, ...module.constants].find((candidate) => candidate.name === 'value');
    assert.deepEqual(
      module.exports.filter((exp) => exp.isDefault),
      [
        {
          name: 'value',
          isDefault: true,
          type: kind,
          source: undefined,
          declaration: declaration?.declaration,
        },
      ],
    );
  }
});

it('TM13 D: named and default exposure preserve one canonical source identity', (context) => {
  const { module } = analyze(context, 'export const value = () => 1; export default value;');
  assert.equal(module.functions.length, 1);
  assert.equal(module.exports.length, 2);
  assert.deepEqual(module.exports.find((exp) => exp.isDefault)?.declaration, module.functions[0]?.declaration);
  const direct = analyze(context, 'export default function value() { return 1; }');
  assert.deepEqual(direct.module.exports[0]?.declaration, direct.module.functions[0]?.declaration);
});

it('TM13 D: unresolved imported and nonidentifier defaults do not create local identities', (context) => {
  for (const source of [
    'export default missing;',
    'export default { value: 1 };',
    'import { remote } from "./remote.js"; export default remote;',
  ]) {
    const { analysis, module } = analyze(context, source);
    assert.deepEqual(
      module.exports.filter((exp) => exp.isDefault),
      [],
    );
    assert.equal(analysis.diagnostics.filter((diagnostic) => diagnostic.category === 'unsupported-default-export').length, 1);
  }
});

it('TM13 D: local default and named export clauses retain public names and exact identity', (context) => {
  for (const source of [
    'const value = () => 1; export { value as default, value as renamed };',
    'export { value as renamed }; export { value as default }; const value = () => 1;',
    'const value = () => 1; export { value as renamed }; export default value;',
  ]) {
    const { analysis, module } = analyze(context, source);
    assert.deepEqual(analysis.diagnostics, []);
    assert.equal(module.exports.length, 2);
    assert.deepEqual(module.exports.map((exp) => [exp.name, exp.isDefault, exp.type]).sort(), [
      ['renamed', false, 'function'],
      ['value', true, 'function'],
    ]);
    for (const exp of module.exports) assert.deepEqual(exp.declaration, module.functions[0]?.declaration);
  }
});

it('TM13 D: anonymous and imported clause defaults report unsupported facts without synthetic names', (context) => {
  for (const source of [
    'export default function() { return 1; }',
    'export default class {}',
    'import { remote } from "./remote.js"; export { remote as default };',
  ]) {
    const { analysis, module } = analyze(context, source);
    assert.deepEqual(module.exports, []);
    assert.equal(analysis.diagnostics.filter((diagnostic) => diagnostic.category === 'unsupported-default-export').length, 1);
    assert.equal(
      [...module.functions, ...module.classes].some((item) => item.name === '<anonymous>'),
      false,
    );
  }
});

it('TM13 D: local clauses preserve existing named default declaration flags in either order', (context) => {
  for (const declaration of ['export default function value() { return 1; }', 'export default class value {}']) {
    for (const clause of ['export { value };', 'export { value as renamed };']) {
      for (const source of [`${declaration} ${clause}`, `${clause} ${declaration}`]) {
        const { analysis, module } = analyze(context, source);
        assert.deepEqual(analysis.diagnostics, []);
        const defaults = module.exports.filter((exp) => exp.isDefault);
        assert.equal(defaults.length, 1);
        assert.equal(defaults[0]?.name, 'value');
        assert.deepEqual(defaults[0]?.declaration, [...module.functions, ...module.classes][0]?.declaration);
        assert.equal(module.exports.filter((exp) => !exp.isDefault).length, 1);
      }
    }
  }
});

it('TM13 D/R: unsupported imported default clauses do not erase supported reexports', (context) => {
  const { analysis, module } = analyze(context, 'import { remote } from "./remote.js"; export { remote as default, remote as named };');
  assert.equal(analysis.diagnostics.filter((diagnostic) => diagnostic.category === 'unsupported-default-export').length, 1);
  assert.deepEqual(
    module.exports.map((exp) => [exp.name, exp.source]),
    [['named', './remote.js']],
  );
  const explicit = analyze(context, 'export { remote as default } from "./remote.js";');
  assert.deepEqual(explicit.analysis.diagnostics, []);
  assert.deepEqual(
    explicit.module.exports.map((exp) => [exp.name, exp.source]),
    [['default', './remote.js']],
  );
});
