// RFC-TM-3 §3.2 / §5 Q3 (rfc-tm-3-diamond.md) — the position checks:
//   1. the 3-site position fixture: token-accurate spans for a continuation,
//      a longform block property, and a DTO field, on real line/column numbers
//      (attached field groups carry their spans on the walker's attachment
//      records; DTO fields carry them on the node);
//   2. the `column: 1` tripwire (I-6): no production module of the new
//      pipeline/AST constructs a position from a constant column literal.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DtoNode } from '../ast/dto-node.ts';
import { walkCstToAst } from './cst-to-ast.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

describe('3-site position fixture (continuation, block property, DTO field)', () => {
  it('asserts token-accurate 1-based spans at all three sites', async () => {
    const parser = await TypedMindParser.create({ wasmPath });
    const source = [
      'UserService @ src/services/user.ts:', // line 1
      '  <- [Logger, Db]', //                   line 2: continuation site
      'UserDTO %', //                           line 3
      '  - name?: string "The name"', //        line 4: DTO field site
      'program TodoApp {', //                   line 5
      '  entry: AppEntry', //                   line 6: block property site
      '}', //                                   line 7
      '',
    ].join('\n');
    const { outcome, attachments } = walkCstToAst(parser.parseCst(source), source);
    const dtoNode = outcome.entities.find((entity) => entity instanceof DtoNode);
    assert.deepEqual(
      {
        continuation: attachments.find((attachment) => attachment.group === 'imports'),
        blockProperty: attachments.find((attachment) => attachment.group === 'entry'),
        dtoFieldSpan: dtoNode instanceof DtoNode ? dtoNode.fields.at(0)?.span : undefined,
        diagnostics: outcome.diagnostics,
      },
      {
        // `  <- [Logger, Db]`: the span starts at the sigil, not the indent.
        continuation: {
          entityName: 'UserService',
          group: 'imports',
          span: { start: { line: 2, column: 3 }, end: { line: 2, column: 18 } },
        },
        // `  entry: AppEntry` inside the longform block.
        blockProperty: {
          entityName: 'TodoApp',
          group: 'entry',
          span: { start: { line: 6, column: 3 }, end: { line: 6, column: 18 } },
        },
        // `  - name?: string "The name"`.
        dtoFieldSpan: { start: { line: 4, column: 3 }, end: { line: 4, column: 29 } },
        diagnostics: [],
      },
    );
  });
});

describe('column-1 tripwire (I-6)', () => {
  it('no production module under src/pipeline or src/ast constructs a constant-column position', () => {
    const productionDirs = [testDir, join(testDir, '..', 'ast'), join(testDir, '..', 'ast', 'gen')];
    const offenders: string[] = [];
    // A literal `column: <digits>` is the legacy hardcoding this mission kills
    // (parser.ts:188 `column: 1`); computed columns (`.column + 1`) never
    // match because a non-digit follows `column:`'s value position.
    const constantColumnPattern = /column:\s*\d/;
    for (const productionDir of productionDirs) {
      for (const entry of readdirSync(productionDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) {
          continue;
        }
        const contents = readFileSync(join(productionDir, entry.name), 'utf8');
        if (constantColumnPattern.test(contents)) {
          offenders.push(entry.name);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });
});
