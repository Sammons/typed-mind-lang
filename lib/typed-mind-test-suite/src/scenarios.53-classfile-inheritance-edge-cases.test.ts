import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 53: ClassFile Inheritance Edge Cases', () => {
  it('should detect circular and invalid inheritance patterns', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-53-classfile-inheritance-edge-cases.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const checker = new DSLChecker();
    const result = checker.check(content);

    // Should have errors for invalid inheritance
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);

    // Should find orphaned entities instead of circular inheritance
    const orphanedErrors = result.errors.filter((e) => e.message.includes('Orphaned entity'));
    assert.ok(orphanedErrors.length > 0);

    // Should find ClassFile reference errors
    const callsErrors = result.errors.filter((e) => e.message.includes("Cannot use 'calls' to reference ClassFile"));
    assert.ok(callsErrors.length > 0);

    // Inheriting from non-existent class
    const nonExistentBaseError = result.errors.find(
      (e) => e.message.includes('NonExistentBase') && (e.message.includes('not found') || e.message.includes('does not exist')),
    );
    assert.notEqual(nonExistentBaseError, undefined); // Missing base class should be detected

    // Self-inheriting class should error
    const selfInheritingError = result.errors.find(
      (e) => e.message.includes('SelfInheriting') && (e.message.includes('itself') || e.message.includes('circular')),
    );
    assert.notEqual(selfInheritingError, undefined); // Self-inheritance should be detected

    // Valid inheritance should not error
    const validChildError = result.errors.find((e) => e.message.includes('ValidChild') && e.message.includes('inheritance'));
    assert.equal(validChildError, undefined);

    // Deep inheritance chain should be valid
    const deepInheritanceError = result.errors.find(
      (e) =>
        (e.message.includes('RootClass') || e.message.includes('MiddleClass') || e.message.includes('DeepChild')) &&
        e.message.includes('inheritance') &&
        !e.message.includes('Orphaned'),
    );
    assert.equal(deepInheritanceError, undefined);
  });
});
