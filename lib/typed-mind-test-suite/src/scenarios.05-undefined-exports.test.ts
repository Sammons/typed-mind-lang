import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-05-undefined-exports', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-05-undefined-exports.tmd';

  it('should validate 05 undefined exports', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Validation should fail due to undefined exports
    assert.equal(result.valid, false);

    // Should have exactly 4 errors (2 undefined exports + 2 orphaned entities)
    assert.equal(result.errors.length, 4);

    // Check for orphaned entities
    const orphanedCreateUser = result.errors.find((err) => err.message === "Orphaned entity 'createUser'");
    assert.notEqual(orphanedCreateUser, undefined);
    assert.equal(orphanedCreateUser?.position.line, 7);

    const orphanedUserModel = result.errors.find((err) => err.message === "Orphaned entity 'UserModel'");
    assert.notEqual(orphanedUserModel, undefined);
    assert.equal(orphanedUserModel?.position.line, 9);

    // Check for undefined export errors
    const deleteUserError = result.errors.find((err) => err.message === "Export 'deleteUser' is not defined anywhere in the codebase");
    assert.notEqual(deleteUserError, undefined);
    assert.equal(deleteUserError?.position.line, 3);
    assert.equal(deleteUserError?.suggestion, "Define 'deleteUser' as a Function, Class, Constants, Asset, or UIComponent entity");

    const updateUserError = result.errors.find((err) => err.message === "Export 'updateUser' is not defined anywhere in the codebase");
    assert.notEqual(updateUserError, undefined);
    assert.equal(updateUserError?.position.line, 3);
    assert.equal(updateUserError?.suggestion, "Define 'updateUser' as a Function, Class, Constants, Asset, or UIComponent entity");
  });
});
