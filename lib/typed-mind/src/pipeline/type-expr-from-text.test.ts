// RFC-TM-8 §1 (rfc-tm-8-diamond.md, X-TYPE-1) — direct unit coverage for the
// hand-rolled recursive-descent parser two call sites reuse: the longform
// `type:` quoted-string value, and type_readonly_array's parenthesized
// element (readonly_paren_rest is a flat, non-recursive CST token). Asserts
// on real structure and on base-offset span computation, not counts.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTypeExprText } from './type-expr-from-text.ts';

describe('parseTypeExprText: the shared string-based type-expression parser', () => {
  it('parses a bare named type with default (1,1) base offset', () => {
    const result = parseTypeExprText('UserRole');
    assert.deepEqual(result, {
      typeExpr: { kind: 'named', name: 'UserRole', span: { start: { line: 1, column: 1 }, end: { line: 1, column: 9 } } },
      remainder: '',
    });
  });

  it('parses an array suffix and records the spelling', () => {
    const result = parseTypeExprText('string[]');
    assert.deepEqual(result.typeExpr, {
      kind: 'array',
      element: { kind: 'named', name: 'string', span: { start: { line: 1, column: 1 }, end: { line: 1, column: 7 } } },
      readonly: false,
      spelling: 'suffix',
      span: { start: { line: 1, column: 1 }, end: { line: 1, column: 9 } },
    });
  });

  it('parses a union of named types', () => {
    const result = parseTypeExprText('string | number');
    assert.equal(result.typeExpr.kind, 'union');
    assert.deepEqual(
      result.typeExpr.kind === 'union' ? result.typeExpr.members.map((member) => (member.kind === 'named' ? member.name : undefined)) : [],
      ['string', 'number'],
    );
  });

  it('applies a non-default base offset for spans (readonly-array element reassembly use case)', () => {
    const result = parseTypeExprText('string', { baseLine: 5, baseColumn: 20 });
    assert.deepEqual(result.typeExpr, {
      kind: 'named',
      name: 'string',
      span: { start: { line: 5, column: 20 }, end: { line: 5, column: 26 } },
    });
  });

  it("parses a parenthesized union (readonly (A | B)[]'s element reassembly)", () => {
    const result = parseTypeExprText('string | number)');
    // The caller (type-expr-from-cst.ts) passes the readonly_paren_rest text
    // WITH the trailing ')' still attached (grammar.js's flat, non-recursive
    // token) — the parser's own paren-open/close pairing only applies when
    // IT sees the opening '(' too; here there is none, so the parse stops
    // at the union and leaves ')' as the remainder for the caller to ignore.
    assert.equal(result.typeExpr.kind, 'union');
    assert.equal(result.remainder, ')');
  });

  it('recognizes a generic with a string-literal argument', () => {
    const result = parseTypeExprText('Pick<S3Client, "send">');
    assert.equal(result.typeExpr.kind, 'generic');
    if (result.typeExpr.kind === 'generic') {
      assert.equal(result.typeExpr.base.name, 'Pick');
      assert.deepEqual(
        result.typeExpr.args.map((arg) => (arg.kind === 'named' ? arg.name : arg.kind === 'literal' ? arg.value : undefined)),
        ['S3Client', 'send'],
      );
    }
  });

  it('falls back to opaque for an object literal', () => {
    const result = parseTypeExprText('{ a: string, b: number }');
    assert.equal(result.typeExpr.kind, 'opaque');
    if (result.typeExpr.kind === 'opaque') {
      assert.equal(result.typeExpr.text, '{ a: string, b: number }');
    }
    assert.equal(result.remainder, '');
  });

  it('falls back to opaque for a tuple', () => {
    const result = parseTypeExprText('[string, number, boolean]');
    assert.equal(result.typeExpr.kind, 'opaque');
    if (result.typeExpr.kind === 'opaque') {
      assert.equal(result.typeExpr.text, '[string, number, boolean]');
    }
  });

  it('parses a readonly-prefixed named-type array (the identifier-rest reassembly shape)', () => {
    const result = parseTypeExprText('readonly DtoFieldNode[]');
    assert.deepEqual(
      result.typeExpr.kind === 'array' ? { readonly: result.typeExpr.readonly, element: result.typeExpr.element.kind } : undefined,
      { readonly: true, element: 'named' },
    );
  });

  it('readonly with no trailing [] is not the array prefix (defensive fallback)', () => {
    const result = parseTypeExprText('readonly');
    assert.equal(result.typeExpr.kind, 'named');
    if (result.typeExpr.kind === 'named') {
      assert.equal(result.typeExpr.name, 'readonly');
    }
  });
});
