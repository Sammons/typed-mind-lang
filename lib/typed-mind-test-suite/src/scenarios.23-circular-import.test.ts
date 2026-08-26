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

describe('scenario-23-circular-import', () => {
  const scenarioFile = 'scenario-23-circular-import.tmd';

  it('should detect circular import errors', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = await checkWithImports(parser, content, filePath);

    // Should be invalid due to circular import and orphaned entities
    assert.equal(result.valid, false);

    // Should have exactly 2 errors (1 orphaned entity + 1 circular import)
    assert.equal(result.diagnostics.length, 2);

    // Check for circular import error
    const circularImportError = result.diagnostics.find((diagnostic) => diagnostic.message.includes('Circular import detected'));
    assert.notEqual(circularImportError, undefined);
    assert.equal(circularImportError?.span.start.line, 2);
    assert.equal(circularImportError?.span.start.column, 1);
    assert.equal(circularImportError?.severity, 'error');
    assert.match(circularImportError?.message ?? '', /module-a\.tmd -> .*module-b\.tmd -> .*module-a\.tmd/);

    // Check for start orphaned entity error
    const startError = result.diagnostics.find((diagnostic) => diagnostic.message.includes("Orphaned entity 'start'"));
    assert.notEqual(startError, undefined);
    assert.equal(startError?.span.start.line, 10);
    assert.equal(startError?.span.start.column, 1);
    assert.equal(startError?.severity, 'error');
  });
});
