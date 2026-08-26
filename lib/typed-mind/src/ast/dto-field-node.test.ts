// RFC-TM-3 §5 Q2 — the named optionalityMarker fixture (rfc-tm-3-diamond.md
// §2.2 footnote). Distinguishes the three source spellings the legacy parser
// collapsed into one boolean at parser.ts:584
// (`optional: match[2] === '?' || match[5]?.includes('optional') || false`):
//   - `- password?: string`              → 'question'
//   - `- email: string (optional)`       → 'parenthesized'
//   - `- id: string`                     → 'none'
// The 'question' variant is produced by the CST→AST layer's anonymous-token
// walk in Q3 (doc §1); these are the construction-site assertions for the
// discriminant and its derived isOptional view.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DtoFieldNode } from './dto-field-node.ts';
import type { Span } from './span.ts';

const span = (line: number, startColumn: number, endColumn: number): Span => ({
  start: { line, column: startColumn },
  end: { line, column: endColumn },
});

describe('DtoFieldNode optionalityMarker discriminant', () => {
  it('distinguishes question vs parenthesized vs none where parser.ts:584 collapsed them', () => {
    const questionField = new DtoFieldNode({
      name: 'password',
      type: 'string',
      optionalityMarker: 'question',
      span: span(3, 3, 21),
    });
    const parenthesizedField = new DtoFieldNode({
      name: 'email',
      type: 'string',
      optionalityMarker: 'parenthesized',
      description: 'Email address',
      span: span(4, 3, 45),
    });
    const plainField = new DtoFieldNode({
      name: 'id',
      type: 'string',
      optionalityMarker: 'none',
      span: span(5, 3, 15),
    });
    assert.deepEqual(
      {
        question: { marker: questionField.optionalityMarker, isOptional: questionField.isOptional },
        parenthesized: { marker: parenthesizedField.optionalityMarker, isOptional: parenthesizedField.isOptional },
        none: { marker: plainField.optionalityMarker, isOptional: plainField.isOptional },
        // The discriminant is what the legacy boolean could not express:
        // question and parenthesized are distinct parse products.
        markersAreDistinct: questionField.optionalityMarker !== parenthesizedField.optionalityMarker,
      },
      {
        question: { marker: 'question', isOptional: true },
        parenthesized: { marker: 'parenthesized', isOptional: true },
        none: { marker: 'none', isOptional: false },
        markersAreDistinct: true,
      },
    );
  });

  it('constructs the full field bag with span and description', () => {
    const field = new DtoFieldNode({
      name: 'createdAt',
      type: 'Date',
      optionalityMarker: 'none',
      description: 'Creation timestamp',
      span: span(6, 3, 40),
    });
    assert.deepEqual(
      { ...field },
      {
        name: 'createdAt',
        type: 'Date',
        optionalityMarker: 'none',
        description: 'Creation timestamp',
        span: span(6, 3, 40),
      },
    );
  });
});
