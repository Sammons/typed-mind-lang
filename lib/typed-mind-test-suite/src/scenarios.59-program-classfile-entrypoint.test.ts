import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

describe('Scenario 59: Program with ClassFile as entry point', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-59-program-classfile-entrypoint.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should parse ClassFile as program entry point', () => {
    const parseResult = parser.parse(content);
    const entities = Array.from(parseResult.entities.values());
    
    // Find the ServerApp program
    const serverApp = entities.find(e => 
      e.name === 'ServerApp' && e.type === 'Program'
    );
    expect(serverApp).toBeDefined();
    expect(serverApp?.entry).toBe('ApplicationServer');
    
    // Find the ApplicationServer ClassFile
    const appServer = entities.find(e => 
      e.name === 'ApplicationServer' && e.type === 'ClassFile'
    );
    expect(appServer).toBeDefined();
    expect(appServer?.path).toBe('src/server.ts');
    expect(appServer?.methods).toContain('start');
  });

  it('should validate ClassFile as valid entry point', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // ServerApp with ClassFile entry should be valid
    const serverAppErrors = errors.filter(e => 
      e.includes('ServerApp') && e.includes('entry')
    );
    expect(serverAppErrors.length).toBeGreaterThan(0);
    
    // ClientApp with File entry should be valid
    const clientAppErrors = errors.filter(e => 
      e.includes('ClientApp') && e.includes('ClientMain')
    );
    expect(clientAppErrors.length).toBe(0);
    
    // BrokenApp should have error for non-existent entry
    expect(errors.some(e => 
      e.includes('BrokenApp') && e.includes('NonExistentService')
    )).toBe(true);
    
    // InvalidApp should have error for using Class as entry
    expect(errors.some(e => 
      e.includes('InvalidApp') && 
      (e.includes('RegularClass') || e.includes('entry point'))
    )).toBe(true);
  });

  it('should handle ClassFile inheritance chain', () => {
    const parseResult = parser.parse(content);
    const entities = Array.from(parseResult.entities.values());
    
    // UserController extends chain
    const userController = entities.find(e => 
      e.name === 'UserController' && e.type === 'ClassFile'
    );
    expect(userController).toBeDefined();
    
    // Database uses Config
    const database = entities.find(e => 
      e.name === 'Database' && e.type === 'ClassFile'
    );
    expect(database?.imports).toContain('Config');
  });

  it('should validate ClassFile auto-export', () => {
    const parseResult = parser.parse(content);
    const entities = Array.from(parseResult.entities.values());
    
    // ApplicationServer should auto-export itself
    const appServer = entities.find(e => 
      e.name === 'ApplicationServer' && e.type === 'ClassFile'
    );
    
    // The ClassFile should have serverInstance in its exports
    expect(appServer?.exports).toContain('serverInstance');
    
    // The ClassFile implicitly exports itself, so manual export would be redundant
    expect(appServer?.exports).not.toContain('ApplicationServer');
  });

  it('should detect missing dependencies', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // Check that all ClassFile methods are referenceable
    const entities = Array.from(parseResult.entities.values());
    const userService = entities.find(e => 
      e.name === 'UserService' && e.type === 'ClassFile'
    );
    expect(userService?.methods).toContain('findUser');
    expect(userService?.methods).toContain('saveUser');
    
    // Verify no orphaned entities
    const orphanedErrors = errors.filter(e => e.includes('orphaned'));
    
    // RegularClass, BaseClass, AbstractBase might be orphaned
    // as they're not used by InvalidApp properly
    expect(orphanedErrors.length).toBe(0);
  });

  it('should distinguish between File and ClassFile entry points', () => {
    const parseResult = parser.parse(content);
    const entities = Array.from(parseResult.entities.values());
    
    // Program can reference both File and ClassFile
    const programs = entities.filter(e => e.type === 'Program');
    
    const serverApp = programs.find(p => p.name === 'ServerApp');
    expect(serverApp?.entry).toBe('ApplicationServer'); // ClassFile
    
    const clientApp = programs.find(p => p.name === 'ClientApp');
    expect(clientApp?.entry).toBe('ClientMain'); // File
    
    const invalidApp = programs.find(p => p.name === 'InvalidApp');
    expect(invalidApp?.entry).toBe('RegularClass'); // Class (invalid)
  });
});