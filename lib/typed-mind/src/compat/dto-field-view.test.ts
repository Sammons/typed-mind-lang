// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — construction-site test for the
// DtoFieldView compat accessor: `optional` mirrors `isOptional` across all
// three `optionalityMarker` variants.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DtoFieldNode } from '../ast/dto-field-node.ts';
import { toDtoFieldView } from './dto-field-view.ts';

describe('toDtoFieldView', () => {
  it('exposes the legacy-named optional accessor for each optionalityMarker variant', () => {
    const span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
    const none = toDtoFieldView(new DtoFieldNode({ name: 'id', type: 'string', optionalityMarker: 'none', span }));
    const question = toDtoFieldView(new DtoFieldNode({ name: 'nickname', type: 'string', optionalityMarker: 'question', span }));
    const parenthesized = toDtoFieldView(new DtoFieldNode({ name: 'bio', type: 'string', optionalityMarker: 'parenthesized', span }));

    assert.equal(none.optional, false);
    assert.equal(question.optional, true);
    assert.equal(parenthesized.optional, true);
    // The underlying node's own fields still read through the view.
    assert.equal(question.name, 'nickname');
    assert.equal(question.isOptional, true);
  });
});
