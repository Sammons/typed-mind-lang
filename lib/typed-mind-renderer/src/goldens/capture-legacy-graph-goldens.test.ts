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
import { describe, it } from 'node:test';
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
const fixturesDir = join(testDir, 'fixtures');

// Fixture documents named in rfc-tm-6-diamond.md §1 (closed list, 7 — the
// circular pair counts as one two-file document): scenario-34 (A12 census
// ClassFiles), scenario-35 (UIComponent containment, declared/derived
// agreement), scenario-31 (mixed syntax), scenario-21 (aliased imports —
// non-empty legacy errors), imports/circular/module-a + module-b (A6
// family), and the purpose-built tm6-branches.tmd. tm6-branches.tmd lives
// under this package's own src/goldens/fixtures/ (NOT the shared
// lib/typed-mind-test-suite/scenarios/ corpus root) so it does not perturb
// lib/typed-mind/scripts/shadow-verdict-harness.mjs's frozen 141-document
// corpus attestation (TM-4-owned, unrelated to this Quantum).
interface FixtureDoc {
  readonly name: string;
  readonly absPath: string;
}

const FIXTURE_DOCS: readonly FixtureDoc[] = [
  {
    name: 'scenario-34-cli-tool',
    absPath: join(repoRoot, 'lib/typed-mind-test-suite/scenarios/scenario-34-cli-tool.tmd'),
  },
  {
    name: 'scenario-35-video-game',
    absPath: join(repoRoot, 'lib/typed-mind-test-suite/scenarios/scenario-35-video-game.tmd'),
  },
  {
    name: 'scenario-31-mixed-syntax',
    absPath: join(repoRoot, 'lib/typed-mind-test-suite/scenarios/scenario-31-mixed-syntax.tmd'),
  },
  {
    name: 'scenario-21-aliased-import',
    absPath: join(repoRoot, 'lib/typed-mind-test-suite/scenarios/scenario-21-aliased-import.tmd'),
  },
  {
    name: 'imports-circular-module-a-b',
    absPath: join(repoRoot, 'lib/typed-mind-test-suite/scenarios/imports/circular/module-a.tmd'),
  },
  {
    name: 'tm6-branches',
    absPath: join(fixturesDir, 'tm6-branches.tmd'),
  },
];

const readFixture = (absPath: string): string => readFileSync(absPath, 'utf8');

// The legacy ImportResolver caches alias-PREFIXED clones per DSLChecker
// instance (lib/typed-mind/src/import-resolver.ts:97-99). Reusing one
// instance across parse() and check() — or across multiple documents —
// cross-contaminates aliased-import resolution: scenario-21's
// `@import ... as UI` / `as DB` entities collapse onto the wrong source
// file when a shared instance's cache leaks between calls. This mirrors
// lib/typed-mind/scripts/shadow-verdict-harness.mjs's runLegacy, which
// deliberately constructs a FRESH `new DSLChecker()` for check() and
// another FRESH one for parse() on every document — never reusing an
// instance. Verified against the harness: this exact shape reproduces its
// frozen A11 census (3 "references unknown parent" errors on scenario-21)
// bit-for-bit; the earlier reused-instance version of this file produced
// 22-23 unrelated errors and 0 matches, because the shared cache had
// already resolved `database.tmd` under both the UI and DB aliases before
// scenario-21's own calls ran.
const checkDocument = (source: string, absPath: string) => new DSLChecker().check(source, absPath);
const parseDocument = (source: string, absPath: string) => new DSLChecker().parse(source, absPath);

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

// The legacy engine embeds absolute filesystem paths in several error
// messages (e.g. import-resolver.ts's "Circular import detected: <abs> ->
// <abs>" chain). Left as absolute paths, a golden captured on one machine
// (a worktree nested under .claude/worktrees/<slug>/) never matches a
// capture from another (a shallow CI checkout) even though nothing
// regressed — this is the same class of bug as the converter's
// process.cwd()-dependent relative paths, just baked in at a different
// layer (message TEXT rather than a computed field). Every string value
// anywhere in the snapshot gets repoRoot stripped and replaced with a
// stable token before it is written to or compared against a golden.
const REPO_ROOT_TOKEN = '<REPO_ROOT>';

const normalizePaths = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.split(repoRoot).join(REPO_ROOT_TOKEN);
  }
  if (Array.isArray(value)) {
    return value.map(normalizePaths);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = normalizePaths(val);
    }
    return out;
  }
  return value;
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
  // The legacy entity objects carry explicit `undefined`-valued keys
  // (e.g. `comment: undefined`, `extends: undefined`) that JSON.stringify
  // drops on write. Round-tripping the live value through JSON before
  // comparing makes both sides the same shape the checked-in golden can
  // actually represent — otherwise node:assert/strict's deepEqual (which
  // is strict-equal, not loose, despite the name) fails on every run past
  // the first even though nothing regressed. normalizePaths runs on the
  // already-JSON-shaped value so both the write path and the compare path
  // see identical treatment.
  const normalized = normalizePaths(JSON.parse(JSON.stringify(value)));
  const existing = readGoldenIfPresent(path);
  if (existing === undefined) {
    writeGolden(path, normalized);
    return;
  }
  assert.deepEqual(normalized, existing);
};

describe('RFC-TM-6 Q1 — legacy graph/metrics/dependency-branch goldens', () => {
  for (const doc of FIXTURE_DOCS) {
    describe(doc.name, () => {
      it('captures the interactive-renderer graph snapshot', () => {
        const source = readFixture(doc.absPath);
        const graph = parseDocument(source, doc.absPath);
        const validation = checkDocument(source, doc.absPath);

        const renderer = new InteractiveTypedMindRenderer();
        renderer.setProgramGraph(graph);
        renderer.setValidationResult(validation);
        const snapshot = renderer.getGraphSnapshot();

        assertMatchesGolden(join(baselineDir, 'graph', `${doc.name}.interactive.json`), snapshot);
      });

      it('captures the enhanced-index graph snapshot', () => {
        const source = readFixture(doc.absPath);
        const graph = parseDocument(source, doc.absPath);
        const validation = checkDocument(source, doc.absPath);

        const renderer = new EnhancedTypedMindRenderer();
        renderer.setProgramGraph(graph);
        renderer.setValidationResult(validation);
        const snapshot = renderer.getGraphSnapshot();

        assertMatchesGolden(join(baselineDir, 'graph', `${doc.name}.enhanced.json`), snapshot);
      });

      it('captures the advanced-renderer graph snapshot (async, stubbed links captured as-is)', async () => {
        const source = readFixture(doc.absPath);
        const graph = parseDocument(source, doc.absPath);
        const validation = checkDocument(source, doc.absPath);

        const renderer = new AdvancedTypedMindRenderer();
        await renderer.setProgramGraph(graph);
        await renderer.setValidationResult(validation);
        const snapshot = normalizeAdvancedSnapshot(renderer.getGraphSnapshot());

        assertMatchesGolden(join(baselineDir, 'graph', `${doc.name}.advanced.json`), snapshot);
      });

      it('captures the GraphMetricsAnalyzer HealthScore', () => {
        const source = readFixture(doc.absPath);
        const graph = parseDocument(source, doc.absPath);

        const analyzer = new GraphMetricsAnalyzer(graph);
        const analysis = analyzer.analyzeGraph();

        assertMatchesGolden(join(baselineDir, 'metrics', `${doc.name}.health-score.json`), analysis.healthScore);
      });
    });
  }

  it('captures the getEntityDependencies dependency-branch golden (tm6-branches.tmd)', () => {
    const absPath = join(fixturesDir, 'tm6-branches.tmd');
    const source = readFixture(absPath);
    const graph = parseDocument(source, absPath);

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
