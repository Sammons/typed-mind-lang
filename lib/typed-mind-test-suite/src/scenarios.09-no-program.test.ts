import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-09-no-program', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-09-no-program.tmd';

  it('should validate 09 no program', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Should be invalid due to missing program entry point
    assert.equal(result.valid, false);

    // Should have exactly 3 errors (1 no program + 1 orphaned file + 1 orphaned entity)
    assert.equal(result.errors.length, 3);

    // Should have an orphaned file error for MainFile
    const orphanedFileError = result.errors.find((err) => err.message === "Orphaned file 'MainFile' - none of its exports are imported");
    assert.notEqual(orphanedFileError, undefined);
    assert.equal(orphanedFileError?.position.line, 3);
    assert.equal(orphanedFileError?.position.column, 1);
    assert.equal(orphanedFileError?.severity, 'error');
    assert.equal(orphanedFileError?.suggestion, 'Remove this file or import its exports somewhere');

    // Should have an orphaned entity error for doSomething
    const orphanedEntityError = result.errors.find((err) => err.message === "Orphaned entity 'doSomething'");
    assert.notEqual(orphanedEntityError, undefined);
    assert.equal(orphanedEntityError?.position.line, 6);
    assert.equal(orphanedEntityError?.position.column, 1);
    assert.equal(orphanedEntityError?.severity, 'error');
    assert.equal(orphanedEntityError?.suggestion, 'Remove or reference this entity');

    // Should have a no program entry point error
    const noProgramError = result.errors.find((err) => err.message === 'No program entry point defined');
    assert.notEqual(noProgramError, undefined);
    assert.equal(noProgramError?.position.line, 1);
    assert.equal(noProgramError?.position.column, 1);
    assert.equal(noProgramError?.severity, 'error');
    assert.equal(noProgramError?.suggestion, 'Add a Program entity: AppName -> EntryFile');
  });
});
