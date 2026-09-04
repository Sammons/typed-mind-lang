// Unit tests for the literal-aware segmenter that backs the converter's type
// text rewrites. PR #158 review (comment 22136) found both rewrites were
// unanchored regexes that corrupted string-literal types; these tests pin the
// preservation contract directly, below the converter, so a future rewrite
// cannot regress it silently.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapStructuralSegments, segmentTypeText } from './type-text-segments.ts';

const upper = (segment: string): string => segment.toUpperCase();

describe('segmentTypeText', () => {
  it('returns one structural segment when there is no literal', () => {
    assert.deepEqual(segmentTypeText('(a: string) => void'), [{ text: '(a: string) => void', isLiteral: false }]);
  });

  it('splits a single-quoted literal out of the surrounding structure', () => {
    assert.deepEqual(segmentTypeText("A | 'lit' | B"), [
      { text: 'A | ', isLiteral: false },
      { text: "'lit'", isLiteral: true },
      { text: ' | B', isLiteral: false },
    ]);
  });

  it('handles double-quoted and backtick-quoted spans', () => {
    assert.deepEqual(segmentTypeText('"d" | `t`'), [
      { text: '"d"', isLiteral: true },
      { text: ' | ', isLiteral: false },
      { text: '`t`', isLiteral: true },
    ]);
  });

  it('treats a backslash-escaped quote as literal content, not a terminator', () => {
    assert.deepEqual(segmentTypeText("'a\\'b' | C"), [
      { text: "'a\\'b'", isLiteral: true },
      { text: ' | C', isLiteral: false },
    ]);
  });

  it('consumes an unterminated quote to end of text', () => {
    // Conservative by design: over-copying can only leave text unchanged,
    // while under-copying would resume rewriting inside a literal.
    assert.deepEqual(segmentTypeText("A | 'unterminated"), [
      { text: 'A | ', isLiteral: false },
      { text: "'unterminated", isLiteral: true },
    ]);
  });

  it('does not treat a quote inside a differently-quoted span as a terminator', () => {
    assert.deepEqual(segmentTypeText(`"it's" | B`), [
      { text: `"it's"`, isLiteral: true },
      { text: ' | B', isLiteral: false },
    ]);
  });
});

describe('mapStructuralSegments', () => {
  it('applies the transform when there is no literal', () => {
    assert.equal(mapStructuralSegments('a | b', upper), 'A | B');
  });

  it('leaves literal spans untouched while transforming around them', () => {
    assert.equal(mapStructuralSegments("a | 'keep me' | b", upper), "A | 'keep me' | B");
  });

  it('round-trips text unchanged under an identity transform', () => {
    const text = `'a' | "b" | \`c\` | D`;
    assert.equal(
      mapStructuralSegments(text, (segment) => segment),
      text,
    );
  });
});
