// RFC-TM-3 §3.3 / §5 Q3 (rfc-tm-3-diamond.md) — the ERROR/MISSING mapper's
// acceptance inventory: the six corpus-manifest defect classes (typed-mind-lang
// PR #18), each fixture-bound (the class name travels in the fixture name, FAQ
// Q6), must produce a `syntax/*` diagnostic whose span covers the offending
// line. Today 3 of 4 malformed shapes produce nothing — this is I-3 made
// mechanical at pipeline level. Plus the doc-named near-miss check:
// naming-edge-cases-example.tmd:49 (`<= [...]`) yields exactly ONE diagnostic
// at the real span, not a recovery cascade.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spanCoversLine } from './spans.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');
const fixturesDir = join(packageDir, 'grammar', 'test', 'fixtures');

// Offending line numbers are pinned per fixture file; each exemplar line is
// lifted from the PR #18 manifest's class description.
const MANIFEST_CLASS_FIXTURES = [
  { defectClass: 'empty-list', fixtureName: 'manifest-empty-list.tmd', offendingLines: [3] },
  { defectClass: 'multiline-bracket-list', fixtureName: 'manifest-multiline-bracket-list.tmd', offendingLines: [3, 4] },
  { defectClass: 'array-suffix-bare-name', fixtureName: 'manifest-array-suffix-bare-name.tmd', offendingLines: [3, 5] },
  { defectClass: 'classfile-trailing-colon', fixtureName: 'manifest-classfile-trailing-colon.tmd', offendingLines: [2] },
  { defectClass: 'quoted-literal-union-field-type', fixtureName: 'manifest-quoted-literal-union-field-type.tmd', offendingLines: [3] },
  { defectClass: 'unrecognized-form', fixtureName: 'manifest-unrecognized-form.tmd', offendingLines: [2] },
];

describe('syntax/* diagnostics for the six corpus-manifest defect classes', () => {
  let parser: TypedMindParser;

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('every defect class produces an error-severity syntax/* diagnostic covering each offending line', () => {
    const results = MANIFEST_CLASS_FIXTURES.map(({ defectClass, fixtureName, offendingLines }) => {
      const outcome = parser.parse(readFileSync(join(fixturesDir, fixtureName), 'utf8'));
      const syntaxDiagnostics = outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
      return {
        defectClass,
        everyOffendingLineCovered: offendingLines.every((line) =>
          syntaxDiagnostics.some((diagnostic) => spanCoversLine(diagnostic.span, line)),
        ),
        allErrorSeverity: syntaxDiagnostics.every((diagnostic) => diagnostic.severity === 'error'),
        hasSyntaxDiagnostic: syntaxDiagnostics.length > 0,
      };
    });
    assert.deepEqual(
      results,
      MANIFEST_CLASS_FIXTURES.map(({ defectClass }) => ({
        defectClass,
        everyOffendingLineCovered: true,
        allErrorSeverity: true,
        hasSyntaxDiagnostic: true,
      })),
    );
  });

  it('a MISSING token maps to syntax/missing at its zero-width insertion point', () => {
    // GLR recovery inserts the missing `]` rather than producing an ERROR node.
    const outcome = parser.parse('Main @ src/main.ts:\n  -> [a\n');
    assert.deepEqual(
      outcome.diagnostics.map((diagnostic) => ({ code: diagnostic.code, severity: diagnostic.severity, span: diagnostic.span })),
      [
        {
          code: 'syntax/missing',
          severity: 'error',
          span: { start: { line: 2, column: 8 }, end: { line: 2, column: 8 } },
        },
      ],
    );
  });

  it('parsing never throws on malformed input (always-tolerant, §3.3)', () => {
    const outcome = parser.parse('!!! not typedmind at all\n%%%\n');
    assert.equal(outcome.diagnostics.length > 0, true);
  });

  it('naming-edge-cases-example.tmd:49 yields exactly one diagnostic for the near-miss line, at the real span', () => {
    const outcome = parser.parse(readFileSync(join(repoRoot, 'naming-edge-cases-example.tmd'), 'utf8'));
    const line49Diagnostics = outcome.diagnostics.filter((diagnostic) => spanCoversLine(diagnostic.span, 49));
    assert.deepEqual(
      line49Diagnostics.map((diagnostic) => ({ code: diagnostic.code, severity: diagnostic.severity, span: diagnostic.span })),
      [
        {
          code: 'syntax/error',
          severity: 'error',
          // The stray `=` of the `<=` near-miss sigil on line 49.
          span: { start: { line: 49, column: 4 }, end: { line: 49, column: 5 } },
        },
      ],
    );
  });
});
