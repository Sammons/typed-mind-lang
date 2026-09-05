// typedmind residual burndown Q10 (2026-09-05) — the entrypoint's
// self-invoked function names reached Program.exports as RAW source names.
//
// Root cause (typescript-to-typedmind-converter.ts, `createProgramEntity`):
// `emittedSelfInvokedFunctionNames` (Q3, PR #186) yields raw names, and the
// fold unioned them with `publicExports` — which `extractPublicExportsFromEntrypoint`
// had already collision-remapped through `functionNameRemap`. When the
// entrypoint's guarded function LOST a bare-name collision under the
// decision-same-named-entities rule (the later path-sorted declaration is
// emitted as `<FileEntity>.<name>`), Program.exports carried BOTH
// `IndexFile.runWorker` and the bare `runWorker`; the bare one is the
// OTHER module's entity, already exported by its own File, so the checker
// reported `checker/multi-exported` (`checker/undefined-export` when no
// entity holds the bare name). Reproduced by the PR #186 reviewer on main.
//
// Fix: the fold resolves each name through the same
// `remapEntrypointExportName` chain the public exports use. Check bindings:
//   (a) fixture 113 `index.ts` (collision LOSER: `src/engine.ts` <
//       `src/index.ts`): Program.exports contains exactly the remapped
//       `IndexFile.runWorker`, once, and the checker reports zero findings.
//   (b) control — fixture 113 `main.ts` (collision WINNER: `src/main.ts` <
//       `src/support.ts`): Program.exports is the bare `runWorker`, zero
//       findings — unchanged behaviour.
//   (c) fixture 100 (Q3) and fixture 20 (X-AN-11) still pass.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);
const fixture = '113-self-invoked-collision-remap';

const analyze = (name: string, entry: string) => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(name));
  return analyzer.analyzeFromEntrypoint(fixturePath(name, 'src', entry));
};

const convert = (name: string, entry: string) => {
  const result = new TypeScriptToTypedMindConverter().convert(analyze(name, entry));
  assert.equal(result.success, true);
  return result;
};

const programExports = (result: { entities: readonly unknown[] }): readonly string[] | undefined => {
  const program = result.entities.find((entity) => (entity as { kind: string }).kind === 'Program') as
    | { exports?: readonly string[] }
    | undefined;
  return program?.exports;
};

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return tm.check(longform).diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`);
};

describe('Q10 — self-invoked function names fold into Program.exports through the collision remap', () => {
  it('the analyzer marks the guarded function on both entrypoints', () => {
    assert.deepEqual(analyze(fixture, 'index.ts').modules[0]?.selfInvokedFunctionNames, ['runWorker']);
    assert.deepEqual(analyze(fixture, 'main.ts').modules[0]?.selfInvokedFunctionNames, ['runWorker']);
  });

  it('(a) collision LOSER entrypoint: Program.exports carries the remapped spelling exactly once; zero findings', async () => {
    const result = convert(fixture, 'index.ts');

    // The entrypoint's declaration is emitted under the qualified name
    // (engine.ts sorts first and keeps the bare `runWorker`).
    const names = result.entities.map((entity) => (entity as { name: string }).name);
    assert.deepEqual(
      names.filter((name) => name === 'runWorker' || name.endsWith('.runWorker')),
      ['runWorker', 'IndexFile.runWorker'],
    );

    // Before the fix: ['IndexFile.runWorker', 'runWorker'] — the bare name
    // is EngineFile's entity, and the checker reported
    // `checker/multi-exported: Entity 'runWorker' is exported by multiple files: IndexApp, EngineFile`.
    assert.deepEqual(programExports(result), ['IndexFile.runWorker']);
    assert.deepEqual(await checkViaLongform(result.entities), []);
  });

  it('(b) control — collision WINNER entrypoint keeps the bare name in Program.exports; zero findings', async () => {
    const result = convert(fixture, 'main.ts');

    const names = result.entities.map((entity) => (entity as { name: string }).name);
    assert.deepEqual(
      names.filter((name) => name === 'runWorker' || name.endsWith('.runWorker')),
      ['runWorker', 'SupportFile.runWorker'],
    );

    assert.deepEqual(programExports(result), ['runWorker']);
    assert.deepEqual(await checkViaLongform(result.entities), []);
  });

  it('(c) fixture 100 (Q3): Program.exports and findings are unchanged', async () => {
    const result = convert('100-top-level-callback-builtin-call', 'index.ts');
    assert.deepEqual(programExports(result), ['WorkerEnv', 'readEnv', 'runWorker']);
    assert.deepEqual(await checkViaLongform(result.entities), []);
  });

  it('(c) fixture 20 (X-AN-11 original): the guarded function is still marked and exported', () => {
    const analysis = analyze('20-self-invoking-root', 'index.ts');
    assert.deepEqual(analysis.modules[0]?.selfInvokedFunctionNames, ['runWorker']);
    const result = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(result.success, true);
    assert.ok(programExports(result)?.includes('runWorker'));
  });
});
