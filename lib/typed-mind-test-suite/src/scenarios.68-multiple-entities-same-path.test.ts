import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-68-multiple-entities-same-path', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-68-multiple-entities-same-path.tmd';

  it('should allow multiple constants and DTOs to share the same path', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // The DSL should be invalid due to orphaned entities, even though path sharing is allowed
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 4);

    // Verify all errors are about orphaned entities, not path conflicts
    result.errors.forEach((error) => {
      assert.match(error.message, /^Orphaned entity/);
    });
  });
});
