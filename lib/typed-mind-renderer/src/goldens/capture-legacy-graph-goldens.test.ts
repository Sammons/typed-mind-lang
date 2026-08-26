// RFC-TM-6 Q1 (rfc-tm-6-diamond.md §1) — captures the legacy-engine graph,
// metrics, and dependency-branch goldens BEFORE any bridge flip. The graph
// paths in this package have no other specification; their current output
// (parsed and checked by the frozen legacy DSLChecker) IS the specification.
//
// This file both WRITES the checked-in JSON goldens under
// goldens/legacy-baseline/ (on first run / when a fixture changes) and
// ASSERTS the live capture still matches the committed baseline — so a
// regression in the untouched legacy engine, or an accidental production
// edit in this Quantum, fails CI immediately. Regenerate deliberately with
// `node --test --test-name-pattern=REGENERATE` is NOT wired; goldens are
// committed as source and updated by hand-reviewed diff, per the doc's
// "pinned baseline" design (§4).
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';
import { AdvancedTypedMindRenderer } from '../advanced-renderer.ts';
import { CodeGenerationEngine } from '../codegen/code-generation.ts';
import { EnhancedTypedMindRenderer } from '../enhanced-index.ts';
import { InteractiveTypedMindRenderer } from '../interactive-renderer.ts';
import { GraphMetricsAnalyzer } from '../metrics/graph-metrics.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const baselineDir = join(packageDir, 'goldens', 'legacy-baseline');

// Fixture documents named in rfc-tm-6-diamond.md §1 (closed list, 7 — the
// circular pair counts as one two-file document): scenario-34 (A12 census
// ClassFiles), scenario-35 (UIComponent containment, declared/derived
// agreement), scenario-31 (mixed syntax), scenario-21 (aliased imports —
// non-empty legacy errors), imports/circular/module-a + module-b (A6
// family), and the purpose-built tm6-branches.tmd.
interface FixtureDoc {
  readonly name: string;
  readonly paths: readonly string[];
  readonly parseFrom: string;
}

const FIXTURE_DOCS: readonly FixtureDoc[] = [
  {
    name: 'scenario-34-cli-tool',
    paths: ['lib/typed-mind-test-suite/scenarios/scenario-34-cli-tool.tmd'],
    parseFrom: 'lib/typed-mind-test-suite/scenarios/scenario-34-cli-tool.tmd',
  },
  {
    name: 'scenario-35-video-game',
    paths: ['lib/typed-mind-test-suite/scenarios/scenario-35-video-game.tmd'],
    parseFrom: 'lib/typed-mind-test-suite/scenarios/scenario-35-video-game.tmd',
  },
  {
    name: 'scenario-31-mixed-syntax',
    paths: ['lib/typed-mind-test-suite/scenarios/scenario-31-mixed-syntax.tmd'],
    parseFrom: 'lib/typed-mind-test-suite/scenarios/scenario-31-mixed-syntax.tmd',
  },
  {
    name: 'scenario-21-aliased-import',
    paths: ['lib/typed-mind-test-suite/scenarios/scenario-21-aliased-import.tmd'],
    parseFrom: 'lib/typed-mind-test-suite/scenarios/scenario-21-aliased-import.tmd',
  },
  {
    name: 'imports-circular-module-a-b',
    paths: [
      'lib/typed-mind-test-suite/scenarios/imports/circular/module-a.tmd',
      'lib/typed-mind-test-suite/scenarios/imports/circular/module-b.tmd',
    ],
    parseFrom: 'lib/typed-mind-test-suite/scenarios/imports/circular/module-a.tmd',
  },
  {
    name: 'tm6-branches',
    paths: ['lib/typed-mind-test-suite/scenarios/tm6-branches.tmd'],
    parseFrom: 'lib/typed-mind-test-suite/scenarios/tm6-branches.tmd',
  },
];

const readFixture = (relativePath: string): string => readFileSync(join(repoRoot, relativePath), 'utf8');

// PerformanceMonitor.getAllMetrics() (performance/spatial-index.ts) records
// wall-clock performance.now() deltas for 'graph-load-time' — genuinely
// non-deterministic across runs and machines. This is the advanced
// renderer's own pre-existing behavior (unchanged by this Quantum); the
// harness normalizes only this one non-deterministic leaf so the golden
// diff is stable, matching the doc's "captured as-is" instruction for
// everything else in the advanced snapshot (stubbed links, healthScore,
// patterns all stay verbatim).
const normalizeAdvancedSnapshot = (snapshot: unknown): unknown => {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
  const metadata = cloned.metadata as Record<string, unknown> | undefined;
  if (metadata && typeof metadata === 'object' && 'performance' in metadata) {
    const performance = metadata.performance as Record<string, unknown> | undefined;
    if (performance && typeof performance === 'object' && 'graph-load-time' in performance) {
      performance['graph-load-time'] = '<normalized: non-deterministic wall-clock timing>';
    }
  }
  return cloned;
};

const readGoldenIfPresent = (path: string): unknown => {
  if (!existsSync(path)) {
    return undefined;
  }
  return JSON.parse(readFileSync(path, 'utf8'));
};

const writeGolden = (path: string, value: unknown): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

// Captures `value` against the checked-in golden at `path`. On first run
// (no committed golden yet) it writes the golden and passes — this is how
// Q1 establishes the pinned baseline in this very PR. On every subsequent
// run it asserts equality, so the legacy-baseline tree is truly read-only
// after this Quantum merges.
const assertMatchesGolden = (path: string, value: unknown): void => {
  const existing = readGoldenIfPresent(path);
  if (existing === undefined) {
    writeGolden(path, value);
    return;
  }
  // The legacy entity objects carry explicit `undefined`-valued keys
  // (e.g. `comment: undefined`, `extends: undefined`) that JSON.stringify
  // drops on write. Round-tripping the live value through JSON before
  // comparing makes both sides the same shape the checked-in golden can
  // actually represent — otherwise node:assert/strict's deepEqual (which
  // is strict-equal, not loose, despite the name) fails on every run past
  // the first even though nothing regressed.
  const normalized = JSON.parse(JSON.stringify(value));
  assert.deepEqual(normalized, existing);
};

describe('RFC-TM-6 Q1 — legacy graph/metrics/dependency-branch goldens', () => {
  let checker: DSLChecker;

  before(() => {
    checker = new DSLChecker();
  });

  for (const doc of FIXTURE_DOCS) {
    describe(doc.name, () => {
      it('captures the interactive-renderer graph snapshot', () => {
        const source = readFixture(doc.parseFrom);
        const graph = checker.parse(source, join(repoRoot, doc.parseFrom));
        const validation = checker.check(source, join(repoRoot, doc.parseFrom));

        const renderer = new InteractiveTypedMindRenderer();
        renderer.setProgramGraph(graph);
        renderer.setValidationResult(validation);
        const snapshot = renderer.getGraphSnapshot();

        assertMatchesGolden(join(baselineDir, 'graph', `${doc.name}.interactive.json`), snapshot);
      });

      it('captures the enhanced-index graph snapshot', () => {
        const source = readFixture(doc.parseFrom);
        const graph = checker.parse(source, join(repoRoot, doc.parseFrom));
        const validation = checker.check(source, join(repoRoot, doc.parseFrom));

        const renderer = new EnhancedTypedMindRenderer();
        renderer.setProgramGraph(graph);
        renderer.setValidationResult(validation);
        const snapshot = renderer.getGraphSnapshot();

        assertMatchesGolden(join(baselineDir, 'graph', `${doc.name}.enhanced.json`), snapshot);
      });

      it('captures the advanced-renderer graph snapshot (async, stubbed links captured as-is)', async () => {
        const source = readFixture(doc.parseFrom);
        const graph = checker.parse(source, join(repoRoot, doc.parseFrom));
        const validation = checker.check(source, join(repoRoot, doc.parseFrom));

        const renderer = new AdvancedTypedMindRenderer();
        await renderer.setProgramGraph(graph);
        await renderer.setValidationResult(validation);
        const snapshot = normalizeAdvancedSnapshot(renderer.getGraphSnapshot());

        assertMatchesGolden(join(baselineDir, 'graph', `${doc.name}.advanced.json`), snapshot);
      });

      it('captures the GraphMetricsAnalyzer HealthScore', () => {
        const source = readFixture(doc.parseFrom);
        const graph = checker.parse(source, join(repoRoot, doc.parseFrom));

        const analyzer = new GraphMetricsAnalyzer(graph);
        const analysis = analyzer.analyzeGraph();

        assertMatchesGolden(join(baselineDir, 'metrics', `${doc.name}.health-score.json`), analysis.healthScore);
      });
    });
  }

  it('captures the getEntityDependencies dependency-branch golden (tm6-branches.tmd)', () => {
    const source = readFixture('lib/typed-mind-test-suite/scenarios/tm6-branches.tmd');
    const filePath = join(repoRoot, 'lib/typed-mind-test-suite/scenarios/tm6-branches.tmd');
    const graph = checker.parse(source, filePath);

    const engine = new CodeGenerationEngine();
    // getEntityDependencies (codegen/code-generation.ts:270-282) is private
    // and has no other caller-facing seam; RFC-TM-6 Q1 names only the 3
    // renderer getGraphSnapshot() accessors as production changes (§1), so
    // this reaches the private method directly rather than adding a 4th
    // accessor the doc never authorized. Test-only, zero production impact.
    const engineInternals = engine as unknown as {
      getEntityDependencies(entity: unknown): string[];
    };

    const branches = ['AppEntry', 'ChildSvc', 'helperFn', 'BaseSvc', 'Serializable', 'RootPanel', 'SidePanel', 'OrphanPanel'];
    const dependencyLists: Record<string, string[]> = {};
    for (const name of branches) {
      const entity = graph.entities.get(name);
      assert.ok(entity, `fixture must define ${name}`);
      dependencyLists[name] = engineInternals.getEntityDependencies(entity);
    }

    assertMatchesGolden(join(baselineDir, 'dependency-branches', 'tm6-branches.json'), dependencyLists);
  });
});
