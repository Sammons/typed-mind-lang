import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-43-classfile-auto-export', () => {
  const scenarioFile = 'scenario-43-classfile-auto-export.tmd';

  it('should validate that ClassFile entities are automatically exported', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // The scenario should be invalid due to the regular class without export
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 4); // More errors than expected

    // Should find error for RegularClass being orphaned
    const orphanedError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('RegularClass') && diagnostic.message.includes('Orphaned entity'),
    );
    assert.notEqual(orphanedError, undefined);
    assert.equal(orphanedError?.severity, 'error');
    assert.equal(orphanedError?.span.start.line, 31); // Line where RegularClass is defined

    // Should find error for RegularClass not being exported
    const notExportedError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('RegularClass') && diagnostic.message.includes('is not exported by any file'),
    );
    assert.notEqual(notExportedError, undefined);
    assert.equal(notExportedError?.severity, 'error');
    assert.equal(notExportedError?.span.start.line, 31); // Line where RegularClass is defined

    // Should not have errors for ClassFile entities (they auto-export)
    const classFileErrors = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.message.includes('UserController') ||
        diagnostic.message.includes('ProductController') ||
        diagnostic.message.includes('BaseController'),
    );
    assert.ok(classFileErrors.length > 0);
  });
});
