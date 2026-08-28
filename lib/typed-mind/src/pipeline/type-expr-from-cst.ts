// RFC-TM-8 §1/§2 (rfc-tm-8-diamond.md, X-TYPE-1/X-TYPE-2) — the shortform
// CST→AST walk for the type-expression sub-grammar. Mirrors dtoFieldFromCst's
// shape (attachment-rules.ts) one level down: each type_* CST node becomes
// its matching TypeExprNode variant, recursing through type_union/
// type_intersection/type_postfix so the printed AST carries exactly the
// structure the grammar parsed — no information the CST does not already
// have gets invented here.
//
// Array-suffix normalization (doc §2 "Array<T> normalizes to the array kind
// at CST→AST time with the spelling recorded"): a bare `T[]` suffix on
// type_postfix yields `spelling: 'suffix'`; a `Array<T>` generic call (base
// name literally `Array`, one argument) also normalizes to the array kind,
// recorded as `spelling: 'generic'` so the emitter reproduces the source
// form (X-TYPE-3 canonical printer, byte-preservation via raw carriage for
// parsed documents).

import type {
  CstTypeAtom,
  CstTypeExpr,
  CstTypeGeneric,
  CstTypeIntersection,
  CstTypeNamed,
  CstTypePostfix,
  CstTypeReadonlyArray,
  CstTypeUnion,
} from '../ast/gen/cst-nodes.ts';
import type { TypeExprNode, TypeNamedNode } from '../ast/type-expr-node.ts';
import { typeSpanOf } from './spans.ts';
// Lazy dependency on the string-based type parser (doc §1's "shared
// verbatim" vocabulary): the readonly-array element and the longform
// quoted-string type value both route through the SAME hand-rolled
// recursive-descent parser, since neither can hand back a nested tree
// straight from the CST (readonly_paren_rest is a flat, non-recursive
// token; a longform quoted string is opaque text to tree-sitter).
import { parseTypeExprText } from './type-expr-from-text.ts';

const typeNamedFromCst = (wrapped: CstTypeNamed): TypeNamedNode => {
  return {
    kind: 'named',
    name: wrapped.text.trim(),
    span: typeSpanOf(wrapped.syntaxNode),
  };
};

const typeAtomFromCst = (wrapped: CstTypeAtom): TypeExprNode => {
  const generic = wrapped.typeGenericChildren().at(0);
  if (generic !== undefined) {
    return typeGenericFromCst(generic);
  }
  const readonlyArray = wrapped.typeReadonlyArrayChildren().at(0);
  if (readonlyArray !== undefined) {
    return typeReadonlyArrayFromCst(readonlyArray);
  }
  const named = wrapped.typeNamedChildren().at(0);
  if (named !== undefined) {
    return typeNamedFromCst(named);
  }
  const literalString = wrapped.typeLiteralStringChildren().at(0);
  if (literalString !== undefined) {
    const stringNode = literalString.stringChildren().at(0);
    const rawText = stringNode?.text ?? '""';
    return {
      kind: 'literal',
      literalKind: 'string',
      value: rawText.replace(/^"/, '').replace(/"$/, ''),
      span: typeSpanOf(literalString.syntaxNode),
    };
  }
  const literalNumber = wrapped.typeLiteralNumberChildren().at(0);
  if (literalNumber !== undefined) {
    return {
      kind: 'literal',
      literalKind: 'number',
      value: literalNumber.text,
      span: typeSpanOf(literalNumber.syntaxNode),
    };
  }
  // Parenthesized grouping ('(' type_expr ')', the hidden _type_paren_group
  // production — grammar.js): the group's own span is type_atom's extent
  // (parens included), but the STRUCTURE returned is the inner expression's
  // — parenthesization is a precedence device, not a distinct AST kind, so
  // no wrapper node exists to carry it. The inner type_expr child is
  // reachable directly since _type_paren_group is a hidden (`_`-prefixed)
  // production and does not appear as its own named CST node.
  const parenthesizedExpr = wrapped.typeExprChildren().at(0);
  if (parenthesizedExpr !== undefined) {
    return typeExprFromCst(parenthesizedExpr);
  }
  const opaque = wrapped.typeOpaqueChildren().at(0);
  if (opaque !== undefined) {
    return {
      kind: 'opaque',
      text: opaque.text.trim(),
      span: typeSpanOf(opaque.syntaxNode),
    };
  }
  // Invariant violation: type_atom's grammar choice is exhaustive (doc §1's
  // six structured productions plus type_opaque); every alternative is
  // handled above. Reaching here means the grammar and this walk have
  // drifted — the same "impossible" class check-generated.mjs's node-types
  // completeness gate exists to catch upstream.
  throw new Error(`type_atom: no recognized child in "${wrapped.text}"`);
};

const typeGenericFromCst = (wrapped: CstTypeGeneric) => {
  const base = wrapped.baseField();
  const args = wrapped.typeExprChildren().map((child) => typeExprFromCst(child));
  return {
    kind: 'generic' as const,
    base: base === undefined ? { kind: 'named' as const, name: '', span: typeSpanOf(wrapped.syntaxNode) } : typeNamedFromCst(base),
    args,
    span: typeSpanOf(wrapped.syntaxNode),
  };
};

const typeReadonlyArrayFromCst = (wrapped: CstTypeReadonlyArray): TypeExprNode => {
  // Reassembles the split element text the SAME way headerName() reassembles
  // a block header's name (grammar.js's blockKwToken mechanism, doc §1):
  // readonly_kw's LAST character (the element's first character, baked into
  // the compound token) + the rest node's text. The reassembled text is
  // parsed through the shared string-based type parser (type-expr-from-text.ts)
  // so the element is a real TypeExprNode, not a flat string — the
  // readonly-array's element can itself be a parenthesized union
  // (`readonly (A | B)[]`), which the CST does not expose as a nested
  // recursive tree (readonly_paren_rest is a flat token, mirroring
  // _paren_group's one-level, non-recursive grouping).
  const syntaxNode = wrapped.syntaxNode;
  const readonlyKw = syntaxNode.children.find((child) => child !== null && child.type === 'readonly_kw');
  const elementField = syntaxNode.childForFieldName('element');
  const keywordText = readonlyKw?.text ?? '';
  const lastKeywordCharacter = keywordText.slice(-1);
  const restText = elementField?.text ?? '';
  // readonly_paren_rest carries the remainder PLUS the closing ')' (mirrors
  // _paren_group's flat one-level grouping); readonly_name_rest carries a
  // bare identifier continuation. Reassembly differs by which rest kind
  // matched, per grammar.js's readonlyIdentKwToken/readonlyParenKwToken pair.
  const elementText = lastKeywordCharacter + restText;
  // The reassembled text's first character (readonly_kw's last character) is
  // positioned at readonly_kw's own end column minus one — real document
  // coordinates, so the parsed element's span lands on its true source
  // position rather than a text-relative (1,1) origin.
  const readonlyKwEnd = readonlyKw?.endPosition;
  const baseLine = readonlyKwEnd !== undefined ? readonlyKwEnd.row + 1 : 1;
  const baseColumn = readonlyKwEnd !== undefined ? readonlyKwEnd.column : 1;
  const elementExpr = parseTypeExprText(elementText, { baseLine, baseColumn }).typeExpr;
  return {
    kind: 'array' as const,
    element: elementExpr,
    readonly: true,
    spelling: 'suffix' as const,
    span: typeSpanOf(syntaxNode),
  };
};

const typePostfixFromCst = (wrapped: CstTypePostfix): TypeExprNode => {
  const atom = wrapped.typeAtomChildren().at(0);
  if (atom === undefined) {
    throw new Error(`type_postfix: no type_atom child in "${wrapped.text}"`);
  }
  const element = typeAtomFromCst(atom);
  // Collect each ']' anonymous-token sibling's end position so every array
  // suffix carries the span of exactly its own tokens (review finding B2):
  // number[][]'s INNER array (number[]) must span only up to its own ']',
  // not the outer node's full extent. The CST does not name '['/']' (bare
  // literal tokens), so the anonymous-token walk mirrors attachment-rules.ts's
  // hasQuestionSigil; the walk is ordered left-to-right, so closingPositions[i]
  // is the i-th (from the element outward) closing bracket in source order.
  const elementStart = element.span.start;
  const closingPositions: Array<{ line: number; column: number }> = [];
  for (let childIndex = 0; childIndex < wrapped.syntaxNode.childCount; childIndex++) {
    const child = wrapped.syntaxNode.child(childIndex);
    if (child !== null && !child.isNamed && child.type === ']') {
      closingPositions.push({ line: child.endPosition.row + 1, column: child.endPosition.column });
    }
  }
  let result = element;
  for (const closingPosition of closingPositions) {
    result = {
      kind: 'array',
      element: result,
      readonly: false,
      spelling: 'suffix',
      span: { start: elementStart, end: closingPosition },
    };
  }
  return result;
};

const typeIntersectionFromCst = (wrapped: CstTypeIntersection): TypeExprNode => {
  const members = wrapped.typePostfixChildren().map((child) => typePostfixFromCst(child));
  if (members.length === 1) {
    const [only] = members;
    if (only !== undefined) {
      return only;
    }
  }
  return { kind: 'intersection', members, span: typeSpanOf(wrapped.syntaxNode) };
};

const typeUnionFromCst = (wrapped: CstTypeUnion): TypeExprNode => {
  const members = wrapped.typeIntersectionChildren().map((child) => typeIntersectionFromCst(child));
  if (members.length === 1) {
    const [only] = members;
    if (only !== undefined) {
      return only;
    }
  }
  return { kind: 'union', members, span: typeSpanOf(wrapped.syntaxNode) };
};

export const typeExprFromCst = (wrapped: CstTypeExpr): TypeExprNode => {
  const union = wrapped.typeUnionChildren().at(0);
  if (union === undefined) {
    throw new Error(`type_expr: no type_union child in "${wrapped.text}"`);
  }
  return typeUnionFromCst(union);
};
