import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { it } from 'node:test';
import { DependencyNode, DtoNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';

it('TM13 EXIT: Node ambient AbortSignal survives source extraction without an import', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-abortsignal-'));
  try {
    const nodeTypes = dirname(createRequire(import.meta.url).resolve('@types/node/package.json'));
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          lib: ['ES2022'],
          types: ['node'],
          typeRoots: [dirname(nodeTypes)],
          skipLibCheck: true,
        },
        include: ['index.ts'],
      }),
    );
    writeFileSync(
      join(root, 'index.ts'),
      `export interface WorkerDeps {
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}
export async function run(deps: WorkerDeps): Promise<void> { await deps.sleep?.(1); }
`,
    );
    const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'index.ts'));
    const sleep = analysis.modules[0]?.interfaces
      .find((entry) => entry.name === 'WorkerDeps')
      ?.properties.find((entry) => entry.name === 'sleep');
    const signal = sleep?.typeInfo?.references.find((reference) => reference.writtenName === 'AbortSignal');
    assert.ok(signal);
    assert.equal(signal.origin.kind, 'external-package');
    if (signal.origin.kind !== 'external-package') assert.fail('expected ambient Node package declaration');
    assert.equal(signal.origin.packageName, '@types/node');
    assert.match(signal.origin.declaration.filePath, /@types\/node\/web-globals\/abortcontroller\.d\.ts$/);
    assert.equal(signal.origin.declaration.name, 'AbortSignal');
    assert.equal(signal.externalBinding, undefined);
    const result = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(result.success, true);
    const dto = result.entities.find((entity) => entity.name === 'WorkerDeps');
    assert.ok(dto instanceof DtoNode);
    assert.equal(dto.fields[0]?.type, '(ms: number, signal?: AbortSignal) => Promise<void>');
    assert.equal(
      result.entities.some((entity) => entity instanceof DependencyNode),
      false,
    );
    assert.deepEqual(
      result.warnings.map((warning) => warning.message),
      ["External type reference 'AbortSignal' has no proven public import binding; retaining source text"],
    );
    const mind = await TypedMind.create();
    assert.deepEqual(mind.check(result.tmdContent).diagnostics, []);
    const misspelled = mind.check(result.tmdContent.replaceAll('AbortSignal', 'AbortSigal'));
    assert.deepEqual(
      misspelled.diagnostics.map(({ code, message }) => ({ code, message })),
      [
        {
          code: 'checker/dto-field-unknown-type',
          message: "DTO 'WorkerDeps' field 'sleep' references undefined type 'AbortSigal'",
        },
      ],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
