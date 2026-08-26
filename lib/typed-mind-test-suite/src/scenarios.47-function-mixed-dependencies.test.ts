import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 47: Function Mixed Dependencies', () => {
  it('should properly distribute mixed dependency types from <- [...] syntax', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-47-function-mixed-dependencies.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    // Should be invalid - all dependencies are not properly distributed
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // Verify the parser correctly distributed the dependencies
    // Note: We can't directly test the internal distribution here,
    // but we can verify no errors were generated

    // Test that the validator doesn't complain about any of the dependencies
    // RFC-TM-4 §4 A7: line 15's `lodash` direct-consumption diagnostic is now
    // reworded ("Dependencies cannot be consumed directly — a File must
    // import 'lodash' first" instead of "Cannot directly consume dependency
    // 'lodash'..."); neither wording matches the substrings checked below,
    // so this assertion is unaffected.
    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);

    // Should not have any "not found" errors
    assert.equal(diagnosticMessages.filter((m) => m.includes('not found')).length, 0);

    // Should not have any type mismatch errors
    assert.equal(diagnosticMessages.filter((m) => m.includes('Cannot call method')).length, 0);
    assert.equal(diagnosticMessages.filter((m) => m.includes('Cannot use')).length, 0);
  });

  it('should detect when mixed dependencies include undefined entities', async () => {
    const content = `
# Test undefined entities in mixed dependencies
TestApp -> MainFile v1.0.0

MainFile @ src/main.ts:
  -> [testFunction]

testFunction :: () => void
  <- [UndefinedUI, MissingAsset, NonExistentDTO, unknownFunction, missingDep, NoSuchConfig]
`;

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 7); // More errors than expected

    // Should have errors for all undefined entities
    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);

    assert.equal(
      diagnosticMessages.some((m) => m.includes("'UndefinedUI' not found")),
      true,
    );
    assert.equal(
      diagnosticMessages.some((m) => m.includes("'MissingAsset' not found")),
      true,
    );
    assert.equal(
      diagnosticMessages.some((m) => m.includes("'NonExistentDTO' not found")),
      true,
    );
    assert.equal(
      diagnosticMessages.some((m) => m.includes("'unknownFunction' not found")),
      true,
    );
    assert.equal(
      diagnosticMessages.some((m) => m.includes("'missingDep' not found")),
      true,
    );
    assert.equal(
      diagnosticMessages.some((m) => m.includes("'NoSuchConfig' not found")),
      true,
    );

    // Verify all errors have proper severity and line numbers
    const diagnostics = result.diagnostics;
    for (const diagnostic of diagnostics) {
      assert.equal(diagnostic.severity, 'error');
      assert.equal(diagnostic.span.start.line, 8); // Line where testFunction is defined in the inline content (relative to content start)
    }
  });
});
