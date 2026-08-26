import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 49: DTO Complex Structures', () => {
  it('should validate complex DTO structures', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-49-dto-complex-structures.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    // All these complex DTO structures should be invalid
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // Verify entities were parsed correctly
    const parseResult = typedMind.parse(content);

    // Check empty DTO exists
    assert.equal(
      parseResult.entities.some((entity) => entity.name === 'EmptyDTO'),
      true,
    );

    // Check nested DTO exists and has fields
    const nestedDTO = parseResult.entities.find((entity) => entity.name === 'NestedDTO');
    assert.notEqual(nestedDTO, undefined);
    assert.equal(nestedDTO?.kind, 'DTO');

    // Check array field DTO
    const arrayDTO = parseResult.entities.find((entity) => entity.name === 'ArrayFieldDTO');
    assert.notEqual(arrayDTO, undefined);

    // Check self-referencing DTO
    const selfRefDTO = parseResult.entities.find((entity) => entity.name === 'SelfReferencingDTO');
    assert.notEqual(selfRefDTO, undefined);

    // Check complex DTO with various field types
    const complexDTO = parseResult.entities.find((entity) => entity.name === 'ComplexDTO');
    assert.notEqual(complexDTO, undefined);
  });

  it('should handle DTO field validation for Function fields', async () => {
    const content = `
# Test DTO with Function field - should error
TestApp -> MainFile v1.0.0

MainFile @ src/main.ts:
  -> [BadDTO]

BadDTO % "DTO with function field"
  - processData: Function "Function field - not allowed"
  - callback: () => void "Another function field"
`;

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // Should have errors for Function fields
    const functionFieldErrors = result.diagnostics.filter((diagnostic) => diagnostic.message.includes('Function type'));
    assert.ok(functionFieldErrors.length > 0);
  });
});
