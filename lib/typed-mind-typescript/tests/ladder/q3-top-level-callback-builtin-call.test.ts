// typedmind residual burndown Q3 (2026-09-05) — Program-export inference
// listed the JavaScript builtin `String` as a Program export.
//
// Root cause (typescript-analyzer.ts, X-AN-11 guard branch): the
// `import.meta.url` self-invocation guard recorded EVERY bare-identifier
// call target under the guard via `collectCalledFunctionNames`, and the
// converter's `createProgramEntity` folded the raw list into
// Program.exports unfiltered. A guarded `runWorker().catch((error) => {
// console.error(String(error)); })` (webhookstorage
// packages/outbound-delivery/src/index.ts:211-228) therefore produced
// `exports: [..., String]` and `checker/undefined-export`
// (`Export 'String' is not defined anywhere in the codebase`).
//
// Rule as intended: only functions THIS module declares at top level are
// self-invoked roots (analyzer), and only functions the converter emits
// (exported ones) may be folded into Program.exports (converter). Check
// bindings:
//   (a) fixture 100: Program.exports is exactly the module's real exports;
//       contains no `String`, no `setTimeout`; zero checker findings.
//   (b) control: the genuinely exported `runWorker` / `readEnv` still
//       appear; the non-exported same-module `reportCrash` invoked from
//       inside the nested `.catch` callback is recorded by the analyzer
//       (it is a real same-module call) but never reaches Program.exports
//       (the converter emits no entity for it).
//   (c) fixture 20 (X-AN-11's original rung) is unchanged.
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
const fixture = '100-top-level-callback-builtin-call';

const analyze = (name: string) => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(name));
  return analyzer.analyzeFromEntrypoint(fixturePath(name, 'src', 'index.ts'));
};

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return tm.check(longform);
};

describe('Q3 — top-level guarded callback calling a builtin never becomes a Program export', () => {
  it('analyzer records only same-module declared functions as self-invoked roots', () => {
    const analysis = analyze(fixture);
    assert.deepEqual(analysis.modules[0]?.selfInvokedFunctionNames, ['readEnv', 'runWorker', 'reportCrash']);
  });

  it('Program.exports is exactly the real exports; no String, no setTimeout, no private function; zero findings', async () => {
    const analysis = analyze(fixture);
    const result = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(result.success, true);

    const program = result.entities.find((entity) => entity.kind === 'Program') as { exports?: readonly string[] } | undefined;
    assert.deepEqual(program?.exports, ['WorkerEnv', 'readEnv', 'runWorker']);

    const checkResult = await checkViaLongform(result.entities);
    assert.deepEqual(
      checkResult.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
      [],
    );
  });

  it('control: fixture 20 (X-AN-11 original) still marks its guarded function', () => {
    const analysis = analyze('20-self-invoking-root');
    assert.deepEqual(analysis.modules[0]?.selfInvokedFunctionNames, ['runWorker']);
  });
});
