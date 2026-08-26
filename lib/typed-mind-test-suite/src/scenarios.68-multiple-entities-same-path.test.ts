import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-68-multiple-entities-same-path', () => {
  const scenarioFile = 'scenario-68-multiple-entities-same-path.tmd';

  it('should allow multiple constants and DTOs to share the same path', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // The DSL should be invalid due to orphaned entities, even though path sharing is allowed
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 4);

    // Verify all diagnostics are about orphaned entities, not path conflicts
    result.diagnostics.forEach((diagnostic) => {
      assert.match(diagnostic.message, /^Orphaned entity/);
    });
  });
});
