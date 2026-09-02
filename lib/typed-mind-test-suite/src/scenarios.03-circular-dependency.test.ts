import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-03-circular-dependency', () => {
  const scenarioFile = 'scenario-03-circular-dependency.tmd';

  it('should detect circular dependency between functions', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // The result should be invalid due to circular dependency
    assert.equal(result.valid, false);

    // Should have exactly 1 error
    assert.equal(result.diagnostics.length, 1);

    const diagnostic = result.diagnostics[0];
    assert.notEqual(diagnostic, undefined);
    assert.ok(diagnostic);

    // Check diagnostic properties
    assert.equal(diagnostic.span.start.line, 3);
    assert.equal(diagnostic.span.start.column, 1);
    assert.equal(diagnostic.severity, 'error');

    // Check that the diagnostic message describes the circular dependency.
    // This exercises `checker/circular-import` (check-cycles.ts), which
    // already carries a `suggestion` field and graded PASS in RFC-TM-10 §12
    // (D-LEG-12, Q7) — not `imports/circular` (import-resolver.ts, a
    // DIFFERENT code with a near-identical message prefix), which Q7 DID
    // change. Message text here is unmodified by Q7.
    assert.equal(diagnostic.message, 'Circular import detected: ServiceA -> ServiceB -> ServiceC -> ServiceA');
  });
});
