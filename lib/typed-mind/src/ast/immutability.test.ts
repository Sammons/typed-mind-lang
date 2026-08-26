// RFC-TM-3 §5 Q2 (rfc-tm-3-diamond.md) — post-construction immutability is
// asserted via tsc: test-fixtures/readonly/readonly-violations.ts attempts a
// write to every field of every semantic class, each under @ts-expect-error.
// tsc exits 0 exactly while every write is still a type error; a field going
// mutable leaves its @ts-expect-error unfulfilled (TS2578) and tsc exits 1.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const fixtureDir = join(packageDir, 'test-fixtures', 'readonly');

// One marker per attempted write. Update alongside the fixture when the
// honest-fields table (doc §2.2) changes.
const expectedMarkerCount = 70;

describe('semantic classes are immutable after construction (tsc-checked)', () => {
  it('typechecks the readonly-violations fixture clean: every field write is still an error', () => {
    const fixtureSource = readFileSync(join(fixtureDir, 'readonly-violations.ts'), 'utf8');
    // Count only the marker comments (the header prose mentions the directive).
    const markerCount = fixtureSource.split('// @ts-expect-error').length - 1;
    assert.deepEqual(markerCount, expectedMarkerCount);

    const tscPath = join(repoRoot, 'node_modules', '.bin', 'tsc');
    // Throws (test failure) on nonzero exit; stdout carries tsc errors if so.
    const stdout = execFileSync(tscPath, ['-p', fixtureDir], { cwd: packageDir, encoding: 'utf8' });
    assert.deepEqual(stdout.trim(), '');
  });
});
