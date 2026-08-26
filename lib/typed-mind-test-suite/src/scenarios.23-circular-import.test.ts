import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-23-circular-import', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-23-circular-import.tmd';

  it('should detect circular import errors', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = checker.check(content, filePath);
    
    // Should be invalid due to circular import and orphaned entities
    assert.equal(result.valid, false);
    
    // Should have exactly 2 errors (1 orphaned entity + 1 circular import)
    assert.equal((result.errors).length, 2);
    
    // Check for circular import error
    const circularImportError = result.errors.find(err => err.message.includes('Circular import detected'));
    assert.notEqual(circularImportError, undefined);
    assert.equal(circularImportError?.position.line, 2);
    assert.equal(circularImportError?.position.column, 1);
    assert.equal(circularImportError?.severity, 'error');
    assert.equal(circularImportError?.suggestion, undefined);
    assert.match(circularImportError?.message, /module-a\.tmd -> .*module-b\.tmd -> .*module-a\.tmd/);
    
    // Check for start orphaned entity error
    const startError = result.errors.find(err => err.message.includes("Orphaned entity 'start'"));
    assert.notEqual(startError, undefined);
    assert.equal(startError?.position.line, 10);
    assert.equal(startError?.position.column, 1);
    assert.equal(startError?.severity, 'error');
    assert.equal(startError?.suggestion, 'Remove or reference this entity');
  });
});