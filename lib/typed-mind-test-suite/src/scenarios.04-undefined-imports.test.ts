import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-04-undefined-imports', () => {
  const scenarioFile = 'scenario-04-undefined-imports.tmd';

  it('should detect undefined imports and report errors', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Validation should fail due to undefined imports
    assert.equal(result.valid, false);

    // Should have exactly 4 errors (3 undefined imports + 1 orphaned file)
    assert.equal(result.diagnostics.length, 4);

    // Check for orphaned file error
    const orphanedFileDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message.includes("Orphaned file 'ServiceA'"));
    assert.notEqual(orphanedFileDiagnostic, undefined);
    assert.equal(orphanedFileDiagnostic?.span.start.line, 8);
    assert.equal(orphanedFileDiagnostic?.span.start.column, 1);

    // Check import errors (order may vary, so find them instead of assuming position)
    const nonExistentDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Import 'NonExistentService' not found");
    assert.notEqual(nonExistentDiagnostic, undefined);
    assert.equal(nonExistentDiagnostic?.span.start.line, 3);

    const missingModuleDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Import 'MissingModule' not found");
    assert.notEqual(missingModuleDiagnostic, undefined);
    assert.equal(missingModuleDiagnostic?.span.start.line, 3);

    const undefinedEntityDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Import 'UndefinedEntity' not found");
    assert.notEqual(undefinedEntityDiagnostic, undefined);
    assert.equal(undefinedEntityDiagnostic?.span.start.line, 8);

    // Verify all diagnostics are about undefined imports
    const importDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.message.includes('not found'));
    assert.equal(importDiagnostics.length, 3);

    // Verify the specific undefined entity names are mentioned
    const diagnosticMessages = result.diagnostics.map((diagnostic) => diagnostic.message);
    assert.ok(diagnosticMessages.includes("Import 'NonExistentService' not found"));
    assert.ok(diagnosticMessages.includes("Import 'MissingModule' not found"));
    assert.ok(diagnosticMessages.includes("Import 'UndefinedEntity' not found"));
  });
});
