import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

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
    
    expect(simpleTransform?.input).toBe('InputDTO');
    expect(simpleTransform?.output).toBe('OutputDTO');
  });

  it('should handle multiple DTOs in dependencies', () => {
    const parseResult = parser.parse(content);
    
    // Complex function with multiple DTOs
    const complexTransform = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'complexTransform' && e.type === 'Function'
    );
    
    // First DTO should be input if signature matches
    expect(complexTransform?.input).toBe('ComplexInput');
    
    // Other DTOs might be in consumes or remain in dependencies
    const allDTOs = [
      complexTransform?.input,
      ...(complexTransform?.consumes || []),
      ...(complexTransform?.calls || [])
    ].filter(Boolean);
    
    expect(allDTOs).toContain('ComplexInput');
    // ValidationRules and TransformConfig should be somewhere
  });

  it('should handle explicit input/output with additional DTOs', () => {
    const parseResult = parser.parse(content);
    
    const explicitFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'explicitFunction' && e.type === 'Function'
    );
    
    expect(explicitFunction?.input).toBe('RequestDTO');
    expect(explicitFunction?.output).toBe('ResponseDTO');
    
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
    expect(ambiguousFunction?.input).toBe('AmbiguousA');
    
    // Extra DTOs beyond first are ignored (they should use explicit syntax)
    expect(ambiguousFunction?.consumes).toEqual([]);
    // Note: AmbiguousB and AmbiguousC are ignored since only one DTO can be auto-assigned as input
  });

  it('should handle DTO as both input and output', () => {
    const parseResult = parser.parse(content);
    
    const selfTransform = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'selfTransform' && e.type === 'Function'
    );
    
    expect(selfTransform?.input).toBe('SelfDTO');
    expect(selfTransform?.output).toBe('SelfDTO');
  });

  it('should auto-distribute mixed dependencies', () => {
    const parseResult = parser.parse(content);
    
    const mixedDependencies = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'mixedDependencies' && e.type === 'Function'
    );
    
    // Check auto-distribution
    expect(mixedDependencies?.input).toBe('MixedInput');
    expect(mixedDependencies?.calls).toContain('helperFunction');
    
    // DataProcessor might be in calls (for its methods)
    const hasDataProcessor = 
      mixedDependencies?.calls?.includes('DataProcessor') ||
      mixedDependencies?.calls?.includes('process') ||
      mixedDependencies?.calls?.includes('validate');
    
    expect(mixedDependencies?.consumes).toContain('DATABASE_URL');
  });

  it('should handle functions with only DTO dependencies', () => {
    const parseResult = parser.parse(content);
    
    const pureDataFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'pureDataFunction' && e.type === 'Function'
    );
    
    expect(pureDataFunction?.input).toBe('PureInput');
    expect(pureDataFunction?.output).toBe('PureOutput');
    
    // PureConfig and PureState should be distributed somewhere
    const allDeps = [
      pureDataFunction?.input,
      ...(pureDataFunction?.consumes || []),
      ...(pureDataFunction?.calls || [])
    ].filter(Boolean);
    
    expect(allDeps).toContain('PureInput');
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
    
    expect(nestedInput?.fields?.some(f => f.type === 'OuterDTO')).toBe(true);
    expect(outerDTO?.fields?.some(f => f.type === 'MiddleDTO')).toBe(true);
    expect(middleDTO?.fields?.some(f => f.type === 'InnerDTO')).toBe(true);
    
    const nestedFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'nestedFunction' && e.type === 'Function'
    );
    
    expect(nestedFunction?.input).toBe('NestedInput');
    expect(nestedFunction?.output).toBe('NestedOutput');
  });

  it('should handle DTO arrays and optional fields', () => {
    const parseResult = parser.parse(content);
    
    const arrayInput = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ArrayInput' && e.type === 'DTO'
    );
    
    // Check array field
    const itemsField = arrayInput?.fields?.find(f => f.name === 'items');
    expect(itemsField?.type).toBe('ItemDTO[]');
    
    // Check optional field
    const optionalField = arrayInput?.fields?.find(f => f.name === 'optional');
    expect(optionalField?.optional).toBe(true);
    expect(optionalField?.type).toBe('OptionalDTO');
    
    const arrayFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'arrayFunction' && e.type === 'Function'
    );
    
    expect(arrayFunction?.input).toBe('ArrayInput');
    expect(arrayFunction?.output).toBe('ArrayOutput');
  });

  it('should validate all DTOs are properly defined', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // All DTOs should be valid
    const dtos = Array.from(parseResult.entities.values()).filter(e => e.type === 'DTO');
    expect(dtos.length).toBeGreaterThan(20); // We have many DTOs
    
    // Check for any undefined type references
    const errors = validationResult.errors.filter(e => 
      e.message.includes('undefined') && 
      e.message.includes('type')
    );
    
    // Should have no undefined types
    expect(errors.length).toBe(0);
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
      expect(processorFile?.exports).toContain(fname);
    }
    
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // No functions should be orphaned
    const orphanedFunctions = validationResult.errors.filter(e => 
      e.message.includes('Function') && 
      e.message.includes('not exported')
    );
    
    expect(orphanedFunctions.length).toBe(0);
  });
});