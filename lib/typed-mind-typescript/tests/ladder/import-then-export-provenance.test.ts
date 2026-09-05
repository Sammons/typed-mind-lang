import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { FileNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const fixture = (context: TestContext, barrel: string) => {
  const project = mkdtempSync(join(tmpdir(), 'tm13-reexport-'));
  context.after(() => rmSync(project, { recursive: true, force: true }));
  writeFileSync(
    join(project, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: true, module: 'NodeNext', moduleResolution: 'NodeNext' } }),
  );
  writeFileSync(
    join(project, 'original.ts'),
    'export interface FormatDetectionResult { format: string }\nexport function detectFormat(): FormatDetectionResult { return { format: "shortform" }; }\n',
  );
  writeFileSync(join(project, 'barrel.ts'), `${barrel}\nfunction localHelper(): string { return "local"; }\n`);
  writeFileSync(
    join(project, 'main.ts'),
    'import { detectFormat, localHelper, type FormatDetectionResult } from "./barrel.js";\nexport function main(): FormatDetectionResult { localHelper(); return detectFormat(); }\n',
  );
  return { project, analysis: new TypeScriptAnalyzer(project).analyzeFromEntrypoint(join(project, 'main.ts')) };
};

for (const [name, barrel] of [
  [
    'separate value and type exports',
    'export { localHelper };\nimport { detectFormat, type FormatDetectionResult } from "./original.js";\nexport { detectFormat };\nexport type { FormatDetectionResult };',
  ],
  [
    'aliased imports exported with their declaring names',
    'export { localHelper };\nimport { detectFormat as localDetect, type FormatDetectionResult as LocalResult } from "./original.js";\nexport { localDetect as detectFormat };\nexport type { LocalResult as FormatDetectionResult };',
  ],
  [
    'export before import and mixed local/imported list',
    'export { detectFormat, FormatDetectionResult, localHelper };\nimport { detectFormat, type FormatDetectionResult } from "./original.js";',
  ],
] as const) {
  it(`TM13 R: ${name} retains declaration ownership and actual references`, async (context) => {
    const { project, analysis } = fixture(context, barrel);
    const module = analysis.modules.find((entry) => entry.filePath === join(project, 'barrel.ts'));
    assert.ok(module);
    for (const name of ['detectFormat', 'FormatDetectionResult']) {
      assert.equal(module.exports.find((entry) => entry.name === name)?.source, './original.js');
    }
    assert.ok(module.exports.filter((entry) => entry.name === 'localHelper').every((entry) => entry.source === undefined));
    const converted = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(converted.success, true);
    const files = converted.entities.filter((entity) => entity instanceof FileNode);
    const original = files.find((entity) => entity.path.endsWith('original.ts'));
    const forwarding = files.find((entity) => entity.path.endsWith('barrel.ts'));
    const consumer = files.find((entity) => entity.path.endsWith('main.ts'));
    assert.deepEqual(original?.exports?.toSorted(), ['FormatDetectionResult', 'detectFormat']);
    assert.deepEqual(forwarding?.exports, ['localHelper']);
    assert.deepEqual(forwarding?.reExports?.toSorted(), ['FormatDetectionResult', 'detectFormat']);
    assert.ok(consumer?.imports.includes('detectFormat'));
    assert.ok(consumer?.imports.includes('FormatDetectionResult'));
    const checked = (await TypedMind.create()).check(converted.tmdContent);
    assert.deepEqual(checked.diagnostics, [], converted.tmdContent);
    assert.equal(checked.valid, true);
  });
}

it('TM13 R: unresolved external named bindings retain provenance without inventing local declarations', (context) => {
  const { project, analysis } = fixture(
    context,
    'export { localHelper };\nimport { detectFormat, type FormatDetectionResult } from "missing-external";\nexport { detectFormat, FormatDetectionResult };',
  );
  const module = analysis.modules.find((entry) => entry.filePath === join(project, 'barrel.ts'));
  assert.deepEqual(
    module?.exports.filter((entry) => entry.name !== 'localHelper').map((entry) => entry.source),
    ['missing-external', 'missing-external'],
  );
  assert.equal(
    module?.functions.some((entry) => entry.name === 'detectFormat'),
    false,
  );
  assert.equal(
    module?.interfaces.some((entry) => entry.name === 'FormatDetectionResult'),
    false,
  );
});

it('TM13 R: actual duplicate File exports still produce checker/multi-exported', async () => {
  const checked = (await TypedMind.create()).check(
    'Main -> First\nFirst @ first.ts:\n  -> [run]\nSecond @ second.ts:\n  -> [run]\nrun :: () => void\n',
  );
  assert.equal(checked.diagnostics.filter((diagnostic) => diagnostic.code === 'checker/multi-exported').length, 1);
  assert.equal(checked.valid, false);
});
