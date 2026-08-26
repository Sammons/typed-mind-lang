import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-26-runparameter-basic', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-26-runparameter-basic.tmd';

  it('should validate basic RunParameter functionality', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = checker.check(content, filePath);

    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);

    // Get parsed entities using parse method
    const parseResult = checker.parse(content, filePath);
    const entities = parseResult.entities;

    // Environment variables
    assert.equal(entities.has('DATABASE_URL'), true);
    assert.equal(entities.has('API_KEY'), true);

    // IAM roles
    assert.equal(entities.has('LAMBDA_ROLE'), true);

    // Runtime configuration
    assert.equal(entities.has('NODE_VERSION'), true);

    // Configuration parameters
    assert.equal(entities.has('MEMORY_SIZE'), true);
    assert.equal(entities.has('TIMEOUT'), true);

    // Functions that consume parameters
    assert.equal(entities.has('handler'), true);
    assert.equal(entities.has('init'), true);

    // Verify RunParameter types
    const databaseUrl = entities.get('DATABASE_URL') as any;
    assert.equal(databaseUrl?.type, 'RunParameter');
    assert.equal(databaseUrl?.paramType, 'env');

    const apiKey = entities.get('API_KEY') as any;
    assert.equal(apiKey?.type, 'RunParameter');
    assert.equal(apiKey?.paramType, 'env');
    assert.equal(apiKey?.defaultValue, 'dev-key-12345');

    const lambdaRole = entities.get('LAMBDA_ROLE') as any;
    assert.equal(lambdaRole?.type, 'RunParameter');
    assert.equal(lambdaRole?.paramType, 'iam');

    const nodeVersion = entities.get('NODE_VERSION') as any;
    assert.equal(nodeVersion?.type, 'RunParameter');
    assert.equal(nodeVersion?.paramType, 'runtime');
    assert.equal(nodeVersion?.defaultValue, '20.x');

    const memorySize = entities.get('MEMORY_SIZE') as any;
    assert.equal(memorySize?.type, 'RunParameter');
    assert.equal(memorySize?.paramType, 'config');
    assert.equal(memorySize?.defaultValue, '512');
  });
});
