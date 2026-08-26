import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-07-duplicate-paths', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-07-duplicate-paths.tmd';

  it('should detect duplicate file paths as validation errors', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // The DSL should be invalid due to duplicate paths
    assert.equal(result.valid, false);

    // Should have exactly 5 errors
    assert.equal(result.errors.length, 5);

    // Check the duplicate path error details
    const duplicatePathError = result.errors.find((err) => err.message === "Path 'src/shared/utils.ts' already used by File 'FileOne'");
    assert.notEqual(duplicatePathError, undefined);
    assert.equal(duplicatePathError?.position.line, 10);
    assert.equal(duplicatePathError?.position.column, 1);
    assert.equal(duplicatePathError?.severity, 'error');
    assert.equal(duplicatePathError?.suggestion, 'Each File/ClassFile must have a unique path. Consider using ClassFile fusion with #:');

    // Check for orphaned file errors
    const orphanedFileOneError = result.errors.find((err) => err.message === "Orphaned file 'FileOne' - none of its exports are imported");
    assert.notEqual(orphanedFileOneError, undefined);
    assert.equal(orphanedFileOneError?.position.line, 7);

    const orphanedFileTwoError = result.errors.find((err) => err.message === "Orphaned file 'FileTwo' - none of its exports are imported");
    assert.notEqual(orphanedFileTwoError, undefined);
    assert.equal(orphanedFileTwoError?.position.line, 10);

    // Check for orphaned entity errors
    const orphanedHelperOneError = result.errors.find((err) => err.message === "Orphaned entity 'helperOne'");
    assert.notEqual(orphanedHelperOneError, undefined);
    assert.equal(orphanedHelperOneError?.position.line, 13);

    const orphanedHelperTwoError = result.errors.find((err) => err.message === "Orphaned entity 'helperTwo'");
    assert.notEqual(orphanedHelperTwoError, undefined);
    assert.equal(orphanedHelperTwoError?.position.line, 14);
  });
});
