import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-42-classfile-inheritance', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-42-classfile-inheritance.tmd';

  it('should handle ClassFile inheritance and implements correctly', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Should be invalid due to import and export issues (based on actual error output)
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 10);

    const errorMessages = result.errors.map((err) => err.message);

    // Should detect that calls cannot reference ClassFile entities
    assert.equal(errorMessages.filter((msg) => msg.includes("Cannot use 'calls' to reference ClassFile")).length, 2);

    // Should detect orphaned interface entities
    assert.ok(errorMessages.includes("Orphaned entity 'IUserController'"));
    assert.ok(errorMessages.includes("Orphaned entity 'IAdminController'"));
    assert.ok(errorMessages.includes("Orphaned entity 'IAuditController'"));

    // Should detect classes not exported by files
    assert.ok(errorMessages.includes("Class 'IUserController' is not exported by any file"));
    assert.ok(errorMessages.includes("Class 'IAdminController' is not exported by any file"));
    assert.ok(errorMessages.includes("Class 'IAuditController' is not exported by any file"));

    // Verify specific error positions
    const orphanedIUserError = result.errors.find((err) => err.message.includes("Orphaned entity 'IUserController'"));
    assert.equal(orphanedIUserError?.position.line, 28);

    const callsError = result.errors.find((err) => err.message.includes("Cannot use 'calls' to reference ClassFile 'UserController'"));
    assert.equal(callsError?.position.line, 10);
    assert.equal(callsError?.suggestion, "'calls' can only reference: Function, Class");

    // Verify the file contains expected ClassFile inheritance syntax
    assert.ok(content.includes('UserController #: src/controllers/user.ts <: BaseController, IUserController'));
    assert.ok(content.includes('AdminController #: src/controllers/admin.ts <: BaseController, IAdminController, IAuditController'));
    assert.ok(content.includes('BaseController #: src/controllers/base.ts'));
  });
});
