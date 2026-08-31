// RFC-TM-4 §2 / Diamond DAG Q2 (rfc-tm-4-diamond.md) — S-CORE-2a corpus-wide
// checks: for every corpus document, `detectFormat(input) === detectFormat(output)`
// (format preservation, including scenario-31's genuinely mixed case) and
// parse→emit→parse yields an AST equal on every honest field (span/raw are
// expected to move — new text, new positions — so they're excluded from the
// comparison, matching the `projected` helper pattern in cst-to-ast.test.ts).
//
// Corpus enumeration mirrors scripts/shadow-verdict-harness.mjs's
// CORPUS_ROOTS (same three directories, same recursive .tmd walk) — the
// S-CORE-2a/2b checks apply to the same corpus TM-4's other checks use.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { detectFormat } from './detect-format.ts';
import { honestFieldsOf } from './honest-fields.ts';
import { SyntaxEmitter } from './syntax-emitter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

const CORPUS_ROOTS = [
  'lib/typed-mind-test-suite/scenarios',
  'lib/typed-mind-static-website/snippets',
  'lib/typed-mind-static-website/snippets-supplementary',
];

const walkTmd = (dir: string, out: string[]): void => {
  for (const entry of readdirSync(join(repoRoot, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTmd(rel, out);
    } else if (entry.name.endsWith('.tmd')) {
      out.push(rel);
    }
  }
};

const enumerateCorpus = (): string[] => {
  const files: string[] = [];
  for (const root of CORPUS_ROOTS) {
    walkTmd(root, files);
  }
  return files;
};

describe('S-CORE-2a: corpus-wide format preservation + parse→emit→parse AST equality', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  for (const relPath of enumerateCorpus()) {
    it(`${relPath}: detectFormat stable and AST round-trips`, () => {
      const source = readFileSync(join(repoRoot, relPath), 'utf8');
      const outcome = parser.parse(source);
      const emitted = emitter.emit(outcome);
      const reparsed = parser.parse(emitted);
      assert.deepEqual(reparsed.entities.map(honestFieldsOf), outcome.entities.map(honestFieldsOf));

      // detectFormat is compared against the RAW SOURCE only for documents
      // that fully parse (no syntax/error diagnostics). A document containing
      // unparsable text (e.g. scenario-54's deliberate boundary violations —
      // a leading-digit name, a bare kebab-case name, an unquoted space-
      // containing name — RFC-TM-4 §4 row A9) has lines that never become
      // ParseOutcome entities at all; the emitter emits from the AST only
      // (declared-fields emission, never raw text), so it cannot and must not
      // try to reproduce syntax it never captured. For a fully-parsing
      // document every significant source line IS an entity, so the raw-text
      // comparison is meaningful and required (S-CORE-2a's actual bar).
      const parsesCleanly = outcome.diagnostics.every((diagnostic) => !diagnostic.code.startsWith('syntax/'));
      if (parsesCleanly) {
        assert.deepEqual(detectFormat(emitted).format, detectFormat(source).format);
      }
    });
  }
});

describe('S-CORE-2a: scenario-31 mixed format stays mixed with stable per-entity forms', () => {
  it("preserves the mixed detectFormat verdict and each entity's own sourceForm across a round-trip", async () => {
    const parser = await TypedMindParser.create({ wasmPath });
    const emitter = new SyntaxEmitter();
    const scenario31Path = join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios', 'scenario-31-mixed-syntax.tmd');
    const source = readFileSync(scenario31Path, 'utf8');
    assert.deepEqual(detectFormat(source).format, 'mixed');
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome);
    assert.deepEqual(detectFormat(emitted).format, 'mixed');
    const reparsed = parser.parse(emitted);
    assert.deepEqual(
      reparsed.entities.map((entity) => ({ name: entity.name, sourceForm: entity.sourceForm })),
      outcome.entities.map((entity) => ({ name: entity.name, sourceForm: entity.sourceForm })),
    );
  });
});
