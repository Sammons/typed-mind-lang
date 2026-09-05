import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-39-classfile-basic', () => {
  const scenarioFile = 'scenario-39-classfile-basic.tmd';

  it('should parse ClassFile entities correctly', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to issues with ClassFile parsing and orphaned entities
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 1);

    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);

    // Q permits verified ClassFile method calls while retaining orphan diagnostics.
    assert.equal(diagnosticMessages.includes("Cannot use 'calls' to reference ClassFile 'TodoController'"), false);

    // Should detect orphaned entities
    assert.ok(diagnosticMessages.includes("Orphaned entity 'startApp'"));
    assert.equal(diagnosticMessages.includes("Orphaned entity 'BaseController'"), false);

    // Verify specific diagnostic positions
    const callDiagnostic = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("Cannot use 'calls' to reference ClassFile 'TodoController'"),
    );
    assert.equal(callDiagnostic, undefined);

    const orphanedStartAppDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'startApp'");
    assert.equal(orphanedStartAppDiagnostic?.span.start.line, 10);

    const orphanedBaseControllerDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned entity 'BaseController'",
    );
    assert.equal(orphanedBaseControllerDiagnostic, undefined);

    // Verify the file contains expected ClassFile syntax
    assert.ok(content.includes('TodoController #: src/controllers/todo.ts <: BaseController'));
    assert.ok(content.includes('BaseController #: src/controllers/base.ts'));
  });
});
