// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — construction-site test for the
// EntityView compat accessor: `type` mirrors `kind`, `position` mirrors
// `span.start`, and the underlying node's own fields still read through.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FileNode } from '../ast/file-node.ts';
import { toEntityView } from './entity-view.ts';

describe('toEntityView', () => {
  it('exposes legacy-named type/position accessors over a real EntityNode', () => {
    const span = { start: { line: 3, column: 1 }, end: { line: 3, column: 10 } };
    const node = new FileNode({
      name: 'Main',
      span,
      raw: 'Main @ src/main.ts:',
      sourceForm: 'shortform',
      path: 'src/main.ts',
      imports: ['Foo'],
      exports: ['Bar'],
    });

    const view = toEntityView(node);

    assert.equal(view.type, 'File');
    assert.deepEqual(view.position, { line: 3, column: 1 });
    // The underlying node's own fields still read through the view.
    assert.equal(view.path, 'src/main.ts');
    assert.deepEqual(view.imports, ['Foo']);
    assert.equal(view.kind, 'File');
    assert.deepEqual(view.span, span);
  });
});
