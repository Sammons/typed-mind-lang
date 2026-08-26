import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

describe('Scenario 65: Bidirectional consumedBy for RunParameters', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-65-bidirectional-consumedby.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should automatically populate RunParameter.consumedBy when Function consumes it', () => {
    const parseResult = parser.parse(content);
    
    // Check DATABASE_URL.consumedBy
    const databaseUrl = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DATABASE_URL' && e.type === 'RunParameter'
    ) as any;
    
    expect(databaseUrl).toBeDefined();
    expect(databaseUrl.consumedBy).toBeDefined();
    expect(databaseUrl.consumedBy).toContain('connectDB');
    expect(databaseUrl.consumedBy).toContain('startServer');
    expect(databaseUrl.consumedBy.length).toBe(2);
  });

  it('should handle multiple functions consuming the same RunParameter', () => {
    const parseResult = parser.parse(content);
    
    // DATABASE_URL is consumed by both connectDB and startServer
    const databaseUrl = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DATABASE_URL' && e.type === 'RunParameter'
    ) as any;
    
    expect(databaseUrl.consumedBy).toEqual(
      expect.arrayContaining(['connectDB', 'startServer'])
    );
  });

  it('should handle single function consuming RunParameter', () => {
    const parseResult = parser.parse(content);
    
    // API_KEY is only consumed by processData
    const apiKey = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'API_KEY' && e.type === 'RunParameter'
    ) as any;
    
    expect(apiKey).toBeDefined();
    expect(apiKey.consumedBy).toEqual(['processData']);
  });

  it('should handle RunParameter with no consuming functions', () => {
    const parseResult = parser.parse(content);
    
    // UNUSED_PARAM has no functions consuming it
    const unusedParam = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'UNUSED_PARAM' && e.type === 'RunParameter'
    ) as any;
    
    expect(unusedParam).toBeDefined();
    expect(unusedParam.consumedBy).toEqual([]);
  });

  it('should maintain consistency between Function.consumes and RunParameter.consumedBy', () => {
    const parseResult = parser.parse(content);
    
    // Check that relationships are bidirectional
    const connectDB = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'connectDB' && e.type === 'Function'
    ) as any;
    const databaseUrl = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DATABASE_URL' && e.type === 'RunParameter'
    ) as any;
    
    expect(connectDB.consumes).toContain('DATABASE_URL');
    expect(databaseUrl.consumedBy).toContain('connectDB');
  });

  it('should handle different RunParameter types', () => {
    const parseResult = parser.parse(content);
    
    // Check different parameter types
    const port = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'PORT' && e.type === 'RunParameter'
    ) as any;
    const dbTimeout = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DB_TIMEOUT' && e.type === 'RunParameter'
    ) as any;
    const maxRetries = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'MAX_RETRIES' && e.type === 'RunParameter'
    ) as any;
    
    expect(port.paramType).toBe('config');
    expect(port.consumedBy).toEqual(['startServer']);
    
    expect(dbTimeout.paramType).toBe('runtime');
    expect(dbTimeout.consumedBy).toEqual(['connectDB']);
    
    expect(maxRetries.paramType).toBe('config');
    expect(maxRetries.consumedBy).toEqual(['processData']);
  });

  it('should validate without errors when bidirectional relationships are correct', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // Should not have any validation errors about missing consumedBy
    const consumedByErrors = validationResult.errors.filter(e => 
      e.message.includes('consumedBy')
    );
    
    expect(consumedByErrors).toEqual([]);
  });

  it('should handle required and optional RunParameters with consumedBy', () => {
    const parseResult = parser.parse(content);
    
    // DATABASE_URL is required
    const databaseUrl = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DATABASE_URL' && e.type === 'RunParameter'
    ) as any;
    
    // PORT has default value (optional)
    const port = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'PORT' && e.type === 'RunParameter'
    ) as any;
    
    expect(databaseUrl.required).toBe(true);
    expect(databaseUrl.consumedBy.length).toBeGreaterThan(0);
    
    expect(port.defaultValue).toBe('3000');
    expect(port.consumedBy).toEqual(['startServer']);
  });
});