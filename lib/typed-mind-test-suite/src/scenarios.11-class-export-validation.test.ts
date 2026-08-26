import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-11-class-export-validation', () => {
  const scenarioFile = 'scenario-11-class-export-validation.tmd';

  it('should validate class export behavior and detect export violations', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to class export violations
    assert.equal(result.valid, false);

    // Should have exactly 6 errors (4 orphaned + 2 export validation)
    assert.equal(result.diagnostics.length, 6);

    // Check for all orphaned entity errors
    const orphanedUnexportedClass = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'UnexportedClass'");
    assert.notEqual(orphanedUnexportedClass, undefined);
    assert.equal(orphanedUnexportedClass?.span.start.line, 7);

    const orphanedUnexportedFunction = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned entity 'unexportedFunction'",
    );
    assert.notEqual(orphanedUnexportedFunction, undefined);
    assert.equal(orphanedUnexportedFunction?.span.start.line, 10);

    const orphanedExportedClass = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'ExportedClass'");
    assert.notEqual(orphanedExportedClass, undefined);
    assert.equal(orphanedExportedClass?.span.start.line, 13);

    const orphanedExportedFunction = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'exportedFunction'");
    assert.notEqual(orphanedExportedFunction, undefined);
    assert.equal(orphanedExportedFunction?.span.start.line, 16);

    // Check export validation errors
    const classNotExportedDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Class 'UnexportedClass' is not exported by any file",
    );
    assert.notEqual(classNotExportedDiagnostic, undefined);
    assert.equal(classNotExportedDiagnostic?.span.start.line, 7);

    const functionNotExportedDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Function 'unexportedFunction' is not exported by any file and is not a class method",
    );
    assert.notEqual(functionNotExportedDiagnostic, undefined);
    assert.equal(functionNotExportedDiagnostic?.span.start.line, 10);
  });
});
