import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-12-valid-complete', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-12-valid-complete.tmd';

  it('should validate complete program as valid', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // This is a valid complete program - all entities are properly connected
    assert.equal(result.valid, true);

    // Should have no errors in a valid program
    assert.equal(result.errors.length, 0);
  });
});
