// RFC-TM-9 Q1 checks (4), (8) — the webhookstorage-signature fixture's Q1
// half: a two-package composite layout with TS project references matching
// the real clone's shape, with TWO entrypoints per RFC §8:
//
//   - infra/api.ts — within the root tsconfig's `include` (root excludes
//     `packages/` entirely, matching the real repo's
//     `"exclude": ["node_modules", ".sst", "packages"]`).
//   - packages/ingest/src/server.ts — a package-rooted entrypoint whose
//     import crosses into packages/core, exercising the composite
//     project-references boundary the root config can never reach (the F1
//     review finding: reference metadata alone does not pull a referenced
//     project's sources into the program's file set — only the config-graph
//     union program construction does, and only a package-rooted entrypoint
//     proves it).
//
// The module-graph.json goldens are exact edge-list diffs (RFC §1 — count
// summaries are explicitly rejected as a check).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(testDir, 'repros-analyzer', 'webhookstorage-signature');

const loadGolden = (name: string): unknown => JSON.parse(readFileSync(join(fixtureDir, name), 'utf8'));

describe('RFC-TM-9 Q1 check (4) — webhookstorage-signature: package-rooted entrypoint crosses into packages/core', () => {
  it('packages/ingest/src/server.ts resolves the cross-package edge via the config-graph union program', () => {
    const projectDir = join(fixtureDir, 'packages', 'ingest');
    const analyzer = new TypeScriptAnalyzer(projectDir);
    const analysis = analyzer.analyzeFromEntrypoint(join(projectDir, 'src', 'server.ts'));

    // The union program must include packages/core's sources even though
    // packages/ingest's OWN tsconfig include is only "src" — this is the
    // config-graph union walk following `references: [{ path: "../core" }]`.
    assert.equal(analysis.modules.length, 2, 'expected server.ts + notification-signing.ts (cross-package)');
    const coreModule = analysis.modules.find((m) => m.filePath.endsWith('notification-signing.ts'));
    assert.notEqual(coreModule, undefined, 'packages/core must be reachable through the composite reference, not just metadata-attached');
    assert.equal(coreModule?.functions[0]?.name, 'signNotification');

    // Exact module-graph.json diff — the Q1 leaf check.
    const golden = loadGolden('module-graph.ingest.json');
    const actual = analysis.moduleGraph.map((edge) => ({
      sourceModule: edge.sourceModule,
      specifier: edge.specifier,
      resolvedTarget: edge.resolvedTarget,
      classification: edge.classification,
    }));
    assert.deepEqual(actual, golden, 'module-graph.json must exact-match: source, specifier, resolved target, classification');

    assert.equal(analysis.diagnostics.length, 0, 'no diagnostics expected on the happy-path cross-package resolution');
  });
});

describe('RFC-TM-9 Q1 check (8, half 1) — webhookstorage-signature: root-included infra/ entrypoint resolves independently', () => {
  it('infra/api.ts resolves under the root config (which excludes packages/) with zero cross-package leakage', () => {
    const analyzer = new TypeScriptAnalyzer(fixtureDir);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));

    assert.equal(analysis.modules.length, 1, 'infra/api.ts has no internal imports in this distilled fixture');
    assert.equal(analysis.diagnostics.length, 0);

    const golden = loadGolden('module-graph.infra.json');
    assert.deepEqual(analysis.moduleGraph, golden);
  });
});
