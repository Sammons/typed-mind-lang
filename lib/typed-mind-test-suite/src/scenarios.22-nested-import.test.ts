import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-22-nested-import', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-22-nested-import.tmd';

  it('should validate nested imports and detect orphaned entities', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = checker.check(content, filePath);
    
    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    
    // Should have exactly 3 orphaned entity errors
    assert.equal((result.errors).length, 3);
    
    // Check for actual orphaned entity errors
    assert.equal(result.errors.some(err => err.message.includes("Orphaned entity 'main'")), true);
    assert.equal(result.errors.some(err => err.message.includes("Orphaned entity 'User'")), true);
    assert.equal(result.errors.some(err => err.message.includes("Orphaned entity 'query'")), true);
  });
});