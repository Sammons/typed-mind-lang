// RFC-TM-10 Q3 (rfc-tm-10-diamond.md §6, D-LEG-6, issue #52) — the SST/Lambda
// handler-string recognizer reaches traversal. Check bindings per the
// Diamond's Q3 line and Diamond DAG entry:
//   - the resolved handler module becomes a REAL traversed module: its
//     entities appear in `analysis.modules` and the converter's `.tmd`
//     output, not merely in `analysis.moduleGraph` bookkeeping
//     (distilled signature fixture proving the traversal-enqueue mechanism;
//     the live-clone verification itself runs separately, see
//     `scripts/run-live-ladder.mjs` and the vault ladder note)
//   - the visited-set guard: a handler string pointing at an
//     already-traversed/already-queued module does not double-enqueue
//   - lead-mandated guardrail 1: the standalone-parse fallback is STRICTLY
//     scoped to recognizer-originated queue entries — an ordinary
//     unresolvable-but-on-disk import path still surfaces the existing
//     `skipped-module` diagnostic, unweakened
//   - lead-mandated guardrail 2: the standalone-parse degradation is
//     disclosed as an informational diagnostic
//     ('recognizer-module-standalone-parsed'), not silent
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

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return { longform, result: tm.check(longform) };
};

describe('RFC-TM-10 Q3 check — D-LEG-6: traversal-enqueue makes the handler module real', () => {
  it('webhookstorage-signature: the resolved handler module appears in analysis.modules, not only moduleGraph', () => {
    const fixtureDir = fixturePath('webhookstorage-signature');
    const analyzer = new TypeScriptAnalyzer(fixtureDir, undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));

    // Before Q3: analysis.modules contained only infra/api.ts, and
    // packages/functions/src/api/index.ts existed nowhere but
    // analysis.moduleGraph. Q3's own check: the module is now REAL.
    const handlerModule = analysis.modules.find((m) => m.filePath.endsWith('packages/functions/src/api/index.ts'));
    assert.notEqual(handlerModule, undefined, 'the resolved handler module must be a real traversed module');
    assert.ok(
      handlerModule?.functions.some((f) => f.name === 'handler'),
      'the handler module must have its own function entity parsed, not just a filesystem existence check',
    );

    // moduleGraph bookkeeping is UNCHANGED per the Diamond's own framing —
    // both are populated from the same resolution now, neither replaces
    // the other.
    const golden = analysis.moduleGraph.find((e) => e.specifier === 'packages/functions/src/api/index.handler');
    assert.equal(golden?.classification, 'internal');
    assert.equal(golden?.resolvedTarget, 'packages/functions/src/api/index.ts');
  });

  it('webhookstorage-signature: the handler function is a resolvable entity in .tmd output, not folded into Program.exports', async () => {
    const fixtureDir = fixturePath('webhookstorage-signature');
    const analyzer = new TypeScriptAnalyzer(fixtureDir, undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const handlerFn = result.entities.find((e) => e.kind === 'Function' && e.name === 'handler');
    assert.notEqual(handlerFn, undefined, 'handler must be a real Function entity, not a bare name in Program.exports');

    const functionsFile = result.entities.find(
      (e) => e.kind === 'File' && 'path' in e && typeof (e as { path: unknown }).path === 'string' && (e as { path: string }).path.includes('packages/functions'),
    );
    assert.notEqual(functionsFile, undefined, 'the handler module must surface as its own File entity inside packages/functions');

    // D-LEG-6's own check binding is about the module/entity being REAL and
    // PRESENT, not a zero-diagnostic checker run for this fixture. Checking
    // this fixture through the checker surfaces a NAMED, PRE-EXISTING set of
    // residual diagnostics — none introduced by Q3, none owned by D-LEG-6's
    // own fix surface:
    //   - `checker/multi-exported` on Program/ApiFile — the D-LEG-7
    //     Program/entry-duplication defect (RFC-TM-10 Q4, in flight
    //     elsewhere in this repo, not this Quantum's scope).
    //   - `checker/orphaned-file`/`checker/orphaned-entity` on
    //     IndexFile/handler — the SST convention string
    //     ('packages/functions/src/api/index.handler') has NO `.tmd`
    //     grammar representation as an import/reference edge; D-LEG-6's own
    //     scope is traversal-enqueue (making the module real), not
    //     synthesizing a new cross-file reference edge for the convention
    //     string, which is a distinct, un-itemized scope item.
    //   - `syntax/error` x2 — a PRE-EXISTING, D-LEG-1-adjacent gap:
    //     `isDTOLikeType` (already fixed once, Q1/PR#70) still classifies a
    //     generic-wrapped inline-object-literal return type
    //     (`Promise<{ statusCode: number }>`) as DTO-like "by elimination"
    //     and routes it through `output`, emitting the raw object-literal
    //     text where the grammar expects a DTO type name. D-LEG-1's fix only
    //     excluded Class-kind names and literal/literal-union types, not
    //     this shape — filed as a new, separate issue; not itemized in any
    //     of the 14 D-LEG items, so not owned by this Quantum or Q1.
    // This fixture pins the KNOWN set explicitly (per the Q1/Q4 file
    // headers' own "pin the achieved verdict, don't claim false green"
    // precedent) rather than asserting a stronger bar D-LEG-6 does not
    // itself deliver.
    const { result: checkResult } = await checkViaLongform(result.entities);
    assert.deepEqual(
      checkResult.diagnostics.map((d) => d.code).sort(),
      ['checker/multi-exported', 'checker/orphaned-entity', 'checker/orphaned-file', 'syntax/error', 'syntax/error'].sort(),
      'residual diagnostics are the named, pre-existing set only — a NEW code here is a regression this fixture must catch',
    );
  });

  it('the recognizer-module-standalone-parsed disclosure names the exact module and no other diagnostics fire for the happy path', () => {
    const fixtureDir = fixturePath('webhookstorage-signature');
    const analyzer = new TypeScriptAnalyzer(fixtureDir, undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));

    const disclosures = analysis.diagnostics.filter((d) => d.category === 'recognizer-module-standalone-parsed');
    assert.equal(disclosures.length, 1, 'exactly one disclosure, for the one standalone-parsed module');
    assert.equal(disclosures[0]?.severity, 'warning');
    assert.ok(disclosures[0]?.filePath?.endsWith('packages/functions/src/api/index.ts'));
    assert.ok(disclosures[0]?.message.includes('parsed standalone'));
  });
});

describe('RFC-TM-10 Q3 check — visited-set guard: no double-enqueue', () => {
  it('a module reached by both a normal import and a handler string is analyzed exactly once', () => {
    const fixtureDir = fixturePath('30-sst-handler-visited-guard');
    const analyzer = new TypeScriptAnalyzer(fixtureDir, undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));

    const matches = analysis.modules.filter((m) => m.filePath.endsWith('shared/handler.ts'));
    assert.equal(matches.length, 1, 'the shared handler module must appear exactly once in analysis.modules, never duplicated');

    // Reached via the normal import path, so it is program-backed — no
    // standalone-parse disclosure should fire for an already-in-program
    // module even though the recognizer also names it.
    const disclosures = analysis.diagnostics.filter((d) => d.category === 'recognizer-module-standalone-parsed');
    assert.equal(disclosures.length, 0, 'a module already reachable via a normal import is never standalone-parsed');

    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    const handlerFns = result.entities.filter((e) => e.kind === 'Function' && e.name === 'handler');
    assert.equal(handlerFns.length, 1, 'exactly one handler Function entity — no duplicate emission from the double reference');
  });
});

describe('RFC-TM-10 Q3 check — lead guardrail 1: fallback is strictly recognizer-scoped', () => {
  it('an ordinary unresolvable bare import specifier (NOT recognizer-originated) still surfaces unresolvable-import, unweakened', () => {
    const fixtureDir = fixturePath('31-skipped-module-not-recognizer');
    // No --recognize flag at all: this fixture proves the general
    // import-resolution path is untouched by Q3, independent of whether
    // the recognizer is even enabled. `ts.resolveModuleName` treats a bare
    // (non-relative) specifier as a package import and cannot resolve it —
    // the same "resolved by the recognizer's own probe, unreachable via TS
    // module resolution" shape the real handler-string target has, reached
    // here via an ORDINARY import instead of the recognizer.
    const analyzer = new TypeScriptAnalyzer(fixtureDir);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'main.ts'));

    const unresolvable = analysis.diagnostics.filter((d) => d.category === 'unresolvable-import');
    assert.equal(unresolvable.length, 1, 'the bare unresolvable specifier must still be reported, not silently traversed');
    assert.ok(unresolvable[0]?.specifier === 'excluded/target.ts');

    const standaloneParsed = analysis.diagnostics.filter((d) => d.category === 'recognizer-module-standalone-parsed');
    assert.equal(standaloneParsed.length, 0, 'the standalone-parse fallback must never fire for a non-recognizer path');

    assert.equal(analysis.modules.length, 1, 'only the entrypoint is analyzed — the unresolvable target never joins analysis.modules');
  });

  it('same fixture WITH --recognize enabled (no handler string present): behavior is identical, the flag alone does not widen the fallback', () => {
    const fixtureDir = fixturePath('31-skipped-module-not-recognizer');
    const analyzer = new TypeScriptAnalyzer(fixtureDir, undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'main.ts'));

    const unresolvable = analysis.diagnostics.filter((d) => d.category === 'unresolvable-import');
    assert.equal(unresolvable.length, 1, 'enabling the recognizer flag must not change the outcome for a path the recognizer never resolved');

    const standaloneParsed = analysis.diagnostics.filter((d) => d.category === 'recognizer-module-standalone-parsed');
    assert.equal(standaloneParsed.length, 0);
  });
});
