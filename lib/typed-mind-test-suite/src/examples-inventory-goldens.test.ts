// RFC-TM-4 §4 (rfc-tm-4-diamond.md) S-TEST-4 — the 31-document examples-inventory
// golden-diagnostics harness. Each file in the inventory (ast-v2-goal-scope.md
// vocab section: 5 at repo root, 6 in examples/ plus the 4 import-resolution
// fixtures in examples/imports/, 3 in the VS Code extension, 2 in the
// test-suite package root, the 10 architecture.tmd/program.tmd dogfood
// documents, and lib/typed-mind-static-website/temp.tmd) parses through the
// new surface and its full diagnostics list is compared against a checked-in
// expectation (goldens/examples-inventory-expected.json) — empty for clean
// examples, the known defects (including naming-edge-cases-example.tmd's
// lines 47/49 and its A1/A2-attested rows) for the rest. This is how
// showcase files that intentionally carry defects are conserved without
// freezing their brokenness as "passing."
//
// `temp.tmd` (lib/typed-mind-static-website/temp.tmd) is treated as present
// until TM-7 deletes it (§4).
//
// The 4 examples/imports/* fixtures exercise cross-file @import resolution
// (S-PARSE-5, ast-v2-goal-scope.md). `TypedMind.check()` does not wire
// ImportResolver (typed-mind.ts: "a separate, unbound concern with no check
// binding" in this Quantum) — this harness composes TypedMindParser +
// ImportResolver + computeLinks + AstValidator directly for those 4 files,
// the same pattern S-TEST-1 uses (typed-mind-with-imports.ts) and the
// shadow-verdict harness uses (lib/typed-mind/scripts/shadow-verdict-harness.mjs).
// No lib/typed-mind source changes.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import type { Diagnostic } from '../../typed-mind/src/ast/diagnostic.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { toDiagnostics } from '../../typed-mind/src/checker/finding.ts';
import { ImportResolver } from '../../typed-mind/src/pipeline/import-resolver.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

const IMPORT_TOUCHING = new Set([
  'examples/imports/main.tmd',
  'examples/imports/shared/auth.tmd',
  'examples/imports/shared/database.tmd',
  'examples/imports/ui/components.tmd',
]);

// The 31-document examples inventory (ast-v2-goal-scope.md vocab section).
const EXAMPLES_INVENTORY: readonly string[] = [
  'complex-dto-example.tmd',
  'method-calls-example.tmd',
  'monorepo-program.tmd',
  'naming-edge-cases-example.tmd',
  'test-vscode-extension.tmd',
  'examples/comment-example.tmd',
  'examples/dto-example.tmd',
  'examples/example-fixed.tmd',
  'examples/example-with-methods.tmd',
  'examples/example.tmd',
  'examples/runparameter-example.tmd',
  'examples/imports/main.tmd',
  'examples/imports/shared/auth.tmd',
  'examples/imports/shared/database.tmd',
  'examples/imports/ui/components.tmd',
  'lib/typed-mind-vscode-extension/architecture.tmd',
  'lib/typed-mind-vscode-extension/program.tmd',
  'lib/typed-mind-vscode-extension/test-syntax.tmd',
  'lib/typed-mind-test-suite/architecture.tmd',
  'lib/typed-mind-test-suite/program.tmd',
  'lib/typed-mind/architecture.tmd',
  'lib/typed-mind/program.tmd',
  'lib/typed-mind-cli/architecture.tmd',
  'lib/typed-mind-cli/program.tmd',
  'lib/typed-mind-lsp/architecture.tmd',
  'lib/typed-mind-lsp/program.tmd',
  'lib/typed-mind-renderer/architecture.tmd',
  'lib/typed-mind-renderer/program.tmd',
  'lib/typed-mind-typescript/architecture.tmd',
  'lib/typed-mind-typescript/typed-mind-cli-architecture.tmd',
  'lib/typed-mind-static-website/temp.tmd',
];

interface GoldenDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly message: string;
}

interface GoldenEntry {
  readonly valid: boolean;
  readonly diagnostics: readonly GoldenDiagnostic[];
}

const toGolden = (diagnostics: readonly Diagnostic[]): readonly GoldenDiagnostic[] => {
  const mapped = diagnostics.map((diagnostic) => {
    return {
      code: diagnostic.code,
      severity: diagnostic.severity,
      line: diagnostic.span.start.line,
      column: diagnostic.span.start.column,
      endLine: diagnostic.span.end.line,
      endColumn: diagnostic.span.end.column,
      message: diagnostic.message,
    } satisfies GoldenDiagnostic;
  });
  return [...mapped].sort(
    (a, b) =>
      a.line - b.line ||
      a.column - b.column ||
      a.endLine - b.endLine ||
      a.endColumn - b.endColumn ||
      a.code.localeCompare(b.code) ||
      a.message.localeCompare(b.message),
  );
};

describe('examples inventory golden diagnostics (S-TEST-4)', () => {
  const expectedPath = join(import.meta.dirname, 'goldens', 'examples-inventory-expected.json');
  const expected: Record<string, GoldenEntry> = JSON.parse(readFileSync(expectedPath, 'utf-8'));

  it('the golden fixture covers exactly the 31-document examples inventory', () => {
    assert.equal(EXAMPLES_INVENTORY.length, 31);
    assert.deepEqual(Object.keys(expected).sort(), [...EXAMPLES_INVENTORY].sort());
  });

  for (const relativePath of EXAMPLES_INVENTORY) {
    it(`matches the checked-in golden: ${relativePath}`, async () => {
      const absPath = join(REPO_ROOT, relativePath);
      const content = readFileSync(absPath, 'utf-8');
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const outcome = parser.parse(content);
      const entities = [...outcome.entities];
      const diagnostics = [...outcome.diagnostics];

      if (IMPORT_TOUCHING.has(relativePath) && outcome.imports.length > 0) {
        const resolver = new ImportResolver(parser);
        const resolved = resolver.resolveImports(outcome.imports, dirname(absPath));
        entities.push(...resolved.resolvedEntities.values());
        diagnostics.push(...resolved.diagnostics);
      }

      const links = computeLinks(entities);
      const validation = new AstValidator().validate({ entities, imports: outcome.imports, diagnostics }, links);
      const allDiagnostics = [...diagnostics, ...toDiagnostics(validation.findings)];
      const valid = allDiagnostics.every((diagnostic) => diagnostic.severity !== 'error');

      const golden = expected[relativePath];
      assert.notEqual(golden, undefined, `missing golden fixture entry for ${relativePath}`);
      assert.equal(valid, golden?.valid);
      assert.deepEqual(toGolden(allDiagnostics), golden?.diagnostics);
    });
  }
});
