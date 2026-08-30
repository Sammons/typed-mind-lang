// issue #87 (rfc-tm-10-diamond.md follow-up, tm10-inc4) — the DOMINANT root
// cause of the core target's diagnostic storm (238 of 265 diagnostics,
// 89.8%): `registerModuleExports` indexes `exportRegistry` under
// extension-LESS specifier guesses only (`./foo`, never `./foo.ts`), but a
// codebase writing explicit-extension internal imports (this repo's own
// `module_is_nodenext`/`verbatimModuleSyntax` convention) reports
// `imp.specifier` verbatim WITH the extension, so `resolveImportToEntity`'s
// `exportRegistry[specifier]` lookup always misses — the importing entity's
// `<- [...]` import-edge list silently drops every internal reference.
// Fixed by stripping a known source extension off the specifier before the
// `exportRegistry` lookup (issue #87's suggested option (b) — the more
// robust of the two, since it does not require registering every extension
// permutation a project might use).
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('36-extension-import-resolution'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('36-extension-import-resolution', 'src', 'main.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('issue #87: same-directory value imports with explicit .ts extensions produce a real <- import edge', () => {
  it("the entrypoint File's imports list names the same-directory function it actually imports", () => {
    const result = convert();
    assert.equal(result.success, true);

    // main.ts is the entrypoint: `processModule`'s ClassFile-fusion branch
    // explicitly excludes entry points ("always for entry points" ->
    // convertToSeparateEntities), so this fixture's top-level class is
    // extracted as a separate plain Class entity, and main.ts itself gets
    // a plain File entity — the File entity's `imports` list is where the
    // import edge issue #87 fixes must land.
    const mainEntity = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('main.ts')) as
      | { imports: readonly string[] }
      | undefined;
    assert.notEqual(mainEntity, undefined, "main.ts's File entity must exist");
    assert.ok(
      mainEntity?.imports.includes('checkOrphans'),
      `expected 'checkOrphans' in the File's imports list, got: ${JSON.stringify(mainEntity?.imports)}`,
    );
  });

  it('the imported function is a real, resolvable entity — not merely named in text', () => {
    const result = convert();
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'checkOrphans');
    assert.notEqual(fn, undefined, 'checkOrphans must be extracted as a real Function entity');
  });

  it('checker verdict: zero orphaned-entity/orphaned-file findings for the imported helper', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);

    const orphanFindings = checkResult.diagnostics.filter(
      (d) =>
        (d.code === 'checker/orphaned-entity' || d.code === 'checker/orphaned-file') &&
        (d.message.includes('checkHelper') || d.message.includes('checkOrphans')),
    );
    assert.deepEqual(
      orphanFindings,
      [],
      `checkHelper.ts/checkOrphans must not orphan now that the import edge resolves: ${JSON.stringify(orphanFindings)}`,
    );
  });
});
