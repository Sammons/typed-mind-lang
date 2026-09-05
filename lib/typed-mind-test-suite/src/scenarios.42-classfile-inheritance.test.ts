import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-42-classfile-inheritance', () => {
  const scenarioFile = 'scenario-42-classfile-inheritance.tmd';

  it('should handle ClassFile inheritance and implements correctly', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to import and export issues (based on actual error output)
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 4);

    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);

    // Q permits both verified ClassFile method calls.
    assert.equal(diagnosticMessages.filter((msg) => msg.includes("Cannot use 'calls' to reference ClassFile")).length, 0);

    // G counts all implements references; export legality remains independent.
    assert.equal(diagnosticMessages.includes("Orphaned entity 'IUserController'"), false);
    assert.equal(diagnosticMessages.includes("Orphaned entity 'IAdminController'"), false);
    assert.equal(diagnosticMessages.includes("Orphaned entity 'IAuditController'"), false);

    // Should detect classes not exported by files
    assert.ok(diagnosticMessages.includes("Class 'IUserController' is not exported by any file"));
    assert.ok(diagnosticMessages.includes("Class 'IAdminController' is not exported by any file"));
    assert.ok(diagnosticMessages.includes("Class 'IAuditController' is not exported by any file"));

    // Verify specific error positions
    const orphanedIUserError = result.diagnostics.find((diagnostic) => diagnostic.message.includes("Orphaned entity 'IUserController'"));
    assert.equal(orphanedIUserError, undefined);

    const callsError = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("Cannot use 'calls' to reference ClassFile 'UserController'"),
    );
    assert.equal(callsError, undefined);

    // Verify the file contains expected ClassFile inheritance syntax
    assert.ok(content.includes('UserController #: src/controllers/user.ts <: BaseController, IUserController'));
    assert.ok(content.includes('AdminController #: src/controllers/admin.ts <: BaseController, IAdminController, IAuditController'));
    assert.ok(content.includes('BaseController #: src/controllers/base.ts'));
  });
});
