import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 51: UIComponent Circular Containment', () => {
  it('should detect circular UIComponent containment', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-51-uicomponent-circular-containment.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    // Should have errors for circular containment
    assert.equal(result.valid, false);
    // RFC-TM-4 §4 A2: line 9's trailing `,` is now diagnosed as a syntax
    // error, adding one diagnostic on top of the legacy set. This test only
    // asserts presence via `> 0` / `.find()`, so the extra diagnostic does
    // not change any assertion outcome.
    assert.ok(result.diagnostics.length > 0);

    // Should find orphaned entities
    const orphanedErrors = result.diagnostics.filter((diagnostic) => diagnostic.message.includes('Orphaned entity'));
    assert.ok(orphanedErrors.length > 0);

    // Should find UIComponent containment error
    const containmentError = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("UIComponent 'SomeParent' is not contained by any other UIComponent"),
    );
    assert.notEqual(containmentError, undefined);

    // Self-containing component should error
    const selfContainError = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message.includes('SelfContainer') && (diagnostic.message.includes('itself') || diagnostic.message.includes('circular')),
    );
    assert.notEqual(selfContainError, undefined); // Self-containment should be detected

    // Direct circular containment (A contains B, B contains A)
    const directCircularError = result.diagnostics.find(
      (diagnostic) =>
        (diagnostic.message.includes('CircularA') || diagnostic.message.includes('CircularB')) && diagnostic.message.includes('circular'),
    );
    assert.notEqual(directCircularError, undefined); // Circular containment should be detected

    // Three-way circular containment
    const threeWayError = result.diagnostics.find(
      (diagnostic) =>
        (diagnostic.message.includes('ThreeWayA') ||
          diagnostic.message.includes('ThreeWayB') ||
          diagnostic.message.includes('ThreeWayC')) &&
        diagnostic.message.includes('circular'),
    );
    assert.notEqual(threeWayError, undefined); // Three-way circular containment should be detected

    // Complex circular patterns
    const complexCircularError = result.diagnostics.find(
      (diagnostic) =>
        (diagnostic.message.includes('ComplexCircle1') || diagnostic.message.includes('ComplexCircle2')) &&
        diagnostic.message.includes('circular'),
    );
    assert.notEqual(complexCircularError, undefined); // Complex circular containment should be detected

    // Valid components should not have errors (but validator flags orphaned entities)
    const validRootError = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message.includes('ValidRoot') && !diagnostic.message.includes('InvalidRoot') && !diagnostic.message.includes('Orphaned'), // Ignore orphaned entity errors
    );
    assert.equal(validRootError, undefined);
  });
});
