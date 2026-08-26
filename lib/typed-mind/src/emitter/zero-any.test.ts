// RFC-TM-4 §2 / Diamond DAG Q2 (rfc-tm-4-diamond.md) — the zero-escape-hatch-
// type grep gate over the new emitter modules ("All new/ported modules are
// clean (zero-escape-hatch-type grep gates)", §3 S-CORE-4). Plain whole-word
// grep (like the src/ast twin, not the src/checker stripped-comment variant):
// the emitter modules carry no legitimate occurrence of the banned identifier
// in comments or strings, so this file must avoid spelling it out too.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const emitterDir = dirname(fileURLToPath(import.meta.url));
// Built without a literal occurrence so this test file passes its own gate.
const bannedIdentifier = ['a', 'n', 'y'].join('');
const bannedPattern = new RegExp(`\\b${bannedIdentifier}\\b`);

describe('banned-identifier (escape-hatch type) gate over the emitter modules', () => {
  it('finds no whole-word banned identifier in src/emitter/*.ts', () => {
    const entries = readdirSync(emitterDir, { withFileTypes: true });
    const fileNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => entry.name)
      .sort();
    // syntax-emitter, detect-format, emit-shortform, emit-longform + this test.
    assert.deepEqual(fileNames.length >= 5, true);
    const offenders = fileNames.filter((fileName) => bannedPattern.test(readFileSync(join(emitterDir, fileName), 'utf8')));
    assert.deepEqual(offenders, []);
  });
});
