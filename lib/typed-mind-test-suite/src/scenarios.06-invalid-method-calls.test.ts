import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-06-invalid-method-calls', () => {
  const scenarioFile = 'scenario-06-invalid-method-calls.tmd';

  it('should detect invalid method calls and unknown entity references', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to method call errors
    assert.equal(result.valid, false);

    // Should have exactly 5 errors (3 method/call errors + 2 orphaned entities)
    assert.equal(result.diagnostics.length, 5);

    // Check for orphaned entities
    const orphanedUserService = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'UserService'");
    assert.notEqual(orphanedUserService, undefined);
    assert.equal(orphanedUserService?.span.start.line, 6);

    const orphanedProcessData = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'processData'");
    assert.notEqual(orphanedProcessData, undefined);
    assert.equal(orphanedProcessData?.span.start.line, 9);

    // Check first diagnostic: UserService.update method not found
    const updateDiagnostic = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("Method 'update' not found on class 'UserService'"),
    );
    assert.notEqual(updateDiagnostic, undefined);
    assert.equal(updateDiagnostic?.severity, 'error');
    assert.equal(updateDiagnostic?.span.start.line, 9);
    assert.equal(updateDiagnostic?.span.start.column, 1);

    // Check second diagnostic: UserService.delete method not found
    const deleteDiagnostic = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("Method 'delete' not found on class 'UserService'"),
    );
    assert.notEqual(deleteDiagnostic, undefined);
    assert.equal(deleteDiagnostic?.severity, 'error');
    assert.equal(deleteDiagnostic?.span.start.line, 9);
    assert.equal(deleteDiagnostic?.span.start.column, 1);

    // Check third diagnostic: Unknown entity NotAClass
    const unknownEntityDiagnostic = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("Call to 'NotAClass.method' references unknown entity 'NotAClass'"),
    );
    assert.notEqual(unknownEntityDiagnostic, undefined);
    assert.equal(unknownEntityDiagnostic?.severity, 'error');
    assert.equal(unknownEntityDiagnostic?.span.start.line, 9);
    assert.equal(unknownEntityDiagnostic?.span.start.column, 1);
  });
});
