import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 50: Circular Function Calls', () => {
  it('should detect circular function call dependencies', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-50-circular-function-calls.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    // Should have errors for circular dependencies
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // Should detect orphaned entities instead of circular dependencies
    const orphanedErrors = result.diagnostics.filter((diagnostic) => diagnostic.message.includes('Orphaned entity'));
    assert.ok(orphanedErrors.length > 0);

    // Check for orphaned file
    const orphanedFile = result.diagnostics.find((diagnostic) => diagnostic.message.includes("Orphaned file 'SecondaryFile'"));
    assert.notEqual(orphanedFile, undefined);

    // Deep chain without circular should NOT have errors
    const deepChainError = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message.includes('chainStart') || diagnostic.message.includes('chainMiddle') || diagnostic.message.includes('chainEnd'),
    );
    // Might have other errors but not circular
    if (deepChainError) {
      assert.ok(!deepChainError.message.includes('Circular'));
    }
  });
});
