// Real-target evaluation (sammons/architecture-notebook, a Lit web app +
// node:http server) — a `.ts`-suffixed relative re-export specifier:
// `export { list_types_route } from './types-list.ts'`. Legal under
// `allowImportingTsExtensions` and idiomatic in any Node type-stripping
// project (the exact style this whole repo's rule layer mandates, per
// `module_is_nodenext` in knowledge/pillars/main.md). The converter's
// `processReExport` called a hand-rolled `resolveModulePath` filesystem
// probe that appends extensions to an ALREADY-suffixed path — given
// `./types-list.ts` it probed `types-list.ts.ts` and `types-list.ts/index.ts`,
// found neither, and emitted the false warning `Re-export source module not
// found: ./types-list.ts (re-exporting list_types_route)` even though the
// file plainly exists. This is the census's A-g2 `.js`-suffix defect
// surviving in the converter's own private copy of the resolver — the
// analyzer itself was already fixed to resolve via `ts.resolveModuleName`
// (X-AN-1) and records the edge in `moduleGraphResolution`. On the real
// target this was 17 false warnings.
//
// Fix (typescript-to-typedmind-converter.ts, `processReExport`): consult
// `moduleGraphResolution` — the analyzer's own resolved edge list — BEFORE
// falling back to the filesystem probe. If the analyzer already resolved
// this specifier from this module, trust it and skip the probe entirely;
// the probe only runs (and can only warn) when the analyzer found nothing.
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

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath('71-ts-suffix-reexport'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('71-ts-suffix-reexport', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('a `.ts`-suffixed relative re-export specifier resolves via the analyzer graph instead of a false "not found" warning', () => {
  it('conversion produces ZERO warnings about the re-export source not being found', () => {
    // The core assertion: on main this warning fires (`Re-export source
    // module not found: ./types-list.ts (re-exporting list_types_route)`)
    // because the converter's hand-rolled resolveModulePath probes the
    // already-suffixed path for a further extension. Post-fix, the
    // moduleGraphResolution lookup short-circuits the probe.
    const result = convert();
    assert.equal(result.success, true);
    const notFoundWarnings = result.warnings.filter((w) => /Re-export source module not found/.test(w.message));
    assert.deepEqual(notFoundWarnings, [], `expected zero "not found" re-export warnings, got: ${JSON.stringify(notFoundWarnings)}`);
  });

  it('the re-exported list_types_route still resolves — the barrel and the source file both exist as entities', () => {
    // Baseline sanity check: entity extraction was never broken by this gap
    // (only the extraneous warning was), so this assertion passes on main
    // too. It pins the shape the fix must not disturb while fixing the
    // warning in the previous test — see that test for the regression proof.
    const result = convert();
    assert.equal(result.success, true);

    const barrel = result.entities.find((e) => e.name === 'TypesFile') as { kind: string; reExports: readonly string[] } | undefined;
    assert.notEqual(barrel, undefined, 'the barrel File entity (types.ts) must exist');
    assert.equal(barrel?.kind, 'File');
    assert.ok(
      barrel?.reExports.includes('list_types_route'),
      `expected the barrel's reExports to include list_types_route, got: ${JSON.stringify(barrel?.reExports)}`,
    );

    const source = result.entities.find((e) => e.name === 'TypesListFile') as { kind: string; exports: readonly string[] } | undefined;
    assert.notEqual(source, undefined, 'the source File entity (types-list.ts) must exist');
    assert.equal(source?.kind, 'File');
    assert.ok(
      source?.exports.includes('list_types_route'),
      `expected the source file's exports to include list_types_route, got: ${JSON.stringify(source?.exports)}`,
    );
  });

  it('the fixture checks fully clean (zero diagnostics)', async () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    assert.deepEqual(
      checkResult.diagnostics,
      [],
      `expected the whole fixture to check clean, got: ${JSON.stringify(checkResult.diagnostics)}`,
    );
  });
});
