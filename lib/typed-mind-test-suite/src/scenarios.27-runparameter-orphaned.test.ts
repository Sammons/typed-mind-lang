import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-27-runparameter-orphaned', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-27-runparameter-orphaned.tmd';

  it('should detect orphaned RunParameters', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = checker.check(content, filePath);
    
    assert.equal(result.valid, false);
    assert.equal((result.errors).length, 3);

    // Should detect orphaned UNUSED_PARAM
    const unusedParamError = result.errors.find(err =>
      err.message === "Orphaned entity 'UNUSED_PARAM'"
    );
    assert.notEqual(unusedParamError, undefined);
    assert.equal(unusedParamError?.position.line, 12);
    assert.equal(unusedParamError?.severity, 'error');
    assert.equal(unusedParamError?.suggestion, 'Remove or reference this entity');

    // Should detect orphaned SECRET_KEY
    const secretKeyError = result.errors.find(err =>
      err.message === "Orphaned entity 'SECRET_KEY'"
    );
    assert.notEqual(secretKeyError, undefined);
    assert.equal(secretKeyError?.position.line, 13);
    assert.equal(secretKeyError?.severity, 'error');
    assert.equal(secretKeyError?.suggestion, 'Remove or reference this entity');

    // Should detect orphaned processData function
    const processDataError = result.errors.find(err =>
      err.message === "Orphaned entity 'processData'"
    );
    assert.notEqual(processDataError, undefined);
    assert.equal(processDataError?.position.line, 16);
    assert.equal(processDataError?.severity, 'error');
    assert.equal(processDataError?.suggestion, 'Remove or reference this entity');
    
    // Get parsed entities using parse method  
    const parseResult = checker.parse(content, filePath);
    const entities = parseResult.entities;
    assert.equal(entities.has('UNUSED_PARAM'), true);
    assert.equal(entities.has('SECRET_KEY'), true);
    assert.equal(entities.has('API_KEY'), true);
    assert.equal(entities.has('DATABASE_URL'), true);
    
    // Verify types
    const unusedParam = entities.get('UNUSED_PARAM') as any;
    assert.equal(unusedParam?.type, 'RunParameter');
    assert.equal(unusedParam?.paramType, 'env');
    
    const secretKey = entities.get('SECRET_KEY') as any;
    assert.equal(secretKey?.type, 'RunParameter');
    assert.equal(secretKey?.paramType, 'config');
    assert.equal(secretKey?.defaultValue, 'secret123');
  });
});