// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — real-range diagnostics. Maps
// CheckOutcome.diagnostics (parse-time and checker findings in one list, each
// carrying a token-accurate Span, TM-4 I-6) directly onto LSP Ranges. The
// `+10` constant (legacy server.ts:150) and the 0,0 parse-failure collapse
// (legacy server.ts:164-173) both die: the tolerant pipeline never throws
// (typed-mind-parser.ts §3.3), so there is no catch arm left to collapse.

import type { Diagnostic as TypedMindDiagnostic } from '@sammons/typed-mind';
import { DiagnosticSeverity, type Diagnostic as LspDiagnostic } from 'vscode-languageserver/node.js';

// Span is 1-based on both axes (rfc-tm-3-diamond.md §3.2); LSP Position is
// 0-based on both axes. The only arithmetic this module performs is that
// single, documented convention conversion — never a constant-width guess.
export const toLspDiagnostic = (diagnostic: TypedMindDiagnostic): LspDiagnostic => {
  return {
    severity: diagnostic.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    range: {
      start: { line: diagnostic.span.start.line - 1, character: diagnostic.span.start.column - 1 },
      end: { line: diagnostic.span.end.line - 1, character: diagnostic.span.end.column - 1 },
    },
    message: diagnostic.message,
    source: 'typed-mind',
    code: diagnostic.code,
  };
};

export const toLspDiagnostics = (diagnostics: readonly TypedMindDiagnostic[]): LspDiagnostic[] => {
  return diagnostics.map(toLspDiagnostic);
};
