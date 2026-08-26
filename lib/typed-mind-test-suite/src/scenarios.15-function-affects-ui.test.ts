import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-15-function-affects-ui', () => {
  const scenarioFile = 'scenario-15-function-affects-ui.tmd';

  it('should validate function affects UI relationships', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to multiple validation errors
    assert.equal(result.valid, false);

    // Should have exactly 11 errors (including orphaned entities)
    assert.equal(result.diagnostics.length, 11);

    // Check for invalid 'calls' to UIComponent error
    const invalidCallsDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Cannot use 'calls' to reference UIComponent 'TodoList'" &&
        diagnostic.span.start.line === 14 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(invalidCallsDiagnostic, undefined);
    assert.equal(invalidCallsDiagnostic?.severity, 'error');

    // Check for invalid 'affects' to Function error
    const invalidAffectsDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Cannot use 'affects' to reference Function 'updateTodoList'" &&
        diagnostic.span.start.line === 26 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(invalidAffectsDiagnostic, undefined);
    assert.equal(invalidAffectsDiagnostic?.severity, 'error');

    // Check for orphaned refreshUI entity error
    const orphanedRefreshUIDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Orphaned entity 'refreshUI'" && diagnostic.span.start.line === 22 && diagnostic.span.start.column === 1,
    );
    assert.notEqual(orphanedRefreshUIDiagnostic, undefined);
    assert.equal(orphanedRefreshUIDiagnostic?.severity, 'error');

    // Check for orphaned invalidAffect entity error
    const orphanedInvalidAffectDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Orphaned entity 'invalidAffect'" && diagnostic.span.start.line === 26 && diagnostic.span.start.column === 1,
    );
    assert.notEqual(orphanedInvalidAffectDiagnostic, undefined);
    assert.equal(orphanedInvalidAffectDiagnostic?.severity, 'error');

    // Check for refreshUI not exported error
    const refreshUINotExportedDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Function 'refreshUI' is not exported by any file and is not a class method" &&
        diagnostic.span.start.line === 22 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(refreshUINotExportedDiagnostic, undefined);
    assert.equal(refreshUINotExportedDiagnostic?.severity, 'error');

    // Check for invalidAffect not exported error
    const invalidAffectNotExportedDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Function 'invalidAffect' is not exported by any file and is not a class method" &&
        diagnostic.span.start.line === 26 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(invalidAffectNotExportedDiagnostic, undefined);
    assert.equal(invalidAffectNotExportedDiagnostic?.severity, 'error');

    // Check for refreshUI affects unknown component error
    const refreshUIUnknownComponentDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Function 'refreshUI' affects unknown component 'NonExistentComponent'" &&
        diagnostic.span.start.line === 22 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(refreshUIUnknownComponentDiagnostic, undefined);
    assert.equal(refreshUIUnknownComponentDiagnostic?.severity, 'error');

    // Check for invalidAffect cannot affect Function error
    const invalidAffectCannotAffectDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "Function 'invalidAffect' cannot affect 'updateTodoList' (it's a Function)" &&
        diagnostic.span.start.line === 26 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(invalidAffectCannotAffectDiagnostic, undefined);
    assert.equal(invalidAffectCannotAffectDiagnostic?.severity, 'error');

    // Check for TodoList not contained error
    const todoListNotContainedDiagnostic = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.message === "UIComponent 'TodoList' is not contained by any other UIComponent" &&
        diagnostic.span.start.line === 7 &&
        diagnostic.span.start.column === 1,
    );
    assert.notEqual(todoListNotContainedDiagnostic, undefined);
    assert.equal(todoListNotContainedDiagnostic?.severity, 'error');

    // All diagnostics should be of severity 'error'
    assert.equal(
      result.diagnostics.every((diagnostic) => diagnostic.severity === 'error'),
      true,
    );
  });
});
