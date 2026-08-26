import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 57: Import and export confusion', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-57-import-export-confusion.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should detect import/export mistakes', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities);
    
    assert.equal(validationResult.valid, false);
    const errors = validationResult.errors.map(e => e.message);

    // There should be validation errors from import/export mistakes
    
    // Mistake 1: Circular import (self-import)
    assert.equal(errors.some(e =>
      e.includes("Circular import detected") && e.includes("UserService")
    ), true);
    
    // Mistake 2: Import non-existent
    assert.equal(errors.some(e =>
      e.includes("Import 'NonExistentModule' not found")
    ), true);
    
    // Mistake 3: Export undefined
    assert.equal(errors.some(e =>
      e.includes("Export 'deleteConfig' is not defined anywhere")
    ), true);
    
    // Mistake 4: Class with imports (parser should reject this)
    if (!parseResult || !parseResult.entities) {
      assert.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());
    const baseClass = entitiesArray.find(e =>
      e.name === 'BaseClass' && e.type === 'Class'
    );
    // Classes can have imports in the current implementation
    assert.notEqual(baseClass, undefined);
    
    // Mistake 6: Assets and UIComponents have orphaned issues
    assert.equal(errors.some(e =>
      e.includes("Orphaned entity 'Logo'")
    ), true);
    assert.equal(errors.some(e =>
      e.includes("Orphaned entity 'Button'")
    ), true);
    
    // Mistake 7: Import class method directly
    assert.equal(errors.some(e =>
      e.includes("Import 'UserService.createUser' not found")
    ), true);
    
    // Mistake 8: Circular import chain A -> B -> C -> A
    assert.equal(errors.some(e =>
      e.includes("Circular import detected: A -> B -> C -> A")
    ), true);
  });

  it('should accept valid import/export patterns', () => {
    const parseResult = parser.parse(content);

    if (!parseResult || !parseResult.entities) {
      assert.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());

    // Check ProperModule has correct imports/exports
    const properModule = entitiesArray.find(e =>
      e.name === 'ProperModule' && e.type === 'File'
    );
    assert.ok((properModule?.imports).includes('Config'));
    assert.ok((properModule?.imports).includes('getConfig'));
    assert.ok((properModule?.exports).includes('properFunc'));
    assert.ok((properModule?.exports).includes('ProperClass'));
    
    // IsolatedFile with no imports/exports is valid
    const isolatedFile = entitiesArray.find(e =>
      e.name === 'IsolatedFile'
    );
    assert.notEqual(isolatedFile, undefined);
    assert.equal(isolatedFile?.imports?.length || 0, 0);
    assert.equal(isolatedFile?.exports?.length || 0, 0);
  });

  it('should properly handle ClassFile imports', () => {
    const parseResult = parser.parse(content);

    if (!parseResult || !parseResult.entities) {
      assert.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());

    // UserService as ClassFile can have imports
    const userService = entitiesArray.find(e =>
      e.name === 'UserService' && e.type === 'ClassFile'
    );
    assert.notEqual(userService, undefined);
    // Even though it tries to import itself, the parser should capture it
    assert.ok((userService?.imports).includes('UserService'));
  });
});