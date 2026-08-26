import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 58: ClassFile vs Class+File mistakes', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-58-classfile-vs-class-file.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should detect ClassFile vs Class+File conflicts', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities);

    assert.equal(validationResult.valid, false);
    const errors = validationResult.errors;

    // There should be validation errors from ClassFile vs Class+File conflicts

    // Mistake 1: Circular import between ClassFiles
    const circularError = errors.find(
      (e) => e.message.includes('Circular import detected') && e.message.includes('ServiceA -> ServiceB -> ServiceA'),
    );
    assert.notEqual(circularError, undefined);

    // Mistake 4: Cannot import non-existent entities
    const importError = errors.find((e) => e.message.includes("Import 'UserRepository' not found"));
    assert.notEqual(importError, undefined);

    // Mistake 5: ClassFile duplicate export
    // ClassFile auto-exports itself, so manual export is redundant
    if (!parseResult?.entities) {
      assert.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());
    const goodService = entitiesArray.find((e) => e.name === 'GoodService' && e.type === 'ClassFile');
    // The exports should include helper but GoodService is implicit
    assert.ok((goodService?.exports).includes('helper'));

    // Mistake 6: Cannot call ClassFile directly (method call syntax)
    const processUserError = errors.find((e) => e.message.includes("Cannot use 'calls' to reference ClassFile 'UserService'"));
    assert.notEqual(processUserError, undefined);

    // Mistake 7: Classes not exported by any file
    const orphanedClassError = errors.find((e) => e.message.includes("Class 'DataClass' is not exported by any file"));
    assert.notEqual(orphanedClassError, undefined);
  });

  it('should properly parse ClassFile features', () => {
    const parseResult = parser.parse(content);

    // UserService ClassFile
    if (!parseResult?.entities) {
      assert.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());
    const userService = entitiesArray.find((e) => e.name === 'UserService' && e.type === 'ClassFile');
    assert.notEqual(userService, undefined);
    assert.equal(userService?.path, 'src/services/user.ts');
    assert.ok((userService?.methods).includes('createUser'));
    assert.ok((userService?.imports).includes('UserRepository'));
    assert.ok((userService?.exports).includes('userHelper'));

    // EmptyService with no methods (valid)
    const emptyService = entitiesArray.find((e) => e.name === 'EmptyService' && e.type === 'ClassFile');
    assert.notEqual(emptyService, undefined);
    assert.equal(emptyService?.methods?.length || 0, 0);

    // ExtendedService extending another ClassFile
    const extendedService = entitiesArray.find((e) => e.name === 'ExtendedService' && e.type === 'ClassFile');
    assert.ok((extendedService?.extends).includes('UserService'));
  });

  it('should distinguish when to use ClassFile vs Class+File', () => {
    const parseResult = parser.parse(content);

    if (!parseResult?.entities) {
      assert.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());

    // ModuleService: Good use of ClassFile (single main export)
    const moduleService = entitiesArray.find((e) => e.name === 'ModuleService' && e.type === 'ClassFile');
    assert.notEqual(moduleService, undefined);

    // SharedFile: Good use of separate File (multiple class exports)
    const sharedFile = entitiesArray.find((e) => e.name === 'SharedFile' && e.type === 'File');
    assert.ok((sharedFile?.exports).includes('SharedClass'));
    assert.ok((sharedFile?.exports).includes('AnotherClass'));
    assert.ok((sharedFile?.exports).includes('utilFunc'));

    // Both SharedClass and AnotherClass exist as separate entities
    const sharedClass = entitiesArray.find((e) => e.name === 'SharedClass' && e.type === 'Class');
    assert.notEqual(sharedClass, undefined);
  });

  it('should handle invalid syntax attempts', () => {
    const parseResult = parser.parse(content);

    if (!parseResult?.entities) {
      assert.fail('parseResult or entities is undefined');
      return;
    }

    const entitiesArray = Array.from(parseResult.entities.values());

    // Files can't have methods (=> syntax)
    const dataFile = entitiesArray.find((e) => e.name === 'DataFile' && e.type === 'File');
    assert.equal(dataFile?.methods, undefined);

    // Classes can't have paths (@ syntax)
    const dataClass = entitiesArray.find((e) => e.name === 'DataClass' && e.type === 'Class');
    assert.equal(dataClass?.path, undefined);
  });
});
