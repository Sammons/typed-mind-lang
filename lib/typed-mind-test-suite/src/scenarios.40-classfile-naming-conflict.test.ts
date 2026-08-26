import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-40-classfile-naming-conflict', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-40-classfile-naming-conflict.tmd';

  it('should detect naming conflicts between File and Class entities', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // Should be invalid due to naming conflicts and other validation errors
    assert.equal(result.valid, false);
    assert.equal((result.errors).length, 10);

    const errorMessages = result.errors.map(err => err.message);

    // Should detect naming conflicts between File and Class entities
    const namingConflictErrors = result.errors.filter(err =>
      err.message.includes("Entity name 'UserController' is used by both a File and a Class")
    );
    assert.equal((namingConflictErrors).length, 2);

    // Should suggest using ClassFile syntax
    const conflictError = namingConflictErrors[0];
    assert.ok((conflictError.suggestion).includes("Replace with: UserController #:"));
    assert.ok((conflictError.suggestion).includes("src/controllers/user.ts <: BaseClass"));

    // Should detect orphaned entities
    assert.ok((errorMessages).includes("Orphaned entity 'startApp'"));
    assert.ok((errorMessages).includes("Orphaned entity 'someFunction'"));
    assert.ok((errorMessages).includes("Orphaned entity 'BaseController'"));

    // Should detect orphaned file
    assert.ok((errorMessages).includes("Orphaned file 'UserService' - none of its exports are imported"));

    // Should detect classes not exported by files
    assert.ok((errorMessages).includes("Class 'UserController' is not exported by any file"));
    assert.ok((errorMessages).includes("Class 'BaseController' is not exported by any file"));

    // Should detect function not exported by any file
    assert.ok((errorMessages).includes("Function 'someFunction' is not exported by any file and is not a class method"));

    // Should detect method not found on class
    assert.ok((errorMessages).includes("Method 'someMethod' not found on class 'UserController'"));
    
    // Verify specific error positions for naming conflicts
    const firstConflictError = result.errors.find(err => 
      err.message.includes("Entity name 'UserController' is used by both a File and a Class") && 
      err.position.line === 13
    );
    assert.notEqual(firstConflictError, undefined);
    
    const secondConflictError = result.errors.find(err => 
      err.message.includes("Entity name 'UserController' is used by both a File and a Class") && 
      err.position.line === 18
    );
    assert.notEqual(secondConflictError, undefined);
  });
});