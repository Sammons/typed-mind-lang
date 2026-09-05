// issue #92 — `typed-mind --check` printed a suppressed finding
// (RFC-TM-8 §8's "suppressed-not-silenced" design, X-SUPP-3: kept in
// `diagnostics` with its severity intact, annotated with `suppression`, and
// excluded only from the error count that drives `valid`) identically to an
// active, unaddressed one — same ERROR/WARNING label, folded into one
// combined `Found N diagnostic(s)` total. Fixed by branching on
// `diagnostic.suppression`: a suppressed finding prints as
// `SUPPRESSED (reason)` and the summary line reports active vs suppressed
// counts separately. This test drives the BUILT CLI binary as a subprocess
// (mirrors typed-mind.test.ts's "new-surface smoke on built dist" pattern)
// since `main()` calls `process.exit` directly and is not otherwise
// unit-testable in-process.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const cliDistPath = join(packageDir, 'dist', 'cli.js');
const fixturePath = join(testDir, '__fixtures__', 'suppressed-and-active.tmd');

const runCli = (args: readonly string[]): { stdout: string; stderr: string; status: number } => {
  try {
    const stdout = execFileSync(process.execPath, [cliDistPath, ...args], { encoding: 'utf8' });
    return { stdout, stderr: '', status: 0 };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    return { stdout: execError.stdout ?? '', stderr: execError.stderr ?? '', status: execError.status ?? 1 };
  }
};

describe('typed-mind --check (built dist): suppressed findings render distinctly (issue #92)', () => {
  it('prints a suppressed finding as SUPPRESSED (reason) and reports active/suppressed counts separately', () => {
    const { stderr, status } = runCli(['--check', fixturePath]);

    assert.equal(status, 1, 'the fixture carries one real unsuppressed error, so --check must still exit non-zero');

    // The suppressed finding ('lonely') is labeled SUPPRESSED with its
    // reason, never ERROR — distinct from the active finding ('noisy').
    assert.ok(
      stderr.includes('SUPPRESSED (consumed only by integration tests) at line') && stderr.includes("Orphaned entity 'lonely'"),
      `expected a SUPPRESSED line for 'lonely', got:\n${stderr}`,
    );
    assert.equal(
      stderr.includes('ERROR') && /ERROR[^\n]*'lonely'/.test(stderr),
      false,
      "the suppressed finding ('lonely') must never be labeled ERROR",
    );

    // The active, unsuppressed finding ('noisy') still prints as a plain
    // ERROR line, exactly as before this fix.
    assert.ok(
      /ERROR at line \d+, col \d+: Orphaned entity 'noisy'/.test(stderr),
      `expected a plain ERROR line for 'noisy', got:\n${stderr}`,
    );

    // The summary line reports active and suppressed counts separately
    // rather than one combined total that cannot distinguish the two.
    assert.ok(
      /Found 1 active diagnostic\(s\), 1 suppressed diagnostic\(s\) \(2 total\)/.test(stderr),
      `expected a two-count summary line, got:\n${stderr}`,
    );
  });

  it('a fixture with zero active diagnostics (only suppressed ones) still reports "No errors found"', () => {
    const onlySuppressedFixture = [
      'App -> Main v1.0.0',
      'Main @ src/main.ts:',
      '  <- [helper]',
      '  -> [helper]',
      'helper :: () => void',
      'lonely % "an unused DTO"',
      'suppress lonely checker/orphaned-entity "consumed only by integration tests"',
      '',
    ].join('\n');
    const dir = mkdtempSync(join(tmpdir(), 'tm-cli-suppressed-'));
    const filePath = join(dir, 'only-suppressed.tmd');
    writeFileSync(filePath, onlySuppressedFixture, 'utf8');

    const { stdout, status } = runCli(['--check', filePath]);
    assert.equal(status, 0, 'a document whose only findings are suppressed must still exit 0 — suppressed-not-silenced, valid');
    assert.ok(stdout.includes('No errors found'));
  });
});
