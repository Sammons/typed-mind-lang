// Unit tests for the literal-aware segmenter that backs the converter's type
// text rewrites. PR #158 review (comment 22136) found both rewrites were
// unanchored regexes that corrupted string-literal types; these tests pin the
// preservation contract directly, below the converter, so a future rewrite
// cannot regress it silently.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapStructuralSegments, segmentTypeText, stripComments } from './type-text-segments.ts';

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

// PR #165 review (comment 22273). The scanner originally knew only about
// quotes, so whichever of a comment or a quote appeared first was irrelevant —
// quotes always won. That is wrong in both directions, and the JSDoc-backtick
// case is what made fixture 101 fail: a backtick inside a doc comment opened a
// template span that swallowed the comment's `*/`.
describe('segmentTypeText — comments are spans, decided against quotes by which opens first', () => {
  it('treats a backtick inside a JSDoc block as comment text, not a template opener', () => {
    // The regression case. Pre-fix the backtick opened a literal span that ran
    // past `*/`, so the comment never terminated and a caller stripping
    // comments left it in place.
    const text = '{ a: string } | /** calls `apply` here */ { b: number }';
    assert.deepEqual(segmentTypeText(text), [
      { text: '{ a: string } | ', isLiteral: false },
      { text: '/** calls `apply` here */', isLiteral: true },
      { text: ' { b: number }', isLiteral: false },
    ]);
  });

  it('treats a `//` inside a string literal as literal content, not a comment', () => {
    assert.deepEqual(segmentTypeText("'https://example.com/path' | B"), [
      { text: "'https://example.com/path'", isLiteral: true },
      { text: ' | B', isLiteral: false },
    ]);
  });

  it('treats a `/*` inside a template literal as literal content, not a comment', () => {
    assert.deepEqual(segmentTypeText('`a/*not a comment*/b` | C'), [
      { text: '`a/*not a comment*/b`', isLiteral: true },
      { text: ' | C', isLiteral: false },
    ]);
  });

  it('leaves the newline that terminates a line comment structural', () => {
    // The newline still has to separate the tokens around it once the comment
    // itself is removed.
    assert.deepEqual(segmentTypeText('A // trailing\n| B'), [
      { text: 'A ', isLiteral: false },
      { text: '// trailing', isLiteral: true },
      { text: '\n| B', isLiteral: false },
    ]);
  });

  it('consumes an unterminated block comment to end of text', () => {
    assert.deepEqual(segmentTypeText('A | /* never closed'), [
      { text: 'A | ', isLiteral: false },
      { text: '/* never closed', isLiteral: true },
    ]);
  });

  it('does not treat a quote inside a line comment as a literal opener', () => {
    assert.deepEqual(segmentTypeText("A // it's fine\n| B"), [
      { text: 'A ', isLiteral: false },
      { text: "// it's fine", isLiteral: true },
      { text: '\n| B', isLiteral: false },
    ]);
  });
});

describe('stripComments', () => {
  it('removes a JSDoc block containing a backtick', () => {
    assert.equal(stripComments('{ a: 1 } | /** uses `apply` */ { b: 2 }'), '{ a: 1 } |   { b: 2 }');
  });

  it('preserves a URL inside a string literal byte-for-byte', () => {
    // The literal-blindness bug this replaces truncated it to `'https:`.
    const text = "'https://example.com/path' | B";
    assert.equal(stripComments(text), text);
  });

  it('preserves a `/*` sequence inside a template literal byte-for-byte', () => {
    // The literal-blindness bug this replaces rewrote it to '`a b` | C'.
    const text = '`a/*not a comment*/b` | C';
    assert.equal(stripComments(text), text);
  });

  it('replaces a line comment with a newline so surrounding tokens stay apart', () => {
    assert.equal(stripComments('A // note\n| B'), 'A \n\n| B');
  });

  it('leaves comment-free text untouched', () => {
    const text = `'a' | "b" | \`c\` | D`;
    assert.equal(stripComments(text), text);
  });
});
