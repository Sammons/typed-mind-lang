// RFC-TM-3 §2.2 (rfc-tm-3-diamond.md) — the common abstract base for the
// eleven semantic classes. Carries name/kind/span/raw/comment plus, per
// RFC-TM-4 §2 (rfc-tm-4-diamond.md, FID-6): `sourceForm`, the one
// S-AST-3-adjacent field addition TM-4 makes. All fields readonly: populated
// once at construction by the CST→AST layer, never written back by the
// pipeline. Semantic classes extend NOTHING generated (DAG Amendment A
// construction seam): the base is hand-authored and holds no tree-sitter
// references, so instances serialize and cross the browser boundary (I-8)
// without dragging the wasm runtime along.

import type { EntityKind } from './entity-kind.ts';
import type { Span } from './span.ts';

// RFC-TM-4 §2: set by the attach layer from the CST node class — brace-block
// headers (including the sigil-with-brace ClassFile header `Name #: path {`)
// => 'longform'; line declarations => 'shortform'. Drives SyntaxEmitter's
// per-entity form selection (S-CORE-2a).
export type SourceForm = 'shortform' | 'longform';

export interface EntityNodeArgs {
  readonly name: string;
  readonly span: Span;
  readonly raw: string;
  readonly comment?: string;
  readonly sourceForm: SourceForm;
}

export abstract class EntityNode {
  abstract readonly kind: EntityKind;
  readonly name: string;
  readonly span: Span;
  readonly raw: string;
  readonly comment: string | undefined;
  readonly sourceForm: SourceForm;

  // Explicit field assignment (not constructor parameter properties):
  // parameter properties are non-erasable syntax. Assign-only, no side effects.
  protected constructor(args: EntityNodeArgs) {
    this.name = args.name;
    this.span = args.span;
    this.raw = args.raw;
    this.comment = args.comment;
    this.sourceForm = args.sourceForm;
  }
}
