import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-38-dependency-validation', () => {
  it('should validate dependency entities', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-38-dependency-validation.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');
    
    const parser = new DSLParser();
    const parseResult = parser.parse(content);
    
    const validator = new DSLValidator();
    const validationResult = validator.validate(parseResult.entities);
    
    // Should be invalid due to multiple dependency validation errors
    assert.equal(validationResult.valid, false);
    assert.equal((validationResult.errors).length, 5);
    
    const errorMessages = validationResult.errors.map(err => err.message);
    
    // Should detect that 'calls' cannot reference a Dependency
    assert.ok((errorMessages).includes("Cannot use 'calls' to reference Dependency 'axios'"));
    
    // Should detect orphaned entity
    assert.ok((errorMessages).includes("Orphaned entity 'User'"));
    
    // Should detect that class is not exported by any file
    assert.ok((errorMessages).includes("Class 'AuthService' is not exported by any file"));
    
    // Should detect that method calls cannot be made on dependencies
    assert.ok((errorMessages).includes("Cannot call method 'post' on Dependency 'axios'. Only Classes and ClassFiles can have methods"));
    
    // Verify specific error positions for key validation errors
    const axiosCallError = validationResult.errors.find(err => err.message.includes("Cannot use 'calls' to reference Dependency 'axios'"));
    assert.equal(axiosCallError?.position.line, 29);
    assert.equal(axiosCallError?.position.column, 1);
    
    const orphanedUserError = validationResult.errors.find(err => err.message.includes("Orphaned entity 'User'"));
    assert.equal(orphanedUserError?.position.line, 43);
    
    const authServiceError = validationResult.errors.find(err => err.message.includes("Class 'AuthService' is not exported by any file"));
    assert.equal(authServiceError?.position.line, 21);
  });
});