// Adversarial-review blocker fix (PR #105 review comment 1) —
// `registerModuleExports`'s `withoutExt` used to strip only
// `ts|tsx|js|jsx`, while `resolveImportToEntity`'s new RC-A fast path
// looks up `exportRegistry[this.stripKnownSourceExtension(resolvedTarget)]`,
// and `stripKnownSourceExtension` strips 8 extensions including
// `mts|cts|mjs|cjs`. For an `.mts` source module the write-side key
// ('src/pages/home.mts', unstripped) and the read-side lookup key
// ('src/pages/home', stripped) disagreed, so the fast path silently
// missed and fell through to the pre-existing guessed-specifier fallback
// — reproducing RC-A's own import-dropping bug for exactly the four
// extensions `stripKnownSourceExtension` covers beyond `withoutExt`'s
// original four. Fixed by making `withoutExt` call
// `stripKnownSourceExtension` directly so the two can never drift apart.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('42-mts-cross-directory-import'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('42-mts-cross-directory-import', 'src', 'App.mts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RC-A extension-mismatch fix: a cross-directory .mts import resolves to a real import edge', () => {
  it("the entrypoint File's imports list names the cross-directory .mts dependency it actually imports", () => {
    const result = convert();
    assert.equal(result.success, true);

    const appEntity = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('App.mts')) as
      | { imports: readonly string[] }
      | undefined;
    assert.notEqual(appEntity, undefined, "App.mts's File entity must exist");
    assert.ok(
      appEntity?.imports.includes('Home'),
      `expected 'Home' (from ./pages/home.mts) in the File's imports list, got: ${JSON.stringify(appEntity?.imports)}`,
    );
  });

  it('checker verdict: zero orphaned-entity/orphaned-file findings for the .mts dependency', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);

    const orphanFindings = checkResult.diagnostics.filter(
      (d) =>
        (d.code === 'checker/orphaned-entity' || d.code === 'checker/orphaned-file') &&
        (d.message.includes('Home') || d.message.includes('home.mts')),
    );
    assert.deepEqual(
      orphanFindings,
      [],
      `pages/home.mts must not orphan now that its .mts import edge resolves: ${JSON.stringify(orphanFindings)}`,
    );
  });
});
