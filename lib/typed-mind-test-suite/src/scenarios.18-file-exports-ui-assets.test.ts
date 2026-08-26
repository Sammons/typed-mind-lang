import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-18-file-exports-ui-assets', () => {
  const scenarioFile = 'scenario-18-file-exports-ui-assets.tmd';

  it('should validate 18 file exports ui assets', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to validation errors
    assert.equal(result.valid, false);

    // Should have exactly 12 validation errors (including orphaned entities)
    assert.equal(result.diagnostics.length, 12);

    // Check for orphaned file entities
    const orphanedFileDiagnostics = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.message.includes('Orphaned file') &&
        (diagnostic.message.includes('ComponentsFile') || diagnostic.message.includes('AssetsFile')),
    );
    assert.equal(orphanedFileDiagnostics.length, 2);

    // Check for UIComponent containment errors
    const uiContainmentDiagnostics = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.message.includes('is not contained by any other UIComponent') &&
        (diagnostic.message.includes('Button') || diagnostic.message.includes('Input') || diagnostic.message.includes('Modal')),
    );
    assert.equal(uiContainmentDiagnostics.length, 3);

    // Verify specific error messages exist
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned file 'ComponentsFile'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned file 'AssetsFile'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("UIComponent 'Button' is not contained by any other UIComponent"),
      ),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("UIComponent 'Input' is not contained by any other UIComponent")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("UIComponent 'Modal' is not contained by any other UIComponent")),
      true,
    );

    // Verify that files can export UI components and assets (this scenario tests that capability)
    // The fact that we can parse the file without syntax errors demonstrates this works
    assert.equal(
      result.diagnostics.every(
        (diagnostic) => !diagnostic.message.includes('cannot export') && !diagnostic.message.includes('invalid export'),
      ),
      true,
    );
  });
});
