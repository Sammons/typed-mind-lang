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
//   - lead-authorized amendment: Function-entity collision disambiguation
//     (X-CONV-4 extension). The live-clone run against the real
//     webhookstorage clone (infra/api.ts, --recognize sst-handler) found
//     that traversal-enqueue is the first mechanism that ever traverses
//     more than one SST-handler target together, and the real clone has
//     FOUR independently-declared functions all named `handler`
//     (packages/functions/src/api/index.ts, .../auth/provision-tenant.ts,
//     .../auth/teardown-tenant.ts, .../auth/deletion-verification.ts) —
//     the converter's Function-entity naming had no file-scoping (unlike
//     Class/ClassFile's X-CONV-4 mechanism), so export failed with
//     "Duplicate entity name: handler" x3 (partial output written
//     correctly, I-13 held). This amendment is lead-authorized because it
//     BLOCKS the "fully extract, then typecheck" bar on the exact
//     live-clone run D-LEG-6's own check binding requires — deferring it
//     would guarantee Q10 (D-LEG-14, the terminal ladder re-run) reds on
//     webhookstorage. Mechanism: on a bare-name collision (checked against
//     `this.entityNames`, first-occurrence-wins), a Function entity is
//     renamed to `<baseName>__<name>`, reusing `deriveProgramName`'s
//     collision-proof rationale verbatim (a literal `__` is provably
//     outside `sanitizeEntityName`'s codomain). Uncollided names stay bare.
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

  it('webhookstorage-signature: the handler function is a resolvable entity in .tmd output, exposed via Program.exports AND its own File', async () => {
    const fixtureDir = fixturePath('webhookstorage-signature');
    const analyzer = new TypeScriptAnalyzer(fixtureDir, undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const handlerFn = result.entities.find((e) => e.kind === 'Function' && e.name === 'handler');
    assert.notEqual(handlerFn, undefined, 'handler must be a real Function entity');

    const functionsFile = result.entities.find(
      (e) =>
        e.kind === 'File' &&
        'path' in e &&
        typeof (e as { path: unknown }).path === 'string' &&
        (e as { path: string }).path.includes('packages/functions'),
    );
    assert.notEqual(functionsFile, undefined, 'the handler module must surface as its own File entity inside packages/functions');

    // tm10-inc3a (lead-authorized amendment, SST-referenced-module orphan
    // flags) — updates this pin CAUSE-LINKED to the fix that shrank it.
    // D-LEG-6's own check binding (module/entity real and present) is
    // unchanged by this amendment; what changed is the residual set below.
    //
    //   - `checker/orphaned-entity` on `handler` — RESOLVED (tm10-inc3a).
    //     The converter now folds `handler`'s final entity name into
    //     `Api__App`'s own `exports` (X-AN-11's mechanism, extended
    //     cross-module: `resolveSstHandlerExportNames`), so the checker's
    //     orphan walk sees a real reference edge instead of a false
    //     "orphaned" finding on code that IS the deployed program's own
    //     handler.
    //   - `checker/orphaned-file` on `IndexFile` — RESOLVED (tm10-inc3a).
    //     The converter now emits the truthful FILE edge: `ApiFile` (the
    //     infra entry) gains `IndexFile` in its own `imports` list
    //     (`foldSstHandlerImportsIntoSourceFiles`) — a true statement
    //     (infra names that module as its deployable), which independently
    //     clears the orphan-file finding via the SAME `imports`-union
    //     mechanism every other import edge already uses.
    //   - `checker/multi-exported` — did NOT fire before this amendment and
    //     was correctly absent from the prior pin, but WOULD have appeared
    //     as an unavoidable side effect of the exports-push above (`handler`
    //     exported by both `Api__App` and `IndexFile`) without the paired
    //     checker widening: `check-exports.ts`'s D-LEG-7 exclusion widened
    //     from a same-entity Program/entry comparison to a Program-scoped
    //     entry-reachability rule (`isProgramScopedExposure`,
    //     `filesReachableFromEntry`) — a Program whose entry transitively
    //     imports a File is a re-export chain, not a hand-authored
    //     duplicate. Confirmed NOT to regress the falsifying test
    //     (`ast-validator.test.ts:366-380`, an import-then-export exporter
    //     with no Program involved) and bounded by a dedicated negative
    //     fixture (`ast-validator.test.ts`, "Program-scoped exposure bound").
    //   - `syntax/error` x2 — RESOLVED (issue #103). The prior pin named the
    //     cause as `isDTOLikeType`-classified `Promise<{ statusCode: number }>`
    //     routing an inline object-literal return type raw through `output`,
    //     and held it out of scope. The real defect was one layer down, in
    //     the grammar: this assertion reaches the parser through
    //     `checkViaLongform`, so the signature text lands in a longform
    //     `signature:` property (P7 `property_freetext`) rather than the
    //     shortform `Name :: signature` production. `freetext_value` could
    //     not represent what `signature` could, and P3 `property_identifier`
    //     stole any value whose first whitespace-delimited chunk was a bare
    //     identifier — so this fixture's `async handler(...)` signature
    //     ERRORed in longform while parsing clean in shortform. Fixed in
    //     `lib/typed-mind/grammar/grammar.js` (issue #103); the residual set
    //     is now empty, and this pin is the cause-linked update.
    const { result: checkResult } = await checkViaLongform(result.entities);
    assert.deepEqual(
      checkResult.diagnostics.map((d) => d.code).sort(),
      [],
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
    assert.equal(
      unresolvable.length,
      1,
      'enabling the recognizer flag must not change the outcome for a path the recognizer never resolved',
    );

    const standaloneParsed = analysis.diagnostics.filter((d) => d.category === 'recognizer-module-standalone-parsed');
    assert.equal(standaloneParsed.length, 0);
  });
});

describe('RFC-TM-10 Q3 check — lead-authorized amendment: Function-entity collision disambiguation (X-CONV-4 extension)', () => {
  it('two independently-traversed SST-handler targets both exporting `handler` disambiguate deterministically, zero duplicate-entity errors', async () => {
    const fixtureDir = fixturePath('32-function-name-collision');
    const analyzer = new TypeScriptAnalyzer(fixtureDir, undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, true, 'conversion must succeed — this is the exact failure mode the live-clone run hit');
    assert.deepEqual(result.errors, [], 'zero duplicate-entity-name errors');

    const functionNames = result.entities
      .filter((e) => e.kind === 'Function')
      .map((e) => e.name)
      .sort();
    // api.ts's own handler target (packages/functions/src/api/index.ts) is
    // traversed FIRST (api.ts is the entrypoint, its own handler string is
    // scanned before the import to auth.ts is followed), so it keeps the
    // bare name; auth.ts's handler target collides and is disambiguated.
    assert.deepEqual(functionNames, ['ProvisionTenant__handler', 'handler']);

    // The disambiguated name must be the one actually referenced by its
    // owning File's exports list — not the stale bare name, which would be
    // a dangling reference no entity carries.
    const provisionFile = result.entities.find(
      (e) => e.kind === 'File' && 'path' in e && (e as { path: string }).path.includes('provision-tenant'),
    ) as { exports: readonly string[] } | undefined;
    assert.notEqual(provisionFile, undefined);
    assert.ok(provisionFile?.exports.includes('ProvisionTenant__handler'));
    assert.ok(!provisionFile?.exports.includes('handler'), 'the stale bare name must not appear in the export list');

    const { result: checkResult } = await checkViaLongform(result.entities);
    const danglingReference = checkResult.diagnostics.some((d) => d.code === 'checker/unresolved-reference');
    assert.equal(danglingReference, false, 'the renamed function must resolve cleanly — no dangling reference from the rename');
  });

  it('an uncollided function name is completely unaffected — stays bare', () => {
    // Reuses the webhookstorage-signature fixture: its lone handler target
    // has no naming collision (nothing else in that fixture is also named
    // `handler`), so it must emit as the bare name, unchanged from before
    // this amendment.
    const fixtureDir = fixturePath('webhookstorage-signature');
    const analyzer = new TypeScriptAnalyzer(fixtureDir, undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    const handlerFn = result.entities.find((e) => e.kind === 'Function' && e.name === 'handler');
    assert.notEqual(handlerFn, undefined, 'an uncollided function name stays bare — the amendment only fires on a detected collision');
  });
});
