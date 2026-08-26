import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-09-no-program', () => {
  const scenarioFile = 'scenario-09-no-program.tmd';

  it('should validate 09 no program', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to missing program entry point
    assert.equal(result.valid, false);

    // Should have exactly 3 errors (1 no program + 1 orphaned file + 1 orphaned entity)
    assert.equal(result.diagnostics.length, 3);

    // Should have an orphaned file error for MainFile
    const orphanedFileDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned file 'MainFile' - none of its exports are imported",
    );
    assert.notEqual(orphanedFileDiagnostic, undefined);
    assert.equal(orphanedFileDiagnostic?.span.start.line, 3);
    assert.equal(orphanedFileDiagnostic?.span.start.column, 1);
    assert.equal(orphanedFileDiagnostic?.severity, 'error');

    // Should have an orphaned entity error for doSomething
    const orphanedEntityDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'doSomething'");
    assert.notEqual(orphanedEntityDiagnostic, undefined);
    assert.equal(orphanedEntityDiagnostic?.span.start.line, 6);
    assert.equal(orphanedEntityDiagnostic?.span.start.column, 1);
    assert.equal(orphanedEntityDiagnostic?.severity, 'error');

    // Should have a no program entry point error
    const noProgramDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === 'No program entry point defined');
    assert.notEqual(noProgramDiagnostic, undefined);
    assert.equal(noProgramDiagnostic?.span.start.line, 1);
    assert.equal(noProgramDiagnostic?.span.start.column, 1);
    assert.equal(noProgramDiagnostic?.severity, 'error');
  });
});
