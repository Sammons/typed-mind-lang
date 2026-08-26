import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-11-class-export-validation', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-11-class-export-validation.tmd';

  it('should validate class export behavior and detect export violations', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // Should be invalid due to class export violations
    assert.equal(result.valid, false);
    
    // Should have exactly 6 errors (4 orphaned + 2 export validation)
    assert.equal((result.errors).length, 6);

    // Check for all orphaned entity errors
    const orphanedUnexportedClass = result.errors.find(err =>
      err.message === "Orphaned entity 'UnexportedClass'"
    );
    assert.notEqual(orphanedUnexportedClass, undefined);
    assert.equal(orphanedUnexportedClass?.position.line, 7);

    const orphanedUnexportedFunction = result.errors.find(err =>
      err.message === "Orphaned entity 'unexportedFunction'"
    );
    assert.notEqual(orphanedUnexportedFunction, undefined);
    assert.equal(orphanedUnexportedFunction?.position.line, 10);

    const orphanedExportedClass = result.errors.find(err =>
      err.message === "Orphaned entity 'ExportedClass'"
    );
    assert.notEqual(orphanedExportedClass, undefined);
    assert.equal(orphanedExportedClass?.position.line, 13);

    const orphanedExportedFunction = result.errors.find(err =>
      err.message === "Orphaned entity 'exportedFunction'"
    );
    assert.notEqual(orphanedExportedFunction, undefined);
    assert.equal(orphanedExportedFunction?.position.line, 16);

    // Check export validation errors
    const classNotExportedError = result.errors.find(err =>
      err.message === "Class 'UnexportedClass' is not exported by any file"
    );
    assert.notEqual(classNotExportedError, undefined);
    assert.equal(classNotExportedError?.position.line, 7);
    assert.equal(classNotExportedError?.suggestion, "Add 'UnexportedClass' to the exports of a file entity or convert to ClassFile with #: operator");

    const functionNotExportedError = result.errors.find(err =>
      err.message === "Function 'unexportedFunction' is not exported by any file and is not a class method"
    );
    assert.notEqual(functionNotExportedError, undefined);
    assert.equal(functionNotExportedError?.position.line, 10);
    assert.equal(functionNotExportedError?.suggestion, "Either add 'unexportedFunction' to the exports of a file entity or define it as a method of a class");
  });
});