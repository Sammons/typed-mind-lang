// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — the checker's finding record and its two
// wire projections. A finding carries a real span (I-6) plus the legacy
// message/suggestion text verbatim; `toValidationErrors` is the facade view
// (the legacy ValidationError wire shape, types.ts), `toDiagnostics` is the
// new-surface view (the ast/diagnostic.ts record; suggestion does not ride —
// the Diagnostic catalog is message-only by TM-3 design).

import type { Diagnostic, DiagnosticSeverity } from '../ast/diagnostic.ts';
import type { Span } from '../ast/span.ts';

export interface CheckerFinding {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly span: Span;
  readonly message: string;
  readonly suggestion?: string | undefined;
}

// The legacy ValidationError wire shape (types.ts), reproduced structurally so
// the checker does not import the legacy type surface (it dies in Q5).
export interface LegacyWireError {
  readonly position: { readonly line: number; readonly column: number };
  readonly message: string;
  readonly severity: 'error' | 'warning';
  readonly suggestion?: string | undefined;
}

export const toValidationErrors = (findings: readonly CheckerFinding[]): LegacyWireError[] => {
  return findings.map((finding) => {
    return {
      position: { line: finding.span.start.line, column: finding.span.start.column },
      message: finding.message,
      severity: finding.severity,
      ...(finding.suggestion === undefined ? {} : { suggestion: finding.suggestion }),
    };
  });
};

export const toDiagnostics = (findings: readonly CheckerFinding[]): Diagnostic[] => {
  return findings.map((finding) => {
    return {
      code: finding.code,
      severity: finding.severity,
      span: finding.span,
      message: finding.message,
    };
  });
};
