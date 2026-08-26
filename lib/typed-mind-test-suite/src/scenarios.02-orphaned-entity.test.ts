import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-02-orphaned-entity', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-02-orphaned-entity.tmd';

  it('should detect orphaned entities that are not referenced anywhere', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // Should fail validation due to orphaned entities
    assert.equal(result.valid, false);
    
    // Should have exactly 7 errors
    assert.equal((result.errors).length, 7);
    
    // Check for orphaned entity errors
    const orphanedFunctionError = result.errors.find(err => 
      err.message === "Orphaned entity 'OrphanedFunction'" && err.position.line === 9
    );
    assert.notEqual(orphanedFunctionError, undefined);
    assert.equal(orphanedFunctionError?.severity, 'error');
    assert.equal(orphanedFunctionError?.suggestion, 'Remove or reference this entity');
    assert.equal(orphanedFunctionError?.position.column, 1);
    
    const orphanedClassError = result.errors.find(err => 
      err.message === "Orphaned entity 'OrphanedClass'" && err.position.line === 11
    );
    assert.notEqual(orphanedClassError, undefined);
    assert.equal(orphanedClassError?.severity, 'error');
    assert.equal(orphanedClassError?.suggestion, 'Remove or reference this entity');
    assert.equal(orphanedClassError?.position.column, 1);
    
    const orphanedFileError = result.errors.find(err =>
      err.message === "Orphaned file 'OrphanedFile' - none of its exports are imported" && err.position.line === 14
    );
    assert.notEqual(orphanedFileError, undefined);
    assert.equal(orphanedFileError?.severity, 'error');
    assert.equal(orphanedFileError?.suggestion, 'Remove this file or import its exports somewhere');
    assert.equal(orphanedFileError?.position.column, 1);
    
    // Check for function not exported errors
    const functionNotExportedError = result.errors.find(err => 
      err.message === "Function 'OrphanedFunction' is not exported by any file and is not a class method"
    );
    assert.notEqual(functionNotExportedError, undefined);
    assert.equal(functionNotExportedError?.severity, 'error');
    assert.equal(functionNotExportedError?.suggestion, "Either add 'OrphanedFunction' to the exports of a file entity or define it as a method of a class");
    assert.equal(functionNotExportedError?.position.line, 9);
    assert.equal(functionNotExportedError?.position.column, 1);
    
    // Check for class not exported errors
    const classNotExportedError = result.errors.find(err => 
      err.message === "Class 'OrphanedClass' is not exported by any file"
    );
    assert.notEqual(classNotExportedError, undefined);
    assert.equal(classNotExportedError?.severity, 'error');
    assert.equal(classNotExportedError?.suggestion, "Add 'OrphanedClass' to the exports of a file entity or convert to ClassFile with #: operator");
    assert.equal(classNotExportedError?.position.line, 11);
    assert.equal(classNotExportedError?.position.column, 1);

    // Check for additional orphaned entities
    const orphanedActiveServiceError = result.errors.find(err =>
      err.message === "Orphaned entity 'ActiveService'" && err.position.line === 6
    );
    assert.notEqual(orphanedActiveServiceError, undefined);
    assert.equal(orphanedActiveServiceError?.severity, 'error');

    const orphanedSomethingError = result.errors.find(err =>
      err.message === "Orphaned entity 'something'" && err.position.line === 18
    );
    assert.notEqual(orphanedSomethingError, undefined);
    assert.equal(orphanedSomethingError?.severity, 'error');

    // Verify that all errors are about orphaned entities
    const errorMessages = result.errors.map(err => err.message);
    assert.ok((errorMessages).includes("Orphaned entity 'ActiveService'"));
    assert.ok((errorMessages).includes("Orphaned entity 'OrphanedFunction'"));
    assert.ok((errorMessages).includes("Orphaned entity 'OrphanedClass'"));
    assert.ok((errorMessages).includes("Orphaned file 'OrphanedFile' - none of its exports are imported"));
    assert.ok((errorMessages).includes("Orphaned entity 'something'"));
    assert.ok((errorMessages).includes("Function 'OrphanedFunction' is not exported by any file and is not a class method"));
    assert.ok((errorMessages).includes("Class 'OrphanedClass' is not exported by any file"));
  });
});