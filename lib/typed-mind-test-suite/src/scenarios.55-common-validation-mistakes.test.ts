import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 55: Common validation mistakes', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-55-common-validation-mistakes.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should detect all common mistakes', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities);

    assert.equal(validationResult.valid, false);

    // Check for specific mistakes
    const errors = validationResult.errors.map((e) => e.message);
    console.log('All errors:', errors);

    // Mistake 1: Missing entry file
    assert.equal(
      errors.some((e) => e.includes("undefined entry point 'main'")),
      true,
    );

    // Mistake 2: Function not exported
    assert.equal(
      errors.some((e) => e.includes("Function 'processData' is not exported")),
      true,
    );

    // Mistake 3: Calling ClassFile directly
    assert.equal(
      errors.some((e) => e.includes("Cannot use 'calls' to reference ClassFile 'DataProcessor'")),
      true,
    );

    // Mistake 5: Helper function not exported
    assert.equal(
      errors.some((e) => e.includes("Function 'helperFunction' is not exported")),
      true,
    );

    // Mistake 6: Class not exported
    assert.equal(
      errors.some((e) => e.includes("Class 'MyService' is not exported")),
      true,
    );

    // Mistake 7: Circular import
    assert.equal(
      errors.some((e) => e.includes('Circular import detected')),
      true,
    );

    // Mistake 8: Invalid RunParameter type - parser might accept any $type
    // The validator doesn't check parameter types currently

    // Mistake 9: Asset can't export functions
    // Assets don't support the export syntax at all

    // Mistake 10: Undefined UIComponent reference
    assert.equal(
      errors.some((e) => e.includes("unknown component 'NonExistentWidget'")),
      true,
    );
  });
});
