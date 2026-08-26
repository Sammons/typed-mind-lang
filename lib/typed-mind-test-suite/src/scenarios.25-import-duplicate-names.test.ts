import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-25-import-duplicate-names', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-25-import-duplicate-names.tmd';

  it('should validate import duplicate names', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = checker.check(content, filePath);

    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 4);

    // Should detect orphaned initialize
    const initializeOrphanError = result.errors.find((err) => err.message === "Orphaned entity 'initialize'");
    assert.notEqual(initializeOrphanError, undefined);
    assert.equal(initializeOrphanError?.position.line, 11);
    assert.equal(initializeOrphanError?.severity, 'error');

    // Should detect orphaned validateUser
    const validateUserOrphanError = result.errors.find((err) => err.message === "Orphaned entity 'validateUser'");
    assert.notEqual(validateUserOrphanError, undefined);
    assert.equal(validateUserOrphanError?.position.line, 8);

    // Should detect AuthService exported by multiple files
    const multipleExportsError = result.errors.find(
      (err) => err.message === "Entity 'AuthService' is exported by multiple files: AuthFile, AuthDuplicateFile",
    );
    assert.notEqual(multipleExportsError, undefined);
    assert.equal(multipleExportsError?.severity, 'error');
    assert.equal(multipleExportsError?.suggestion, 'Each entity should be exported by exactly one file. Remove the duplicate exports.');

    // Should detect duplicate entity name from import
    const duplicateNameError = result.errors.find((err) => err.message === "Duplicate entity name 'AuthService' from import");
    assert.notEqual(duplicateNameError, undefined);
    assert.equal(duplicateNameError?.position.line, 3);
    assert.equal(duplicateNameError?.suggestion, 'Use an alias to avoid naming conflicts');
  });
});
