import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-44-classfile-mixed-entities', () => {
  const scenarioFile = 'scenario-44-classfile-mixed-entities.tmd';

  it('should handle mixed ClassFile and regular entities correctly', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // The scenario should be invalid due to multiple validation errors
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 8); // More errors than expected

    // Should find error for BaseController being orphaned
    const baseControllerOrphanedError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('BaseController') && diagnostic.message.includes('Orphaned entity'),
    );
    assert.notEqual(baseControllerOrphanedError, undefined);
    assert.equal(baseControllerOrphanedError?.severity, 'error');

    // Should find error for BaseController not being exported from a File
    const baseControllerNotExportedError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('BaseController') && diagnostic.message.includes('is not exported by any file'),
    );
    assert.notEqual(baseControllerNotExportedError, undefined);
    assert.equal(baseControllerNotExportedError?.severity, 'error');

    // Should find errors for invalid calls to ClassFile methods
    const userControllerCallError = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("Cannot use 'calls' to reference ClassFile 'UserController'"),
    );
    assert.notEqual(userControllerCallError, undefined);
    assert.equal(userControllerCallError?.severity, 'error');

    const userRepositoryCallError = result.diagnostics.find((diagnostic) =>
      diagnostic.message.includes("Cannot use 'calls' to reference ClassFile 'UserRepository'"),
    );
    assert.notEqual(userRepositoryCallError, undefined);
    assert.equal(userRepositoryCallError?.severity, 'error');

    // Should find error for DataProcessor not being exported
    const dataProcessorError = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('DataProcessor') && diagnostic.message.includes('is not exported by any file'),
    );
    assert.notEqual(dataProcessorError, undefined);
    assert.equal(dataProcessorError?.severity, 'error');
  });
});
