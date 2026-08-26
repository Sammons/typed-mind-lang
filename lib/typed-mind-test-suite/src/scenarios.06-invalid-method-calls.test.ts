import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-06-invalid-method-calls', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-06-invalid-method-calls.tmd';

  it('should detect invalid method calls and unknown entity references', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Should be invalid due to method call errors
    assert.equal(result.valid, false);

    // Should have exactly 5 errors (3 method/call errors + 2 orphaned entities)
    assert.equal(result.errors.length, 5);

    // Check for orphaned entities
    const orphanedUserService = result.errors.find((err) => err.message === "Orphaned entity 'UserService'");
    assert.notEqual(orphanedUserService, undefined);
    assert.equal(orphanedUserService?.position.line, 6);

    const orphanedProcessData = result.errors.find((err) => err.message === "Orphaned entity 'processData'");
    assert.notEqual(orphanedProcessData, undefined);
    assert.equal(orphanedProcessData?.position.line, 9);

    // Check first error: UserService.update method not found
    const updateError = result.errors.find((err) => err.message.includes("Method 'update' not found on class 'UserService'"));
    assert.notEqual(updateError, undefined);
    assert.equal(updateError?.severity, 'error');
    assert.equal(updateError?.position.line, 9);
    assert.equal(updateError?.position.column, 1);
    assert.equal(updateError?.suggestion, 'Available methods: create, read');

    // Check second error: UserService.delete method not found
    const deleteError = result.errors.find((err) => err.message.includes("Method 'delete' not found on class 'UserService'"));
    assert.notEqual(deleteError, undefined);
    assert.equal(deleteError?.severity, 'error');
    assert.equal(deleteError?.position.line, 9);
    assert.equal(deleteError?.position.column, 1);
    assert.equal(deleteError?.suggestion, 'Available methods: create, read');

    // Check third error: Unknown entity NotAClass
    const unknownEntityError = result.errors.find((err) =>
      err.message.includes("Call to 'NotAClass.method' references unknown entity 'NotAClass'"),
    );
    assert.notEqual(unknownEntityError, undefined);
    assert.equal(unknownEntityError?.severity, 'error');
    assert.equal(unknownEntityError?.position.line, 9);
    assert.equal(unknownEntityError?.position.column, 1);
    assert.equal(unknownEntityError?.suggestion, undefined);
  });
});
