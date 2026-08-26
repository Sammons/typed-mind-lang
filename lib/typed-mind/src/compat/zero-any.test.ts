// RFC-TM-4 §3/S-CORE-4 (rfc-tm-4-diamond.md) — src/compat/ is new code under
// the flip; it carries zero unsafe escape-hatch types from its first commit,
// the same gate shape as the sibling AST and emitter modules' own gates.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const compatDir = dirname(fileURLToPath(import.meta.url));
// Built without a literal occurrence so this test file passes its own gate.
const bannedIdentifier = ['a', 'n', 'y'].join('');
const bannedPattern = new RegExp(`\\b${bannedIdentifier}\\b`);

describe('banned-identifier (escape-hatch type) gate over src/compat', () => {
  it('finds no whole-word banned identifier in src/compat/*.ts', () => {
    const entries = readdirSync(compatDir, { withFileTypes: true });
    const fileNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(fileNames.length >= 3, true);
    const offenders = fileNames.filter((fileName) => bannedPattern.test(readFileSync(join(compatDir, fileName), 'utf8')));
    assert.deepEqual(offenders, []);
  });
});
