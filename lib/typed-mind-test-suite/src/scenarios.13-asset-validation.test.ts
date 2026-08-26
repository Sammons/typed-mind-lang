import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-13-asset-validation', () => {
  const scenarioFile = 'scenario-13-asset-validation.tmd';

  it('should validate asset entities and their relationships', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);

    // Should have exactly 5 errors (including orphaned entities)
    assert.equal(result.diagnostics.length, 5);

    // Check for orphaned AssetsFile error
    const orphanedAssetsFileDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Orphaned file 'AssetsFile' - none of its exports are imported" &&
        diagnostic.span.start.line === 6 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(orphanedAssetsFileDiagnostic, undefined);
    assert.equal(orphanedAssetsFileDiagnostic?.severity, 'error');

    // Check for orphaned UnexportedAsset error
    const orphanedUnexportedAssetDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Orphaned entity 'UnexportedAsset'" &&
        diagnostic.span.start.line === 15 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(orphanedUnexportedAssetDiagnostic, undefined);
    assert.equal(orphanedUnexportedAssetDiagnostic?.severity, 'error');

    // All diagnostics should be of severity 'error'
    assert.equal(
      result.diagnostics.every((diagnostic) => diagnostic.severity === 'error'),
      true,
    );
  });
});
