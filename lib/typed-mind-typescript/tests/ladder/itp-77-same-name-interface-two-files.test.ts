// Fixture 77 — itp-maker ladder rung. PARTIAL FIX: the declaration half is
// closed by decision-same-named-entities PR 1; the reference-following half
// remains a KNOWN GAP and this fixture stays its pin.
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
// WHAT PR 1 CHANGED. `reserveTypeEntityNames` is a whole-run pre-pass that
// resolves a cross-module bare-name collision to a deterministic
// module-qualified name, reusing `reserveFunctionEntityNames`'s `__`
// convention. Conversion now COMPLETES: `success: true`, no `Duplicate
// entity name` error, and BOTH declarations survive as `JobRecord` (the
// first declarer, bare) and `JobStoreFile.JobRecord` (the second, qualified),
// each carrying its own fields. The collision is reported as a warning
// naming both paths. The three MECHANICAL reference sites follow the
// rename — this fixture's `MainFile` imports `JobStoreFile.JobRecord` and
// `JobStoreFile` exports it, both resolved through
// `resolveImportToEntity`/`convertExports` from the analyzer's own module
// graph, with no type-origin inference needed.
//
// WHAT REMAINS THE GAP, and what this fixture still pins: the reference
// sites holding RAW TYPE TEXT. `getTypeString` (typescript-analyzer.ts) is
// a bare `typeNode.getText()` and `types.ts` carries no resolved-type-origin
// field, so `saveJob(record: JobRecord)` cannot be resolved to a declaring
// module without PR 2's TypeChecker plumbing. Those references stay bare in
// the interim, and PR 1 emits a warning at each one so the window is
// visible rather than inferred from a downstream checker finding.
//
// The assertions below CHARACTERIZE that interim state. When PR 2 lands
// they fail by design — that is the signal to re-pin them.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
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

describe('fixture 77: same-named interfaces in two files — declaration renamed (PR 1), references still bare (PR 2 gap)', () => {
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

  it('FIXED (PR 1): conversion completes, and the collision is a warning naming both paths', () => {
    const result = convert();

    assert.equal(result.success, true, 'a name collision must no longer fail the whole conversion');
    assert.deepEqual(
      result.errors.filter((error) => (error as { message: string }).message.includes('Duplicate entity name')),
      [],
      'the hard `Duplicate entity name` abort is gone',
    );

    // The warning text is the documented contract, asserted verbatim.
    const collisionWarnings = result.warnings.filter((warning) =>
      (warning as { message: string }).message.startsWith("Duplicate entity name 'JobRecord'"),
    );
    assert.deepEqual(
      collisionWarnings.map((warning) => (warning as { message: string }).message),
      [
        "Duplicate entity name 'JobRecord' declared in both 'src/job-store.ts' and 'src/main.ts'; the declaration whose file path sorts first kept the bare name, so 'src/main.ts' was renamed to 'MainFile.JobRecord'. TypedMind entity names are global to a document.",
      ],
      'exactly one collision warning, naming both declaring paths and the resulting qualified name',
    );
  });

  it('FIXED (PR 1): both declarations survive, the second module-qualified', () => {
    const result = convert();

    const jobRecordDtos = result.entities
      .filter((entity) => (entity as { kind: string }).kind === 'DTO')
      .map((entity) => (entity as { name: string }).name)
      .filter((name) => name.endsWith('JobRecord'))
      .sort();

    assert.deepEqual(
      jobRecordDtos,
      ['JobRecord', 'MainFile.JobRecord'],
      'src/job-store.ts sorts first so it keeps the bare name; src/main.ts is qualified by its sanitized module basename',
    );

    // Each keeps its OWN fields — the collision loser is a real, distinct
    // entity, not the survivor wearing the wrong module's shape (which is
    // precisely what `createConstantEntity`'s old silent-skip produced).
    const qualified = result.entities.find((entity) => (entity as { name: string }).name === 'MainFile.JobRecord');
    assert.deepEqual(
      (qualified as { fields: { name: string }[] }).fields.map((field) => field.name),
      ['id', 'title'],
      'the renamed entity carries main.ts fields, not job-store.ts fields',
    );
    const bare = result.entities.find((entity) => (entity as { name: string }).name === 'JobRecord');
    assert.deepEqual(
      (bare as { fields: { name: string }[] }).fields.map((field) => field.name),
      ['id', 'procoreTemplateId'],
      'the bare-name winner carries job-store.ts fields',
    );
  });

  it('FIXED (PR 1): the MECHANICAL reference sites follow the rename', () => {
    const result = convert();

    // `resolveImportToEntity` resolves the import through the analyzer's own
    // module-graph target, and `convertExports` names the export by its
    // actual emitted entity name. Both are module-resolvable without PR 2.
    // job-store.ts sorts first, so IT holds the bare name and main.ts imports
    // that; main.ts's own declaration is the renamed one, and its File entity
    // must export the renamed name rather than the bare one it no longer owns.
    const mainFile = result.entities.find((entity) => (entity as { name: string }).name === 'MainFile');
    assert.ok(
      (mainFile as { imports: string[] }).imports.includes('JobRecord'),
      `main.ts must import job-store.ts's bare-name entity: ${JSON.stringify((mainFile as { imports: string[] }).imports)}`,
    );
    assert.ok(
      (mainFile as { exports: string[] }).exports.includes('MainFile.JobRecord'),
      `main.ts must export its OWN renamed entity: ${JSON.stringify((mainFile as { exports: string[] }).exports)}`,
    );

    const jobStoreFile = result.entities.find((entity) => (entity as { name: string }).name === 'JobStoreFile');
    assert.ok(
      (jobStoreFile as { exports: string[] }).exports.includes('JobRecord'),
      `job-store.ts must export the bare name it won: ${JSON.stringify((jobStoreFile as { exports: string[] }).exports)}`,
    );
  });

  it('STILL THE GAP (PR 2): raw type-text references stay bare, and each one warns', () => {
    const result = convert();

    // `saveJob(record: JobRecord)` and `readJob(...): JobRecord` are raw
    // source text. PR 1 cannot resolve which module's `JobRecord` each names,
    // so both stay bare — and each emits an interim-window warning.
    const saveJob = result.entities.find((entity) => (entity as { name: string }).name === 'saveJob');
    assert.equal((saveJob as { input?: string }).input, 'JobRecord', "saveJob's input stays the BARE name — reference-following is PR 2");

    const interimWarnings = result.warnings
      .map((warning) => (warning as { message: string }).message)
      .filter((message) => message.startsWith("Reference to 'JobRecord'"));
    assert.equal(
      interimWarnings.length,
      2,
      `each unresolved reference must warn so the interim window is visible: ${JSON.stringify(interimWarnings)}`,
    );
  });

  it('STILL THE GAP (PR 2): the emitted .tmd is free of duplicate-name and multi-exported findings', async () => {
    const result = convert();

    const typedMind = await TypedMind.create();
    const checkResult = typedMind.check(result.tmdContent);
    const codes = checkResult.diagnostics.map((diagnostic) => diagnostic.code);

    // The rename's whole purpose: the global namespace is now genuinely
    // collision-free, so neither the duplicate-name nor the multi-exported
    // check fires — the two findings the pre-PR-1 silent-skip produced.
    assert.deepEqual(
      codes.filter((code) => code === 'checker/duplicate-name' || code === 'checker/multi-exported'),
      [],
      `no duplicate-name and no multi-exported finding may survive the rename: ${JSON.stringify(checkResult.diagnostics)}`,
    );

    // The residual is the aliased-import shape this fixture was built for
    // (`JobRecord as JobStoreRecord`), which PR 2 closes — pinned exactly so
    // any OTHER finding appearing here fails.
    assert.deepEqual(
      codes,
      ['checker/output-dto-not-found'],
      `the only residual is the aliased-import gap PR 2 owns: ${JSON.stringify(checkResult.diagnostics)}`,
    );
  });
});
