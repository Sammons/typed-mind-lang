import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-41-classfile-method-calls', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-41-classfile-method-calls.tmd';

  it('should validate method calls on ClassFile entities', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // Should be invalid due to issues with method calls and entity resolution (based on actual error output)
    assert.equal(result.valid, false);
    assert.equal((result.errors).length, 8);
    
    const errorMessages = result.errors.map(err => err.message);
    
    // Should detect that calls cannot reference ClassFile entities
    assert.equal(errorMessages.filter(msg => msg.includes("Cannot use 'calls' to reference ClassFile 'UserController'")).length, 3);
    
    // Should detect orphaned entity
    assert.ok((errorMessages).includes("Orphaned entity 'testInvalidCall'"));
    
    // Should detect function not exported by any file
    assert.ok((errorMessages).includes("Function 'testInvalidCall' is not exported by any file and is not a class method"));
    
    // Should detect method not found on classfile
    assert.ok((errorMessages).includes("Method 'nonExistentMethod' not found on classfile 'UserController'"));
    
    // Verify specific error positions for method call validation
    const orphanedError = result.errors.find(err => err.message.includes("Orphaned entity 'testInvalidCall'"));
    assert.equal(orphanedError?.position.line, 25);
    
    const methodNotFoundError = result.errors.find(err => err.message.includes("Method 'nonExistentMethod' not found on classfile"));
    assert.equal(methodNotFoundError?.position.line, 25);
    assert.equal(methodNotFoundError?.suggestion, "Available methods: createUser, getUser, updateUser, deleteUser");
    
    // Verify the file contains expected ClassFile syntax with proper methods
    assert.ok((content).includes('UserController #: src/controllers/user.ts <: BaseController'));
    assert.ok((content).includes('=> [createUser, getUser, updateUser, deleteUser]'));
  });
});