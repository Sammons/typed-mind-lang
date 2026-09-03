// Fixture 77 — itp-maker ladder rung. KNOWN GAP, characterized not fixed.
//
// THE GAP: two files that each independently declare an interface with
// the same bare name collide in a single GLOBAL entity namespace, and the
// whole conversion reports failure. `convertInterfaceToDTO` derives the
// entity name via `createEntityName(iface.name)`, which is the identity
// function (`types.ts`, no module or file qualification), then rejects on
// `this.entityNames`, a set spanning the entire conversion run. The
// second declaration raises `Duplicate entity name`, `convert()` returns
// `success: false`, and the CLI writes partial output only.
//
// Live evidence: itp-maker `functions/save-job.ts:58` +
// `functions/lib/job-store.ts:58` each declare their own
// `export interface JobRecord` (customer-facing shape vs. stored shape),
// and `save-job.ts` imports the store's version ALIASED
// (`JobRecord as JobStoreRecord`) without re-exporting it. The save-job
// entrypoint fails conversion with 2 duplicate-name errors
// (`JobRecord`, `PushHistoryEntry`) and emits partial output.
//
// NOT the deferred barrel/multi-exported re-export shape: `isReExport`
// gates on `exportItem.source !== undefined` and never fires here,
// because neither declaration has a `from` clause at all. The collision
// is purely in the global DTO-entity namespace.
//
// WHY NOT FIXED HERE: functions already have a disambiguation scheme —
// `reserveFunctionEntityNames` falls back to `${baseName}__${func.name}`
// on collision and threads the result through `functionNameRemap`, which
// has 8+ consumer sites (export lists, sibling-call edges, input/output
// DTO refs, re-export resolution). An interface equivalent needs a
// parallel remap plus matching updates at every DTO reference site: DTO
// field types, `input`/`output` slots, `extends` targets and export
// lists. That is a cross-cutting entity-identity change spanning more
// than one owning concern, past the size bar for this ladder rung. The
// design is named above so the follow-up is mechanical, not exploratory.
//
// This test CHARACTERIZES the current behavior. When the gap is fixed,
// these assertions fail by design — that is the signal to replace them
// with the fixed-behavior assertions sketched in the final test below.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(testDir, 'repros-analyzer', '77-same-name-interface-two-files');

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixtureDir);
  const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'main.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('fixture 77 (KNOWN GAP): same-named interfaces in two files collide in the global entity namespace', () => {
  it('both files really do declare their own JobRecord — the fixture reproduces the real shape', () => {
    const analyzer = new TypeScriptAnalyzer(fixtureDir);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'main.ts'));

    const declaringModules = analysis.modules.filter((module) => module.interfaces.some((iface) => iface.name === 'JobRecord'));
    assert.equal(declaringModules.length, 2, 'exactly two modules must independently declare JobRecord');
  });

  it('the collision is not a re-export: neither declaration carries a `from` clause', () => {
    const analyzer = new TypeScriptAnalyzer(fixtureDir);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'main.ts'));

    // This is what distinguishes the gap from the deferred barrel
    // multi-exported shape, whose `isReExport` check keys on
    // `exportItem.source !== undefined`.
    const reExportsOfJobRecord = analysis.modules.flatMap((module) =>
      module.exports.filter((exported) => exported.name === 'JobRecord' && exported.source !== undefined),
    );
    assert.deepEqual(reExportsOfJobRecord, [], 'no JobRecord export may carry a source — this is not a re-export');
  });

  it('CURRENT BEHAVIOR (the gap): conversion fails with a duplicate-name error', () => {
    const result = convert();

    assert.equal(result.success, false, 'the global-namespace collision currently fails the whole conversion');
    assert.ok(
      result.errors.some((error) => (error as { message: string }).message.includes('Duplicate entity name: JobRecord')),
      `expected a JobRecord duplicate-name error, got: ${JSON.stringify(result.errors)}`,
    );
  });

  it('CURRENT BEHAVIOR (the gap): only one JobRecord DTO survives, so the second file loses its type', () => {
    const result = convert();

    const jobRecordDtos = result.entities.filter(
      (entity) => (entity as { kind: string; name: string }).kind === 'DTO' && (entity as { name: string }).name === 'JobRecord',
    );
    // When fixed, this becomes 2 distinct entities (e.g. `JobRecord` and
    // `JobStore__JobRecord`, following `reserveFunctionEntityNames`'s
    // `__` separator convention, which is provably outside
    // `sanitizeEntityName`'s codomain and so cannot collide).
    assert.equal(jobRecordDtos.length, 1, 'today exactly one JobRecord DTO survives the collision');
  });
});
