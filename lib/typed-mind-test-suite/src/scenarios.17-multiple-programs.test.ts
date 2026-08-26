import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-17-multiple-programs', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-17-multiple-programs.tmd';

  it('should validate 17 multiple programs', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // Should be invalid due to validation errors
    assert.equal(result.valid, false);
    
    // Should have exactly 13 validation errors (including extra orphaned entities)
    assert.equal((result.errors).length, 13);
    
    // Check for entry point validation errors
    const entryPointErrors = result.errors.filter(err => 
      err.message.includes("Cannot use 'entry' to reference Asset 'IndexHTML'") ||
      err.message.includes("Program 'UIProgram' entry point 'IndexHTML' must be a File entity")
    );
    assert.equal((entryPointErrors).length, 2);
    
    // Check for orphaned UIComponent entities
    const orphanedUIErrors = result.errors.filter(err => 
      err.message.includes('Orphaned entity') && 
      (err.message.includes('AppContainer') || 
       err.message.includes('Sidebar') || 
       err.message.includes('GraphCanvas') || 
       err.message.includes('DetailsPanel') || 
       err.message.includes('ErrorPanel'))
    );
    assert.equal((orphanedUIErrors).length, 5);
    
    // Check for UIComponent containment errors
    const uiContainmentErrors = result.errors.filter(err => 
      err.message.includes('is not contained by any other UIComponent')
    );
    assert.equal((uiContainmentErrors).length, 5);
    
    // Verify specific error messages exist
    assert.equal(result.errors.some(err => err.message.includes("Cannot use 'entry' to reference Asset 'IndexHTML'")), true);
    assert.equal(result.errors.some(err => err.message.includes("Program 'UIProgram' entry point 'IndexHTML' must be a File entity")), true);
    assert.equal(result.errors.some(err => err.message.includes("Orphaned entity 'AppContainer'")), true);
    assert.equal(result.errors.some(err => err.message.includes("Orphaned entity 'Sidebar'")), true);
    assert.equal(result.errors.some(err => err.message.includes("Orphaned entity 'GraphCanvas'")), true);
    assert.equal(result.errors.some(err => err.message.includes("Orphaned entity 'DetailsPanel'")), true);
    assert.equal(result.errors.some(err => err.message.includes("Orphaned entity 'ErrorPanel'")), true);
    
    // Verify UIComponent containment errors for each component
    assert.equal(result.errors.some(err => err.message.includes("UIComponent 'AppContainer' is not contained by any other UIComponent")), true);
    assert.equal(result.errors.some(err => err.message.includes("UIComponent 'Sidebar' is not contained by any other UIComponent")), true);
    assert.equal(result.errors.some(err => err.message.includes("UIComponent 'GraphCanvas' is not contained by any other UIComponent")), true);
    assert.equal(result.errors.some(err => err.message.includes("UIComponent 'DetailsPanel' is not contained by any other UIComponent")), true);
    assert.equal(result.errors.some(err => err.message.includes("UIComponent 'ErrorPanel' is not contained by any other UIComponent")), true);
  });
});