// RFC-TM-6 Q2 (rfc-tm-6-diamond.md §2/§4) — captures the FLIPPED renderer's
// graph, metrics, and dependency-branch output into goldens/live/, over the
// same 7-fixture-document set Q1 captured from legacy. goldens/legacy-baseline/
// (Q1's output) is pinned and untouched by this file — per the doc's "Q1's
// legacy-captured goldens are copied to a read-only goldens/legacy-baseline/
// tree that never changes after Q1. Post-flip goldens live beside them."
//
// This file replaces capture-legacy-graph-goldens.test.ts (Q1, deleted in this
// Quantum): that file called setProgramGraph/setValidationResult(ValidationResult),
// both removed from the renderer classes by this flip (per §2, "not
// dual-tracked"). Q1's baseline JSON is already checked in and frozen; nothing
// needs to re-run the legacy engine to keep it current (§4 "No retirement
// dependency" — the classifier is file-vs-file, not live-vs-legacy).
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DtoNode, TypedMind } from '@sammons/typed-mind';
import { AdvancedTypedMindRenderer } from '../advanced-renderer.ts';
import type { CodeGenConfig } from '../codegen/code-generation.ts';
import { CodeGenerationEngine } from '../codegen/code-generation.ts';
import { EnhancedTypedMindRenderer } from '../enhanced-index.ts';
import { InteractiveTypedMindRenderer } from '../interactive-renderer.ts';
import { GraphMetricsAnalyzer } from '../metrics/graph-metrics.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const liveDir = join(packageDir, 'goldens', 'live');
const fixturesDir = join(testDir, 'fixtures');

// Same closed fixture-document list as Q1's capture (§1) — the flip's output
// is only comparable to the baseline over the same documents.
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
  // Review follow-up (post-Q1): tm6-branches.tmd's `imports`/`exports` lists
  // are WIDER than the doc's rfc-tm-6-diamond.md §1 literal fixture text
  // (`<- [helperFn]` / `-> [BaseSvc, ChildSvc]`). The literal text fails
  // legacy validation with 8 errors (AppEntry's <- [helperFn] alone doesn't
  // resolve BaseSvc/Serializable/ChildSvc/RootPanel/SidePanel as imports, so
  // getEntityDependencies and the graph-link goldens can't exercise every
  // branch the doc names). The fixture actually checked in widens both
  // lists to include every branch entity, verified clean (0 diagnostics)
  // against both engines. The OrphanPanel declared/derived containment
  // mismatch — the fixture's actual purpose, per §1's "declared/derived
  // containment mismatch... this document can [catch a wrong-source join]"
  // — is preserved unchanged: OrphanPanel's `< [SidePanel]` (declaredContainedBy)
  // vs RootPanel's `> [OrphanPanel, SidePanel]` (derived containedBy) still
  // disagree exactly as the doc specifies.
  {
    name: 'tm6-branches',
    absPath: join(fixturesDir, 'tm6-branches.tmd'),
  },
];

const readFixture = (absPath: string): string => readFileSync(absPath, 'utf8');

// Same repo-root path-scrubbing the Q1 harness applies, so live goldens are
// comparable across machines/CI the same way the baseline is.
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

// PerformanceMonitor.getAllMetrics() (performance/spatial-index.ts) records
// wall-clock performance.now() deltas — same non-determinism the Q1 harness
// normalized for the advanced snapshot.
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

const writeLiveGolden = (path: string, value: unknown): void => {
  const normalized = normalizePaths(JSON.parse(JSON.stringify(value)));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
};

describe('RFC-TM-6 Q2 — flipped-renderer graph/metrics/dependency-branch goldens (goldens/live/)', () => {
  for (const doc of FIXTURE_DOCS) {
    describe(doc.name, () => {
      it('captures the interactive-renderer graph snapshot', async () => {
        const source = readFixture(doc.absPath);
        const typedMind = await TypedMind.create();
        const graph = typedMind.parse(source, doc.absPath);
        const { diagnostics } = typedMind.check(source, doc.absPath);

        const renderer = new InteractiveTypedMindRenderer();
        renderer.setGraph(graph);
        renderer.setValidationResult(diagnostics);
        const snapshot = renderer.getGraphSnapshot();

        writeLiveGolden(join(liveDir, 'graph', `${doc.name}.interactive.json`), snapshot);
      });

      it('captures the enhanced-index graph snapshot', async () => {
        const source = readFixture(doc.absPath);
        const typedMind = await TypedMind.create();
        const graph = typedMind.parse(source, doc.absPath);
        const { diagnostics } = typedMind.check(source, doc.absPath);

        const renderer = new EnhancedTypedMindRenderer();
        renderer.setGraph(graph);
        renderer.setValidationResult(diagnostics);
        const snapshot = renderer.getGraphSnapshot();

        writeLiveGolden(join(liveDir, 'graph', `${doc.name}.enhanced.json`), snapshot);
      });

      it('captures the advanced-renderer graph snapshot (async, stubbed links captured as-is)', async () => {
        const source = readFixture(doc.absPath);
        const typedMind = await TypedMind.create();
        const graph = typedMind.parse(source, doc.absPath);
        const { diagnostics } = typedMind.check(source, doc.absPath);

        const renderer = new AdvancedTypedMindRenderer();
        await renderer.setGraph(graph);
        await renderer.setValidationResult(diagnostics);
        const snapshot = normalizeAdvancedSnapshot(renderer.getGraphSnapshot());

        writeLiveGolden(join(liveDir, 'graph', `${doc.name}.advanced.json`), snapshot);
      });

      it('captures the GraphMetricsAnalyzer HealthScore', async () => {
        const source = readFixture(doc.absPath);
        const typedMind = await TypedMind.create();
        const graph = typedMind.parse(source, doc.absPath);

        const analyzer = new GraphMetricsAnalyzer(graph);
        const analysis = analyzer.analyzeGraph();

        writeLiveGolden(join(liveDir, 'metrics', `${doc.name}.health-score.json`), analysis.healthScore);
      });
    });
  }

  it('captures the getEntityDependencies dependency-branch golden (tm6-branches.tmd)', async () => {
    const absPath = join(fixturesDir, 'tm6-branches.tmd');
    const source = readFixture(absPath);
    const typedMind = await TypedMind.create();
    const graph = typedMind.parse(source, absPath);

    const engine = new CodeGenerationEngine();
    const engineInternals = engine as unknown as {
      getEntityDependencies(entity: unknown): string[];
    };

    const branches = ['AppEntry', 'ChildSvc', 'helperFn', 'BaseSvc', 'Serializable', 'RootPanel', 'SidePanel', 'OrphanPanel'];
    const dependencyLists: Record<string, string[]> = {};
    for (const name of branches) {
      const entity = graph.entities.find((candidate) => candidate.name === name);
      assert.ok(entity, `fixture must define ${name}`);
      dependencyLists[name] = engineInternals.getEntityDependencies(entity);
    }

    writeLiveGolden(join(liveDir, 'dependency-branches', 'tm6-branches.json'), dependencyLists);
  });

  // Regression for the DtoFieldNode.isOptional read in generateDTOInterface
  // (codegen/code-generation.ts): the generator used to read the nonexistent
  // `field.optional`, so no generated DTO interface ever emitted a `?`
  // marker. UserDTO below carries one optional field (email) and one
  // required field (id) so both branches of the ternary are exercised.
  it('emits a ? marker only for optional DTO fields in the generated TypeScript interface', async () => {
    const source = `UserDTO % "User data transfer object"\n  - id: string "User ID"\n  - email: string "Email address" (optional)\n`;
    const absPath = join(fixturesDir, 'dto-optional-field.tmd');
    const typedMind = await TypedMind.create();
    const graph = typedMind.parse(source, absPath);

    const dto = graph.entities.find((candidate) => candidate.name === 'UserDTO');
    assert.ok(dto instanceof DtoNode, 'fixture must define UserDTO as a DTO entity');

    const config: CodeGenConfig = {
      language: 'typescript',
      framework: 'none',
      outputDirectory: 'src',
      includeTests: false,
      includeComments: false,
      includeTypeDefinitions: false,
      codeStyle: {
        indentation: 'spaces',
        indentSize: 2,
        quotes: 'single',
        semicolons: true,
        trailingCommas: true,
        maxLineLength: 120,
      },
      patterns: {
        useInterfaces: true,
        useAbstractClasses: false,
        useDependencyInjection: false,
        useAsyncAwait: true,
      },
    };

    const engine = new CodeGenerationEngine();
    const generated = await engine.generateEntity(dto, config, graph);
    const [file] = generated.files;
    assert.ok(file, 'TypeScript generator must emit one file for a DTO entity');

    const idLine = file.content.split('\n').find((line) => line.includes('id:'));
    const emailLine = file.content.split('\n').find((line) => line.includes('email'));
    assert.equal(idLine, '  id: string;');
    assert.equal(emailLine, '  email?: string;');
  });
});
