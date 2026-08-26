import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-14-uicomponent-validation', () => {
  const scenarioFile = 'scenario-14-uicomponent-validation.tmd';

  it('should validate UIComponent entities and their structure', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to orphaned entities and missing containment
    assert.equal(result.valid, false);

    // Should have exactly 5 errors (including orphaned entity)
    assert.equal(result.diagnostics.length, 5);

    // Check for orphaned ComponentsFile error
    const orphanedComponentsFileDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Orphaned file 'ComponentsFile' - none of its exports are imported" &&
        diagnostic.span.start.line === 6 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(orphanedComponentsFileDiagnostic, undefined);
    assert.equal(orphanedComponentsFileDiagnostic?.severity, 'error');

    // Check for orphaned UnexportedComponent error
    const orphanedUnexportedComponentDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Orphaned entity 'UnexportedComponent'" &&
        diagnostic.span.start.line === 36 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(orphanedUnexportedComponentDiagnostic, undefined);
    assert.equal(orphanedUnexportedComponentDiagnostic?.severity, 'error');

    // Check for App component not contained error
    const appNotContainedDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "UIComponent 'App' is not contained by any other UIComponent" &&
        diagnostic.span.start.line === 10 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(appNotContainedDiagnostic, undefined);
    assert.equal(appNotContainedDiagnostic?.severity, 'error');

    // Check for UnexportedComponent not contained error
    const unexportedNotContainedDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "UIComponent 'UnexportedComponent' is not contained by any other UIComponent" &&
        diagnostic.span.start.line === 36 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(unexportedNotContainedDiagnostic, undefined);
    assert.equal(unexportedNotContainedDiagnostic?.severity, 'error');

    // All diagnostics should be of severity 'error'
    assert.equal(
      result.diagnostics.every((diagnostic) => diagnostic.severity === 'error'),
      true,
    );
  });
});
