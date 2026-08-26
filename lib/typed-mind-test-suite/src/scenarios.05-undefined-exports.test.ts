import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-05-undefined-exports', () => {
  const scenarioFile = 'scenario-05-undefined-exports.tmd';

  it('should validate 05 undefined exports', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Validation should fail due to undefined exports
    assert.equal(result.valid, false);

    // Should have exactly 4 errors (2 undefined exports + 2 orphaned entities)
    assert.equal(result.diagnostics.length, 4);

    // Check for orphaned entities
    const orphanedCreateUser = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'createUser'");
    assert.notEqual(orphanedCreateUser, undefined);
    assert.equal(orphanedCreateUser?.span.start.line, 7);

    const orphanedUserModel = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'UserModel'");
    assert.notEqual(orphanedUserModel, undefined);
    assert.equal(orphanedUserModel?.span.start.line, 9);

    // Check for undefined export errors
    const deleteUserDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Export 'deleteUser' is not defined anywhere in the codebase",
    );
    assert.notEqual(deleteUserDiagnostic, undefined);
    assert.equal(deleteUserDiagnostic?.span.start.line, 3);

    const updateUserDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Export 'updateUser' is not defined anywhere in the codebase",
    );
    assert.notEqual(updateUserDiagnostic, undefined);
    assert.equal(updateUserDiagnostic?.span.start.line, 3);
  });
});
