import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-40-classfile-naming-conflict', () => {
  const scenarioFile = 'scenario-40-classfile-naming-conflict.tmd';

  it('should detect naming conflicts between File and Class entities', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to naming conflicts and other validation diagnostics
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 10);

    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);

    // Should detect naming conflicts between File and Class entities
    const namingConflictDiagnostics = result.diagnostics.filter((diagnostic) =>
      diagnostic.message.includes("Entity name 'UserController' is used by both a File and a Class"),
    );
    assert.equal(namingConflictDiagnostics.length, 2);

    // Should detect orphaned entities
    assert.ok(diagnosticMessages.includes("Orphaned entity 'startApp'"));
    assert.ok(diagnosticMessages.includes("Orphaned entity 'someFunction'"));
    assert.ok(diagnosticMessages.includes("Orphaned entity 'BaseController'"));

    // Should detect orphaned file
    assert.ok(diagnosticMessages.includes("Orphaned file 'UserService' - none of its exports are imported"));

    // Should detect classes not exported by files
    assert.ok(diagnosticMessages.includes("Class 'UserController' is not exported by any file"));
    assert.ok(diagnosticMessages.includes("Class 'BaseController' is not exported by any file"));

    // Should detect function not exported by any file
    assert.ok(diagnosticMessages.includes("Function 'someFunction' is not exported by any file and is not a class method"));

    // Should detect method not found on class
    assert.ok(diagnosticMessages.includes("Method 'someMethod' not found on class 'UserController'"));

    // Verify specific diagnostic positions for naming conflicts
    const firstConflictDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message.includes("Entity name 'UserController' is used by both a File and a Class") && diagnostic.span.start.line === 13,
    );
    assert.notEqual(firstConflictDiagnostic, undefined);

    const secondConflictDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message.includes("Entity name 'UserController' is used by both a File and a Class") && diagnostic.span.start.line === 18,
    );
    assert.notEqual(secondConflictDiagnostic, undefined);
  });
});
