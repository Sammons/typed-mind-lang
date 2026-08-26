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
