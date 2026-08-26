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

describe('scenario-21-aliased-import', () => {
  const scenarioFile = 'scenario-21-aliased-import.tmd';

  it('should validate aliased imports and detect validation errors', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = await checkWithImports(parser, content, filePath);

    // Should be invalid due to multiple validation errors
    assert.equal(result.valid, false);

    // RFC-TM-4 §4 A11 (FID-4): legacy's derived-containedBy entries dangle
    // across aliased imports (3 spurious "references unknown parent" errors,
    // scenario-21-aliased-import ×3); the declared-only containedBy port
    // drops them. None of those 3 were asserted by name below, so the
    // remaining assertions (>10, still true after the drop) are unchanged.
    assert.ok(result.diagnostics.length > 10);

    // Check for key orphaned entities
    const orphanedErrors = result.diagnostics.filter((diagnostic) => diagnostic.message.includes('Orphaned entity'));
    assert.ok(orphanedErrors.length > 0);

    // Should have orphaned ComponentsFile and DatabaseFile
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned file 'UI.ComponentsFile'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned file 'DB.DatabaseFile'")),
      true,
    );

    // Check for undefined exports
    const exportErrors = result.diagnostics.filter((diagnostic) => diagnostic.message.includes('is not defined anywhere in the codebase'));
    assert.ok(exportErrors.length > 0);
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Export 'Button' is not defined anywhere in the codebase")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Export 'Form' is not defined anywhere in the codebase")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Export 'Connection' is not defined anywhere in the codebase")),
      true,
    );

    // Check for containment validation errors
    assert.equal(
      result.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("UIComponent 'UI.Input' is not contained by any other UIComponent"),
      ),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("contains unknown component 'Input'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("contains unknown component 'Button'")),
      true,
    );

    // Check for class export errors
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Class 'DB.Connection' is not exported by any file")),
      true,
    );

    // All diagnostics should be severity 'error'
    assert.equal(
      result.diagnostics.every((diagnostic) => diagnostic.severity === 'error'),
      true,
    );
  });
});
