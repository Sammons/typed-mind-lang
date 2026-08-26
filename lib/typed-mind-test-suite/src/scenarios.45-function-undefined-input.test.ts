import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 45: Function Undefined Input/Output DTOs', () => {
  it('should detect functions with undefined input/output DTOs', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-45-function-undefined-input.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const checker = new DSLChecker();
    const result = checker.check(content);

    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 7);

    // Check specific errors
    const errors = result.errors;

    // Should find undefined UserInput
    const userInputError = errors.find((e) => e.message.includes('UserInput'));
    assert.notEqual(userInputError, undefined);
    assert.ok((userInputError?.message).includes("Function input DTO 'UserInput' not found"));
    assert.equal(userInputError?.severity, 'error');
    assert.equal(userInputError?.position.line, 8); // Line where processUser function is defined

    // Should find undefined ValidationResult
    const validationResultError = errors.find((e) => e.message.includes('ValidationResult'));
    assert.notEqual(validationResultError, undefined);
    assert.ok((validationResultError?.message).includes("Function output DTO 'ValidationResult' not found"));
    assert.equal(validationResultError?.severity, 'error');
    assert.equal(validationResultError?.position.line, 13); // Line where validateData function is defined

    // Should find undefined TransformInput
    const transformInputError = errors.find((e) => e.message.includes('TransformInput'));
    assert.notEqual(transformInputError, undefined);
    assert.ok((transformInputError?.message).includes("Function input DTO 'TransformInput' not found"));
    assert.equal(transformInputError?.severity, 'error');
    assert.equal(transformInputError?.position.line, 17); // Line where transformResult function is defined

    // Should find undefined TransformOutput
    const transformOutputError = errors.find((e) => e.message.includes('TransformOutput'));
    assert.notEqual(transformOutputError, undefined);
    assert.ok((transformOutputError?.message).includes("Function output DTO 'TransformOutput' not found"));
    assert.equal(transformOutputError?.severity, 'error');
    assert.equal(transformOutputError?.position.line, 17); // Line where transformResult function is defined
  });
});
