import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-02-orphaned-entity', () => {
  const scenarioFile = 'scenario-02-orphaned-entity.tmd';

  it('should detect orphaned entities that are not referenced anywhere', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should fail validation due to orphaned entities
    assert.equal(result.valid, false);

    // Should have exactly 7 errors
    assert.equal(result.diagnostics.length, 7);

    // Check for orphaned entity errors
    const orphanedFunctionDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned entity 'OrphanedFunction'" && diagnostic.span.start.line === 9,
    );
    assert.notEqual(orphanedFunctionDiagnostic, undefined);
    assert.equal(orphanedFunctionDiagnostic?.severity, 'error');
    assert.equal(orphanedFunctionDiagnostic?.span.start.column, 1);

    const orphanedClassDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned entity 'OrphanedClass'" && diagnostic.span.start.line === 11,
    );
    assert.notEqual(orphanedClassDiagnostic, undefined);
    assert.equal(orphanedClassDiagnostic?.severity, 'error');
    assert.equal(orphanedClassDiagnostic?.span.start.column, 1);

    const orphanedFileDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Orphaned file 'OrphanedFile' - none of its exports are imported" && diagnostic.span.start.line === 14,
    );
    assert.notEqual(orphanedFileDiagnostic, undefined);
    assert.equal(orphanedFileDiagnostic?.severity, 'error');
    assert.equal(orphanedFileDiagnostic?.span.start.column, 1);

    // Check for function not exported errors
    const functionNotExportedDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Function 'OrphanedFunction' is not exported by any file and is not a class method",
    );
    assert.notEqual(functionNotExportedDiagnostic, undefined);
    assert.equal(functionNotExportedDiagnostic?.severity, 'error');
    assert.equal(functionNotExportedDiagnostic?.span.start.line, 9);
    assert.equal(functionNotExportedDiagnostic?.span.start.column, 1);

    // Check for class not exported errors
    const classNotExportedDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Class 'OrphanedClass' is not exported by any file",
    );
    assert.notEqual(classNotExportedDiagnostic, undefined);
    assert.equal(classNotExportedDiagnostic?.severity, 'error');
    assert.equal(classNotExportedDiagnostic?.span.start.line, 11);
    assert.equal(classNotExportedDiagnostic?.span.start.column, 1);

    // Check for additional orphaned entities
    const orphanedActiveServiceDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned entity 'ActiveService'" && diagnostic.span.start.line === 6,
    );
    assert.notEqual(orphanedActiveServiceDiagnostic, undefined);
    assert.equal(orphanedActiveServiceDiagnostic?.severity, 'error');

    const orphanedSomethingDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned entity 'something'" && diagnostic.span.start.line === 18,
    );
    assert.notEqual(orphanedSomethingDiagnostic, undefined);
    assert.equal(orphanedSomethingDiagnostic?.severity, 'error');

    // Verify that all diagnostics are about orphaned entities
    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);
    assert.ok(diagnosticMessages.includes("Orphaned entity 'ActiveService'"));
    assert.ok(diagnosticMessages.includes("Orphaned entity 'OrphanedFunction'"));
    assert.ok(diagnosticMessages.includes("Orphaned entity 'OrphanedClass'"));
    assert.ok(diagnosticMessages.includes("Orphaned file 'OrphanedFile' - none of its exports are imported"));
    assert.ok(diagnosticMessages.includes("Orphaned entity 'something'"));
    assert.ok(diagnosticMessages.includes("Function 'OrphanedFunction' is not exported by any file and is not a class method"));
    assert.ok(diagnosticMessages.includes("Class 'OrphanedClass' is not exported by any file"));
  });
});
