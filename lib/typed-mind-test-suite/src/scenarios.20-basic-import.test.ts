import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-20-basic-import', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-20-basic-import.tmd';

  it('should validate basic import functionality', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = checker.check(content, filePath);

    // Should be invalid due to orphaned entity
    assert.equal(result.valid, false);

    // Should have exactly 2 errors for orphaned entities
    assert.equal(result.errors.length, 2);

    // Check for orphaned entities
    assert.equal(
      result.errors.some((err) => err.message.includes("Orphaned entity 'startApp'")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("Orphaned entity 'validateUser'")),
      true,
    );
  });
});
