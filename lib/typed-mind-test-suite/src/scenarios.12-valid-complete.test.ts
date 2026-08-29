import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-12-valid-complete', () => {
  const scenarioFile = 'scenario-12-valid-complete.tmd';

  it('should validate complete program as valid', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // RFC-TM-4 §4 A2: the empty exports list `-> []` (L5, on AppFile) is now
    // diagnosed as a syntax/error ("unparsable text") instead of parsing
    // silently, so this previously-clean scenario now carries exactly 1 finding.
    assert.equal(result.valid, false); // was true
    assert.equal(result.diagnostics.length, 1); // was 0

    const diagnostic = result.diagnostics[0];
    // RFC-TM-10 §12 (D-LEG-12, Q7): `syntax/error`'s message gained an initial
    // capital and a trailing suggestion clause (folded into `message` — the
    // pipeline-level `Diagnostic` type carries no `suggestion` field).
    assert.equal(diagnostic?.message, 'Unparsable text: `-> []` — check this line against the grammar and fix or remove it');
    assert.equal(diagnostic?.span.start.line, 5);
    assert.equal(diagnostic?.severity, 'error');
  });
});
