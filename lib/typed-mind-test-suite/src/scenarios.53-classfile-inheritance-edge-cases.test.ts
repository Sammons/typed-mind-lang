import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 53: ClassFile Inheritance Edge Cases', () => {
  it('should detect circular and invalid inheritance patterns', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-53-classfile-inheritance-edge-cases.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    // Should have errors for invalid inheritance
    assert.equal(result.valid, false);
    // RFC-TM-4 §4 A2: line 9's trailing `,` is now diagnosed as a syntax
    // error, adding one diagnostic on top of the legacy set. This test only
    // asserts presence via `> 0` / `.find()`, so the extra diagnostic does
    // not change any assertion outcome.
    assert.ok(result.diagnostics.length > 0);

    // Should find orphaned entities instead of circular inheritance
    const orphanedErrors = result.diagnostics.filter((diagnostic) => diagnostic.message.includes('Orphaned entity'));
    assert.ok(orphanedErrors.length > 0);

    // Q permits the two verified ClassFile method calls.
    const callsErrors = result.diagnostics.filter((diagnostic) => diagnostic.message.includes("Cannot use 'calls' to reference ClassFile"));
    assert.equal(callsErrors.length, 0);

    // Inheriting from non-existent class
    const nonExistentBaseError = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message.includes('NonExistentBase') &&
        (diagnostic.message.includes('not found') || diagnostic.message.includes('does not exist')),
    );
    assert.notEqual(nonExistentBaseError, undefined); // Missing base class should be detected

    // Self-inheriting class should error
    const selfInheritingError = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message.includes('SelfInheriting') && (diagnostic.message.includes('itself') || diagnostic.message.includes('circular')),
    );
    assert.notEqual(selfInheritingError, undefined); // Self-inheritance should be detected

    // Valid inheritance should not error
    const validChildError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('ValidChild') && diagnostic.message.includes('inheritance'),
    );
    assert.equal(validChildError, undefined);

    // Deep inheritance chain should be valid
    const deepInheritanceError = result.diagnostics.find(
      (diagnostic) =>
        (diagnostic.message.includes('RootClass') ||
          diagnostic.message.includes('MiddleClass') ||
          diagnostic.message.includes('DeepChild')) &&
        diagnostic.message.includes('inheritance') &&
        !diagnostic.message.includes('Orphaned'),
    );
    assert.equal(deepInheritanceError, undefined);
  });
});
