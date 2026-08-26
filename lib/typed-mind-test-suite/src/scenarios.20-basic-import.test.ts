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

describe('scenario-20-basic-import', () => {
  const scenarioFile = 'scenario-20-basic-import.tmd';

  it('should validate basic import functionality', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = await checkWithImports(parser, content, filePath);

    // Should be invalid due to orphaned entity
    assert.equal(result.valid, false);

    // Should have exactly 2 errors for orphaned entities
    assert.equal(result.diagnostics.length, 2);

    // Check for orphaned entities
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'startApp'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'validateUser'")),
      true,
    );
  });
});
