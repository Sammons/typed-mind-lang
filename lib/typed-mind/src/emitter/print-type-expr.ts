// RFC-TM-8 §3 (rfc-tm-8-diamond.md, X-TYPE-3, "resolves Q4") — the canonical
// printer for a TypeExprNode that has NO source text: synthetic nodes built
// directly (e.g. a future converter path that constructs typeExpr without
// also carrying a raw `type` string). Parsed documents never call this —
// their DtoFieldNode.type is the preserved raw source text, and every
// current emitter (emit-shortform.ts, emit-longform.ts) prints THAT
// verbatim (byte-preservation, X-TYPE-3's other half). One frozen spelling
// per the doc: `" | "`, `" & "`, `", "` separators, no space inside `<>`.
//
// spelling: 'generic' round-trips as `Array<T>` (not `readonly T[]` and not
// bare `T[]`) — the doc's Array<T> normalization (X-TYPE-2) exists so the
// structured AST treats `Array<T>` and `T[]` as the same array kind for
// checking purposes (Q2), while this printer keeps the two SPELLINGS
// distinguishable on the way back out, exactly the "spelling recorded" the
// doc names as the point of carrying the field at all.

import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { quoteStringLiteral } from './quote-string-literal.ts';

const printAtomWithParensIfNeeded = (node: TypeExprNode): string => {
  if (node.kind === 'union' || node.kind === 'intersection') {
    return `(${printTypeExpr(node)})`;
  }
  return printTypeExpr(node);
};

export const printTypeExpr = (node: TypeExprNode): string => {
  switch (node.kind) {
    case 'named':
      return node.name;
    case 'literal':
      return node.literalKind === 'string' ? quoteStringLiteral(node.value) : node.value;
    case 'generic':
      return `${node.base.name}<${node.args.map(printTypeExpr).join(', ')}>`;
    case 'array':
      if (node.spelling === 'generic') {
        // readonly has no bearing on the generic spelling — TypeScript's
        // `Array<T>` form has no readonly-prefixed counterpart of its own
        // (that's `ReadonlyArray<T>`, a different base name entirely, which
        // never normalizes per the doc's Array-only ruling); a readonly
        // array.kind with spelling 'generic' is not a reachable combination
        // from either CST or text-parser normalization path today.
        return `Array<${printTypeExpr(node.element)}>`;
      }
      return `${node.readonly ? 'readonly ' : ''}${printAtomWithParensIfNeeded(node.element)}[]`;
    case 'union':
      return node.members.map(printAtomWithParensIfNeeded).join(' | ');
    case 'intersection':
      return node.members.map(printAtomWithParensIfNeeded).join(' & ');
    case 'opaque':
      return node.text;
  }
};
