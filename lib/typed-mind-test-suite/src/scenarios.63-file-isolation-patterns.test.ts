import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

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
    expect(publicAPI?.imports).toContain('InternalService');
    expect(publicAPI?.imports).toContain('PrivateHelper');
    expect(publicAPI?.imports).toContain('SharedUtils');
    
    // Selectively exports only public methods
    expect(publicAPI?.exports).toContain('publicMethod');
    expect(publicAPI?.exports).toContain('utilityFunction');
    
    // Does not export internal helpers
    expect(publicAPI?.exports).not.toContain('processInternal');
    expect(publicAPI?.exports).not.toContain('privateProcess');
  });

  it('should enforce module boundaries', () => {
    const parseResult = parser.parse(content);
    
    // Auth module exposes only public interface
    const authModule = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'AuthModule' && e.type === 'File'
    );
    
    expect(authModule?.imports).toContain('AuthService');
    expect(authModule?.imports).toContain('AuthValidator');
    expect(authModule?.imports).toContain('AuthConfig');
    
    expect(authModule?.exports).toContain('authenticate');
    expect(authModule?.exports).toContain('authorize');
    
    // Internal auth components not exposed
    expect(authModule?.exports).not.toContain('AuthService');
    expect(authModule?.exports).not.toContain('validateUser');
  });

  it('should handle layered architecture', () => {
    const parseResult = parser.parse(content);
    
    // Presentation depends on Business
    const presentation = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'PresentationLayer' && e.type === 'File'
    );
    expect(presentation?.imports).toContain('BusinessLayer');
    expect(presentation?.imports).not.toContain('DataLayer'); // No direct access
    
    // Business depends on Data
    const business = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'BusinessLayer' && e.type === 'File'
    );
    expect(business?.imports).toContain('DataLayer');
    expect(business?.imports).not.toContain('Database'); // No direct DB access
    
    // Data encapsulates Database
    const data = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DataLayer' && e.type === 'File'
    );
    expect(data?.imports).toContain('Database');
  });

  it('should detect circular dependencies between modules', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // ModuleA imports ModuleB, ModuleB imports ModuleA
    expect(errors.some(e => 
      e.includes('Circular') && 
      (e.includes('ModuleA') || e.includes('ModuleB'))
    )).toBe(true);
  });

  it('should detect orphaned functions', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // orphanedFunction is not exported from any file
    expect(errors.some(e => 
      e.includes('orphanedFunction') && 
      (e.includes('not exported') || e.includes('orphaned'))
    )).toBe(true);
    
    // Private implementation details are exported from their file
    const implDetail = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ImplementationDetail' && e.type === 'File'
    );
    expect(implDetail?.exports).toContain('privateImpl');
    expect(implDetail?.exports).toContain('secretAlgorithm');
  });

  it('should handle re-export patterns', () => {
    const parseResult = parser.parse(content);
    
    const coreExports = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'CoreExports' && e.type === 'File'
    );
    
    // Re-exports imported entities
    expect(coreExports?.imports).toContain('CoreService');
    expect(coreExports?.imports).toContain('CoreUtils');
    expect(coreExports?.imports).toContain('CoreTypes');
    
    expect(coreExports?.exports).toContain('CoreService');
    expect(coreExports?.exports).toContain('coreUtil');
    expect(coreExports?.exports).toContain('CoreConfig');
    
    // Doesn't export everything (selective re-export)
    expect(coreExports?.exports).not.toContain('coreHelper');
    expect(coreExports?.exports).not.toContain('CoreState');
  });

  it('should handle files with no exports', () => {
    const parseResult = parser.parse(content);
    
    // Side effects file
    const noExportFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'NoExportFile' && e.type === 'File'
    );
    
    expect(noExportFile?.imports).toContain('Logger');
    expect(noExportFile?.exports?.length || 0).toBe(0);
    
    // Import only file with explicit empty exports
    const importOnlyFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ImportOnlyFile' && e.type === 'File'
    );
    
    expect(importOnlyFile?.imports?.length).toBeGreaterThan(0);
    expect(importOnlyFile?.exports?.length || 0).toBe(0);
  });

  it('should handle test file isolation', () => {
    const parseResult = parser.parse(content);
    
    const testFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'TestFile' && e.type === 'File'
    );
    
    // Test file imports public APIs
    expect(testFile?.imports).toContain('PublicAPI');
    expect(testFile?.imports).toContain('CoreExports');
    
    // Exports test suite
    expect(testFile?.exports).toContain('testSuite');
    
    const testSuite = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'testSuite' && e.type === 'Function'
    );
    
    // Test calls public methods
    expect(testSuite?.calls).toContain('publicMethod');
    expect(testSuite?.calls).toContain('coreUtil');
  });

  it('should handle environment-specific files', () => {
    const parseResult = parser.parse(content);
    
    // Dev-specific file
    const devFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DevFile' && e.type === 'File'
    );
    expect(devFile?.path).toContain('dev/');
    
    // Prod-specific file
    const prodFile = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ProdFile' && e.type === 'File'
    );
    expect(prodFile?.path).toContain('prod/');
    
    // Different entry points
    const devEntry = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DevEntry' && e.type === 'File'
    );
    const prodEntry = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ProdEntry' && e.type === 'File'
    );
    
    expect(devEntry?.imports).toContain('DevFile');
    expect(prodEntry?.imports).toContain('ProdFile');
  });

  it.skip('should handle multiple programs for different builds', () => {
    const parseResult = parser.parse(content);
    
    // Multiple programs in same file
    const programs = Array.from(parseResult.entities.values()).filter(e => e.type === 'Program');
    
    const isolationApp = programs.find(p => p.name === 'IsolationApp');
    const devApp = programs.find(p => p.name === 'DevApp');
    const prodApp = programs.find(p => p.name === 'ProdApp');
    
    expect(isolationApp?.entry).toBe('main');
    expect(devApp?.entry).toBe('DevEntry');
    expect(prodApp?.entry).toBe('ProdEntry');
    
    // Different versions
    expect(devApp?.version).toBe('v1.0.0-dev');
    expect(prodApp?.version).toBe('v1.0.0');
  });

  it('should validate file isolation integrity', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // Check that internal services are not orphaned
    const internalService = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'InternalService' && e.type === 'ClassFile'
    );
    
    // InternalService is imported by PublicAPI
    expect(internalService).toBeDefined();
    
    // Private functions should be traceable
    const privateHelper = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'PrivateHelper' && e.type === 'File'
    );
    
    // PrivateHelper is imported by PublicAPI and InternalService
    expect(privateHelper).toBeDefined();
  });

  it('should validate all layer dependencies', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // Check no layer violations
    const layerViolations = errors.filter(e => 
      e.includes('PresentationLayer') && e.includes('DataLayer')
    );
    expect(layerViolations.length).toBe(0);
    
    // All layer functions should be properly connected
    const handleRequest = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'handleRequest' && e.type === 'Function'
    );
    expect(handleRequest?.calls).toContain('processBusinessLogic');
    
    const processBusinessLogic = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'processBusinessLogic' && e.type === 'Function'
    );
    expect(processBusinessLogic?.calls).toContain('queryData');
    expect(processBusinessLogic?.calls).toContain('updateData');
  });
});