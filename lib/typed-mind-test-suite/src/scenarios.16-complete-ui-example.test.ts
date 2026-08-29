import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-16-complete-ui-example', () => {
  const scenarioFile = 'scenario-16-complete-ui-example.tmd';

  it('should validate 16 complete ui example', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to validation errors
    assert.equal(result.valid, false);

    // RFC-TM-4 §4 A2: `-> []` (line 5) is a PR #18 manifest empty-list class,
    // now diagnosed as syntax/error instead of silently dropped — one new
    // diagnostic on top of the legacy 16.
    assert.equal(result.diagnostics.length, 17);
    // RFC-TM-10 §12 (D-LEG-12, Q7): `syntax/error`'s message gained an initial
    // capital and a trailing suggestion clause (no `suggestion` field exists on
    // the pipeline-level `Diagnostic` type, so clause 3 folds into `message`).
    const emptyListErrors = result.diagnostics.filter(
      (diagnostic) => diagnostic.message === 'Unparsable text: `-> []` — check this line against the grammar and fix or remove it',
    );
    assert.equal(emptyListErrors.length, 1);

    // Check for orphaned file entities
    const orphanedFileErrors = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.message.includes('Orphaned file') &&
        (diagnostic.message.includes('ComponentsFile') || diagnostic.message.includes('AssetsFile')),
    );
    assert.equal(orphanedFileErrors.length, 2);

    // Check for method not found error on UserModel
    const methodNotFoundErrors = result.diagnostics.filter((diagnostic) =>
      diagnostic.message.includes("Method 'find' not found on class 'UserModel'"),
    );
    assert.equal(methodNotFoundErrors.length, 1);

    // Check for UIComponent containment errors
    const uiContainmentErrors = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.message.includes('is not contained by any other UIComponent') &&
        (diagnostic.message.includes('App') || diagnostic.message.includes('LoginFormView')),
    );
    assert.equal(uiContainmentErrors.length, 2);

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
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Method 'find' not found on class 'UserModel'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("UIComponent 'App' is not contained by any other UIComponent")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("UIComponent 'LoginFormView' is not contained by any other UIComponent"),
      ),
      true,
    );
  });
});
