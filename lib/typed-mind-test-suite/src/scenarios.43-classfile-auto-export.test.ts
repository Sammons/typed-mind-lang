import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-43-classfile-auto-export', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-43-classfile-auto-export.tmd';

  it('should validate that ClassFile entities are automatically exported', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // The scenario should be invalid due to the regular class without export
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 4); // More errors than expected

    // Should find error for RegularClass being orphaned
    const orphanedError = result.errors.find((err) => err.message.includes('RegularClass') && err.message.includes('Orphaned entity'));
    assert.notEqual(orphanedError, undefined);
    assert.equal(orphanedError?.severity, 'error');
    assert.equal(orphanedError?.position.line, 31); // Line where RegularClass is defined

    // Should find error for RegularClass not being exported
    const notExportedError = result.errors.find(
      (err) => err.message.includes('RegularClass') && err.message.includes('is not exported by any file'),
    );
    assert.notEqual(notExportedError, undefined);
    assert.equal(notExportedError?.severity, 'error');
    assert.equal(notExportedError?.position.line, 31); // Line where RegularClass is defined

    // Should not have errors for ClassFile entities (they auto-export)
    const classFileErrors = result.errors.filter(
      (err) =>
        err.message.includes('UserController') || err.message.includes('ProductController') || err.message.includes('BaseController'),
    );
    assert.ok(classFileErrors.length > 0);
  });
});
