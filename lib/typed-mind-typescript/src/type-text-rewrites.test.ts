// PR #158 review regression tests (comment 22136).
//
// `collapseToSingleLineType` and `parenthesizeTypeQueryText` were unanchored
// regexes that rewrote the CONTENTS of string-literal types. A string-literal
// type's value is its exact characters, so the rewrites changed the type's
// MEANING:
//
//   'E ( bad )'  ->  'E (bad)'      (whitespace-next-to-bracket collapse)
//   'typeof x'   ->  '(typeof x)'   (type-query parenthesization)
//
// Both corrupted forms still PARSE cleanly, so no checker diagnostic catches
// them and no end-to-end fixture would have failed. That is what makes a
// direct unit test at the transform boundary the right check: the contract is
// "structure is rewritten, literal bytes are not," and only these tests can
// state it without a parse result standing in the way.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collapseToSingleLineType, parenthesizeTypeQueryText } from './typescript-to-typedmind-converter.ts';

describe('collapseToSingleLineType — literal preservation', () => {
  it('does not collapse whitespace inside a single-quoted literal', () => {
    // The exact probe case from the review.
    assert.equal(collapseToSingleLineType("'E ( bad )'"), "'E ( bad )'");
  });

  it('does not collapse whitespace inside a double-quoted literal', () => {
    assert.equal(collapseToSingleLineType('"D ( bad )"'), '"D ( bad )"');
  });

  it('does not collapse whitespace inside a backtick literal', () => {
    assert.equal(collapseToSingleLineType('`T ( bad )`'), '`T ( bad )`');
  });

  it('preserves a literal containing `=>`, `|`, and `typeof`', () => {
    const literal = "'a => b | c typeof d'";
    assert.equal(collapseToSingleLineType(literal), literal);
  });

  it('still collapses the structure AROUND a preserved literal', () => {
    // The point of the fix is not to stop collapsing — it is to collapse only
    // structural text. The literal keeps its interior spaces; the multi-line
    // parameter list still becomes one line and loses its dangling comma.
    assert.equal(collapseToSingleLineType("(\n  a: 'E ( bad )',\n  b: string,\n) => void"), "(a: 'E ( bad )', b: string) => void");
  });

  it('collapses normally when no literal is present', () => {
    assert.equal(collapseToSingleLineType('(\n  a: string,\n  b: number,\n) => void'), '(a: string, b: number) => void');
  });

  it('preserves an escaped quote inside a literal', () => {
    assert.equal(collapseToSingleLineType("'a\\'b ( c )'"), "'a\\'b ( c )'");
  });
});

describe('parenthesizeTypeQueryText — literal preservation', () => {
  it('does not parenthesize `typeof` inside a single-quoted literal', () => {
    // The exact probe case from the review.
    assert.equal(parenthesizeTypeQueryText("'typeof x'"), "'typeof x'");
  });

  it('does not parenthesize `typeof` inside a double-quoted literal', () => {
    assert.equal(parenthesizeTypeQueryText('"typeof x"'), '"typeof x"');
  });

  it('preserves a literal containing `=>`, `|`, and `typeof`', () => {
    const literal = "'a => b | c typeof d'";
    assert.equal(parenthesizeTypeQueryText(literal), literal);
  });

  it('still parenthesizes a structural type query alongside a literal', () => {
    assert.equal(parenthesizeTypeQueryText("'typeof x' | typeof y"), "'typeof x' | (typeof y)");
  });

  it('parenthesizes normally when no literal is present', () => {
    assert.equal(parenthesizeTypeQueryText('typeof fetch'), '(typeof fetch)');
  });

  it('stays idempotent on an already-parenthesized query', () => {
    assert.equal(parenthesizeTypeQueryText('(typeof CHECK_CODES)[number]'), '(typeof CHECK_CODES)[number]');
  });
});
