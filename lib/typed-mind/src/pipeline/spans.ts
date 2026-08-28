// RFC-TM-3 §3.2 (rfc-tm-3-diamond.md) — token-accurate span construction for
// the CST→AST layer. Grammar productions include their `_indent` prefix and
// `_line_end` newline, so the raw tree-sitter node extent starts before the
// first meaningful token and ends after the trailing newline. tokenSpanOf
// trims both: the span starts at the first non-whitespace character and ends
// after the last non-whitespace character. 1-based on both axes (I-6: no
// constructed position uses a constant column).

import type { Node as SyntaxNode } from 'web-tree-sitter';
import type { Span } from '../ast/span.ts';

export const tokenSpanOf = (syntaxNode: SyntaxNode): Span => {
  const text = syntaxNode.text;
  const leadingMatch = /^[ \t]*/.exec(text);
  const leadingLength = leadingMatch === null ? 0 : leadingMatch[0].length;
  const startLine = syntaxNode.startPosition.row + 1;
  const startColumn = syntaxNode.startPosition.column + 1 + leadingLength;
  const trimmedText = text.trimEnd();
  if (trimmedText.length === 0) {
    // Zero-width node (a MISSING token): the span is the insertion point.
    return {
      start: { line: startLine, column: syntaxNode.startPosition.column + 1 },
      end: { line: startLine, column: syntaxNode.startPosition.column + 1 },
    };
  }
  const lines = trimmedText.split('\n');
  if (lines.length === 1) {
    return {
      start: { line: startLine, column: startColumn },
      end: { line: startLine, column: syntaxNode.startPosition.column + 1 + trimmedText.length },
    };
  }
  const lastLine = (lines[lines.length - 1] ?? '').replace(/\r$/, '');
  return {
    start: { line: startLine, column: startColumn },
    end: { line: startLine + lines.length - 1, column: lastLine.length + 1 },
  };
};

export const spanCoversLine = (span: Span, line: number): boolean => {
  return span.start.line <= line && line <= span.end.line;
};

// RFC-TM-8 §2 (rfc-tm-8-diamond.md, X-TYPE-2) — per-CST-sub-node span
// extraction in the tokenSpanOf style, for the type-expression sub-grammar's
// recursive children. type_expr's productions carry no _indent/_line_end
// wrapping the way a top-level line does, so no leading/trailing whitespace
// trim is normally needed. A thin, trimmed wrapper (tokenSpanOf's own trim
// logic) so every TypeExprNode carries the span of exactly its own tokens,
// matching what X-TYPE-4's future per-part findings (Q2) attach to.
//
// The readonly-array compound-token reassembly (readonly_kw carries
// "readonly " + one consumed character; readonly_name_rest/
// readonly_paren_rest/readonly_brace_rest carry only the REST of the
// element's text) does NOT go through this helper — that reconstruction
// lives entirely in type-expr-from-cst.ts's typeReadonlyArrayFromCst, which
// computes the element's base offset from readonly_kw's own end position and
// hands it to parseTypeExprText directly (review finding, non-blocking:
// this comment previously implied the reassembly happened here).
export const typeSpanOf = tokenSpanOf;
