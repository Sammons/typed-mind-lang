import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-19-uicomponent-containment', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-19-uicomponent-containment.tmd';

  it('should validate UIComponent containment rules', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    
    // Should be invalid due to containment errors and orphaned entities
    assert.equal(result.valid, false);

    // Should have exactly 6 errors (4 orphaned + 2 containment)
    assert.equal((result.errors).length, 6);

    // Check for orphaned entity errors
    const errorMessages = result.errors.map(err => err.message);
    assert.ok((errorMessages).includes("Orphaned entity 'RootApp'"));
    assert.ok((errorMessages).includes("Orphaned entity 'Sidebar'"));
    assert.ok((errorMessages).includes("Orphaned entity 'OrphanedComponent'"));
    assert.ok((errorMessages).includes("Orphaned entity 'AnotherRootApp'"));

    // Check for Sidebar containment error
    const sidebarError = result.errors.find(err =>
      err.message.includes("UIComponent 'Sidebar' is not contained by any other UIComponent")
    );
    assert.notEqual(sidebarError, undefined);
    assert.equal(sidebarError?.position.line, 12);
    assert.equal(sidebarError?.position.column, 1);
    assert.equal(sidebarError?.severity, 'error');
    assert.equal(sidebarError?.suggestion, "Either add 'Sidebar' to another UIComponent's contains list, or mark it as a root component with &!");

    // Check for OrphanedComponent containment error
    const orphanedError = result.errors.find(err =>
      err.message.includes("UIComponent 'OrphanedComponent' is not contained by any other UIComponent")
    );
    assert.notEqual(orphanedError, undefined);
    assert.equal(orphanedError?.position.line, 20);
    assert.equal(orphanedError?.position.column, 1);
    assert.equal(orphanedError?.severity, 'error');
    assert.equal(orphanedError?.suggestion, "Either add 'OrphanedComponent' to another UIComponent's contains list, or mark it as a root component with &!");
  });
});