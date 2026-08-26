import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

describe('scenario-38-dependency-validation', () => {
  it('should validate dependency entities', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-38-dependency-validation.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');
    
    const parser = new DSLParser();
    const parseResult = parser.parse(content);
    
    const validator = new DSLValidator();
    const validationResult = validator.validate(parseResult.entities);
    
    // Should be invalid due to multiple dependency validation errors
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toHaveLength(5);
    
    const errorMessages = validationResult.errors.map(err => err.message);
    
    // Should detect that 'calls' cannot reference a Dependency
    expect(errorMessages).toContain("Cannot use 'calls' to reference Dependency 'axios'");
    
    // Should detect orphaned entity
    expect(errorMessages).toContain("Orphaned entity 'User'");
    
    // Should detect that class is not exported by any file
    expect(errorMessages).toContain("Class 'AuthService' is not exported by any file");
    
    // Should detect that method calls cannot be made on dependencies
    expect(errorMessages).toContain("Cannot call method 'post' on Dependency 'axios'. Only Classes and ClassFiles can have methods");
    
    // Verify specific error positions for key validation errors
    const axiosCallError = validationResult.errors.find(err => err.message.includes("Cannot use 'calls' to reference Dependency 'axios'"));
    expect(axiosCallError?.position.line).toBe(29);
    expect(axiosCallError?.position.column).toBe(1);
    
    const orphanedUserError = validationResult.errors.find(err => err.message.includes("Orphaned entity 'User'"));
    expect(orphanedUserError?.position.line).toBe(43);
    
    const authServiceError = validationResult.errors.find(err => err.message.includes("Class 'AuthService' is not exported by any file"));
    expect(authServiceError?.position.line).toBe(21);
  });
});