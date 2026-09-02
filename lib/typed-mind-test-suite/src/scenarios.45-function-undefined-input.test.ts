import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 45: Function Undefined Input/Output DTOs', () => {
  it('should detect functions with undefined input/output DTOs', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-45-function-undefined-input.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 7);

    // Check specific errors
    const diagnostics = result.diagnostics;

    // Should find undefined UserInput
    const userInputError = diagnostics.find((diagnostic) => diagnostic.message.includes('UserInput'));
    assert.notEqual(userInputError, undefined);
    assert.ok(userInputError?.message.includes("Function input DTO 'UserInput' not found"));
    assert.equal(userInputError?.severity, 'error');
    assert.equal(userInputError?.span.start.line, 8); // Line where processUser function is defined

    // Should find undefined ValidationResult
    const validationResultError = diagnostics.find((diagnostic) => diagnostic.message.includes('ValidationResult'));
    assert.notEqual(validationResultError, undefined);
    assert.ok(validationResultError?.message.includes("Function output DTO 'ValidationResult' not found"));
    assert.equal(validationResultError?.severity, 'error');
    assert.equal(validationResultError?.span.start.line, 13); // Line where validateData function is defined

    // Should find undefined TransformInput
    const transformInputError = diagnostics.find((diagnostic) => diagnostic.message.includes('TransformInput'));
    assert.notEqual(transformInputError, undefined);
    assert.ok(transformInputError?.message.includes("Function input DTO 'TransformInput' not found"));
    assert.equal(transformInputError?.severity, 'error');
    assert.equal(transformInputError?.span.start.line, 17); // Line where transformResult function is defined

    // Should find undefined TransformOutput
    const transformOutputError = diagnostics.find((diagnostic) => diagnostic.message.includes('TransformOutput'));
    assert.notEqual(transformOutputError, undefined);
    assert.ok(transformOutputError?.message.includes("Function output DTO 'TransformOutput' not found"));
    assert.equal(transformOutputError?.severity, 'error');
    assert.equal(transformOutputError?.span.start.line, 17); // Line where transformResult function is defined
  });
});
