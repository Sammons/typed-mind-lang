import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-15-function-affects-ui', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-15-function-affects-ui.tmd';

  it('should validate function affects UI relationships', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // Should be invalid due to multiple validation errors
    assert.equal(result.valid, false);
    
    // Should have exactly 11 errors (including orphaned entities)
    assert.equal((result.errors).length, 11);
    
    // Check for invalid 'calls' to UIComponent error
    const invalidCallsError = result.errors.find(err => 
      err.message === "Cannot use 'calls' to reference UIComponent 'TodoList'" &&
      err.position.line === 14 &&
      err.position.column === 1
    );
    assert.notEqual(invalidCallsError, undefined);
    assert.equal(invalidCallsError?.severity, 'error');
    assert.equal(invalidCallsError?.suggestion, "'calls' can only reference: Function, Class");
    
    // Check for invalid 'affects' to Function error
    const invalidAffectsError = result.errors.find(err => 
      err.message === "Cannot use 'affects' to reference Function 'updateTodoList'" &&
      err.position.line === 26 &&
      err.position.column === 1
    );
    assert.notEqual(invalidAffectsError, undefined);
    assert.equal(invalidAffectsError?.severity, 'error');
    assert.equal(invalidAffectsError?.suggestion, "'affects' can only reference: UIComponent");
    
    // Check for orphaned refreshUI entity error
    const orphanedRefreshUIError = result.errors.find(err => 
      err.message === "Orphaned entity 'refreshUI'" &&
      err.position.line === 22 &&
      err.position.column === 1
    );
    assert.notEqual(orphanedRefreshUIError, undefined);
    assert.equal(orphanedRefreshUIError?.severity, 'error');
    assert.equal(orphanedRefreshUIError?.suggestion, 'Remove or reference this entity');
    
    // Check for orphaned invalidAffect entity error
    const orphanedInvalidAffectError = result.errors.find(err => 
      err.message === "Orphaned entity 'invalidAffect'" &&
      err.position.line === 26 &&
      err.position.column === 1
    );
    assert.notEqual(orphanedInvalidAffectError, undefined);
    assert.equal(orphanedInvalidAffectError?.severity, 'error');
    assert.equal(orphanedInvalidAffectError?.suggestion, 'Remove or reference this entity');
    
    // Check for refreshUI not exported error
    const refreshUINotExportedError = result.errors.find(err => 
      err.message === "Function 'refreshUI' is not exported by any file and is not a class method" &&
      err.position.line === 22 &&
      err.position.column === 1
    );
    assert.notEqual(refreshUINotExportedError, undefined);
    assert.equal(refreshUINotExportedError?.severity, 'error');
    assert.equal(refreshUINotExportedError?.suggestion, "Either add 'refreshUI' to the exports of a file entity or define it as a method of a class");
    
    // Check for invalidAffect not exported error
    const invalidAffectNotExportedError = result.errors.find(err => 
      err.message === "Function 'invalidAffect' is not exported by any file and is not a class method" &&
      err.position.line === 26 &&
      err.position.column === 1
    );
    assert.notEqual(invalidAffectNotExportedError, undefined);
    assert.equal(invalidAffectNotExportedError?.severity, 'error');
    assert.equal(invalidAffectNotExportedError?.suggestion, "Either add 'invalidAffect' to the exports of a file entity or define it as a method of a class");
    
    // Check for refreshUI affects unknown component error
    const refreshUIUnknownComponentError = result.errors.find(err => 
      err.message === "Function 'refreshUI' affects unknown component 'NonExistentComponent'" &&
      err.position.line === 22 &&
      err.position.column === 1
    );
    assert.notEqual(refreshUIUnknownComponentError, undefined);
    assert.equal(refreshUIUnknownComponentError?.severity, 'error');
    assert.equal(refreshUIUnknownComponentError?.suggestion, "Define 'NonExistentComponent' as a UIComponent");
    
    // Check for invalidAffect cannot affect Function error
    const invalidAffectCannotAffectError = result.errors.find(err => 
      err.message === "Function 'invalidAffect' cannot affect 'updateTodoList' (it's a Function)" &&
      err.position.line === 26 &&
      err.position.column === 1
    );
    assert.notEqual(invalidAffectCannotAffectError, undefined);
    assert.equal(invalidAffectCannotAffectError?.severity, 'error');
    assert.equal(invalidAffectCannotAffectError?.suggestion, 'Functions can only affect UIComponents');
    
    // Check for TodoList not contained error
    const todoListNotContainedError = result.errors.find(err => 
      err.message === "UIComponent 'TodoList' is not contained by any other UIComponent" &&
      err.position.line === 7 &&
      err.position.column === 1
    );
    assert.notEqual(todoListNotContainedError, undefined);
    assert.equal(todoListNotContainedError?.severity, 'error');
    assert.equal(todoListNotContainedError?.suggestion, "Either add 'TodoList' to another UIComponent's contains list, or mark it as a root component with &!");
    
    // All errors should be of severity 'error'
    assert.equal(result.errors.every(err => err.severity === 'error'), true);
  });
});