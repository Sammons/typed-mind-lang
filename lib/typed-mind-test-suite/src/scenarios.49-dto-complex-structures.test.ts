import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 49: DTO Complex Structures', () => {
  it('should validate complex DTO structures', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-49-dto-complex-structures.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const checker = new DSLChecker();
    const result = checker.check(content);

    // All these complex DTO structures should be invalid
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);

    // Verify entities were parsed correctly
    const parseResult = checker.parse(content);

    // Check empty DTO exists
    assert.equal(parseResult.entities.has('EmptyDTO'), true);

    // Check nested DTO exists and has fields
    const nestedDTO = parseResult.entities.get('NestedDTO');
    assert.notEqual(nestedDTO, undefined);
    assert.equal(nestedDTO?.type, 'DTO');

    // Check array field DTO
    const arrayDTO = parseResult.entities.get('ArrayFieldDTO');
    assert.notEqual(arrayDTO, undefined);

    // Check self-referencing DTO
    const selfRefDTO = parseResult.entities.get('SelfReferencingDTO');
    assert.notEqual(selfRefDTO, undefined);

    // Check complex DTO with various field types
    const complexDTO = parseResult.entities.get('ComplexDTO');
    assert.notEqual(complexDTO, undefined);
  });

  it('should handle DTO field validation for Function fields', () => {
    const content = `
# Test DTO with Function field - should error
TestApp -> MainFile v1.0.0

MainFile @ src/main.ts:
  -> [BadDTO]

BadDTO % "DTO with function field"
  - processData: Function "Function field - not allowed"
  - callback: () => void "Another function field"
`;

    const checker = new DSLChecker();
    const result = checker.check(content);

    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);

    // Should have errors for Function fields
    const functionFieldErrors = result.errors.filter((e) => e.message.includes('Function type'));
    assert.ok(functionFieldErrors.length > 0);
  });
});
