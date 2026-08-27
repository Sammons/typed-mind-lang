// RFC-TM-3 §2.2 footnote (rfc-tm-3-diamond.md) — one DTO field. The
// optionalityMarker discriminant replaces the collapsed legacy boolean
// (parser.ts:584 folded `- f?: t` and `- f: t (optional)` into one
// `optional: true`): the source spelling survives as a three-way variant. The
// 'question' variant is detected by the CST→AST layer's anonymous-token walk
// (doc §1), not a generated accessor. Carries a real span per §3.2.
//
// RFC-TM-8 §2 (rfc-tm-8-diamond.md, X-TYPE-2) — `type` stays the preserved
// raw source text (diagnostics/hover quote the author's spelling verbatim,
// per doc §2/§10's "hover keeps quoting the raw spelling" FAQ answer) and
// gains `typeExpr`, the structured parse the checker walks (Q2).

import type { Span } from './span.ts';
import type { TypeExprNode } from './type-expr-node.ts';

export type OptionalityMarker = 'none' | 'question' | 'parenthesized';

export class DtoFieldNode {
  readonly name: string;
  readonly type: string;
  readonly typeExpr: TypeExprNode;
  readonly optionalityMarker: OptionalityMarker;
  readonly description: string | undefined;
  readonly span: Span;

  constructor(args: {
    name: string;
    type: string;
    typeExpr: TypeExprNode;
    optionalityMarker: OptionalityMarker;
    description?: string;
    span: Span;
  }) {
    this.name = args.name;
    this.type = args.type;
    this.typeExpr = args.typeExpr;
    this.optionalityMarker = args.optionalityMarker;
    this.description = args.description;
    this.span = args.span;
  }

  // Derived view preserving legacy consumer ergonomics (doc §2.2 footnote).
  get isOptional(): boolean {
    return this.optionalityMarker !== 'none';
  }
}
