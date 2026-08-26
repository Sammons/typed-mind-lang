import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 63: File isolation patterns', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-63-file-isolation-patterns.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should handle selective exports from public API', () => {
    const parseResult = parser.parse(content);
    
    const publicAPI = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'PublicAPI' && e.type === 'File'
    );
    
    // Imports internal modules
    assert.ok((publicAPI?.imports).includes('InternalService'));
    assert.ok((publicAPI?.imports).includes('PrivateHelper'));
    assert.ok((publicAPI?.imports).includes('SharedUtils'));
    
    // Selectively exports only public methods
    assert.ok((publicAPI?.exports).includes('publicMethod'));
    assert.ok((publicAPI?.exports).includes('utilityFunction'));
    
    // Does not export internal helpers
    assert.ok(!(publicAPI?.exports).includes('processInternal'));
    assert.ok(!(publicAPI?.exports).includes('privateProcess'));
  });

  it('should enforce module boundaries', () => {
    const parseResult = parser.parse(content);
    
    // Auth module exposes only public interface
    const authModule = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'AuthModule' && e.type === 'File'
    );
    
    assert.ok((authModule?.imports).includes('AuthService'));
    assert.ok((authModule?.imports).includes('AuthValidator'));
    assert.ok((authModule?.imports).includes('AuthConfig'));
    
    assert.ok((authModule?.exports).includes('authenticate'));
    assert.ok((authModule?.exports).includes('authorize'));
    
    // Internal auth components not exposed
    assert.ok(!(authModule?.exports).includes('AuthService'));
    assert.ok(!(authModule?.exports).includes('validateUser'));
  });

  it('should handle layered architecture', () => {
    const parseResult = parser.parse(content);
    
    // Presentation depends on Business
    const presentation = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'PresentationLayer' && e.type === 'File'
    );
    assert.ok((presentation?.imports).includes('BusinessLayer'));
    assert.ok(!(presentation?.imports).includes('DataLayer')); // No direct access
    
    // Business depends on Data
    const business = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'BusinessLayer' && e.type === 'File'
    );
    assert.ok((business?.imports).includes('DataLayer'));
    assert.ok(!(business?.imports).includes('Database')); // No direct DB access
    
    // Data encapsulates Database
    const data = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DataLayer' && e.type === 'File'
    );
    assert.ok((data?.imports).includes('Database'));
  });

  it('should detect circular dependencies between modules', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // ModuleA imports ModuleB, ModuleB imports ModuleA
    assert.equal(errors.some(e => 
      e.includes('Circular') && 
      (e.includes('ModuleA') || e.includes('ModuleB'))
    ), true);
  });

  it('should detect orphaned functions', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // orphanedFunction is not exported from any file
    assert.equal(errors.some(e => 
      e.includes('orphanedFunction') && 
      (e.includes('not exported') || e.includes('orphaned'))
    ), true);
    
    // Private implementation details are exported from their file
    const implDetail = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ImplementationDetail' && e.type === 'File'
    );
    assert.ok((implDetail?.exports).includes('privateImpl'));
    assert.ok((implDetail?.exports).includes('secretAlgorithm'));
  });

  it('should handle re-export patterns', () => {
    const parseResult = parser.parse(content);
    
    const coreExports = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'CoreExports' && e.type === 'File'
    );
    
    // Re-exports imported entities
    assert.ok((coreExports?.imports).includes('CoreService'));
    assert.ok((coreExports?.imports).includes('CoreUtils'));
    assert.ok((coreExports?.imports).includes('CoreTypes'));
    
    assert.ok((coreExports?.exports).includes('CoreService'));
    assert.ok((coreExports?.exports).includes('coreUtil'));
    assert.ok((coreExports?.exports).includes('CoreConfig'));
    
    // Doesn't export everything (selective re-export)
    assert.ok(!(coreExports?.exports).includes('coreHelper'));
    assert.ok(!(coreExports?.exports).includes('CoreState'));
  });

  it('should handle files with no exports', () => {
    const parseResult = parser.parse(content);
    
    // Side effects file
    const noExportFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'NoExportFile' && e.type === 'File'
    );
    
    assert.ok((noExportFile?.imports).includes('Logger'));
    assert.equal(noExportFile?.exports?.length || 0, 0);
    
    // Import only file with explicit empty exports
    const importOnlyFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ImportOnlyFile' && e.type === 'File'
    );
    
    assert.ok((importOnlyFile?.imports?.length) > (0));
    assert.equal(importOnlyFile?.exports?.length || 0, 0);
  });

  it('should handle test file isolation', () => {
    const parseResult = parser.parse(content);
    
    const testFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'TestFile' && e.type === 'File'
    );
    
    // Test file imports public APIs
    assert.ok((testFile?.imports).includes('PublicAPI'));
    assert.ok((testFile?.imports).includes('CoreExports'));
    
    // Exports test suite
    assert.ok((testFile?.exports).includes('testSuite'));
    
    const testSuite = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'testSuite' && e.type === 'Function'
    );
    
    // Test calls public methods
    assert.ok((testSuite?.calls).includes('publicMethod'));
    assert.ok((testSuite?.calls).includes('coreUtil'));
  });

  it('should handle environment-specific files', () => {
    const parseResult = parser.parse(content);
    
    // Dev-specific file
    const devFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DevFile' && e.type === 'File'
    );
    assert.ok((devFile?.path).includes('dev/'));
    
    // Prod-specific file
    const prodFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ProdFile' && e.type === 'File'
    );
    assert.ok((prodFile?.path).includes('prod/'));
    
    // Different entry points
    const devEntry = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DevEntry' && e.type === 'File'
    );
    const prodEntry = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ProdEntry' && e.type === 'File'
    );
    
    assert.ok((devEntry?.imports).includes('DevFile'));
    assert.ok((prodEntry?.imports).includes('ProdFile'));
  });

  it.skip('should handle multiple programs for different builds', () => {
    const parseResult = parser.parse(content);
    
    // Multiple programs in same file
    const programs = Array.from(parseResult.entities.values()).filter(e => e.type === 'Program');
    
    const isolationApp = programs.find(p => p.name === 'IsolationApp');
    const devApp = programs.find(p => p.name === 'DevApp');
    const prodApp = programs.find(p => p.name === 'ProdApp');
    
    assert.equal(isolationApp?.entry, 'main');
    assert.equal(devApp?.entry, 'DevEntry');
    assert.equal(prodApp?.entry, 'ProdEntry');
    
    // Different versions
    assert.equal(devApp?.version, 'v1.0.0-dev');
    assert.equal(prodApp?.version, 'v1.0.0');
  });

  it('should validate file isolation integrity', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // Check that internal services are not orphaned
    const internalService = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'InternalService' && e.type === 'ClassFile'
    );
    
    // InternalService is imported by PublicAPI
    assert.notEqual(internalService, undefined);
    
    // Private functions should be traceable
    const privateHelper = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'PrivateHelper' && e.type === 'File'
    );
    
    // PrivateHelper is imported by PublicAPI and InternalService
    assert.notEqual(privateHelper, undefined);
  });

  it('should validate all layer dependencies', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // Check no layer violations
    const layerViolations = errors.filter(e => 
      e.includes('PresentationLayer') && e.includes('DataLayer')
    );
    assert.equal(layerViolations.length, 0);
    
    // All layer functions should be properly connected
    const handleRequest = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'handleRequest' && e.type === 'Function'
    );
    assert.ok((handleRequest?.calls).includes('processBusinessLogic'));
    
    const processBusinessLogic = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'processBusinessLogic' && e.type === 'Function'
    );
    assert.ok((processBusinessLogic?.calls).includes('queryData'));
    assert.ok((processBusinessLogic?.calls).includes('updateData'));
  });
});