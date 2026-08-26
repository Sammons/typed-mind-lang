// RFC-TM-3 §3.3 (rfc-tm-3-diamond.md) — the ERROR/MISSING → syntax/* mapper.
// Per the Path-A recovery decision (TM-2 Q0) there is no catch-all error_line
// node: malformed lines surface as genuine (ERROR)/(MISSING) nodes with real
// ranges, and this mapper walks exactly those. One diagnostic per top-level
// ERROR node (its children are recovery noise, not further findings — this is
// what keeps naming-edge-cases-example.tmd:49 at exactly one diagnostic);
// MISSING tokens outside an ERROR get their own syntax/missing entry.

import type { Node as SyntaxNode } from 'web-tree-sitter';
import type { Diagnostic } from '../ast/diagnostic.ts';
import { tokenSpanOf } from './spans.ts';

const SNIPPET_LIMIT = 60;

const errorSnippet = (syntaxNode: SyntaxNode): string => {
  const firstLine = (syntaxNode.text.split('\n')[0] ?? '').trim();
  if (firstLine.length <= SNIPPET_LIMIT) {
    return firstLine;
  }
  return `${firstLine.slice(0, SNIPPET_LIMIT)}…`;
};

const visit = (syntaxNode: SyntaxNode, diagnostics: Diagnostic[]): void => {
  if (syntaxNode.type === 'ERROR') {
    diagnostics.push({
      code: 'syntax/error',
      severity: 'error',
      span: tokenSpanOf(syntaxNode),
      message: `unparsable text: \`${errorSnippet(syntaxNode)}\``,
    });
    return;
  }
  if (syntaxNode.isMissing) {
    diagnostics.push({
      code: 'syntax/missing',
      severity: 'error',
      span: tokenSpanOf(syntaxNode),
      message: `missing ${syntaxNode.type}`,
    });
    return;
  }
  if (!syntaxNode.hasError) {
    // Prune: ERROR/MISSING nodes only live under error-bearing ancestors.
    return;
  }
  for (const child of syntaxNode.children) {
    visit(child, diagnostics);
  }
};

export const collectSyntaxDiagnostics = (rootSyntaxNode: SyntaxNode): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  visit(rootSyntaxNode, diagnostics);
  return diagnostics;
};
