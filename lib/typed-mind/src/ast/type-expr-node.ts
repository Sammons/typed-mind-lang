// RFC-TM-8 §2 (rfc-tm-8-diamond.md, X-TYPE-2) — the structured type-expression
// AST. Kind discriminants per RFC-TM-3 conventions (`kind` is the tagged-union
// discriminator, house rule: no enums); readonly fields; honest optionality —
// a field is present only when the source spelling carries it.
//
// The `opaque` variant is the flagged fallback leaf (doc §1 "Opaque fallback",
// authorized scope amendment): type text outside the six structured
// productions (object literals incl. index signatures, tuples, function
// types, conditional types). It carries no findings at the checker level
// (Q2) — same trust level as today's non-matching field_type chunks.

import type { Span } from './span.ts';

export interface TypeNamedNode {
  readonly kind: 'named';
  readonly name: string;
  readonly span: Span;
}

export interface TypeLiteralNode {
  readonly kind: 'literal';
  readonly literalKind: 'string' | 'number';
  readonly value: string;
  readonly span: Span;
}

export interface TypeGenericNode {
  readonly kind: 'generic';
  readonly base: TypeNamedNode;
  readonly args: readonly TypeExprNode[];
  readonly span: Span;
}

// spelling: 'suffix' (`T[]`) vs 'generic' (`Array<T>`, normalized to this
// kind at CST→AST time per doc §2) — recorded so the emitter reproduces the
// source form (byte-preservation for parsed documents, X-TYPE-3).
export type TypeArraySpelling = 'suffix' | 'generic';

export interface TypeArrayNode {
  readonly kind: 'array';
  readonly element: TypeExprNode;
  readonly readonly: boolean;
  readonly spelling: TypeArraySpelling;
  readonly span: Span;
}

export interface TypeUnionNode {
  readonly kind: 'union';
  readonly members: readonly TypeExprNode[];
  readonly span: Span;
}

export interface TypeIntersectionNode {
  readonly kind: 'intersection';
  readonly members: readonly TypeExprNode[];
  readonly span: Span;
}

// The flagged fallback leaf — text is the raw, un-parsed source slice for the
// shape (object literal, tuple, function type, conditional type) the six
// structured productions do not cover.
export interface TypeOpaqueNode {
  readonly kind: 'opaque';
  readonly text: string;
  // Optional source provenance: decoded text offsets to source-column offsets.
  // Quoted payload escapes make these differ; absent means the ordinary raw span.
  readonly textOffsets?: readonly number[];
  readonly span: Span;
}

export type TypeExprNode =
  | TypeNamedNode
  | TypeLiteralNode
  | TypeGenericNode
  | TypeArrayNode
  | TypeUnionNode
  | TypeIntersectionNode
  | TypeOpaqueNode;
