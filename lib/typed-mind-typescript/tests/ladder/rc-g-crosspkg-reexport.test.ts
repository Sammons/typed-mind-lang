// RFC-TM-11 Amendment 1, §RX-6 (rfc-tm-11-diamond.md) — issue #109 (RC-G),
// the cross-package residual Quantum 1 (RX-1..RX-5) left open. A re-export
// barrel whose target resolves to NO local entity (an external or
// workspace-package specifier — `@scope/core/client-ip`, matching the
// real `TenantBillingFile`/`ClientIpFile` corpus instances exactly)
// cannot have its re-exported name reach any importer's `imports` list:
// `resolveImportToEntity` returns `undefined` for that name from every
// caller. `isFileConsumed`'s two loops from Quantum 1 (over
// `file.exports` and `file.reExports`) can therefore never find a match
// for this shape, no matter how many real modules import through the
// barrel.
//
// Fixed with a two-part mechanism: (i) `foldReExportedNamesIntoImporterFiles`,
// a post-pass mirroring `foldDynamicImportsIntoSourceFiles`'s shape, folds
// the barrel File's own entity name into a real importer's `imports` list
// whenever the imported name is present in the barrel's `reExports`; (ii)
// `isFileConsumed` (check-orphans.ts) gains a third branch,
// `isEntityImported(context, file.name)`, which is what actually reads
// the name part (i) writes.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath('47-crosspkg-reexport'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('47-crosspkg-reexport', 'src', 'main.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RC-G: a barrel re-exporting from an external/workspace-package specifier is provably consumed', () => {
  it("folds the barrel's own File entity name into the real importer's imports list", () => {
    const result = convert();
    assert.equal(result.success, true);

    const mainEntity = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('main.ts')) as
      | { imports: readonly string[] }
      | undefined;
    assert.notEqual(mainEntity, undefined, "main.ts's File entity must exist");

    const clientIpFileEntity = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('client-ip.ts')) as
      | { name: string; reExports: readonly string[] }
      | undefined;
    assert.notEqual(clientIpFileEntity, undefined, "client-ip.ts's File entity must exist");
    const clientIpFileEntityName = clientIpFileEntity?.name ?? '';

    assert.ok(
      mainEntity?.imports.includes(clientIpFileEntityName),
      `expected '${clientIpFileEntityName}' (folded because main.ts imports getClientIp, which is in ClientIpFile's reExports) in main's imports list, got: ${JSON.stringify(mainEntity?.imports)}`,
    );
  });

  it("bound (a): the barrel's LOCAL declaration (formatIp, not in reExports) resolves normally and does not duplicate the fold", () => {
    const result = convert();
    const mainEntity = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('main.ts')) as
      | { imports: readonly string[] }
      | undefined;

    // formatIp resolves to its own real Function entity via the existing
    // resolveImportToEntity path (unaffected by RX-6) — it must appear by
    // its OWN name, not folded away or duplicated.
    assert.ok(
      mainEntity?.imports.includes('formatIp'),
      `expected 'formatIp' in main's imports list, got: ${JSON.stringify(mainEntity?.imports)}`,
    );

    const clientIpFileEntity = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('client-ip.ts')) as
      | { name: string }
      | undefined;
    const clientIpFileEntityName = clientIpFileEntity?.name ?? '';
    const occurrences = (mainEntity?.imports ?? []).filter((name) => name === clientIpFileEntityName).length;
    assert.equal(occurrences, 1, 'ClientIpFile must be folded exactly once, not once per resolved import from the same barrel');
  });

  it('bound (b): no entity is fabricated for the re-exported name itself (getClientIp stays unresolvable)', () => {
    const result = convert();
    const getClientIpEntity = result.entities.find((e) => 'name' in e && (e as { name: string }).name === 'GetClientIp');
    assert.equal(
      getClientIpEntity,
      undefined,
      'getClientIp must never become a Function/Class/DTO/etc. entity — only the barrel File is provably consumed',
    );
  });

  it('the converted document checks clean end to end (checker/orphaned-file does not fire on the barrel)', async () => {
    const result = convert();
    const typedMind = await TypedMind.create();
    const checkResult = typedMind.check(result.tmdContent);
    const orphanedFileFindings = checkResult.diagnostics.filter((d) => d.code === 'checker/orphaned-file');
    assert.deepEqual(
      orphanedFileFindings,
      [],
      `expected zero checker/orphaned-file findings, got: ${JSON.stringify(orphanedFileFindings)}`,
    );
    assert.equal(checkResult.valid, true);
  });
});
