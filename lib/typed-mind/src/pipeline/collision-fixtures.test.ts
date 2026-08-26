// RFC-TM-3 §5 Q2 (rfc-tm-3-diamond.md) — the duplicate-preservation fixtures
// are AUTHORED here and EXECUTED in Q3 (the pipeline is not yet parseable in
// Q2; the CST→AST walk that builds ParseOutcome lands there). Q2 proves the
// fixture documents are grammar-clean so Q3 inherits ready inputs; the two
// todo entries below are the Q3 assertions, verbatim from the doc's Q2/Q3
// checks: ParseOutcome.entities contains 2 entries for a same-kind name
// collision AND for a longform-vs-shortform collision.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');
const fixturesDir = join(packageDir, 'grammar', 'test', 'fixtures');

describe('duplicate-preservation collision fixtures (Q2-authored, Q3-executed)', () => {
  it('both collision fixtures parse grammar-clean (no ERROR/MISSING nodes)', async () => {
    const parser = await TypedMindParser.create({ wasmPath });
    const fixtureNames = ['collision-same-kind.tmd', 'collision-longform-vs-shortform.tmd'];
    const errorStates = fixtureNames.map((fixtureName) => {
      const root = parser.parseCst(readFileSync(join(fixturesDir, fixtureName), 'utf8'));
      return { fixtureName, hasError: root.syntaxNode.hasError };
    });
    assert.deepEqual(errorStates, [
      { fixtureName: 'collision-same-kind.tmd', hasError: false },
      { fixtureName: 'collision-longform-vs-shortform.tmd', hasError: false },
    ]);
  });

  it('ParseOutcome.entities contains 2 entries for the same-kind File collision, each with its own span', async () => {
    const parser = await TypedMindParser.create({ wasmPath });
    const outcome = parser.parse(readFileSync(join(fixturesDir, 'collision-same-kind.tmd'), 'utf8'));
    assert.deepEqual(
      outcome.entities.map((entity) => ({
        kind: entity.kind,
        name: entity.name,
        path: 'path' in entity ? entity.path : undefined,
        span: entity.span,
      })),
      [
        {
          kind: 'File',
          name: 'Api',
          path: 'src/api/a.ts',
          span: { start: { line: 5, column: 1 }, end: { line: 5, column: 20 } },
        },
        {
          kind: 'File',
          name: 'Api',
          path: 'src/api/b.ts',
          span: { start: { line: 6, column: 1 }, end: { line: 6, column: 20 } },
        },
      ],
    );
  });

  it('ParseOutcome.entities contains 2 entries for the longform-vs-shortform Function collision, each with its own span', async () => {
    const parser = await TypedMindParser.create({ wasmPath });
    const outcome = parser.parse(readFileSync(join(fixturesDir, 'collision-longform-vs-shortform.tmd'), 'utf8'));
    assert.deepEqual(
      outcome.entities.map((entity) => ({
        kind: entity.kind,
        name: entity.name,
        signature: 'signature' in entity ? entity.signature : undefined,
        startLine: entity.span.start.line,
        endLine: entity.span.end.line,
      })),
      [
        { kind: 'Function', name: 'createUser', signature: '(data: UserDTO) => UserDTO', startLine: 5, endLine: 7 },
        { kind: 'Function', name: 'createUser', signature: '(data: UserDTO) => UserDTO', startLine: 8, endLine: 8 },
      ],
    );
  });
});
