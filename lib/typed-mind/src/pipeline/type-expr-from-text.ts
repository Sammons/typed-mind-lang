// RFC-TM-8 §1 (rfc-tm-8-diamond.md, X-TYPE-1) — a hand-rolled recursive-
// descent parser over a bare type-expression STRING, mirroring the grammar's
// own precedence (type_union → type_intersection → type_postfix → type_atom)
// and its six structured kinds plus the type_opaque fallback (doc §1). Two
// call sites cannot get a nested CST tree straight from tree-sitter and need
// this instead:
//   - the longform `type:` property's value is a QUOTED STRING at the
//     grammar level (corpus: every longform-fixture `type: "string[]"`
//     spelling — snippets/dto-longform.tmd, hero-longform.tmd,
//     constants-longform.tmd) — its inner text is opaque to tree-sitter, so
//     the structure the checker (Q2) will walk has to come from parsing that
//     extracted string;
//   - type_readonly_array's parenthesized element (`readonly (A | B)[]`) —
//     readonly_paren_rest is a FLAT, non-recursive token (mirrors
//     _paren_group's one-level grouping, grammar.js), so its inner text
//     needs the same re-parse to become a real TypeExprNode tree rather than
//     staying a flat string.
//
// This parser is per `handroll_validation_at_boundaries` (no parser-
// generator dependency for a second grammar surface) and stays a pure
// function: text in, TypeExprNode out, no tree-sitter/wasm involved. It is
// NOT the grammar — the grammar (X-TYPE-1) is the single source of truth for
// what shortform accepts; this text parser exists only because two positions
// hand this module a string instead of a CST subtree, and it recognizes the
// identical vocabulary so a longform `type: "string | number"` field
// resolves to the same union structure a shortform field would.

import type { Position, Span } from '../ast/span.ts';
import type { TypeExprNode, TypeNamedNode } from '../ast/type-expr-node.ts';

export interface ParseTypeExprTextOptions {
  // The 1-based line/column where `text[0]` sits in the real document —
  // spans are computed relative to this offset so a readonly-array element
  // or a longform quoted-string's inner type carries a real position, not a
  // text-relative one starting at (1,1). Defaults to (1, 1) for isolated use
  // (e.g. tests).
  readonly baseLine?: number;
  readonly baseColumn?: number;
}

export interface ParseTypeExprTextResult {
  readonly typeExpr: TypeExprNode;
  // Unconsumed trailing text, if any — always empty for a well-formed type
  // expression; the doc's opaque fallback absorbs anything the six
  // structured kinds don't recognize, so a non-empty remainder signals a
  // parser bug, not a legitimately-unparsable input.
  readonly remainder: string;
}

const NAMED_TOKEN = /^[A-Za-z_]\w*/;
const NUMBER_TOKEN = /^-?\d+(\.\d+)?/;
const READONLY_PREFIX = /^readonly[ \t]+(?=[A-Za-z_(])/;
// Mirrors grammar.js's _qualified_name_opaque_token: a dotted/qualified type
// reference (`ts.CompilerOptions`) has no structured production and must
// fall to type_opaque, exactly like the grammar-side fix for the same shape
// (review finding B1) — this is the longest-match check at the SAME position
// a bare NAMED_TOKEN would also match, so it must be tried FIRST.
const QUALIFIED_NAME_TOKEN = /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+/;

class TextCursor {
  readonly text: string;
  index = 0;
  readonly baseLine: number;
  readonly baseColumn: number;

  constructor(text: string, baseLine: number, baseColumn: number) {
    this.text = text;
    this.baseLine = baseLine;
    this.baseColumn = baseColumn;
  }

  positionAt(index: number): Position {
    // Type-expression text is always single-line (field_type/readonly_paren_rest/
    // a longform quoted string's inner text never carry a real newline — the
    // grammar excludes '\n' from every text-carrying token in this family).
    return { line: this.baseLine, column: this.baseColumn + index };
  }

  skipWhitespace(): void {
    while (this.index < this.text.length && (this.text[this.index] === ' ' || this.text[this.index] === '\t')) {
      this.index += 1;
    }
  }

  peek(): string {
    return this.text.slice(this.index);
  }

  startsWith(literal: string): boolean {
    return this.text.startsWith(literal, this.index);
  }
}

const spanFrom = (cursor: TextCursor, startIndex: number, endIndex: number): Span => {
  return { start: cursor.positionAt(startIndex), end: cursor.positionAt(endIndex) };
};

const parseNamed = (cursor: TextCursor): TypeNamedNode | undefined => {
  const match = NAMED_TOKEN.exec(cursor.peek());
  if (match === null) {
    return undefined;
  }
  const startIndex = cursor.index;
  cursor.index += match[0].length;
  return { kind: 'named', name: match[0], span: spanFrom(cursor, startIndex, cursor.index) };
};

const parseStringLiteral = (cursor: TextCursor): TypeExprNode | undefined => {
  if (cursor.peek()[0] !== '"') {
    return undefined;
  }
  const startIndex = cursor.index;
  const closingIndex = cursor.text.indexOf('"', cursor.index + 1);
  const endIndex = closingIndex === -1 ? cursor.text.length : closingIndex + 1;
  const raw = cursor.text.slice(startIndex, endIndex);
  cursor.index = endIndex;
  return {
    kind: 'literal',
    literalKind: 'string',
    value: raw.replace(/^"/, '').replace(/"$/, ''),
    span: spanFrom(cursor, startIndex, endIndex),
  };
};

const parseNumberLiteral = (cursor: TextCursor): TypeExprNode | undefined => {
  const match = NUMBER_TOKEN.exec(cursor.peek());
  if (match === null) {
    return undefined;
  }
  const startIndex = cursor.index;
  cursor.index += match[0].length;
  return { kind: 'literal', literalKind: 'number', value: match[0], span: spanFrom(cursor, startIndex, cursor.index) };
};

// Balances (), [], {} to arbitrary depth exactly like the grammar's
// _opaque_run/_opaque_piece family — the text-parser twin of that recursive
// production, since this module cannot invoke the grammar recursively.
const scanOpaqueRun = (cursor: TextCursor): string => {
  const startIndex = cursor.index;
  const stack: string[] = [];
  const closerFor: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  while (cursor.index < cursor.text.length) {
    const ch = cursor.text[cursor.index];
    if (ch === '"' && stack.length === 0) {
      break;
    }
    if (ch === undefined) {
      break;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(closerFor[ch] ?? '');
      cursor.index += 1;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
        cursor.index += 1;
        continue;
      }
      // An unmatched closer at depth 0 ends the opaque run (mirrors the
      // grammar: an opaque leaf never consumes a closer it did not open).
      if (stack.length === 0) {
        break;
      }
      cursor.index += 1;
      continue;
    }
    if (stack.length === 0 && (ch === '|' || ch === '&')) {
      // Top-level union/intersection operators end an opaque run so
      // `union: string | number` still splits on '|' even when 'string'
      // itself fell through to opaque for some other reason; inside a
      // bracket/paren group, '|'/'&' are part of the opaque text (e.g. a
      // function-type union return position) and stay consumed.
      break;
    }
    cursor.index += 1;
  }
  return cursor.text.slice(startIndex, cursor.index);
};

const parseAtom = (cursor: TextCursor): TypeExprNode => {
  cursor.skipWhitespace();
  const readonlyMatch = READONLY_PREFIX.exec(cursor.peek());
  if (readonlyMatch !== null) {
    const startIndex = cursor.index;
    cursor.index += readonlyMatch[0].length;
    const element = parseAtom(cursor);
    cursor.skipWhitespace();
    if (cursor.startsWith('[]')) {
      cursor.index += 2;
      return { kind: 'array', element, readonly: true, spelling: 'suffix', span: spanFrom(cursor, startIndex, cursor.index) };
    }
    // No trailing `[]` after all — `readonly` was not actually the array
    // prefix (defensive: the grammar-level compound token already prevents
    // this from occurring at a real call site; kept for a text parser that
    // may see hand-constructed input in isolation, e.g. tests).
    cursor.index = startIndex;
  }
  if (cursor.startsWith('(')) {
    const startIndex = cursor.index;
    cursor.index += 1;
    const inner = parseUnion(cursor);
    cursor.skipWhitespace();
    if (cursor.startsWith(')')) {
      cursor.index += 1;
      return inner;
    }
    // Unbalanced — fall through to opaque scanning from the original start.
    cursor.index = startIndex;
    const text = scanOpaqueRun(cursor);
    return { kind: 'opaque', text: text.trim(), span: spanFrom(cursor, startIndex, cursor.index) };
  }
  const stringLiteral = parseStringLiteral(cursor);
  if (stringLiteral !== undefined) {
    return stringLiteral;
  }
  const numberLiteral = parseNumberLiteral(cursor);
  if (numberLiteral !== undefined) {
    return numberLiteral;
  }
  // Qualified/dotted name check BEFORE the plain named-type check (review
  // finding B1): both match the SAME leading identifier at this position,
  // but the qualified form is the objectively longer match, so it must win
  // outright — routing straight to opaque exactly like grammar.js's
  // _qualified_name_opaque_token does for the identical shape.
  const qualifiedMatch = QUALIFIED_NAME_TOKEN.exec(cursor.peek());
  if (qualifiedMatch !== null) {
    const startIndex = cursor.index;
    cursor.index += qualifiedMatch[0].length;
    return { kind: 'opaque', text: qualifiedMatch[0], span: spanFrom(cursor, startIndex, cursor.index) };
  }
  const namedStartIndex = cursor.index;
  const named = parseNamed(cursor);
  if (named !== undefined) {
    cursor.skipWhitespace();
    if (cursor.startsWith('<')) {
      cursor.index += 1;
      const args: TypeExprNode[] = [parseUnion(cursor)];
      cursor.skipWhitespace();
      while (cursor.startsWith(',')) {
        cursor.index += 1;
        args.push(parseUnion(cursor));
        cursor.skipWhitespace();
      }
      if (cursor.startsWith('>')) {
        cursor.index += 1;
      }
      const genericSpan = spanFrom(cursor, namedStartIndex, cursor.index);
      // Review finding B3 / lead ruling: mirror type-expr-from-cst.ts's
      // Array<T> normalization (doc §2 — Array only, one argument, base
      // name literally "Array"; no other generic base normalizes).
      const [onlyArg] = args;
      if (named.name === 'Array' && args.length === 1 && onlyArg !== undefined) {
        return { kind: 'array', element: onlyArg, readonly: false, spelling: 'generic', span: genericSpan };
      }
      return { kind: 'generic', base: named, args, span: genericSpan };
    }
    return named;
  }
  const startIndex = cursor.index;
  const text = scanOpaqueRun(cursor);
  if (text.length === 0) {
    // Nothing recognizable and nothing to balance-scan (e.g. a stray
    // operator at the very start) — consume one character so the parser
    // always makes progress, matching the grammar's own always-terminates
    // guarantee (doc's "parsing never throws on malformed input").
    cursor.index += 1;
    return { kind: 'opaque', text: cursor.text.slice(startIndex, cursor.index), span: spanFrom(cursor, startIndex, cursor.index) };
  }
  return { kind: 'opaque', text: text.trim(), span: spanFrom(cursor, startIndex, cursor.index) };
};

const parsePostfix = (cursor: TextCursor): TypeExprNode => {
  const elementStartIndex = cursor.index;
  let result = parseAtom(cursor);
  cursor.skipWhitespace();
  while (cursor.startsWith('[]')) {
    cursor.index += 2;
    // The array's own span covers the WHOLE expression (element through the
    // closing `]`), not just the `[]` suffix — spanFrom's start must be the
    // element's own start position, captured BEFORE parseAtom advanced the
    // cursor past it (a prior bug here used cursor.index at the `[` position,
    // producing a span that started after the element instead of before it).
    result = {
      kind: 'array',
      element: result,
      readonly: false,
      spelling: 'suffix',
      span: spanFrom(cursor, elementStartIndex, cursor.index),
    };
    cursor.skipWhitespace();
  }
  return result;
};

const parseIntersection = (cursor: TextCursor): TypeExprNode => {
  const startIndex = cursor.index;
  const members = [parsePostfix(cursor)];
  cursor.skipWhitespace();
  while (cursor.startsWith('&')) {
    cursor.index += 1;
    members.push(parsePostfix(cursor));
    cursor.skipWhitespace();
  }
  if (members.length === 1) {
    const [only] = members;
    if (only !== undefined) {
      return only;
    }
  }
  return { kind: 'intersection', members, span: spanFrom(cursor, startIndex, cursor.index) };
};

const parseUnion = (cursor: TextCursor): TypeExprNode => {
  const startIndex = cursor.index;
  const members = [parseIntersection(cursor)];
  cursor.skipWhitespace();
  while (cursor.startsWith('|')) {
    cursor.index += 1;
    members.push(parseIntersection(cursor));
    cursor.skipWhitespace();
  }
  if (members.length === 1) {
    const [only] = members;
    if (only !== undefined) {
      return only;
    }
  }
  return { kind: 'union', members, span: spanFrom(cursor, startIndex, cursor.index) };
};

export const parseTypeExprText = (text: string, options: ParseTypeExprTextOptions = {}): ParseTypeExprTextResult => {
  const cursor = new TextCursor(text, options.baseLine ?? 1, options.baseColumn ?? 1);
  cursor.skipWhitespace();
  const typeExpr = parseUnion(cursor);
  return { typeExpr, remainder: cursor.text.slice(cursor.index) };
};
