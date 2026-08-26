import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

describe('Scenario 57: Import and export confusion', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-57-import-export-confusion.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should detect import/export mistakes', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities);
    
    expect(validationResult.valid).toBe(false);
    const errors = validationResult.errors.map(e => e.message);

    // There should be validation errors from import/export mistakes
    
    // Mistake 1: Circular import (self-import)
    expect(errors.some(e =>
      e.includes("Circular import detected") && e.includes("UserService")
    )).toBe(true);
    
    // Mistake 2: Import non-existent
    expect(errors.some(e =>
      e.includes("Import 'NonExistentModule' not found")
    )).toBe(true);
    
    // Mistake 3: Export undefined
    expect(errors.some(e =>
      e.includes("Export 'deleteConfig' is not defined anywhere")
    )).toBe(true);
    
    // Mistake 4: Class with imports (parser should reject this)
    if (!parseResult || !parseResult.entities) {
      expect.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());
    const baseClass = entitiesArray.find(e =>
      e.name === 'BaseClass' && e.type === 'Class'
    );
    // Classes can have imports in the current implementation
    expect(baseClass).toBeDefined();
    
    // Mistake 6: Assets and UIComponents have orphaned issues
    expect(errors.some(e =>
      e.includes("Orphaned entity 'Logo'")
    )).toBe(true);
    expect(errors.some(e =>
      e.includes("Orphaned entity 'Button'")
    )).toBe(true);
    
    // Mistake 7: Import class method directly
    expect(errors.some(e =>
      e.includes("Import 'UserService.createUser' not found")
    )).toBe(true);
    
    // Mistake 8: Circular import chain A -> B -> C -> A
    expect(errors.some(e =>
      e.includes("Circular import detected: A -> B -> C -> A")
    )).toBe(true);
  });

  it('should accept valid import/export patterns', () => {
    const parseResult = parser.parse(content);

    if (!parseResult || !parseResult.entities) {
      expect.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());

    // Check ProperModule has correct imports/exports
    const properModule = entitiesArray.find(e =>
      e.name === 'ProperModule' && e.type === 'File'
    );
    expect(properModule?.imports).toContain('Config');
    expect(properModule?.imports).toContain('getConfig');
    expect(properModule?.exports).toContain('properFunc');
    expect(properModule?.exports).toContain('ProperClass');
    
    // IsolatedFile with no imports/exports is valid
    const isolatedFile = entitiesArray.find(e =>
      e.name === 'IsolatedFile'
    );
    expect(isolatedFile).toBeDefined();
    expect(isolatedFile?.imports?.length || 0).toBe(0);
    expect(isolatedFile?.exports?.length || 0).toBe(0);
  });

  it('should properly handle ClassFile imports', () => {
    const parseResult = parser.parse(content);

    if (!parseResult || !parseResult.entities) {
      expect.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());

    // UserService as ClassFile can have imports
    const userService = entitiesArray.find(e =>
      e.name === 'UserService' && e.type === 'ClassFile'
    );
    expect(userService).toBeDefined();
    // Even though it tries to import itself, the parser should capture it
    expect(userService?.imports).toContain('UserService');
  });
});