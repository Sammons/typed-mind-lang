import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-28-runparameter-invalid-consumes', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-28-runparameter-invalid-consumes.tmd';

  it('should detect invalid RunParameter consumption', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = checker.check(content, filePath);

    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 3);

    // Check for orphaned entities
    const orphanedBadFunction = result.errors.find((err) => err.message === "Orphaned entity 'badFunction'");
    assert.notEqual(orphanedBadFunction, undefined);

    const orphanedAnotherBadFunction = result.errors.find((err) => err.message === "Orphaned entity 'anotherBadFunction'");
    assert.notEqual(orphanedAnotherBadFunction, undefined);

    // Should detect consuming unknown parameter
    const unknownParamError = result.errors.find(
      (err) => err.message === "Function 'badFunction' consumes unknown entity 'NON_EXISTENT_PARAM'",
    );
    assert.notEqual(unknownParamError, undefined);
    assert.equal(unknownParamError?.position.line, 12);
    assert.equal(unknownParamError?.severity, 'error');
    assert.equal(unknownParamError?.suggestion, "Define 'NON_EXISTENT_PARAM' as one of: RunParameter, Asset, Dependency, Constants");

    // Get parsed entities using parse method
    const parseResult = checker.parse(content, filePath);
    const entities = parseResult.entities;
    assert.equal(entities.has('DATABASE_URL'), true);
    assert.equal(entities.has('APP_CONFIG'), true);
    assert.equal(entities.has('badFunction'), true);
    assert.equal(entities.has('anotherBadFunction'), true);

    // Verify types
    const databaseUrl = entities.get('DATABASE_URL') as any;
    assert.equal(databaseUrl?.type, 'RunParameter');
    assert.equal(databaseUrl?.paramType, 'env');

    const appConfig = entities.get('APP_CONFIG');
    assert.equal(appConfig?.type, 'Constants');
  });
});
