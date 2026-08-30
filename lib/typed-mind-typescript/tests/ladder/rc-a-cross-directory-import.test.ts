// RC-A (ladder-diagnostic-disposition-2026-08-29.md rank 1, issue #99) —
// the DOMINANT root cause across the cross-target ladder disposition: 301
// diagnostic instances (functions-api, web-main, web-app, ops-cli).
// `registerModuleExports`/`resolveImportToEntity` (typescript-to-typedmind-
// converter.ts) registered/looked up `exportRegistry` under a fixed
// enumeration of GUESSED specifier shapes (bare filename, `types/`/
// `services/`-prefixed forms only). Any relative import crossing into an
// arbitrary subdirectory (`./pages/Home.js`, `./commands/tenant.js`, ...)
// was never one of the guessed shapes, so the reference edge silently
// dropped — no diagnostic, just a missing `<-`/`->` entry. Fixed by
// indexing the analyzer's own `ts.resolveModuleName`-backed resolution
// (X-AN-1, `analysis.moduleGraph`) and consulting it FIRST in
// `resolveImportToEntity`, keyed by `(sourceModule, specifier)` so the
// converter reuses the exact resolution the analyzer already computed
// instead of re-deriving it by guessing.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('38-cross-directory-import'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('38-cross-directory-import', 'src', 'App.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RC-A: cross-directory relative-import specifiers (./pages/*, ./commands/*) resolve to a real import edge', () => {
  it("the entrypoint File's imports list names both cross-directory dependencies it actually imports", () => {
    const result = convert();
    assert.equal(result.success, true);

    const appEntity = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('App.ts')) as
      | { imports: readonly string[] }
      | undefined;
    assert.notEqual(appEntity, undefined, "App.ts's File entity must exist");
    assert.ok(
      appEntity?.imports.includes('Home'),
      `expected 'Home' (from ./pages/home.ts) in the File's imports list, got: ${JSON.stringify(appEntity?.imports)}`,
    );
    assert.ok(
      appEntity?.imports.includes('tenantCommand'),
      `expected 'tenantCommand' (from ./commands/tenant.ts) in the File's imports list, got: ${JSON.stringify(appEntity?.imports)}`,
    );
  });

  it('both cross-directory exports are real, resolvable entities — not merely named in text', () => {
    const result = convert();
    assert.equal(result.success, true);

    const home = result.entities.find((e) => e.kind === 'Function' && e.name === 'Home');
    assert.notEqual(home, undefined, 'Home must be extracted as a real entity');
    const tenantCommand = result.entities.find((e) => e.kind === 'Function' && e.name === 'tenantCommand');
    assert.notEqual(tenantCommand, undefined, 'tenantCommand must be extracted as a real entity');
  });

  it('checker verdict: zero orphaned-entity/orphaned-file findings for either cross-directory module', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);

    const orphanFindings = checkResult.diagnostics.filter(
      (d) =>
        (d.code === 'checker/orphaned-entity' || d.code === 'checker/orphaned-file') &&
        (d.message.includes('Home') ||
          d.message.includes('tenantCommand') ||
          d.message.includes('home.ts') ||
          d.message.includes('tenant.ts')),
    );
    assert.deepEqual(
      orphanFindings,
      [],
      `pages/home.ts and commands/tenant.ts must not orphan now that their import edges resolve: ${JSON.stringify(orphanFindings)}`,
    );
  });
});
