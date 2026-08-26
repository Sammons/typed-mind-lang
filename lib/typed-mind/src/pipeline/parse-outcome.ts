// RFC-TM-3 §3.1 (rfc-tm-3-diamond.md) — the parse pipeline's output shape.
// `entities` is a LIST, not the legacy Map (FAQ Q2): every declaration
// survives, kind-agnostic, shortform and longform alike, each with its own
// span, so TM-4's duplicate-name validator covers strictly more cases than
// the legacy parser's cross-kind-shortform-only conflict channel
// (parser.ts:108-121). `diagnostics` is always present (S-PARSE-3:
// always-tolerant, parsing never throws).

import type { Diagnostic } from '../ast/diagnostic.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { ImportStatementNode } from '../ast/import-statement-node.ts';

export interface ParseOutcome {
  readonly entities: readonly EntityNode[];
  readonly imports: readonly ImportStatementNode[];
  readonly diagnostics: readonly Diagnostic[];
}
