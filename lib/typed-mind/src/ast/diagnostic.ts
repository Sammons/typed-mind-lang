// RFC-TM-3 §3.3 (rfc-tm-3-diamond.md) — the diagnostics record for the
// always-tolerant pipeline. `code` is an open string catalog by design, not a
// kind-discriminated closed union: diagnostics are reporting records serialized
// to callers, not control-flow failure values (stated departure from the
// failure-union pillar rule, per the doc). The catalog itself (syntax/*,
// semantics/*, imports/*) is produced by Q3-Q5 phases.
//
// `suppression` (RFC-TM-8 §8, X-SUPP-3): present when a SuppressionNode's
// (code, target) pair matched this diagnostic. Suppressed-not-silenced (I-10):
// the diagnostic keeps its severity and stays in the emitted list; `valid`
// excludes it from the error count (checker/ast-validator.ts and the
// typed-mind.ts facade both apply that exclusion). Optional, not a
// discriminant — most diagnostics never carry it.

import type { Span } from './span.ts';

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly span: Span;
  readonly message: string;
  readonly suppression?: { readonly reason: string; readonly span: Span } | undefined;
}
