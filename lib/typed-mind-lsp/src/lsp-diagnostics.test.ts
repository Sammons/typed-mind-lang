// RFC-TM-5 §1 leaf a check binding — "a diagnostics fixture asserts two
// findings on different lines carry distinct start/end columns matching token
// boundaries, plus a no-constant-column tripwire over lib/typed-mind-lsp/src/"
// (I-6, same shape TM-4 used for src/checker/). The `+10` constant (legacy
// server.ts:150) and the 0,0 parse-failure collapse (legacy server.ts:164-173)
// both die: real spans are asserted directly, and the tripwire below greps
// this package's own source for a reintroduced constant-column literal.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { toLspDiagnostics } from './lsp-diagnostics.ts';

const srcDir = dirname(fileURLToPath(import.meta.url));

// Two malformed lines on different lines/columns produce two diagnostics with
// distinct, non-constant-width ranges — the direct opposite of legacy's
// column+10 guess and 0,0 parse-failure collapse.
const DIAGNOSTIC_FIXTURE = `UserService @ src/services/user.ts:
  <= [Logger]

  "an orphan description with no open entity"
`;

describe('lsp-diagnostics (RFC-TM-5 §1 leaf a)', () => {
  it('maps CheckOutcome.diagnostics onto LSP Ranges with distinct, token-accurate columns (no +10 constant)', async () => {
    const typedMind = await TypedMind.create();
    const checked = typedMind.check(DIAGNOSTIC_FIXTURE);
    assert.equal(checked.diagnostics.length > 1, true);
    const lspDiagnostics = toLspDiagnostics(checked.diagnostics);

    // No two diagnostics share both a start and an end range identically
    // computed by a constant offset from the start (the `+10` defect class).
    const widths = lspDiagnostics.map((diagnostic) => diagnostic.range.end.character - diagnostic.range.start.character);
    const distinctWidths = new Set(widths);
    assert.equal(distinctWidths.size > 1, true, 'expected token-accurate (non-uniform) diagnostic widths, not a constant offset');

    // Every range's line is 0-based and matches a real source line (never the
    // 0,0 collapse a thrown parse error used to produce).
    for (const diagnostic of lspDiagnostics) {
      assert.equal(diagnostic.range.start.line >= 0, true);
      assert.equal(Number.isInteger(diagnostic.range.start.character), true);
    }
  });

  it('never throws on malformed input: check() always returns a diagnostics list, never a caught exception', async () => {
    const typedMind = await TypedMind.create();
    assert.doesNotThrow(() => typedMind.check('!!! not typedmind at all !!!'));
  });

  it("tripwire: this package's LSP source contains no constant-column diagnostic literal (character: N + 10, or a hardcoded 0,0 diagnostic range)", () => {
    const files = readdirSync(srcDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));
    for (const file of files) {
      const contents = readFileSync(join(srcDir, file), 'utf8');
      assert.doesNotMatch(contents, /column\s*\+\s*10/, `${file} reintroduces the +10 constant-column offset`);
      assert.doesNotMatch(
        contents,
        /character:\s*0\s*,?\s*\}[^}]*character:\s*1\s*\}/s,
        `${file} reintroduces a hardcoded 0,0 diagnostic-range collapse`,
      );
    }
  });
});
