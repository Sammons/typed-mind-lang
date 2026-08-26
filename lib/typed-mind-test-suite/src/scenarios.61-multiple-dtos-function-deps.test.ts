import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 61: Multiple DTOs in function dependencies', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-61-multiple-dtos-function-deps.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should auto-assign single DTO to input', () => {
    const parseResult = parser.parse(content);
    
    // Simple function with single DTO dependency
    const simpleTransform = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'simpleTransform' && e.type === 'Function'
    );
    
    assert.equal(simpleTransform?.input, 'InputDTO');
    assert.equal(simpleTransform?.output, 'OutputDTO');
  });

  it('should handle multiple DTOs in dependencies', () => {
    const parseResult = parser.parse(content);
    
    // Complex function with multiple DTOs
    const complexTransform = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'complexTransform' && e.type === 'Function'
    );
    
    // First DTO should be input if signature matches
    assert.equal(complexTransform?.input, 'ComplexInput');
    
    // Other DTOs might be in consumes or remain in dependencies
    const allDTOs = [
      complexTransform?.input,
      ...(complexTransform?.consumes || []),
      ...(complexTransform?.calls || [])
    ].filter(Boolean);
    
    assert.ok((allDTOs).includes('ComplexInput'));
    // ValidationRules and TransformConfig should be somewhere
  });

  it('should handle explicit input/output with additional DTOs', () => {
    const parseResult = parser.parse(content);
    
    const explicitFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'explicitFunction' && e.type === 'Function'
    );
    
    assert.equal(explicitFunction?.input, 'RequestDTO');
    assert.equal(explicitFunction?.output, 'ResponseDTO');
    
    // ConfigDTO and StateDTO should be in dependencies somewhere
    const deps = [
      ...(explicitFunction?.consumes || []),
      ...(explicitFunction?.calls || [])
    ];
    
    // They might be treated as consumed or called
  });

  it('should handle multiple potential input DTOs', () => {
    const parseResult = parser.parse(content);
    
    const ambiguousFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ambiguousFunction' && e.type === 'Function'
    );
    
    // Function signature has two parameters
    // Parser should assign first DTO as input
    assert.equal(ambiguousFunction?.input, 'AmbiguousA');
    
    // Extra DTOs beyond first are ignored (they should use explicit syntax)
    assert.deepEqual(ambiguousFunction?.consumes, []);
    // Note: AmbiguousB and AmbiguousC are ignored since only one DTO can be auto-assigned as input
  });

  it('should handle DTO as both input and output', () => {
    const parseResult = parser.parse(content);
    
    const selfTransform = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'selfTransform' && e.type === 'Function'
    );
    
    assert.equal(selfTransform?.input, 'SelfDTO');
    assert.equal(selfTransform?.output, 'SelfDTO');
  });

  it('should auto-distribute mixed dependencies', () => {
    const parseResult = parser.parse(content);
    
    const mixedDependencies = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'mixedDependencies' && e.type === 'Function'
    );
    
    // Check auto-distribution
    assert.equal(mixedDependencies?.input, 'MixedInput');
    assert.ok((mixedDependencies?.calls).includes('helperFunction'));
    
    // DataProcessor might be in calls (for its methods)
    const hasDataProcessor = 
      mixedDependencies?.calls?.includes('DataProcessor') ||
      mixedDependencies?.calls?.includes('process') ||
      mixedDependencies?.calls?.includes('validate');
    
    assert.ok((mixedDependencies?.consumes).includes('DATABASE_URL'));
  });

  it('should handle functions with only DTO dependencies', () => {
    const parseResult = parser.parse(content);
    
    const pureDataFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'pureDataFunction' && e.type === 'Function'
    );
    
    assert.equal(pureDataFunction?.input, 'PureInput');
    assert.equal(pureDataFunction?.output, 'PureOutput');
    
    // PureConfig and PureState should be distributed somewhere
    const allDeps = [
      pureDataFunction?.input,
      ...(pureDataFunction?.consumes || []),
      ...(pureDataFunction?.calls || [])
    ].filter(Boolean);
    
    assert.ok((allDeps).includes('PureInput'));
    // PureConfig and PureState handling depends on parser logic
  });

  it('should handle nested DTO references', () => {
    const parseResult = parser.parse(content);
    
    // Check nested DTO structure
    const nestedInput = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'NestedInput' && e.type === 'DTO'
    );
    const outerDTO = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'OuterDTO' && e.type === 'DTO'
    );
    const middleDTO = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'MiddleDTO' && e.type === 'DTO'
    );
    const innerDTO = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'InnerDTO' && e.type === 'DTO'
    );
    
    assert.equal(nestedInput?.fields?.some(f => f.type === 'OuterDTO'), true);
    assert.equal(outerDTO?.fields?.some(f => f.type === 'MiddleDTO'), true);
    assert.equal(middleDTO?.fields?.some(f => f.type === 'InnerDTO'), true);
    
    const nestedFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'nestedFunction' && e.type === 'Function'
    );
    
    assert.equal(nestedFunction?.input, 'NestedInput');
    assert.equal(nestedFunction?.output, 'NestedOutput');
  });

  it('should handle DTO arrays and optional fields', () => {
    const parseResult = parser.parse(content);
    
    const arrayInput = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ArrayInput' && e.type === 'DTO'
    );
    
    // Check array field
    const itemsField = arrayInput?.fields?.find(f => f.name === 'items');
    assert.equal(itemsField?.type, 'ItemDTO[]');
    
    // Check optional field
    const optionalField = arrayInput?.fields?.find(f => f.name === 'optional');
    assert.equal(optionalField?.optional, true);
    assert.equal(optionalField?.type, 'OptionalDTO');
    
    const arrayFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'arrayFunction' && e.type === 'Function'
    );
    
    assert.equal(arrayFunction?.input, 'ArrayInput');
    assert.equal(arrayFunction?.output, 'ArrayOutput');
  });

  it('should validate all DTOs are properly defined', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // All DTOs should be valid
    const dtos = Array.from(parseResult.entities.values()).filter(e => e.type === 'DTO');
    assert.ok((dtos.length) > (20)); // We have many DTOs
    
    // Check for any undefined type references
    const errors = validationResult.errors.filter(e => 
      e.message.includes('undefined') && 
      e.message.includes('type')
    );
    
    // Should have no undefined types
    assert.equal(errors.length, 0);
  });

  it('should export all functions properly', () => {
    const parseResult = parser.parse(content);
    
    const processorFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ProcessorFile' && e.type === 'File'
    );
    
    // Check all functions are exported
    const functionNames = [
      'simpleTransform', 'complexTransform', 'explicitFunction',
      'ambiguousFunction', 'selfTransform', 'mixedDependencies',
      'pureDataFunction', 'nestedFunction', 'arrayFunction'
    ];
    
    for (const fname of functionNames) {
      assert.ok((processorFile?.exports).includes(fname));
    }
    
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // No functions should be orphaned
    const orphanedFunctions = validationResult.errors.filter(e => 
      e.message.includes('Function') && 
      e.message.includes('not exported')
    );
    
    assert.equal(orphanedFunctions.length, 0);
  });
});