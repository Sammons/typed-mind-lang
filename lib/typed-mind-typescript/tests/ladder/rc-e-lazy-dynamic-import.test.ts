// RC-E (issue #107) — `lazy(() => import('./pages/Home.js'))`, preact-iso's
// (and React.lazy's) route-level code-splitting idiom, produced no
// import-graph edge: TM-9 Q1 (X-AN-2) made a top-level/statement-level
// dynamic `import()` visible, but the analyzer's own visitor already walks
// every expression depth via `ts.forEachChild` — the gap was entirely on
// the converter side, which never consumed `module.dynamicImportSpecifiers`
// at all in `convertImports`. Fixed with a post-pass
// (`foldDynamicImportsIntoSourceFiles`, mirroring the SST-handler fold)
// that resolves each dynamic-import specifier via the SAME
// `moduleGraphResolution` map RC-A's fix populates (which already covers
// dynamic imports per X-AN-1's own doc comment) and folds the target
// File/ClassFile entity name into the importing module's `imports:` list.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('44-lazy-dynamic-import'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('44-lazy-dynamic-import', 'src', 'App.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RC-E: a dynamic import() nested inside a call/arrow argument (lazy(() => import(...))) resolves to a real import edge', () => {
  it("the importing module's File entity names the lazy-loaded target module", () => {
    const result = convert();
    assert.equal(result.success, true);

    const appEntity = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('App.ts')) as
      | { imports: readonly string[] }
      | undefined;
    assert.notEqual(appEntity, undefined, "App.ts's File entity must exist");

    const homeFileEntity = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('home.ts')) as { name: string } | undefined;
    assert.notEqual(homeFileEntity, undefined, "pages/home.ts's File entity must exist");
    const homeFileEntityName = homeFileEntity?.name ?? '';

    assert.ok(
      appEntity?.imports.includes(homeFileEntityName),
      `expected '${homeFileEntityName}' (from lazy(() => import('./pages/home.ts'))) in App's imports list, got: ${JSON.stringify(appEntity?.imports)}`,
    );
  });

  it('the lazy-loaded module and its export are real, resolvable entities', () => {
    const result = convert();
    assert.equal(result.success, true);

    const home = result.entities.find((e) => e.kind === 'Function' && e.name === 'Home');
    assert.notEqual(home, undefined, 'Home must be extracted as a real entity');
  });

  it('checker verdict: zero orphaned-file findings for the lazy-loaded module', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);

    const orphanFindings = checkResult.diagnostics.filter((d) => d.code === 'checker/orphaned-file' && d.message.includes('home.ts'));
    assert.deepEqual(
      orphanFindings,
      [],
      `pages/home.ts must not orphan now that its lazy()-wrapped dynamic import resolves: ${JSON.stringify(orphanFindings)}`,
    );
  });

  it('a non-literal (computed) dynamic-import specifier still surfaces the existing diagnostic, not silence', () => {
    // Verifies the fix does not disturb the pre-existing non-literal-
    // specifier diagnostic path (X-AN-2) even when the computed import()
    // is nested inside a call argument the same way the literal case is
    // (fixture 45's `lazy(() => import(\`./pages/\${page}.ts\`))`).
    const analyzer = new TypeScriptAnalyzer(fixturePath('45-lazy-dynamic-import-computed'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('45-lazy-dynamic-import-computed', 'src', 'App.ts'));
    const nonLiteralDiagnostics = analysis.diagnostics.filter((d) => d.category === 'non-literal-dynamic-import');
    assert.equal(
      nonLiteralDiagnostics.length,
      1,
      `expected exactly one non-literal-dynamic-import diagnostic, got: ${JSON.stringify(analysis.diagnostics)}`,
    );
  });
});
