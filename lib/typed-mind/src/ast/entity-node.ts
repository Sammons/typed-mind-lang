// RFC-TM-3 §2.2 (rfc-tm-3-diamond.md) — the common abstract base for the
// eleven semantic classes. Carries exactly name/kind/span/raw/comment. All
// fields readonly: populated once at construction by the CST→AST layer, never
// written back by the pipeline. Semantic classes extend NOTHING generated
// (DAG Amendment A construction seam): the base is hand-authored and holds no
// tree-sitter references, so instances serialize and cross the browser
// boundary (I-8) without dragging the wasm runtime along.

import type { EntityKind } from './entity-kind.ts';
import type { Span } from './span.ts';

export interface EntityNodeArgs {
  readonly name: string;
  readonly span: Span;
  readonly raw: string;
  readonly comment?: string;
}

export abstract class EntityNode {
  abstract readonly kind: EntityKind;
  readonly name: string;
  readonly span: Span;
  readonly raw: string;
  readonly comment: string | undefined;

  // Explicit field assignment (not constructor parameter properties):
  // parameter properties are non-erasable syntax. Assign-only, no side effects.
  protected constructor(args: EntityNodeArgs) {
    this.name = args.name;
    this.span = args.span;
    this.raw = args.raw;
    this.comment = args.comment;
  }
}
