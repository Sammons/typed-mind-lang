import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 46: Function Undefined Method Calls', () => {
  it('should detect functions with undefined method calls', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-46-function-undefined-calls.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    assert.equal(result.valid, false);
    // RFC-TM-4 §4 A2: `someConstant * "Constants"` (line 41) is now diagnosed
    // as a syntax error instead of being silently accepted — one new
    // diagnostic on top of the legacy 14.
    assert.equal(result.diagnostics.length, 15); // More errors than expected

    // Check specific errors
    const diagnostics = result.diagnostics;

    // Should find undefined UndefinedService
    const undefinedServiceError = diagnostics.find((diagnostic) => diagnostic.message.includes('UndefinedService'));
    assert.notEqual(undefinedServiceError, undefined);
    assert.ok(undefinedServiceError?.message.includes("references unknown entity 'UndefinedService'"));
    assert.equal(undefinedServiceError?.severity, 'error');
    assert.equal(undefinedServiceError?.span.start.line, 8); // Line where processData function is defined

    // Should find undefined NonExistentClass
    const nonExistentClassError = diagnostics.find((diagnostic) => diagnostic.message.includes('NonExistentClass'));
    assert.notEqual(nonExistentClassError, undefined);
    assert.ok(nonExistentClassError?.message.includes("references unknown entity 'NonExistentClass'"));
    assert.equal(nonExistentClassError?.severity, 'error');
    assert.equal(nonExistentClassError?.span.start.line, 8); // Line where processData function is defined

    // Should find error for calling method on DTO
    const requestDTOError = diagnostics.find(
      (diagnostic) => diagnostic.message.includes('RequestDTO') && diagnostic.message.includes('Cannot call method'),
    );
    assert.notEqual(requestDTOError, undefined);
    assert.ok(requestDTOError?.message.includes("Cannot call method 'handle' on DTO 'RequestDTO'"));
    assert.equal(requestDTOError?.severity, 'error');
    assert.equal(requestDTOError?.span.start.line, 14); // Line where handleRequest function is defined

    // Should find error for undefined someConstant.execute
    // RFC-TM-4 §4 A2: narrowed to the unknown-entity message specifically —
    // the new `unparsable text` diagnostic (line 41) also mentions
    // 'someConstant', and a plain substring match would now hit it first.
    const constantError = diagnostics.find(
      (diagnostic) => diagnostic.message.includes('someConstant') && diagnostic.message.includes('references unknown entity'),
    );
    assert.notEqual(constantError, undefined);
    assert.ok(constantError?.message.includes("references unknown entity 'someConstant'"));
    assert.equal(constantError?.severity, 'error');
    assert.equal(constantError?.span.start.line, 14); // Line where handleRequest function is defined

    // Should find undefined InvalidClass
    const invalidClassError = diagnostics.find((diagnostic) => diagnostic.message.includes('InvalidClass'));
    assert.notEqual(invalidClassError, undefined);
    assert.ok(invalidClassError?.message.includes("references unknown entity 'InvalidClass'"));
    assert.equal(invalidClassError?.severity, 'error');
    assert.equal(invalidClassError?.span.start.line, 20); // Line where validateInput function is defined
  });
});
