import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 54: Entity Name Boundaries', () => {
  it('should validate entity naming rules and boundaries', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-54-entity-name-boundaries.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    // Should have errors for invalid names
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // RFC-TM-4 §4 A9: `123Name @ src/invalid-number.ts:` (line 40) is now
    // rejected as a syntax error ("unparsable text: ...") at parse time
    // (TM-2 grammar narrowing on leading-digit names) instead of being
    // parsed as a File and later flagged `Orphaned file '123Name'`. The
    // message no longer contains 'Orphaned', so this assertion targets the
    // new syntax diagnostic directly.
    const numberStartError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('123Name') && diagnostic.code === 'syntax/error',
    );
    assert.notEqual(numberStartError, undefined);

    // Names with special cases get parsed but may cause orphaned entity errors
    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);

    // Check that various entity names are detected as orphaned (this shows they were parsed)
    assert.equal(
      diagnosticMessages.some((msg) => msg.includes('123Name')),
      true,
    );

    // Check for various naming boundary conditions in the errors
    // Most entities become orphaned, which confirms they were parsed

    // Case sensitivity - all three variants should be parsed as different entities
    const parseResult = typedMind.parse(content);

    const hasTestCase = parseResult.entities.some((entity) => entity.name === 'TestCase');
    const hasTestcase = parseResult.entities.some((entity) => entity.name === 'testcase');
    const hasTESTCASE = parseResult.entities.some((entity) => entity.name === 'TESTCASE');

    // TypedMind should be case-sensitive, so all three variants should exist
    assert.equal(hasTestCase, true);
    assert.equal(hasTestcase, true);
    assert.equal(hasTESTCASE, true);

    // Valid names should not have errors
    const validNameError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('ValidName') && !diagnostic.message.includes('Orphaned'),
    );
    assert.equal(validNameError, undefined);

    // Long names should be valid (no arbitrary length limit)
    const longNameError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('VeryLongEntityName') && diagnostic.message.includes('too long'),
    );
    assert.equal(longNameError, undefined);
  });
});
