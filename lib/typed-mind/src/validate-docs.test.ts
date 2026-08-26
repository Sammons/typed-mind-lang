// RFC-TM-7 §1 (rfc-tm-7-diamond.md) — validate-docs rewritten on
// `TypedMind.create()`. The legacy vacuity (this test read
// `parseResult.errors`, but the legacy `ParseResult` carries `parseErrors` —
// the field was always `undefined`, so the parse-error assertion never fired;
// see git history at validate-docs.test.ts:38 pre-rewrite) dies structurally
// here: `check()` returns ONE `diagnostics` stream (parse + semantic), so
// there is no errors-vs-parseErrors split left to typo.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from './typed-mind.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(__dirname, '..', 'grammar', 'grammar.wasm');

describe('Documentation Examples', () => {
  it('should validate all TypedMind examples in grammar.md', async () => {
    const typedMind = await TypedMind.create({ wasmPath });
    const grammarPath = join(__dirname, '..', 'grammar.md');
    const content = readFileSync(grammarPath, 'utf-8');

    // Extract all ```tmd code blocks
    const tmdBlocks = content.match(/```tmd\n([\s\S]*?)```/g) || [];

    assert.ok(tmdBlocks.length > 0);

    tmdBlocks.forEach((block, index) => {
      // Remove the ```tmd and ``` markers
      const code = block.replace(/```tmd\n/, '').replace(/\n```$/, '');

      // Skip blocks that are just fragments or syntax demonstrations (too
      // short to be a complete program, or carrying no Program entity).
      if (code.split('\n').length < 10) return;
      if (!code.includes('->')) return;

      const { valid, diagnostics } = typedMind.check(code);
      const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

      if (!valid) {
        console.error(`\nExample ${index + 1} has diagnostics errors:`);
        console.error('Code:\n', code);
        console.error(
          'Errors:',
          errors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
        );
        assert.equal(errors.length, 0);
      }
    });
  });
});
