// RFC-TM-8 §3 (rfc-tm-8-diamond.md, X-TYPE-3) — printTypeExpr unit coverage.
// Real string-output assertions per node kind, including the Array<T>
// normalization round-trip (lead ruling on review finding B3): a
// spelling:'generic' array node prints back as `Array<T>`, not `T[]`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { printTypeExpr } from './print-type-expr.ts';

const SPAN = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

describe('printTypeExpr: canonical printer for synthetic (no-source-text) TypeExprNode', () => {
  it('prints a named type', () => {
    const node: TypeExprNode = { kind: 'named', name: 'UserDTO', span: SPAN };
    assert.equal(printTypeExpr(node), 'UserDTO');
  });

  it('prints a string literal with quotes restored', () => {
    const node: TypeExprNode = { kind: 'literal', literalKind: 'string', value: 'active', span: SPAN };
    assert.equal(printTypeExpr(node), '"active"');
  });

  it('prints a number literal bare', () => {
    const node: TypeExprNode = { kind: 'literal', literalKind: 'number', value: '42', span: SPAN };
    assert.equal(printTypeExpr(node), '42');
  });

  it('prints a generic with no space inside <>', () => {
    const node: TypeExprNode = {
      kind: 'generic',
      base: { kind: 'named', name: 'Pick', span: SPAN },
      args: [
        { kind: 'named', name: 'S3Client', span: SPAN },
        { kind: 'literal', literalKind: 'string', value: 'send', span: SPAN },
      ],
      span: SPAN,
    };
    assert.equal(printTypeExpr(node), 'Pick<S3Client, "send">');
  });

  it('prints a suffix array', () => {
    const node: TypeExprNode = {
      kind: 'array',
      element: { kind: 'named', name: 'string', span: SPAN },
      readonly: false,
      spelling: 'suffix',
      span: SPAN,
    };
    assert.equal(printTypeExpr(node), 'string[]');
  });

  it('prints a readonly suffix array', () => {
    const node: TypeExprNode = {
      kind: 'array',
      element: { kind: 'named', name: 'string', span: SPAN },
      readonly: true,
      spelling: 'suffix',
      span: SPAN,
    };
    assert.equal(printTypeExpr(node), 'readonly string[]');
  });

  it('prints a generic-spelling array as Array<T>, not T[] (B3 lead ruling)', () => {
    const node: TypeExprNode = {
      kind: 'array',
      element: { kind: 'named', name: 'number', span: SPAN },
      readonly: false,
      spelling: 'generic',
      span: SPAN,
    };
    assert.equal(printTypeExpr(node), 'Array<number>');
  });

  it('prints a union with " | " separators', () => {
    const node: TypeExprNode = {
      kind: 'union',
      members: [
        { kind: 'literal', literalKind: 'string', value: 'active', span: SPAN },
        { kind: 'literal', literalKind: 'string', value: 'inactive', span: SPAN },
      ],
      span: SPAN,
    };
    assert.equal(printTypeExpr(node), '"active" | "inactive"');
  });

  it('prints an intersection with " & " separators', () => {
    const node: TypeExprNode = {
      kind: 'intersection',
      members: [
        { kind: 'named', name: 'A', span: SPAN },
        { kind: 'named', name: 'B', span: SPAN },
      ],
      span: SPAN,
    };
    assert.equal(printTypeExpr(node), 'A & B');
  });

  it('parenthesizes a union nested inside an array element', () => {
    const node: TypeExprNode = {
      kind: 'array',
      element: {
        kind: 'union',
        members: [
          { kind: 'named', name: 'string', span: SPAN },
          { kind: 'named', name: 'number', span: SPAN },
        ],
        span: SPAN,
      },
      readonly: false,
      spelling: 'suffix',
      span: SPAN,
    };
    assert.equal(printTypeExpr(node), '(string | number)[]');
  });

  it('prints an opaque node verbatim', () => {
    const node: TypeExprNode = { kind: 'opaque', text: '{ a: string }', span: SPAN };
    assert.equal(printTypeExpr(node), '{ a: string }');
  });
});
