import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { checkWithImports } from './typed-mind-with-imports.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-25-import-duplicate-names', () => {
  const scenarioFile = 'scenario-25-import-duplicate-names.tmd';

  it('should validate import duplicate names', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = await checkWithImports(parser, content, filePath);

    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 4);

    // Should detect orphaned initialize
    const initializeOrphanError = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'initialize'");
    assert.notEqual(initializeOrphanError, undefined);
    assert.equal(initializeOrphanError?.span.start.line, 11);
    assert.equal(initializeOrphanError?.severity, 'error');

    // Should detect orphaned validateUser
    const validateUserOrphanError = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'validateUser'");
    assert.notEqual(validateUserOrphanError, undefined);
    assert.equal(validateUserOrphanError?.span.start.line, 8);

    // Should detect AuthService exported by multiple files
    const multipleExportsError = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Entity 'AuthService' is exported by multiple files: AuthFile, AuthDuplicateFile",
    );
    assert.notEqual(multipleExportsError, undefined);
    assert.equal(multipleExportsError?.severity, 'error');

    // Should detect duplicate entity name from import. The new-surface message
    // folds the legacy suggestion text in (Diagnostic carries message only, no
    // separate `.suggestion` field; harness N1 normalization note,
    // shadow-verdict-harness.mjs).
    const duplicateNameError = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Duplicate entity name 'AuthService' from import; use an alias to avoid naming conflicts",
    );
    assert.notEqual(duplicateNameError, undefined);
    assert.equal(duplicateNameError?.span.start.line, 3);
  });
});
