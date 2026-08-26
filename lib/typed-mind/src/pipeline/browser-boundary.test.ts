// RFC-TM-3 §3.7 / §5 Q5 (rfc-tm-3-diamond.md) — the I-8 module-boundary
// precursor check, wired into the package test run: the static import graph
// from the pipeline's browser-safe entry (src/pipeline/index.ts) must reach no
// node:fs/node:path import. Verified in BOTH directions per the doc's Q5
// checks: the clean direction on the real entry, and the detection direction
// twice — on the real Node-only import-resolver.ts (whose node:fs/node:path
// imports the walker must find), and on a seeded temp-dir graph with a
// deliberate node:fs import. TM-7 hardens this against the real bundle.

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const pipelineDir = dirname(fileURLToPath(import.meta.url));

const BANNED_SPECIFIERS = ['node:fs', 'node:path'];

// Static import/export specifiers only: `import ... from '...'`,
// `export ... from '...'`, and bare `import '...'`. The lazy
// `require('node:path')` inside typed-mind-parser.ts's CJS-only default-wasm
// branch is NOT a static import and is out of I-8's scope by design (doc §3.1).
const STATIC_SPECIFIER_PATTERN = /^(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]|^import\s+['"]([^'"]+)['"]/gms;

const staticSpecifiersOf = (source: string): string[] => {
  const specifiers: string[] = [];
  for (const match of source.matchAll(STATIC_SPECIFIER_PATTERN)) {
    const specifier = match[1] ?? match[2];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
};

export interface ModuleGraphReport {
  readonly visitedFiles: readonly string[];
  readonly externalSpecifiers: readonly string[];
  readonly bannedReaches: readonly { file: string; specifier: string }[];
}

export const walkModuleGraph = (entryFile: string): ModuleGraphReport => {
  const visited = new Set<string>();
  const externals = new Set<string>();
  const bannedReaches: { file: string; specifier: string }[] = [];
  const queue = [resolve(entryFile)];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || visited.has(file)) {
      continue;
    }
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    for (const specifier of staticSpecifiersOf(source)) {
      if (specifier.startsWith('.')) {
        queue.push(resolve(dirname(file), specifier));
      } else {
        externals.add(specifier);
        if (BANNED_SPECIFIERS.includes(specifier)) {
          bannedReaches.push({ file, specifier });
        }
      }
    }
  }
  return {
    visitedFiles: [...visited].sort(),
    externalSpecifiers: [...externals].sort(),
    bannedReaches,
  };
};

describe('I-8 browser-boundary check (§3.7): module graph from src/pipeline/index.ts', () => {
  it('reaches no node:fs/node:path import and never pulls in the Node-only ImportResolver', () => {
    const report = walkModuleGraph(join(pipelineDir, 'index.ts'));
    assert.deepEqual(
      {
        bannedReaches: report.bannedReaches,
        reachesImportResolver: report.visitedFiles.some((file) => file.endsWith('import-resolver.ts')),
        externalSpecifiers: report.externalSpecifiers,
        coversPipelineChain: ['cst-to-ast.ts', 'link-index.ts', 'typed-mind-parser.ts', join('gen', 'cst-nodes.ts')].every((expected) =>
          report.visitedFiles.some((file) => file.endsWith(expected)),
        ),
      },
      {
        bannedReaches: [],
        reachesImportResolver: false,
        // web-tree-sitter is the pipeline's only external (browser-compatible;
        // wasm arrives via the wasmPath/wasmBytes override contract, §3.1).
        externalSpecifiers: ['web-tree-sitter'],
        coversPipelineChain: true,
      },
    );
  });

  it('detection direction: flags the real Node-only import-resolver.ts when walked as a root', () => {
    const report = walkModuleGraph(join(pipelineDir, 'import-resolver.ts'));
    assert.deepEqual(report.bannedReaches.map((reach) => reach.specifier).sort(), ['node:fs', 'node:path']);
  });

  it('detection direction: flags a seeded transitive node:fs import in a scratch graph', () => {
    const scratchDir = mkdtempSync(join(tmpdir(), 'tm3-q5-i8-'));
    after(() => {
      rmSync(scratchDir, { recursive: true, force: true });
    });
    writeFileSync(join(scratchDir, 'entry.ts'), "import { helper } from './helper.ts';\nexport const value = helper();\n");
    writeFileSync(join(scratchDir, 'helper.ts'), "import { readFileSync } from 'node:fs';\nexport const helper = () => readFileSync;\n");
    const report = walkModuleGraph(join(scratchDir, 'entry.ts'));
    assert.deepEqual(
      report.bannedReaches.map((reach) => ({ specifier: reach.specifier, fromHelper: reach.file.endsWith('helper.ts') })),
      [{ specifier: 'node:fs', fromHelper: true }],
    );
  });
});
