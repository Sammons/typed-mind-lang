import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-07-duplicate-paths', () => {
  const scenarioFile = 'scenario-07-duplicate-paths.tmd';

  it('should detect duplicate file paths as validation errors', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // The DSL should be invalid due to duplicate paths
    assert.equal(result.valid, false);

    // Should have exactly 5 errors
    assert.equal(result.diagnostics.length, 5);

    // Check the duplicate path error details
    const duplicatePathDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Path 'src/shared/utils.ts' already used by File 'FileOne'",
    );
    assert.notEqual(duplicatePathDiagnostic, undefined);
    assert.equal(duplicatePathDiagnostic?.span.start.line, 10);
    assert.equal(duplicatePathDiagnostic?.span.start.column, 1);
    assert.equal(duplicatePathDiagnostic?.severity, 'error');

    // Check for orphaned file errors
    const orphanedFileOneDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned file 'FileOne' - none of its exports are imported",
    );
    assert.notEqual(orphanedFileOneDiagnostic, undefined);
    assert.equal(orphanedFileOneDiagnostic?.span.start.line, 7);

    const orphanedFileTwoDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned file 'FileTwo' - none of its exports are imported",
    );
    assert.notEqual(orphanedFileTwoDiagnostic, undefined);
    assert.equal(orphanedFileTwoDiagnostic?.span.start.line, 10);

    // Check for orphaned entity errors
    const orphanedHelperOneDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'helperOne'");
    assert.notEqual(orphanedHelperOneDiagnostic, undefined);
    assert.equal(orphanedHelperOneDiagnostic?.span.start.line, 13);

    const orphanedHelperTwoDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'helperTwo'");
    assert.notEqual(orphanedHelperTwoDiagnostic, undefined);
    assert.equal(orphanedHelperTwoDiagnostic?.span.start.line, 14);
  });
});
