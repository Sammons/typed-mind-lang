import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 48: Constants Edge Cases', () => {
  it('should validate Constants with and without schema', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-48-constants-edge-cases.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    assert.equal(result.valid, false);
    assert.deepEqual(
      result.diagnostics.map((diagnostic) => `${diagnostic.span.start.line}:${diagnostic.message}`),
      ["20:Orphaned entity 'InvalidSchemaConfig'", "30:Orphaned entity 'processConfig'"],
    );

    // RFC-TM-14 U5a, leaf R6a (rfc-tm-14-diamond.md §S5, U-2): ConfigSchema is
    // USED — `ValidConfig ! src/config/valid.ts : ConfigSchema` names it as
    // the value's type — so the schema reference credits the orphan walk.
    // The former pin (`Orphaned entity 'ConfigSchema'` at line 24) recorded
    // the legacy port's exclusion of schema from the referenced set, not a
    // rule; removing the schema slot restores exactly that orphan
    // (constants-schema-corpus-deltas.test.ts is the corpus-wide control).
    const withoutSchema = content.replace('ValidConfig ! src/config/valid.ts : ConfigSchema', 'ValidConfig ! src/config/valid.ts');
    assert.notEqual(withoutSchema, content);
    const orphanedSchemaError = typedMind
      .check(withoutSchema)
      .diagnostics.find((diagnostic) => diagnostic.message.includes('ConfigSchema') && diagnostic.message.includes('Orphaned entity'));
    assert.equal(orphanedSchemaError?.severity, 'error');
    assert.equal(orphanedSchemaError?.span.start.line, 24); // Line where ConfigSchema is defined

    // Constants with non-existent schema should be valid but the schema should not be found
    // (but the validator might not specifically flag this as missing schema anymore)
    // We may or may not get a specific "NonExistentSchema not found" error

    // Constants without schema should be valid (no error)
    const noSchemaError = result.diagnostics.find((diagnostic) => diagnostic.message.includes('NoSchemaConfig'));
    assert.equal(noSchemaError, undefined);

    // Valid constants with schema should be valid (no error)
    const validConfigError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('ValidConfig') && !diagnostic.message.includes('NonExistentSchema'),
    );
    assert.equal(validConfigError, undefined);

    // Verify that all expected entities are present in the parsed result
    // (by absence of "not found" errors for them)
    const entityNotFoundErrors = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.message.includes('not found') &&
        (diagnostic.message.includes('ValidConfig') ||
          diagnostic.message.includes('NoSchemaConfig') ||
          diagnostic.message.includes('ConfigSchema') ||
          diagnostic.message.includes('processConfig')),
    );
    assert.equal(entityNotFoundErrors.length, 0);
  });
});
