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

describe('scenario-24-import-not-found', () => {
  const scenarioFile = 'scenario-24-import-not-found.tmd';

  it('should detect import file not found errors', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = await checkWithImports(parser, content, filePath);

    // Should be invalid due to import file not found
    assert.equal(result.valid, false);

    // Should have exactly 2 errors (1 failed import + 1 orphaned entity)
    assert.equal(result.diagnostics.length, 2);

    // Check for import file not found error
    const importError = result.diagnostics.find((diagnostic) => diagnostic.message.includes('Failed to import'));
    assert.notEqual(importError, undefined);
    assert.match(importError?.message ?? '', /Failed to import '\.\/non-existent-file\.tmd'/);
    assert.match(importError?.message ?? '', /ENOENT: no such file or directory/);
    assert.equal(importError?.span.start.line, 2);
    assert.equal(importError?.span.start.column, 1);
    assert.equal(importError?.severity, 'error');

    // Check for orphaned entity error
    const orphanedError = result.diagnostics.find((diagnostic) => diagnostic.message.includes("Orphaned entity 'main'"));
    assert.notEqual(orphanedError, undefined);
    assert.equal(orphanedError?.span.start.line, 9);
    assert.equal(orphanedError?.span.start.column, 1);
    assert.equal(orphanedError?.severity, 'error');
  });
});
