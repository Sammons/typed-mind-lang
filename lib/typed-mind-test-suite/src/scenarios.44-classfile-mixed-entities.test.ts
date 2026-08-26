import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-44-classfile-mixed-entities', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-44-classfile-mixed-entities.tmd';

  it('should handle mixed ClassFile and regular entities correctly', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // The scenario should be invalid due to multiple validation errors
    assert.equal(result.valid, false);
    assert.equal((result.errors).length, 8); // More errors than expected
    
    // Should find error for BaseController being orphaned
    const baseControllerOrphanedError = result.errors.find(err => 
      err.message.includes('BaseController') && 
      err.message.includes('Orphaned entity')
    );
    assert.notEqual(baseControllerOrphanedError, undefined);
    assert.equal(baseControllerOrphanedError?.severity, 'error');
    
    // Should find error for BaseController not being exported from a File
    const baseControllerNotExportedError = result.errors.find(err => 
      err.message.includes('BaseController') && 
      err.message.includes('is not exported by any file')
    );
    assert.notEqual(baseControllerNotExportedError, undefined);
    assert.equal(baseControllerNotExportedError?.severity, 'error');
    
    // Should find errors for invalid calls to ClassFile methods
    const userControllerCallError = result.errors.find(err => 
      err.message.includes('Cannot use \'calls\' to reference ClassFile \'UserController\'')
    );
    assert.notEqual(userControllerCallError, undefined);
    assert.equal(userControllerCallError?.severity, 'error');
    
    const userRepositoryCallError = result.errors.find(err => 
      err.message.includes('Cannot use \'calls\' to reference ClassFile \'UserRepository\'')
    );
    assert.notEqual(userRepositoryCallError, undefined);
    assert.equal(userRepositoryCallError?.severity, 'error');
    
    // Should find error for DataProcessor not being exported
    const dataProcessorError = result.errors.find(err => 
      err.message.includes('DataProcessor') && 
      err.message.includes('is not exported by any file')
    );
    assert.notEqual(dataProcessorError, undefined);
    assert.equal(dataProcessorError?.severity, 'error');
  });
});