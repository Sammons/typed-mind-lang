import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-18-file-exports-ui-assets', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-18-file-exports-ui-assets.tmd';

  it('should validate 18 file exports ui assets', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Should be invalid due to validation errors
    assert.equal(result.valid, false);

    // Should have exactly 12 validation errors (including orphaned entities)
    assert.equal(result.errors.length, 12);

    // Check for orphaned file entities
    const orphanedFileErrors = result.errors.filter(
      (err) => err.message.includes('Orphaned file') && (err.message.includes('ComponentsFile') || err.message.includes('AssetsFile')),
    );
    assert.equal(orphanedFileErrors.length, 2);

    // Check for UIComponent containment errors
    const uiContainmentErrors = result.errors.filter(
      (err) =>
        err.message.includes('is not contained by any other UIComponent') &&
        (err.message.includes('Button') || err.message.includes('Input') || err.message.includes('Modal')),
    );
    assert.equal(uiContainmentErrors.length, 3);

    // Verify specific error messages exist
    assert.equal(
      result.errors.some((err) => err.message.includes("Orphaned file 'ComponentsFile'")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("Orphaned file 'AssetsFile'")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("UIComponent 'Button' is not contained by any other UIComponent")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("UIComponent 'Input' is not contained by any other UIComponent")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("UIComponent 'Modal' is not contained by any other UIComponent")),
      true,
    );

    // Verify that files can export UI components and assets (this scenario tests that capability)
    // The fact that we can parse the file without syntax errors demonstrates this works
    assert.equal(
      result.errors.every((err) => !err.message.includes('cannot export') && !err.message.includes('invalid export')),
      true,
    );
  });
});
