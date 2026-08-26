// RFC-TM-3 §2.3/§5 Q2 (rfc-tm-3-diamond.md) — the new semantic-AST modules
// carry zero unsafe escape-hatch types from the first commit (S-CORE-4's
// core-wide flip lands in TM-4; TM-3 never introduces one). Greps every
// hand-authored module under src/ast/ (the generated gen/ layer is Q1's, gated
// by its own generator) for the banned identifier as a whole word, tests
// included. The identifier is spelled indirectly so this file passes its gate.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const astDir = dirname(fileURLToPath(import.meta.url));
// Built without a literal occurrence so this test file passes its own gate.
const bannedIdentifier = ['a', 'n', 'y'].join('');
const bannedPattern = new RegExp(`\\b${bannedIdentifier}\\b`);

describe('banned-identifier (escape-hatch type) gate over the hand-authored ast modules', () => {
  it('finds no whole-word banned identifier in src/ast/*.ts', () => {
    const entries = readdirSync(astDir, { withFileTypes: true });
    const fileNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => entry.name)
      .sort();
    // The eleven classes + base + dto field + kind/diagnostic/span types + tests.
    assert.deepEqual(fileNames.length >= 16, true);
    const offenders = fileNames.filter((fileName) => bannedPattern.test(readFileSync(join(astDir, fileName), 'utf8')));
    assert.deepEqual(offenders, []);
  });
});
