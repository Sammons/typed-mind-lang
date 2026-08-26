import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-01-duplicate-export', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-01-duplicate-export.tmd';

  it('should validate 01 duplicate export', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Validate that the file is invalid due to errors
    assert.equal(result.valid, false);

    // Should have exactly 5 errors
    assert.equal(result.errors.length, 5);

    // Check for the main duplicate export error
    const duplicateExportError = result.errors.find((err) =>
      err.message.includes("Entity 'UserService' is exported by multiple files: MainFile, SecondFile"),
    );
    assert.notEqual(duplicateExportError, undefined);
    assert.equal(duplicateExportError?.position.line, 3);
    assert.equal(duplicateExportError?.position.column, 1);
    assert.equal(duplicateExportError?.severity, 'error');
    assert.equal(duplicateExportError?.suggestion, 'Each entity should be exported by exactly one file. Remove the duplicate exports.');

    // Check for orphaned SecondFile error
    const orphanedSecondFileError = result.errors.find(
      (err) => err.message === "Orphaned file 'SecondFile' - none of its exports are imported",
    );
    assert.notEqual(orphanedSecondFileError, undefined);
    assert.equal(orphanedSecondFileError?.position.line, 6);
    assert.equal(orphanedSecondFileError?.position.column, 1);
    assert.equal(orphanedSecondFileError?.severity, 'error');
    assert.equal(orphanedSecondFileError?.suggestion, 'Remove this file or import its exports somewhere');

    // Check for orphaned UserService error
    const orphanedUserServiceError = result.errors.find((err) => err.message === "Orphaned entity 'UserService'");
    assert.notEqual(orphanedUserServiceError, undefined);
    assert.equal(orphanedUserServiceError?.position.line, 10);
    assert.equal(orphanedUserServiceError?.position.column, 1);
    assert.equal(orphanedUserServiceError?.severity, 'error');
    assert.equal(orphanedUserServiceError?.suggestion, 'Remove or reference this entity');

    // Check for orphaned BaseService error
    const orphanedBaseServiceError = result.errors.find((err) => err.message === "Orphaned entity 'BaseService'");
    assert.notEqual(orphanedBaseServiceError, undefined);
    assert.equal(orphanedBaseServiceError?.position.line, 13);
    assert.equal(orphanedBaseServiceError?.position.column, 1);
    assert.equal(orphanedBaseServiceError?.severity, 'error');
    assert.equal(orphanedBaseServiceError?.suggestion, 'Remove or reference this entity');

    // Check for BaseService not exported error
    const baseServiceNotExportedError = result.errors.find((err) => err.message === "Class 'BaseService' is not exported by any file");
    assert.notEqual(baseServiceNotExportedError, undefined);
    assert.equal(baseServiceNotExportedError?.position.line, 13);
    assert.equal(baseServiceNotExportedError?.position.column, 1);
    assert.equal(baseServiceNotExportedError?.severity, 'error');
    assert.equal(
      baseServiceNotExportedError?.suggestion,
      "Add 'BaseService' to the exports of a file entity or convert to ClassFile with #: operator",
    );

    // Ensure all errors are error-level severity
    result.errors.forEach((error) => {
      assert.equal(error.severity, 'error');
    });
  });
});
