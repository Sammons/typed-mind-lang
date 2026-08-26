import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-19-uicomponent-containment', () => {
  const scenarioFile = 'scenario-19-uicomponent-containment.tmd';

  it('should validate UIComponent containment rules', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to containment errors and orphaned entities
    assert.equal(result.valid, false);

    // Should have exactly 6 errors (4 orphaned + 2 containment)
    assert.equal(result.diagnostics.length, 6);

    // Check for orphaned entity errors
    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);
    assert.ok(diagnosticMessages.includes("Orphaned entity 'RootApp'"));
    assert.ok(diagnosticMessages.includes("Orphaned entity 'Sidebar'"));
    assert.ok(diagnosticMessages.includes("Orphaned entity 'OrphanedComponent'"));
    assert.ok(diagnosticMessages.includes("Orphaned entity 'AnotherRootApp'"));

    // Check for Sidebar containment error
    const sidebarDiagnostic = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("UIComponent 'Sidebar' is not contained by any other UIComponent"),
    );
    assert.notEqual(sidebarDiagnostic, undefined);
    assert.equal(sidebarDiagnostic?.span.start.line, 12);
    assert.equal(sidebarDiagnostic?.span.start.column, 1);
    assert.equal(sidebarDiagnostic?.severity, 'error');

    // Check for OrphanedComponent containment error
    const orphanedDiagnostic = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("UIComponent 'OrphanedComponent' is not contained by any other UIComponent"),
    );
    assert.notEqual(orphanedDiagnostic, undefined);
    assert.equal(orphanedDiagnostic?.span.start.line, 20);
    assert.equal(orphanedDiagnostic?.span.start.column, 1);
    assert.equal(orphanedDiagnostic?.severity, 'error');
  });
});
