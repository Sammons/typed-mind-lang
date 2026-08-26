import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

describe('Scenario 58: ClassFile vs Class+File mistakes', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-58-classfile-vs-class-file.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should detect ClassFile vs Class+File conflicts', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities);
    
    expect(validationResult.valid).toBe(false);
    const errors = validationResult.errors;

    // There should be validation errors from ClassFile vs Class+File conflicts
    
    // Mistake 1: Circular import between ClassFiles
    const circularError = errors.find(e =>
      e.message.includes("Circular import detected") &&
      e.message.includes("ServiceA -> ServiceB -> ServiceA")
    );
    expect(circularError).toBeDefined();
    
    // Mistake 4: Cannot import non-existent entities
    const importError = errors.find(e =>
      e.message.includes("Import 'UserRepository' not found")
    );
    expect(importError).toBeDefined();
    
    // Mistake 5: ClassFile duplicate export
    // ClassFile auto-exports itself, so manual export is redundant
    if (!parseResult || !parseResult.entities) {
      expect.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());
    const goodService = entitiesArray.find(e =>
      e.name === 'GoodService' && e.type === 'ClassFile'
    );
    // The exports should include helper but GoodService is implicit
    expect(goodService?.exports).toContain('helper');
    
    // Mistake 6: Cannot call ClassFile directly (method call syntax)
    const processUserError = errors.find(e =>
      e.message.includes("Cannot use 'calls' to reference ClassFile 'UserService'")
    );
    expect(processUserError).toBeDefined();
    
    // Mistake 7: Classes not exported by any file
    const orphanedClassError = errors.find(e =>
      e.message.includes("Class 'DataClass' is not exported by any file")
    );
    expect(orphanedClassError).toBeDefined();
  });

  it('should properly parse ClassFile features', () => {
    const parseResult = parser.parse(content);
    
    // UserService ClassFile
    if (!parseResult || !parseResult.entities) {
      expect.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());
    const userService = entitiesArray.find(e =>
      e.name === 'UserService' && e.type === 'ClassFile'
    );
    expect(userService).toBeDefined();
    expect(userService?.path).toBe('src/services/user.ts');
    expect(userService?.methods).toContain('createUser');
    expect(userService?.imports).toContain('UserRepository');
    expect(userService?.exports).toContain('userHelper');
    
    // EmptyService with no methods (valid)
    const emptyService = entitiesArray.find(e =>
      e.name === 'EmptyService' && e.type === 'ClassFile'
    );
    expect(emptyService).toBeDefined();
    expect(emptyService?.methods?.length || 0).toBe(0);
    
    // ExtendedService extending another ClassFile
    const extendedService = entitiesArray.find(e =>
      e.name === 'ExtendedService' && e.type === 'ClassFile'
    );
    expect(extendedService?.extends).toContain('UserService');
  });

  it('should distinguish when to use ClassFile vs Class+File', () => {
    const parseResult = parser.parse(content);

    if (!parseResult || !parseResult.entities) {
      expect.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());

    // ModuleService: Good use of ClassFile (single main export)
    const moduleService = entitiesArray.find(e =>
      e.name === 'ModuleService' && e.type === 'ClassFile'
    );
    expect(moduleService).toBeDefined();
    
    // SharedFile: Good use of separate File (multiple class exports)
    const sharedFile = entitiesArray.find(e =>
      e.name === 'SharedFile' && e.type === 'File'
    );
    expect(sharedFile?.exports).toContain('SharedClass');
    expect(sharedFile?.exports).toContain('AnotherClass');
    expect(sharedFile?.exports).toContain('utilFunc');
    
    // Both SharedClass and AnotherClass exist as separate entities
    const sharedClass = entitiesArray.find(e =>
      e.name === 'SharedClass' && e.type === 'Class'
    );
    expect(sharedClass).toBeDefined();
  });

  it('should handle invalid syntax attempts', () => {
    const parseResult = parser.parse(content);

    if (!parseResult || !parseResult.entities) {
      expect.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());

    // Files can't have methods (=> syntax)
    const dataFile = entitiesArray.find(e =>
      e.name === 'DataFile' && e.type === 'File'
    );
    expect(dataFile?.methods).toBeUndefined();
    
    // Classes can't have paths (@ syntax)
    const dataClass = entitiesArray.find(e =>
      e.name === 'DataClass' && e.type === 'Class'
    );
    expect(dataClass?.path).toBeUndefined();
  });
});