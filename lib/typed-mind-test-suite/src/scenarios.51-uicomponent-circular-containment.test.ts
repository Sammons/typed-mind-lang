import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 51: UIComponent Circular Containment', () => {
  it('should detect circular UIComponent containment', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-51-uicomponent-circular-containment.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');
    
    const checker = new DSLChecker();
    const result = checker.check(content);
    
    // Should have errors for circular containment
    assert.equal(result.valid, false);
    assert.ok((result.errors.length) > (0));
    
    // Should find orphaned entities
    const orphanedErrors = result.errors.filter(e =>
      e.message.includes('Orphaned entity')
    );
    assert.ok((orphanedErrors.length) > (0));

    // Should find UIComponent containment error
    const containmentError = result.errors.find(e =>
      e.message.includes("UIComponent 'SomeParent' is not contained by any other UIComponent")
    );
    assert.notEqual(containmentError, undefined);
    
    // Self-containing component should error
    const selfContainError = result.errors.find(e =>
      e.message.includes('SelfContainer') &&
      (e.message.includes('itself') || e.message.includes('circular'))
    );
    assert.notEqual(selfContainError, undefined); // Self-containment should be detected
    
    // Direct circular containment (A contains B, B contains A)
    const directCircularError = result.errors.find(e =>
      (e.message.includes('CircularA') || e.message.includes('CircularB')) &&
      e.message.includes('circular')
    );
    assert.notEqual(directCircularError, undefined); // Circular containment should be detected
    
    // Three-way circular containment
    const threeWayError = result.errors.find(e =>
      (e.message.includes('ThreeWayA') ||
       e.message.includes('ThreeWayB') ||
       e.message.includes('ThreeWayC')) &&
      e.message.includes('circular')
    );
    assert.notEqual(threeWayError, undefined); // Three-way circular containment should be detected
    
    // Complex circular patterns
    const complexCircularError = result.errors.find(e =>
      (e.message.includes('ComplexCircle1') ||
       e.message.includes('ComplexCircle2')) &&
      e.message.includes('circular')
    );
    assert.notEqual(complexCircularError, undefined); // Complex circular containment should be detected
    
    // Valid components should not have errors (but validator flags orphaned entities)
    const validRootError = result.errors.find(e =>
      e.message.includes('ValidRoot') &&
      !e.message.includes('InvalidRoot') &&
      !e.message.includes('Orphaned') // Ignore orphaned entity errors
    );
    assert.equal(validRootError, undefined);
  });
});