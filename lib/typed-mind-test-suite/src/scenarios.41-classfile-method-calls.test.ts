import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-41-classfile-method-calls', () => {
  const scenarioFile = 'scenario-41-classfile-method-calls.tmd';

  it('should validate method calls on ClassFile entities', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to issues with method calls and entity resolution (based on actual error output)
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 6);

    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);

    // Q permits the two verified methods; the unknown method retains its diagnostics.
    assert.equal(diagnosticMessages.filter((msg) => msg.includes("Cannot use 'calls' to reference ClassFile 'UserController'")).length, 1);

    // Should detect orphaned entity
    assert.ok(diagnosticMessages.includes("Orphaned entity 'testInvalidCall'"));

    // Should detect function not exported by any file
    assert.ok(diagnosticMessages.includes("Function 'testInvalidCall' is not exported by any file and is not a class method"));

    // Should detect method not found on classfile
    assert.ok(diagnosticMessages.includes("Method 'nonExistentMethod' not found on classfile 'UserController'"));

    // Verify specific error positions for method call validation
    const orphanedError = result.diagnostics.find((diagnostic) => diagnostic.message.includes("Orphaned entity 'testInvalidCall'"));
    assert.equal(orphanedError?.span.start.line, 25);

    const methodNotFoundError = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("Method 'nonExistentMethod' not found on classfile"),
    );
    assert.equal(methodNotFoundError?.span.start.line, 25);

    // Verify the file contains expected ClassFile syntax with proper methods
    assert.ok(content.includes('UserController #: src/controllers/user.ts <: BaseController'));
    assert.ok(content.includes('=> [createUser, getUser, updateUser, deleteUser]'));
  });
});
