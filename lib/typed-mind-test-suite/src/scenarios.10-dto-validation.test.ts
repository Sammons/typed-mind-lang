import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-10-dto-validation', () => {
  const scenarioFile = 'scenario-10-dto-validation.tmd';

  it('should validate DTO structure and detect validation errors', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to validation errors
    assert.equal(result.valid, false);

    // RFC-TM-4 §4 A2: the empty exports list `-> []` (L20) is now diagnosed as a
    // syntax/error ("unparsable text") in addition to the 6 legacy diagnostics.
    assert.equal(result.diagnostics.length, 7); // was 6

    assert.ok(
      result.diagnostics.some((diagnostic) => diagnostic.message === 'unparsable text: `-> []`' && diagnostic.span.start.line === 20),
    );

    // Check for orphaned entities
    const orphanedCreateUser = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'createUser'");
    assert.notEqual(orphanedCreateUser, undefined);
    assert.equal(orphanedCreateUser?.span.start.line, 6);

    const orphanedUpdateUser = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'updateUser'");
    assert.notEqual(orphanedUpdateUser, undefined);
    assert.equal(orphanedUpdateUser?.span.start.line, 10);

    // Check for validation errors
    const cannotUseInputDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Cannot use 'input' to reference File 'UserFile'",
    );
    assert.notEqual(cannotUseInputDiagnostic, undefined);
    assert.equal(cannotUseInputDiagnostic?.span.start.line, 10);

    const nonExistentDTODiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Function input DTO 'NonExistentDTO' not found",
    );
    assert.notEqual(nonExistentDTODiagnostic, undefined);
    assert.equal(nonExistentDTODiagnostic?.span.start.line, 6);

    const userFileNotDTODiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Function input 'UserFile' is not a DTO (it's a File)",
    );
    assert.notEqual(userFileNotDTODiagnostic, undefined);
    assert.equal(userFileNotDTODiagnostic?.span.start.line, 10);

    const notADTODiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Function output DTO 'NotADTO' not found");
    assert.notEqual(notADTODiagnostic, undefined);
    assert.equal(notADTODiagnostic?.span.start.line, 10);
  });
});
