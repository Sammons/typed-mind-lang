// RFC-TM-13 burndown Q7 — three re-export deferrals re-verified on current
// main after unit R ("barrel provenance": `ParsedExport.source` on the
// import-then-bare-export idiom), PR #170 and PR #181. One hermetic fixture
// per deferral under `repros-analyzer/109..111`; each fixture's README
// records the outcome class.
//
//   109 — issue #62 residual (core-diagnostic-disposition-2026-08-29.md:44,
//         rfc-tm-13-draft.md residual 2): CLEAN, closed by R. Positive
//         regression test below.
//   110 — RFC-TM-11 Deferral RX-A (rfc-tm-11-diamond.md:373-406): the real
//         re-export is CLEAN; the same-name-from-external-package shape is
//         FIXED by RFC-TM-15 §S2 (rfc-tm-15-diamond.md, leaf X1): the entry
//         is owner-qualified and its Dependency carries the export.
//   111 — RFC-TM-11 Deferral RX-B (same section): the self-credit shape is
//         FIXED in check-orphans.ts (core test in ast-validator.test.ts);
//         the unrelated-importer shape is pinned — needs the same mechanism.
//
// Control: the `->`-for-`<->` rewrite of fixture 110's document (what the
// pre-R converter emitted for the bare idiom) still produces exactly one
// `checker/multi-exported`.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FileNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = (name: string, ...segments: string[]): string => join(testDir, 'repros-analyzer', name, ...segments);

const convertFixture = (name: string, mode: 'entrypoint' | 'whole-project' = 'entrypoint') => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(name));
  const analysis = mode === 'whole-project' ? analyzer.analyze() : analyzer.analyzeFromEntrypoint(fixturePath(name, 'src', 'main.ts'));
  return new TypeScriptToTypedMindConverter().convert(analysis);
};

const fileByPath = (entities: readonly unknown[], suffix: string): FileNode | undefined => {
  return entities.find((entity): entity is FileNode => entity instanceof FileNode && entity.path.endsWith(suffix));
};

const checkDocument = async (tmdContent: string) => (await TypedMind.create()).check(tmdContent);

const codes = (diagnostics: readonly { code: string }[], code: string) => diagnostics.filter((diagnostic) => diagnostic.code === code);

describe('Q7 item 1 — issue #62 residual: import-then-bare-export (fixture 109)', () => {
  it('is CLEAN on main: no multi-exported, and the declaring file is the sole exporter', async () => {
    const result = convertFixture('109-import-then-bare-export-multi-exported');
    assert.equal(result.success, true);
    assert.deepEqual(result.warnings, []);

    const declaring = fileByPath(result.entities, 'detect-format.ts');
    const forwardingFile = fileByPath(result.entities, 'format-api.ts');
    const forwardingClassFile = result.entities.find((entity) => entity.kind === 'ClassFile' && entity.name === 'SyntaxEmitter') as
      | { exports: readonly string[]; imports: readonly string[] }
      | undefined;
    assert.deepEqual(declaring?.exports.toSorted(), ['FormatDetectionResult', 'detectFormat']);
    // The plain-File forwarder carries the provenance fact in `<->`, and
    // neither name in its own `->`.
    assert.deepEqual(forwardingFile?.exports, ['formatLabel']);
    assert.deepEqual(forwardingFile?.reExports.toSorted(), ['FormatDetectionResult', 'detectFormat']);
    // The ClassFile forwarder (the corpus shape) carries no `reexports:` slot
    // (RFC-TM-11 §RX-1); the fact that matters is the names are absent from
    // its `exports:` — that absence is what the historical finding was about.
    assert.deepEqual(forwardingClassFile?.exports.toSorted(), ['EmitOptions', 'SyntaxEmitter']);
    assert.deepEqual(forwardingClassFile?.imports.toSorted(), ['FormatDetectionResult', 'detectFormat']);

    const checked = await checkDocument(result.tmdContent);
    assert.deepEqual(codes(checked.diagnostics, 'checker/multi-exported'), [], result.tmdContent);
    assert.deepEqual(checked.diagnostics, [], result.tmdContent);
    assert.equal(checked.valid, true);
  });
});

describe('Q7 item 2 — RFC-TM-11 Deferral RX-A: reExports vs an independent export (fixture 110)', () => {
  it('shape A (real re-export of a sibling) is CLEAN: the barrel re-exports, the declaring file exports', async () => {
    const result = convertFixture('110-reexport-name-vs-independent-export');
    assert.equal(result.success, true);
    const declaring = fileByPath(result.entities, 'normalize.ts');
    const barrel = fileByPath(result.entities, 'barrel.ts');
    assert.deepEqual(declaring?.exports, ['normalizeVehicleString']);
    assert.deepEqual(barrel?.exports, []);
    assert.deepEqual(barrel?.reExports, ['normalizeVehicleString']);
    const checked = await checkDocument(result.tmdContent);
    assert.deepEqual(codes(checked.diagnostics, 'checker/multi-exported'), [], result.tmdContent);
    assert.equal(checked.valid, true);
  });

  // FIXED (RFC-TM-15 §S2, leaf X1). `vendor-surface.ts` re-exports
  // `normalizeVehicleString` from an external package; the entry used to be
  // the bare name, which named normalize.ts's entity by coincidence of
  // spelling. The converter now creates the Dependency for the external
  // source, appends the re-exported name to its `exports`, and emits the
  // entry owner-qualified (`VehicleVendorSdk.normalizeVehicleString`); the
  // resolver follows the qualified entry to `external`, so the local entity
  // is never bound. RX-6's fold matches on the member part, so `MainFile`
  // keeps `VendorSurfaceFile` in its imports and no `orphaned-file` fires.
  it('TM15 V2: an external re-export is emitted owner-qualified with its Dependency and the fold survives', async () => {
    const result = convertFixture('110-reexport-name-vs-independent-export');
    assert.equal(result.success, true);
    const vendorSurface = fileByPath(result.entities, 'vendor-surface.ts');
    const main = fileByPath(result.entities, 'main.ts');
    const dependency = result.entities.find((entity) => entity.kind === 'Dependency' && entity.name === 'VehicleVendorSdk') as
      | { exports?: readonly string[] }
      | undefined;
    assert.deepEqual(vendorSurface?.exports, []);
    assert.deepEqual(vendorSurface?.reExports, ['VehicleVendorSdk.normalizeVehicleString']);
    assert.deepEqual(vendorSurface?.imports, []);
    assert.deepEqual(dependency?.exports, ['normalizeVehicleString']);
    assert.ok(main?.imports.includes(vendorSurface?.name ?? ''), `RX-6 fold must survive qualification: ${main?.imports.join(', ')}`);
    assert.match(result.tmdContent, /VendorSurfaceFile @ src\/vendor-surface\.ts:\n  <-> \[VehicleVendorSdk\.normalizeVehicleString\]\n/);
    const checked = await checkDocument(result.tmdContent);
    assert.deepEqual(checked.diagnostics, [], result.tmdContent);
    assert.equal(checked.valid, true);
  });
});

describe('Q7 item 3 — RFC-TM-11 Deferral RX-B: isFileConsumed re-export branch (fixture 111)', () => {
  // PINNED, not fixed: main.ts imports the name DIRECTLY from normalize.ts
  // and nothing imports barrel.ts, yet the bare-name scan credits the barrel.
  // Only whole-project analysis puts an unimported barrel in the document at
  // all; the CLI's entrypoint traversal never reaches one. The RX-6 fold
  // (`foldReExportedNamesIntoImporterFiles`) writes the barrel's own File
  // name into a through-barrel importer, so an extracted document ALWAYS
  // carries the distinguishing fact — but the checker cannot rely on it for
  // hand-authored documents, which is why this stays deferred.
  it('unrelated-importer shape is pinned: the unimported barrel is not reported orphaned', async () => {
    const result = convertFixture('111-unconsumed-barrel-credited-by-direct-import', 'whole-project');
    assert.equal(result.success, true);
    const barrel = fileByPath(result.entities, 'barrel.ts');
    const main = fileByPath(result.entities, 'main.ts');
    assert.deepEqual(barrel?.reExports, ['normalizeVehicleString']);
    assert.deepEqual(main?.imports, ['normalizeVehicleString']);
    assert.equal(main?.imports.includes(barrel?.name ?? ''), false, 'no importer names the barrel');
    const checked = await checkDocument(result.tmdContent);
    assert.deepEqual(codes(checked.diagnostics, 'checker/orphaned-file'), [], result.tmdContent);
  });

  // FIXED (check-orphans.ts): the same document with main.ts's direct import
  // removed. The barrel's only claim to consumption was its OWN `<-` edge,
  // which the re-export branch now excludes. Core-level pin and removal
  // control live in lib/typed-mind/src/checker/ast-validator.test.ts.
  it('self-credit shape is fixed: a barrel nothing imports is reported orphaned', async () => {
    const result = convertFixture('111-unconsumed-barrel-credited-by-direct-import', 'whole-project');
    const withoutDirectImport = result.tmdContent.replace('  <- [normalizeVehicleString]\n  -> [run]\n', '  -> [run]\n');
    assert.notEqual(withoutDirectImport, result.tmdContent, "the rewrite must remove main.ts's direct import");
    const checked = await checkDocument(withoutDirectImport);
    assert.deepEqual(
      codes(checked.diagnostics, 'checker/orphaned-file').map((diagnostic) => diagnostic.message),
      ["Orphaned file 'BarrelFile' - none of its exports are imported"],
      withoutDirectImport,
    );
  });
});

describe('Q7 control — a genuine duplicate export still produces checker/multi-exported', () => {
  it("fixture 110's document with the barrel's `<->` rewritten to `->` (the pre-R emission) flags once", async () => {
    const result = convertFixture('110-reexport-name-vs-independent-export');
    const barrel = fileByPath(result.entities, 'barrel.ts');
    const duplicated = result.tmdContent.replace(
      `${barrel?.name} @ src/barrel.ts:\n  <- [normalizeVehicleString]\n  <-> [normalizeVehicleString]\n`,
      `${barrel?.name} @ src/barrel.ts:\n  <- [normalizeVehicleString]\n  -> [normalizeVehicleString]\n`,
    );
    assert.notEqual(duplicated, result.tmdContent, 'the rewrite must hit the barrel block');
    const checked = await checkDocument(duplicated);
    assert.deepEqual(
      codes(checked.diagnostics, 'checker/multi-exported').map((diagnostic) => diagnostic.message),
      [`Entity 'normalizeVehicleString' is exported by multiple files: ${barrel?.name}, NormalizeFile`],
      duplicated,
    );
    assert.equal(checked.valid, false);
  });
});
