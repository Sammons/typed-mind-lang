import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 46: Function Undefined Method Calls', () => {
  it('should detect functions with undefined method calls', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-46-function-undefined-calls.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');
    
    const checker = new DSLChecker();
    const result = checker.check(content);
    
    assert.equal(result.valid, false);
    assert.equal((result.errors).length, 14); // More errors than expected
    
    // Check specific errors
    const errors = result.errors;
    
    // Should find undefined UndefinedService
    const undefinedServiceError = errors.find(e => e.message.includes("UndefinedService"));
    assert.notEqual(undefinedServiceError, undefined);
    assert.ok((undefinedServiceError?.message).includes("references unknown entity 'UndefinedService'"));
    assert.equal(undefinedServiceError?.severity, 'error');
    assert.equal(undefinedServiceError?.position.line, 8); // Line where processData function is defined
    
    // Should find undefined NonExistentClass
    const nonExistentClassError = errors.find(e => e.message.includes("NonExistentClass"));
    assert.notEqual(nonExistentClassError, undefined);
    assert.ok((nonExistentClassError?.message).includes("references unknown entity 'NonExistentClass'"));
    assert.equal(nonExistentClassError?.severity, 'error');
    assert.equal(nonExistentClassError?.position.line, 8); // Line where processData function is defined
    
    // Should find error for calling method on DTO
    const requestDTOError = errors.find(e => e.message.includes("RequestDTO") && e.message.includes("Cannot call method"));
    assert.notEqual(requestDTOError, undefined);
    assert.ok((requestDTOError?.message).includes("Cannot call method 'handle' on DTO 'RequestDTO'"));
    assert.equal(requestDTOError?.severity, 'error');
    assert.equal(requestDTOError?.position.line, 14); // Line where handleRequest function is defined
    
    // Should find error for undefined someConstant.execute 
    const constantError = errors.find(e => e.message.includes("someConstant"));
    assert.notEqual(constantError, undefined);
    assert.ok((constantError?.message).includes("references unknown entity 'someConstant'"));
    assert.equal(constantError?.severity, 'error');
    assert.equal(constantError?.position.line, 14); // Line where handleRequest function is defined
    
    // Should find undefined InvalidClass
    const invalidClassError = errors.find(e => e.message.includes("InvalidClass"));
    assert.notEqual(invalidClassError, undefined);
    assert.ok((invalidClassError?.message).includes("references unknown entity 'InvalidClass'"));
    assert.equal(invalidClassError?.severity, 'error');
    assert.equal(invalidClassError?.position.line, 20); // Line where validateInput function is defined
  });
});