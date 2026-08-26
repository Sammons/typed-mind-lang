import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    
    assert.notEqual(databaseUrl, undefined);
    assert.notEqual(databaseUrl.consumedBy, undefined);
    assert.ok((databaseUrl.consumedBy).includes('connectDB'));
    assert.ok((databaseUrl.consumedBy).includes('startServer'));
    assert.equal(databaseUrl.consumedBy.length, 2);
  });

  it('should handle multiple functions consuming the same RunParameter', () => {
    const parseResult = parser.parse(content);
    
    // DATABASE_URL is consumed by both connectDB and startServer
    const databaseUrl = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'DATABASE_URL' && e.type === 'RunParameter'
    ) as any;
    
    for (const expected of ['connectDB', 'startServer']) {
      assert.ok(databaseUrl.consumedBy.includes(expected));
    }
  });

  it('should handle single function consuming RunParameter', () => {
    const parseResult = parser.parse(content);
    
    // API_KEY is only consumed by processData
    const apiKey = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'API_KEY' && e.type === 'RunParameter'
    ) as any;
    
    assert.notEqual(apiKey, undefined);
    assert.deepEqual(apiKey.consumedBy, ['processData']);
  });

  it('should handle RunParameter with no consuming functions', () => {
    const parseResult = parser.parse(content);
    
    // UNUSED_PARAM has no functions consuming it
    const unusedParam = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'UNUSED_PARAM' && e.type === 'RunParameter'
    ) as any;
    
    assert.notEqual(unusedParam, undefined);
    assert.deepEqual(unusedParam.consumedBy, []);
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
    
    assert.ok((connectDB.consumes).includes('DATABASE_URL'));
    assert.ok((databaseUrl.consumedBy).includes('connectDB'));
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
    
    assert.equal(port.paramType, 'config');
    assert.deepEqual(port.consumedBy, ['startServer']);
    
    assert.equal(dbTimeout.paramType, 'runtime');
    assert.deepEqual(dbTimeout.consumedBy, ['connectDB']);
    
    assert.equal(maxRetries.paramType, 'config');
    assert.deepEqual(maxRetries.consumedBy, ['processData']);
  });

  it('should validate without errors when bidirectional relationships are correct', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // Should not have any validation errors about missing consumedBy
    const consumedByErrors = validationResult.errors.filter(e => 
      e.message.includes('consumedBy')
    );
    
    assert.deepEqual(consumedByErrors, []);
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
    
    assert.equal(databaseUrl.required, true);
    assert.ok((databaseUrl.consumedBy.length) > (0));
    
    assert.equal(port.defaultValue, '3000');
    assert.deepEqual(port.consumedBy, ['startServer']);
  });
});