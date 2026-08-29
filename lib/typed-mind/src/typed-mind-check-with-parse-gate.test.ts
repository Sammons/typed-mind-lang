// RFC-TM-10 §13 Diamond DAG Q9 check binding (rfc-tm-10-diamond.md, D-LEG-13)
// — "the corrupted-output fixture shows a parse-failure diagnostic with zero
// `checker/*` codes in the result." A fixture that deliberately corrupts
// converter output (an unescaped `!!!` line appended after a valid document,
// simulating an unfound future emission bug) proves `checkWithParseGate`
// skips the checker phase entirely on a parse failure, returning only
// `syntax/*` diagnostics — never the `checker/orphaned-file` /
// `checker/orphaned-entity` / `checker/import-not-found` /
// `checker/entry-not-found` storm the unwrapped `check()` builds on top of
// the same unparsable input (confirmed live: the corrupted hero fixture
// produces exactly those four checker codes plus `syntax/error` through
// plain `check()`, and exactly `syntax/error` alone through the gate).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from './typed-mind.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');
const heroPath = join(packageDir, 'grammar', 'test', 'fixtures', 'hero.tmd');

const createTypedMind = async () => TypedMind.create({ wasmPath });

describe('D-LEG-13: TypedMind.checkWithParseGate', () => {
  let heroSource: string;

  before(() => {
    heroSource = readFileSync(heroPath, 'utf8');
  });

  it('a source with a trailing unparsable line reports only syntax/* diagnostics, zero checker/* codes', async () => {
    const typedMind = await createTypedMind();
    const corrupted = `${heroSource}\n!!! not typedmind at all\n`;

    // Control: the unwrapped check() mixes the parse-failure syntax/error
    // with checker findings built on top of the same unparsable input — the
    // exact defect this item's gate exists to close.
    const unwrapped = typedMind.check(corrupted);
    assert.equal(
      unwrapped.diagnostics.some((diagnostic) => diagnostic.code === 'syntax/error'),
      true,
    );
    assert.equal(
      unwrapped.diagnostics.some((diagnostic) => diagnostic.code.startsWith('checker/')),
      true,
    );

    const gated = typedMind.checkWithParseGate(corrupted);
    assert.deepEqual(
      {
        valid: gated.valid,
        suppressedCount: gated.suppressedCount,
        allSyntaxCodes: gated.diagnostics.every((diagnostic) => diagnostic.code.startsWith('syntax/')),
        anyCheckerCodes: gated.diagnostics.some((diagnostic) => diagnostic.code.startsWith('checker/')),
        diagnosticCount: gated.diagnostics.length,
      },
      { valid: false, suppressedCount: 0, allSyntaxCodes: true, anyCheckerCodes: false, diagnosticCount: 1 },
    );
  });

  it('a MISSING-token parse failure is gated the same way as an ERROR-node failure', async () => {
    const typedMind = await createTypedMind();
    const missingTokenSource = 'Main @ src/main.ts:\n  -> [a\n';

    const gated = typedMind.checkWithParseGate(missingTokenSource);
    assert.deepEqual(
      {
        valid: gated.valid,
        allSyntaxCodes: gated.diagnostics.every((diagnostic) => diagnostic.code.startsWith('syntax/')),
        hasSyntaxMissing: gated.diagnostics.some((diagnostic) => diagnostic.code === 'syntax/missing'),
      },
      { valid: false, allSyntaxCodes: true, hasSyntaxMissing: true },
    );
  });

  it('a parse-clean source delegates unchanged to check() — identical result, checker phase runs', async () => {
    const typedMind = await createTypedMind();

    const gated = typedMind.checkWithParseGate(heroSource);
    const unwrapped = typedMind.check(heroSource);
    assert.deepEqual(gated, unwrapped);
    // The hero fixture is not itself a fully clean-checking document (it
    // exercises orphan/import findings elsewhere in the suite) — the point
    // here is parity with check(), not a zero-diagnostic result.
    assert.equal(gated.diagnostics.length > 0, true);
  });

  it('parses entities before the corruption point even though the checker phase is skipped', async () => {
    const typedMind = await createTypedMind();
    const corrupted = `${heroSource}\n!!! not typedmind at all\n`;

    const { entities } = typedMind.parse(corrupted);
    // The valid prefix (hero.tmd's own entities) still parses even though the
    // trailing garbage line fails — the always-tolerant pipeline (RFC-TM-3
    // §3.3) recovers around the ERROR node rather than discarding everything
    // before it. This is the parser-level half of I-13's "computed graph
    // before the corruption point" guarantee; the extractor-CLI's own
    // partial-.tmd-write path (typescript-typescript/src/cli.ts) is a
    // separate, unmodified mechanism this item does not touch.
    assert.equal(entities.length > 0, true);
  });
});
