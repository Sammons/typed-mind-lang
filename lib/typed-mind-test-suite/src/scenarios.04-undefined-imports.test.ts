import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-04-undefined-imports', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-04-undefined-imports.tmd';

  it('should detect undefined imports and report errors', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Validation should fail due to undefined imports
    assert.equal(result.valid, false);

    // Should have exactly 4 errors (3 undefined imports + 1 orphaned file)
    assert.equal(result.errors.length, 4);

    // Check for orphaned file error
    const orphanedFileError = result.errors.find((err) => err.message.includes("Orphaned file 'ServiceA'"));
    assert.notEqual(orphanedFileError, undefined);
    assert.equal(orphanedFileError?.position.line, 8);
    assert.equal(orphanedFileError?.position.column, 1);

    // Check import errors (order may vary, so find them instead of assuming position)
    const nonExistentError = result.errors.find((err) => err.message === "Import 'NonExistentService' not found");
    assert.notEqual(nonExistentError, undefined);
    assert.equal(nonExistentError?.position.line, 3);

    const missingModuleError = result.errors.find((err) => err.message === "Import 'MissingModule' not found");
    assert.notEqual(missingModuleError, undefined);
    assert.equal(missingModuleError?.position.line, 3);

    const undefinedEntityError = result.errors.find((err) => err.message === "Import 'UndefinedEntity' not found");
    assert.notEqual(undefinedEntityError, undefined);
    assert.equal(undefinedEntityError?.position.line, 8);

    // Verify all errors are about undefined imports
    const importErrors = result.errors.filter((err) => err.message.includes('not found'));
    assert.equal(importErrors.length, 3);

    // Verify the specific undefined entity names are mentioned
    const errorMessages = result.errors.map((err) => err.message);
    assert.ok(errorMessages.includes("Import 'NonExistentService' not found"));
    assert.ok(errorMessages.includes("Import 'MissingModule' not found"));
    assert.ok(errorMessages.includes("Import 'UndefinedEntity' not found"));
  });
});
