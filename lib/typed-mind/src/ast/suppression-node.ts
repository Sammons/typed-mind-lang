// RFC-TM-8 §7 (rfc-tm-8-diamond.md) — X-SUPP-2: the suppression AST carriage.
// Document-level, NOT an EntityNode subclass (per the doc's grain ruling and
// the ImportStatementNode precedent, ast/import-statement-node.ts): a
// suppression's target entity may not exist — that absence is exactly what
// staleness reporting (checker/stale-suppression) must see — so it cannot
// live attached to an entity or be modeled as a twelfth EntityKind, which
// would force a member into every exhaustive `switch (entity.kind)` in the
// checker/emitter for a construct that is not itself a declaration.
//
// Grain (frozen at scope, doc §7): one SuppressionNode is one (code, target)
// pair. A longform `suppress { ... }` block with N entries produces N
// SuppressionNode values, not one node holding N entries — this is what lets
// ParseOutcome.suppressions stay a flat list the checker matches findings
// against one entry at a time, and what lets a single entry inside a
// multi-entry block go stale independently of its siblings.

import type { Span } from './span.ts';

export class SuppressionNode {
  readonly target: string;
  readonly code: string;
  readonly reason: string;
  readonly span: Span;
  readonly raw: string;

  // Explicit field assignment (not constructor parameter properties):
  // parameter properties are non-erasable syntax. Assign-only, no side effects.
  constructor(args: { target: string; code: string; reason: string; span: Span; raw: string }) {
    this.target = args.target;
    this.code = args.code;
    this.reason = args.reason;
    this.span = args.span;
    this.raw = args.raw;
  }
}
