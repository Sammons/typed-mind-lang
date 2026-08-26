// RFC-TM-4 §1 / Diamond DAG Q1 (rfc-tm-4-diamond.md) — the zero-`any` grep
// gate over the new checker modules ("All new/ported modules are clean
// (zero-`any` grep gates)", §3 S-CORE-4). Unlike the src/ast twin, checker
// sources legitimately carry the WORD in comments and in ported legacy
// message/suggestion strings (and 'any' is a TypedMind DSL primitive name in
// check-dto-fields.ts), so the gate strips comments and string/template
// literals before grepping for the banned whole-word identifier.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const checkerDir = dirname(fileURLToPath(import.meta.url));
// Built without a literal occurrence so this test file passes its own gate.
const bannedIdentifier = ['a', 'n', 'y'].join('');
const bannedPattern = new RegExp(`\\b${bannedIdentifier}\\b`);

const stripNonCode = (source: string): string => {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
};

describe('banned-identifier (escape-hatch type) gate over the checker modules', () => {
  it(`finds no whole-word banned identifier in src/checker/*.ts outside comments and strings`, () => {
    const entries = readdirSync(checkerDir, { withFileTypes: true });
    const fileNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(fileNames.length >= 16, true);
    const offenders = fileNames.filter((fileName) => bannedPattern.test(stripNonCode(readFileSync(join(checkerDir, fileName), 'utf8'))));
    assert.deepEqual(offenders, []);
  });
});
