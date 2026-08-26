import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-16-complete-ui-example', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-16-complete-ui-example.tmd';

  it('should validate 16 complete ui example', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Should be invalid due to validation errors
    assert.equal(result.valid, false);

    // Should have exactly 16 validation errors (including orphaned entities)
    assert.equal(result.errors.length, 16);

    // Check for orphaned file entities
    const orphanedFileErrors = result.errors.filter(
      (err) => err.message.includes('Orphaned file') && (err.message.includes('ComponentsFile') || err.message.includes('AssetsFile')),
    );
    assert.equal(orphanedFileErrors.length, 2);

    // Check for method not found error on UserModel
    const methodNotFoundErrors = result.errors.filter((err) => err.message.includes("Method 'find' not found on class 'UserModel'"));
    assert.equal(methodNotFoundErrors.length, 1);

    // Check for UIComponent containment errors
    const uiContainmentErrors = result.errors.filter(
      (err) =>
        err.message.includes('is not contained by any other UIComponent') &&
        (err.message.includes('App') || err.message.includes('LoginFormView')),
    );
    assert.equal(uiContainmentErrors.length, 2);

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
      result.errors.some((err) => err.message.includes("Method 'find' not found on class 'UserModel'")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("UIComponent 'App' is not contained by any other UIComponent")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("UIComponent 'LoginFormView' is not contained by any other UIComponent")),
      true,
    );
  });
});
