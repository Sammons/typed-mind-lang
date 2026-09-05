// Fixture77, distilled from itp-maker: independent same-name interfaces and
// an aliased import. E retains both declarations under distinct owned names;
// A2 uses exact source identities for parameter, return and DTO I/O references.
// Both original shapes survive and the original fixture checks clean.
// converter-type-references.test.ts removes origins to restore the exact
// previous missing JobStoreRecord output finding and original output bytes.
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

describe('fixture 77: same-named interfaces in two files — distinct declarations and references resolve by source identity', () => {
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

  it('FIXED (A2): type references resolve the exact declaring module without interim warnings', () => {
    const result = convert();

    // The two source declarations retain distinct identities through aliases.
    const saveJob = result.entities.find((entity) => (entity as { name: string }).name === 'saveJob');
    assert.equal((saveJob as { input?: string }).input, 'MainFile.JobRecord', "saveJob's input references its own source declaration");

    const interimWarnings = result.warnings
      .map((warning) => (warning as { message: string }).message)
      .filter((message) => message.startsWith("Reference to 'JobRecord'"));
    assert.equal(
      interimWarnings.length,
      0,
      `resolved references no longer carry interim collision warnings: ${JSON.stringify(interimWarnings)}`,
    );
  });

  it('FIXED (A2): the original aliased-import fixture checks clean', async () => {
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

    // A2 resolves JobRecord as JobStoreRecord to the actual DTO; no residual remains.
    assert.deepEqual(codes, [], `the only residual is the aliased-import gap PR 2 owns: ${JSON.stringify(checkResult.diagnostics)}`);
  });
});
