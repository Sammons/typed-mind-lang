import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-03-circular-dependency', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-03-circular-dependency.tmd';

  it('should detect circular dependency between functions', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // The result should be invalid due to circular dependency
    assert.equal(result.valid, false);

    // Should have exactly 1 error
    assert.equal(result.errors.length, 1);

    const error = result.errors[0];

    // Check error properties
    assert.equal(error.position.line, 3);
    assert.equal(error.position.column, 1);
    assert.equal(error.severity, 'error');
    assert.notEqual(error.suggestion, undefined);

    // Check that the error message describes the circular dependency
    assert.equal(error.message, 'Circular import detected: ServiceA -> ServiceB -> ServiceC -> ServiceA');
  });
});
