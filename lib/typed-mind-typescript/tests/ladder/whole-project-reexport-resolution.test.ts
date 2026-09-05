// Fixture 112 — `TypeScriptAnalyzer.analyze()` (whole-project mode) resolves
// re-export sources through the same `ts.resolveModuleName` resolver
// `analyzeFromEntrypoint` uses. Before this fix, whole-project mode recorded
// no `moduleGraph` edges, so the converter fell back to a private
// extension-probing resolver that could not handle a `.ts`-suffixed
// specifier and warned `Re-export source module not found: ./normalize.ts`
// for a file that exists (fixture 111's out-of-scope note; the fixture-71
// defect surviving in that fallback).
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FileNode } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(testDir, 'repros-analyzer', '112-whole-project-reexport-resolution');

const analyzeFixture = (mode: 'whole-project' | 'entrypoint') => {
  const analyzer = new TypeScriptAnalyzer(fixtureRoot);
  return mode === 'whole-project' ? analyzer.analyze() : analyzer.analyzeFromEntrypoint(join(fixtureRoot, 'src', 'main.ts'));
};

const notFoundWarnings = (warnings: readonly { message: string }[]) =>
  warnings.map((warning) => warning.message).filter((message) => message.includes('Re-export source module not found'));

for (const mode of ['whole-project', 'entrypoint'] as const) {
  describe(`fixture 112 in ${mode} mode`, () => {
    it('records the re-export edge to the existing `.ts`-suffixed source in the module graph', () => {
      const analysis = analyzeFixture(mode);
      const barrelEdges = analysis.moduleGraph.filter((edge) => edge.sourceModule === join('src', 'barrel.ts'));
      assert.deepEqual(barrelEdges, [
        {
          sourceModule: join('src', 'barrel.ts'),
          specifier: './normalize.ts',
          resolvedTarget: join('src', 'normalize.ts'),
          classification: 'internal',
        },
        { sourceModule: join('src', 'barrel.ts'), specifier: './missing.ts', resolvedTarget: undefined, classification: 'unresolved' },
      ]);
    });

    it('raises exactly one unresolvable-import diagnostic, for the control specifier', () => {
      const analysis = analyzeFixture(mode);
      const unresolvable = analysis.diagnostics.filter((diagnostic) => diagnostic.category === 'unresolvable-import');
      assert.deepEqual(
        unresolvable.map((diagnostic) => diagnostic.specifier),
        ['./missing.ts'],
      );
    });

    it('warns only about the control re-export whose source does not exist, and records the real one', () => {
      const result = new TypeScriptToTypedMindConverter().convert(analyzeFixture(mode));
      assert.equal(result.success, true);
      assert.deepEqual(notFoundWarnings(result.warnings), ['Re-export source module not found: ./missing.ts (re-exporting missingHelper)']);

      const barrel = result.entities.find((entity): entity is FileNode => entity instanceof FileNode && entity.path.endsWith('barrel.ts'));
      assert.ok(
        barrel?.reExports.includes('normalizeVehicleString'),
        `expected the barrel to record the re-export, got: ${JSON.stringify(barrel?.reExports)}`,
      );
    });
  });
}
