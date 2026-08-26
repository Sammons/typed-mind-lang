import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-01-duplicate-export', () => {
  const scenarioFile = 'scenario-01-duplicate-export.tmd';

  it('should validate 01 duplicate export', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Validate that the file is invalid due to errors
    assert.equal(result.valid, false);

    // Should have exactly 5 errors
    assert.equal(result.diagnostics.length, 5);

    // Check for the main duplicate export error
    const duplicateExportDiagnostic = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("Entity 'UserService' is exported by multiple files: MainFile, SecondFile"),
    );
    assert.notEqual(duplicateExportDiagnostic, undefined);
    assert.equal(duplicateExportDiagnostic?.span.start.line, 3);
    assert.equal(duplicateExportDiagnostic?.span.start.column, 1);
    assert.equal(duplicateExportDiagnostic?.severity, 'error');

    // Check for orphaned SecondFile error
    const orphanedSecondFileDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned file 'SecondFile' - none of its exports are imported",
    );
    assert.notEqual(orphanedSecondFileDiagnostic, undefined);
    assert.equal(orphanedSecondFileDiagnostic?.span.start.line, 6);
    assert.equal(orphanedSecondFileDiagnostic?.span.start.column, 1);
    assert.equal(orphanedSecondFileDiagnostic?.severity, 'error');

    // Check for orphaned UserService error
    const orphanedUserServiceDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'UserService'");
    assert.notEqual(orphanedUserServiceDiagnostic, undefined);
    assert.equal(orphanedUserServiceDiagnostic?.span.start.line, 10);
    assert.equal(orphanedUserServiceDiagnostic?.span.start.column, 1);
    assert.equal(orphanedUserServiceDiagnostic?.severity, 'error');

    // Check for orphaned BaseService error
    const orphanedBaseServiceDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'BaseService'");
    assert.notEqual(orphanedBaseServiceDiagnostic, undefined);
    assert.equal(orphanedBaseServiceDiagnostic?.span.start.line, 13);
    assert.equal(orphanedBaseServiceDiagnostic?.span.start.column, 1);
    assert.equal(orphanedBaseServiceDiagnostic?.severity, 'error');

    // Check for BaseService not exported error
    const baseServiceNotExportedDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Class 'BaseService' is not exported by any file",
    );
    assert.notEqual(baseServiceNotExportedDiagnostic, undefined);
    assert.equal(baseServiceNotExportedDiagnostic?.span.start.line, 13);
    assert.equal(baseServiceNotExportedDiagnostic?.span.start.column, 1);
    assert.equal(baseServiceNotExportedDiagnostic?.severity, 'error');

    // Ensure all diagnostics are error-level severity
    result.diagnostics.forEach((diagnostic) => {
      assert.equal(diagnostic.severity, 'error');
    });
  });
});
