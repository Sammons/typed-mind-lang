import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Package exports', () => {
  it('should re-export DSLChecker from @sammons/typed-mind', async () => {
    const exports = await import('./index.ts');

    assert.notEqual(exports.DSLChecker, undefined);
    assert.equal(typeof exports.DSLChecker, 'function');
  });

  it('should re-export TypedMindRenderer from @sammons/typed-mind-renderer', async () => {
    const exports = await import('./index.ts');

    assert.notEqual(exports.TypedMindRenderer, undefined);
    assert.equal(typeof exports.TypedMindRenderer, 'function');
  });

  it('should have all expected exports', async () => {
    const exports = await import('./index.ts');

    // Check that we have the main exports we expect
    assert.notEqual(exports.DSLChecker, undefined);
    assert.notEqual(exports.TypedMindRenderer, undefined);

    // These exports should be constructor functions/classes
    assert.equal(typeof exports.DSLChecker, 'function');
    assert.equal(typeof exports.TypedMindRenderer, 'function');
  });

  it('should support both named and namespace imports', async () => {
    // Test named imports
    const { DSLChecker, TypedMindRenderer } = await import('./index.ts');
    assert.notEqual(DSLChecker, undefined);
    assert.notEqual(TypedMindRenderer, undefined);

    // Test namespace import
    const allExports = await import('./index.ts');
    assert.notEqual(allExports.DSLChecker, undefined);
    assert.notEqual(allExports.TypedMindRenderer, undefined);
  });
});
