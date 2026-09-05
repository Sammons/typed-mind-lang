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

describe('scenario-22-nested-import', () => {
  const scenarioFile = 'scenario-22-nested-import.tmd';

  it('should validate nested imports and detect orphaned entities', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = await checkWithImports(parser, content, filePath);

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);

    // B1: User is referenced by a function signature; main and query remain orphaned.
    assert.equal(result.diagnostics.length, 2);

    // Check for actual orphaned entity errors
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'main'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'User'")),
      false,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'query'")),
      true,
    );
  });
});
