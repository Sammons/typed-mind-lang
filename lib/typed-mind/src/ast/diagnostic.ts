// RFC-TM-3 §3.3 (rfc-tm-3-diamond.md) — the diagnostics record for the
// always-tolerant pipeline. `code` is an open string catalog by design, not a
// kind-discriminated closed union: diagnostics are reporting records serialized
// to callers, not control-flow failure values (stated departure from the
// failure-union pillar rule, per the doc). The catalog itself (syntax/*,
// semantics/*, imports/*) is produced by Q3-Q5 phases.

import type { Span } from './span.ts';

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly span: Span;
  readonly message: string;
}
