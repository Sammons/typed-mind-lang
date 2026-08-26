import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-10-dto-validation', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-10-dto-validation.tmd';

  it('should validate DTO structure and detect validation errors', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // Should be invalid due to validation errors
    assert.equal(result.valid, false);
    
    // Should have exactly 6 errors (2 orphaned + 4 validation)
    assert.equal((result.errors).length, 6);

    // Check for orphaned entities
    const orphanedCreateUser = result.errors.find(err =>
      err.message === "Orphaned entity 'createUser'"
    );
    assert.notEqual(orphanedCreateUser, undefined);
    assert.equal(orphanedCreateUser?.position.line, 6);

    const orphanedUpdateUser = result.errors.find(err =>
      err.message === "Orphaned entity 'updateUser'"
    );
    assert.notEqual(orphanedUpdateUser, undefined);
    assert.equal(orphanedUpdateUser?.position.line, 10);

    // Check for validation errors
    const cannotUseInputError = result.errors.find(err =>
      err.message === "Cannot use 'input' to reference File 'UserFile'"
    );
    assert.notEqual(cannotUseInputError, undefined);
    assert.equal(cannotUseInputError?.position.line, 10);
    assert.equal(cannotUseInputError?.suggestion, "'input' can only reference: DTO");

    const nonExistentDTOError = result.errors.find(err =>
      err.message === "Function input DTO 'NonExistentDTO' not found"
    );
    assert.notEqual(nonExistentDTOError, undefined);
    assert.equal(nonExistentDTOError?.position.line, 6);

    const userFileNotDTOError = result.errors.find(err =>
      err.message === "Function input 'UserFile' is not a DTO (it's a File)"
    );
    assert.notEqual(userFileNotDTOError, undefined);
    assert.equal(userFileNotDTOError?.position.line, 10);

    const notADTOError = result.errors.find(err =>
      err.message === "Function output DTO 'NotADTO' not found"
    );
    assert.notEqual(notADTOError, undefined);
    assert.equal(notADTOError?.position.line, 10);
  });
});