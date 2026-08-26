import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-21-aliased-import', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-21-aliased-import.tmd';

  it('should validate aliased imports and detect validation errors', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = checker.check(content, filePath);

    // Should be invalid due to multiple validation errors
    assert.equal(result.valid, false);

    // Should have many errors due to undefined entities and containment issues
    assert.ok(result.errors.length > 10);

    // Check for key orphaned entities
    const orphanedErrors = result.errors.filter((err) => err.message.includes('Orphaned entity'));
    assert.ok(orphanedErrors.length > 0);

    // Should have orphaned ComponentsFile and DatabaseFile
    assert.equal(
      result.errors.some((err) => err.message.includes("Orphaned file 'UI.ComponentsFile'")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("Orphaned file 'DB.DatabaseFile'")),
      true,
    );

    // Check for undefined exports
    const exportErrors = result.errors.filter((err) => err.message.includes('is not defined anywhere in the codebase'));
    assert.ok(exportErrors.length > 0);
    assert.equal(
      result.errors.some((err) => err.message.includes("Export 'Button' is not defined anywhere in the codebase")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("Export 'Form' is not defined anywhere in the codebase")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("Export 'Connection' is not defined anywhere in the codebase")),
      true,
    );

    // Check for containment validation errors
    assert.equal(
      result.errors.some((err) => err.message.includes("UIComponent 'UI.Input' is not contained by any other UIComponent")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("contains unknown component 'Input'")),
      true,
    );
    assert.equal(
      result.errors.some((err) => err.message.includes("contains unknown component 'Button'")),
      true,
    );

    // Check for class export errors
    assert.equal(
      result.errors.some((err) => err.message.includes("Class 'DB.Connection' is not exported by any file")),
      true,
    );

    // All errors should be severity 'error'
    assert.equal(
      result.errors.every((err) => err.severity === 'error'),
      true,
    );
  });
});
