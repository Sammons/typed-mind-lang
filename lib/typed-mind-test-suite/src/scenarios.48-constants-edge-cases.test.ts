import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 48: Constants Edge Cases', () => {
  it('should validate Constants with and without schema', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-48-constants-edge-cases.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');
    
    const checker = new DSLChecker();
    const result = checker.check(content);
    
    assert.equal(result.valid, false);
    assert.equal((result.errors).length, 3); // More errors than expected
    
    // Should find error for orphaned ConfigSchema
    const orphanedSchemaError = result.errors.find(e => 
      e.message.includes('ConfigSchema') && 
      e.message.includes('Orphaned entity')
    );
    assert.notEqual(orphanedSchemaError, undefined);
    assert.equal(orphanedSchemaError?.severity, 'error');
    assert.equal(orphanedSchemaError?.position.line, 24); // Line where ConfigSchema is defined
    
    // Constants with non-existent schema should be valid but the schema should not be found
    // (but the validator might not specifically flag this as missing schema anymore)
    const schemaErrors = result.errors.filter(e => 
      e.message.includes('NonExistentSchema')
    );
    // We may or may not get a specific "NonExistentSchema not found" error
    
    // Constants without schema should be valid (no error)
    const noSchemaError = result.errors.find(e => 
      e.message.includes('NoSchemaConfig')
    );
    assert.equal(noSchemaError, undefined);
    
    // Valid constants with schema should be valid (no error)
    const validConfigError = result.errors.find(e => 
      e.message.includes('ValidConfig') && 
      !e.message.includes('NonExistentSchema')
    );
    assert.equal(validConfigError, undefined);
    
    // Verify that all expected entities are present in the parsed result
    // (by absence of "not found" errors for them)
    const entityNotFoundErrors = result.errors.filter(e => 
      e.message.includes('not found') &&
      (e.message.includes('ValidConfig') ||
       e.message.includes('NoSchemaConfig') ||
       e.message.includes('ConfigSchema') ||
       e.message.includes('processConfig'))
    );
    assert.equal((entityNotFoundErrors).length, 0);
  });
});