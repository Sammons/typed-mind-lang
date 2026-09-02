// RFC-TM-8 §7/§10 (rfc-tm-8-diamond.md) — X-SUPP-4 round-trip: the canonical
// entry spelling for a SuppressionNode. Unlike DtoFieldNode.type (raw-text
// carriage, S-CORE-2a), a SuppressionNode carries no preserved raw text for
// its INDIVIDUAL fields — target/code/reason are plain strings — so emission
// always re-derives the canonical spelling, the same posture printTypeExpr
// takes for synthetic type nodes (doc §3). This is sufficient for the
// doc's own round-trip bar: parse->emit->parse deep-equal on AST SHAPE
// (target/code/reason/span-derived-equality), not byte-for-byte source
// preservation — mirrored by round-trip.test.ts's honestFieldsOf projection,
// which already excludes span/raw from its comparison.

import type { Diagnostic } from '../ast/diagnostic.ts';
import type { SuppressionNode } from '../ast/suppression-node.ts';
import { quoteSwapDiagnostic } from './emitter-diagnostics.ts';
import { quoteStringLiteral, quoteSwapOccurred } from './quote-string-literal.ts';

// One shortform suppression line: `suppress Target code/name "reason"`.
export const suppressionToShortformLine = (suppression: SuppressionNode): string => {
  return `suppress ${suppression.target} ${suppression.code} ${quoteStringLiteral(suppression.reason)}`;
};

// One longform block entry (no leading `suppress` keyword — the block header
// carries it once): `Target code/name "reason"`.
const suppressionToLongformEntry = (suppression: SuppressionNode): string => {
  return `  ${suppression.target} ${suppression.code} ${quoteStringLiteral(suppression.reason)}`;
};

// A whole `suppress { ... }` block wrapping every suppression in the group.
// The doc's longform form is one block per document (§7: "Longform block:
// `suppress { ... }` with one entry per line") — callers group the flat
// ParseOutcome.suppressions list into a single block for longform emission.
export const suppressionsToLongformBlock = (suppressions: readonly SuppressionNode[]): string[] => {
  if (suppressions.length === 0) {
    return [];
  }
  return ['suppress {', ...suppressions.map(suppressionToLongformEntry), '}'];
};

// Issue #130, disposition (b) — a suppression's `reason` is the one
// non-entity free-text field `quoteStringLiteral` quotes (emit-suppression.ts
// has no EntityNode to key a diagnostic off, so this reports against the
// suppression's own `target`/`span` instead of an entity name).
export const quoteSwapDiagnosticsForSuppressions = (suppressions: readonly SuppressionNode[]): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  for (const suppression of suppressions) {
    if (quoteSwapOccurred(suppression.reason)) {
      diagnostics.push(quoteSwapDiagnostic(suppression.target, 'reason', suppression.span));
    }
  }
  return diagnostics;
};
