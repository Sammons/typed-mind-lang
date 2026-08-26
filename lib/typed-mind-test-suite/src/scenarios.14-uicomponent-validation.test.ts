import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-14-uicomponent-validation', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-14-uicomponent-validation.tmd';

  it('should validate UIComponent entities and their structure', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // Should be invalid due to orphaned entities and missing containment
    assert.equal(result.valid, false);
    
    // Should have exactly 5 errors (including orphaned entity)
    assert.equal((result.errors).length, 5);
    
    // Check for orphaned ComponentsFile error
    const orphanedComponentsFileError = result.errors.find(err =>
      err.message === "Orphaned file 'ComponentsFile' - none of its exports are imported" &&
      err.position.line === 6 &&
      err.position.column === 1
    );
    assert.notEqual(orphanedComponentsFileError, undefined);
    assert.equal(orphanedComponentsFileError?.severity, 'error');
    assert.equal(orphanedComponentsFileError?.suggestion, 'Remove this file or import its exports somewhere');
    
    // Check for orphaned UnexportedComponent error
    const orphanedUnexportedComponentError = result.errors.find(err => 
      err.message === "Orphaned entity 'UnexportedComponent'" &&
      err.position.line === 36 &&
      err.position.column === 1
    );
    assert.notEqual(orphanedUnexportedComponentError, undefined);
    assert.equal(orphanedUnexportedComponentError?.severity, 'error');
    assert.equal(orphanedUnexportedComponentError?.suggestion, 'Remove or reference this entity');
    
    // Check for App component not contained error
    const appNotContainedError = result.errors.find(err => 
      err.message === "UIComponent 'App' is not contained by any other UIComponent" &&
      err.position.line === 10 &&
      err.position.column === 1
    );
    assert.notEqual(appNotContainedError, undefined);
    assert.equal(appNotContainedError?.severity, 'error');
    assert.equal(appNotContainedError?.suggestion, "Either add 'App' to another UIComponent's contains list, or mark it as a root component with &!");
    
    // Check for UnexportedComponent not contained error
    const unexportedNotContainedError = result.errors.find(err => 
      err.message === "UIComponent 'UnexportedComponent' is not contained by any other UIComponent" &&
      err.position.line === 36 &&
      err.position.column === 1
    );
    assert.notEqual(unexportedNotContainedError, undefined);
    assert.equal(unexportedNotContainedError?.severity, 'error');
    assert.equal(unexportedNotContainedError?.suggestion, "Either add 'UnexportedComponent' to another UIComponent's contains list, or mark it as a root component with &!");
    
    // All errors should be of severity 'error'
    assert.equal(result.errors.every(err => err.severity === 'error'), true);
  });
});