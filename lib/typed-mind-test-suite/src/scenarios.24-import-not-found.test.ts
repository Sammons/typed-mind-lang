import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-24-import-not-found', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-24-import-not-found.tmd';

  it('should detect import file not found errors', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = checker.check(content, filePath);
    
    // Should be invalid due to import file not found
    assert.equal(result.valid, false);
    
    // Should have exactly 2 errors (1 failed import + 1 orphaned entity)
    assert.equal((result.errors).length, 2);

    // Check for import file not found error
    const importError = result.errors.find(err => err.message.includes('Failed to import'));
    assert.notEqual(importError, undefined);
    assert.match(importError?.message, /Failed to import '\.\/non-existent-file\.tmd'/);
    assert.match(importError?.message, /ENOENT: no such file or directory/);
    assert.equal(importError?.position.line, 2);
    assert.equal(importError?.position.column, 1);
    assert.equal(importError?.severity, 'error');

    // Check for orphaned entity error
    const orphanedError = result.errors.find(err => err.message.includes("Orphaned entity 'main'"));
    assert.notEqual(orphanedError, undefined);
    assert.equal(orphanedError?.position.line, 9);
    assert.equal(orphanedError?.position.column, 1);
    assert.equal(orphanedError?.severity, 'error');
    assert.equal(orphanedError?.suggestion, 'Remove or reference this entity');
  });
});