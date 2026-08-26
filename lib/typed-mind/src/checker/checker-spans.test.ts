// RFC-TM-4 §1 / Diamond DAG Q1 (rfc-tm-4-diamond.md) — the I-6 span fixture
// for checker diagnostics: findings carry token-accurate spans from the real
// AST (line AND both columns from the source text, no constant columns — the
// column-1 tripwire in ../pipeline/position-fixtures.test.ts covers
// src/checker/ too), and the two wire projections carry them faithfully:
// toValidationErrors maps span.start to the legacy position shape (plus
// message/severity/suggestion), toDiagnostics keeps the full span.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { AstValidator } from './ast-validator.ts';
import { toDiagnostics, toValidationErrors } from './finding.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(testDir, '..', '..', 'grammar', 'grammar.wasm');

describe('I-6 span fixture: checker findings carry token-accurate spans', () => {
  it('anchors findings on the real declaration spans and projects them to both wire shapes', async () => {
    const parser = await TypedMindParser.create({ wasmPath });
    const source = [
      'App -> Main v1.0.0', //          line 1
      'Main @ src/main.ts:', //         line 2
      '  <- [helper]', //               line 3
      '  -> [helper]', //               line 4
      'helper :: () => void', //        line 5
      'lonely % "unused DTO"', //       line 6: orphan finding site
      'stranded % "also unused"', //    line 7: second orphan site
      '',
    ].join('\n');
    const outcome = parser.parse(source);
    const result = new AstValidator().validate(outcome, computeLinks(outcome.entities));
    const orphans = result.findings.filter((finding) => finding.code === 'checker/orphaned-entity');
    assert.deepEqual(
      {
        spans: orphans.map((finding) => finding.span),
        wireErrors: toValidationErrors(orphans),
        wireDiagnostics: toDiagnostics(orphans).map((diagnostic) => ({ code: diagnostic.code, span: diagnostic.span })),
      },
      {
        // Token-accurate: each span covers its own declaration line with the
        // real end column (declaration length + 1), not a constant.
        spans: [
          { start: { line: 6, column: 1 }, end: { line: 6, column: 22 } },
          { start: { line: 7, column: 1 }, end: { line: 7, column: 25 } },
        ],
        wireErrors: [
          {
            position: { line: 6, column: 1 },
            message: "Orphaned entity 'lonely'",
            severity: 'error',
            suggestion: 'Remove or reference this entity',
          },
          {
            position: { line: 7, column: 1 },
            message: "Orphaned entity 'stranded'",
            severity: 'error',
            suggestion: 'Remove or reference this entity',
          },
        ],
        wireDiagnostics: [
          { code: 'checker/orphaned-entity', span: { start: { line: 6, column: 1 }, end: { line: 6, column: 22 } } },
          { code: 'checker/orphaned-entity', span: { start: { line: 7, column: 1 }, end: { line: 7, column: 25 } } },
        ],
      },
    );
  });
});
