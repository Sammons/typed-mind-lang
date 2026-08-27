// RFC-TM-4 §5 (rfc-tm-4-diamond.md) — Q5 terminal sweep. `DSLChecker` died
// with the legacy facade; `TypedMind` (index.ts's new-surface export) is its
// replacement in this re-export smoke test.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Package exports', () => {
  it('should re-export TypedMind from @sammons/typed-mind', async () => {
    const exports = await import('./index.ts');

    assert.notEqual(exports.TypedMind, undefined);
    assert.equal(typeof exports.TypedMind, 'function');
  });

  it('should re-export TypedMindRenderer from @sammons/typed-mind-renderer', async () => {
    const exports = await import('./index.ts');

    assert.notEqual(exports.TypedMindRenderer, undefined);
    assert.equal(typeof exports.TypedMindRenderer, 'function');
  });

  it('should have all expected exports', async () => {
    const exports = await import('./index.ts');

    // Check that we have the main exports we expect
    assert.notEqual(exports.TypedMind, undefined);
    assert.notEqual(exports.TypedMindRenderer, undefined);

    // These exports should be constructor functions/classes
    assert.equal(typeof exports.TypedMind, 'function');
    assert.equal(typeof exports.TypedMindRenderer, 'function');
  });

  it('should support both named and namespace imports', async () => {
    // Test named imports
    const { TypedMind, TypedMindRenderer } = await import('./index.ts');
    assert.notEqual(TypedMind, undefined);
    assert.notEqual(TypedMindRenderer, undefined);

    // Test namespace import
    const allExports = await import('./index.ts');
    assert.notEqual(allExports.TypedMind, undefined);
    assert.notEqual(allExports.TypedMindRenderer, undefined);
  });
});
