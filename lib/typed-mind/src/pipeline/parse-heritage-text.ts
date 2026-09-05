import type { HeritageReference } from '../ast/heritage-reference.ts';
import { type ParseTypeExprTextOptions, parseTypeExprText } from './type-expr-from-text.ts';
import { scanTypeDelimiters } from './type-text-lexical.ts';

export const parseHeritageText = (text: string, options: ParseTypeExprTextOptions = {}): HeritageReference => {
  const parsed = parseTypeExprText(text, options);
  const node = parsed.typeExpr;
  if (scanTypeDelimiters(text)?.length === 0 && parsed.remainder.trim() === '') {
    if (node.kind === 'named') return { kind: 'named', base: node, args: [], span: node.span };
    if (node.kind === 'generic') return { kind: 'named', base: node.base, args: node.args, span: node.span };
    // Ordinary type expressions normalize precisely Array<T> to an array.
    // Heritage must keep its named constructor identity and argument instead.
    if (node.kind === 'array' && node.spelling === 'generic' && !node.readonly) {
      const start = node.span.start;
      return {
        kind: 'named',
        base: { kind: 'named', name: 'Array', span: { start, end: { line: start.line, column: start.column + 5 } } },
        args: [node.element],
        span: node.span,
      };
    }
  }
  const start = { line: options.baseLine ?? 1, column: options.baseColumn ?? 1 };
  return { kind: 'opaque', text, span: { start, end: { line: start.line, column: start.column + text.length } } };
};
