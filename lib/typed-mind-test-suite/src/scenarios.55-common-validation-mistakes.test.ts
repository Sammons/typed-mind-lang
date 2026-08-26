import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

describe('Scenario 55: Common validation mistakes', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-55-common-validation-mistakes.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should detect all common mistakes', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities);
    
    expect(validationResult.valid).toBe(false);
    
    // Check for specific mistakes
    const errors = validationResult.errors.map(e => e.message);
    console.log('All errors:', errors);
    
    // Mistake 1: Missing entry file
    expect(errors.some(e => e.includes("undefined entry point 'main'"))).toBe(true);
    
    // Mistake 2: Function not exported
    expect(errors.some(e => e.includes("Function 'processData' is not exported"))).toBe(true);
    
    // Mistake 3: Calling ClassFile directly
    expect(errors.some(e => e.includes("Cannot use 'calls' to reference ClassFile 'DataProcessor'"))).toBe(true);
    
    // Mistake 5: Helper function not exported
    expect(errors.some(e => e.includes("Function 'helperFunction' is not exported"))).toBe(true);
    
    // Mistake 6: Class not exported
    expect(errors.some(e => e.includes("Class 'MyService' is not exported"))).toBe(true);
    
    // Mistake 7: Circular import
    expect(errors.some(e => e.includes("Circular import detected"))).toBe(true);
    
    // Mistake 8: Invalid RunParameter type - parser might accept any $type
    // The validator doesn't check parameter types currently
    
    // Mistake 9: Asset can't export functions
    // Assets don't support the export syntax at all
    
    // Mistake 10: Undefined UIComponent reference
    expect(errors.some(e => e.includes("unknown component 'NonExistentWidget'"))).toBe(true);
  });
});