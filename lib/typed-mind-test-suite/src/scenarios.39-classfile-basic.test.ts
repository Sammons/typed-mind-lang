import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-39-classfile-basic', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-39-classfile-basic.tmd';

  it('should parse ClassFile entities correctly', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Should be invalid due to issues with ClassFile parsing and orphaned entities
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 3);

    const errorMessages = result.errors.map((err) => err.message);

    // Should detect that calls cannot reference ClassFile entities
    assert.ok(errorMessages.includes("Cannot use 'calls' to reference ClassFile 'TodoController'"));

    // Should detect orphaned entities
    assert.ok(errorMessages.includes("Orphaned entity 'startApp'"));
    assert.ok(errorMessages.includes("Orphaned entity 'BaseController'"));

    // Verify specific error positions
    const callError = result.errors.find((err) => err.message.includes("Cannot use 'calls' to reference ClassFile 'TodoController'"));
    assert.equal(callError?.position.line, 10);
    assert.equal(callError?.position.column, 1);
    assert.equal(callError?.suggestion, "'calls' can only reference: Function, Class");

    const orphanedStartAppError = result.errors.find((err) => err.message === "Orphaned entity 'startApp'");
    assert.equal(orphanedStartAppError?.position.line, 10);

    const orphanedBaseControllerError = result.errors.find((err) => err.message === "Orphaned entity 'BaseController'");
    assert.equal(orphanedBaseControllerError?.position.line, 18);

    // Verify the file contains expected ClassFile syntax
    assert.ok(content.includes('TodoController #: src/controllers/todo.ts <: BaseController'));
    assert.ok(content.includes('BaseController #: src/controllers/base.ts'));
  });
});
