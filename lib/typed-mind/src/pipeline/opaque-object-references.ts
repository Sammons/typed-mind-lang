// RFC-TM-14 §S4 R4a (rfc-tm-14-diamond.md): a bounded inline-object parse for
// an opaque TypeExpr leaf. The grammar keeps `{ ... }` opaque (no seventh
// TypeExpr kind — Rejected Alternatives); this module recovers only the member
// types so the shared walker can credit the names inside them. Member grammar
// (the doc's EBNF; anything else makes the WHOLE leaf contribute nothing):
//
//   object   := '{' [member (sep member)* [sep]] '}'    sep := ';' | ','  (top level only)
//   member   := ['readonly'] key ['?'] ':' type
//             | key ['?'] ['<' ... '>'] '(' params ')' [':' type]
//   key      := identifier | string-literal
//
// Rejected shapes: index signatures, mapped types, `get`/`set` accessors,
// call/construct signatures, numeric keys. Depth tracking over `()[]{}<>` and
// quoted strings follows grammar/src/scanner.c:32-80 (`=>`, `<=`, `>=` open
// and close nothing; a template `${` is unsupported).
//
// R4b (delta R4-tq) lives here too: `(typeof <QualifiedName>)` plus optional
// indexed-access postfix (`[number]`, `[]`) names a VALUE, so the walker fires
// `hooks.valueReference`, never `hooks.reference` (G-1).

import type { ParsedSignature } from '../ast/callable-signature.ts';
import type { Span } from '../ast/span.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { parseSignatureText } from './parse-signature-text.ts';
import { parseTypeExprText } from './type-expr-from-text.ts';

export interface OpaqueTextBase {
  readonly baseLine: number;
  readonly baseColumn: number;
}

export type OpaqueObjectMember =
  | { readonly kind: 'property'; readonly key: string; readonly typeExpr: TypeExprNode }
  | { readonly kind: 'method'; readonly key: string; readonly signature: ParsedSignature };

export type OpaqueObjectParseResult =
  | { readonly kind: 'members'; readonly members: readonly OpaqueObjectMember[] }
  | { readonly kind: 'rejected' };

export interface TypeQueryReference {
  readonly name: string;
  readonly span: Span;
}

const REJECTED: OpaqueObjectParseResult = { kind: 'rejected' };
const IDENTIFIER = /^[A-Za-z_]\w*/;
const QUALIFIED_NAME = /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*/;
const TYPE_QUERY = /^\(\s*typeof\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\)((?:\s*\[[^\]]*\])*)\s*$/;
const closerFor: Readonly<Record<string, string>> = { '(': ')', '[': ']', '{': '}', '<': '>' };

// Top-level `;` / `,` separator indexes inside `text`, or undefined when the
// text is unbalanced, carries an unfinished quote, or uses a template
// interpolation (scanner.c's own rejection).
const scanSeparators = (text: string): readonly number[] | undefined => {
  const stack: string[] = [];
  const separators: number[] = [];
  let quote = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';
    if (quote !== '') {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
      else if (quote === '`' && char === '$' && text[index + 1] === '{') return undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if ((char === '=' && text[index + 1] === '>') || ((char === '<' || char === '>') && text[index + 1] === '=')) {
      index += 1;
      continue;
    }
    const closer = closerFor[char];
    if (closer !== undefined) {
      stack.push(closer);
    } else if (')]}>'.includes(char)) {
      if (stack.pop() !== char) return undefined;
    } else if (stack.length === 0 && (char === ';' || char === ',')) {
      separators.push(index);
    }
  }
  return stack.length === 0 && quote === '' ? separators : undefined;
};

// The index just past the `)` that closes the parameter list opened at
// `openIndex`, honoring quotes and nested groups; undefined when unbalanced.
const parameterListEnd = (text: string, openIndex: number): number | undefined => {
  const stack: string[] = [];
  let quote = '';
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index] ?? '';
    if (quote !== '') {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if ((char === '=' && text[index + 1] === '>') || ((char === '<' || char === '>') && text[index + 1] === '=')) {
      index += 1;
      continue;
    }
    const closer = closerFor[char];
    if (closer !== undefined) stack.push(closer);
    else if (')]}>'.includes(char)) {
      if (stack.pop() !== char) return undefined;
      if (stack.length === 0) return index + 1;
    }
  }
  return undefined;
};

const keyAt = (text: string, index: number): { readonly key: string; readonly end: number } | undefined => {
  const quote = text[index];
  if (quote === '"' || quote === "'") {
    for (let cursor = index + 1; cursor < text.length; cursor += 1) {
      const char = text[cursor];
      if (char === '\\') cursor += 1;
      else if (char === quote) return { key: text.slice(index + 1, cursor), end: cursor + 1 };
    }
    return undefined;
  }
  const match = IDENTIFIER.exec(text.slice(index));
  return match === null ? undefined : { key: match[0], end: index + match[0].length };
};

const skipSpaces = (text: string, index: number): number => {
  let cursor = index;
  while (cursor < text.length && /\s/.test(text[cursor] ?? '')) cursor += 1;
  return cursor;
};

// `typeAt` parses the type text starting at `index` (absolute in `text`) with
// real columns so the walker's spans stay source-mapped through the caller.
const typeAt = (text: string, index: number, end: number, base: OpaqueTextBase): TypeExprNode | undefined => {
  const start = skipSpaces(text, index);
  const raw = text.slice(start, end).trimEnd();
  if (raw === '') return undefined;
  const parsed = parseTypeExprText(raw, { baseLine: base.baseLine, baseColumn: base.baseColumn + start });
  return parsed.remainder.trim() === '' ? parsed.typeExpr : undefined;
};

const memberAt = (text: string, start: number, end: number, base: OpaqueTextBase): OpaqueObjectMember | undefined => {
  let cursor = skipSpaces(text, start);
  let readonlyModifier = false;
  const modifier = /^readonly\s+/.exec(text.slice(cursor, end));
  if (modifier !== null) {
    const after = cursor + modifier[0].length;
    // `readonly` is a modifier only when a key follows it; `readonly: T` and
    // `readonly?: T` keep `readonly` as the key itself.
    if (keyAt(text, after) !== undefined) {
      readonlyModifier = true;
      cursor = after;
    }
  }
  const key = keyAt(text, cursor);
  if (key === undefined) return undefined;
  cursor = skipSpaces(text, key.end);
  if (text[cursor] === '?') cursor = skipSpaces(text, cursor + 1);
  const next = text[cursor];
  if (next === ':') {
    const typeExpr = typeAt(text, cursor + 1, end, base);
    return typeExpr === undefined ? undefined : { kind: 'property', key: key.key, typeExpr };
  }
  // A construct signature (`new (...)`) is outside the member grammar.
  if (readonlyModifier || key.key === 'new' || (next !== '(' && next !== '<')) return undefined;
  const parametersOpen = next === '<' ? text.indexOf('(', cursor) : cursor;
  if (parametersOpen === -1) return undefined;
  const parametersEnd = parameterListEnd(text, parametersOpen);
  if (parametersEnd === undefined || parametersEnd > end) return undefined;
  const signatureText = text.slice(cursor, parametersEnd);
  const parsed = parseSignatureText(signatureText, {
    baseLine: base.baseLine,
    baseColumn: base.baseColumn + cursor,
    allowMissingReturnType: true,
  });
  if (parsed.kind !== 'parsed') return undefined;
  const afterParameters = skipSpaces(text, parametersEnd);
  if (afterParameters >= end) return { kind: 'method', key: key.key, signature: parsed.signature };
  if (text[afterParameters] !== ':') return undefined;
  const returnStart = skipSpaces(text, afterParameters + 1);
  const returnText = text.slice(returnStart, end).trimEnd();
  const typeExpr = typeAt(text, afterParameters + 1, end, base);
  if (typeExpr === undefined) return undefined;
  const returnSpan: Span = {
    start: { line: base.baseLine, column: base.baseColumn + returnStart },
    end: { line: base.baseLine, column: base.baseColumn + returnStart + returnText.length },
  };
  return {
    kind: 'method',
    key: key.key,
    signature: { ...parsed.signature, returnType: { kind: 'type', text: returnText, span: returnSpan, typeExpr } },
  };
};

export const parseOpaqueObjectMembers = (text: string, base: OpaqueTextBase): OpaqueObjectParseResult => {
  const open = skipSpaces(text, 0);
  if (text[open] !== '{') return REJECTED;
  const close = text.lastIndexOf('}');
  if (close <= open || text.slice(close + 1).trim() !== '') return REJECTED;
  const inner = text.slice(open + 1, close);
  const separators = scanSeparators(inner);
  if (separators === undefined) return REJECTED;
  const members: OpaqueObjectMember[] = [];
  const bounds = [...separators, inner.length];
  let start = 0;
  for (const [position, stop] of bounds.entries()) {
    const piece = inner.slice(start, stop);
    if (piece.trim() === '') {
      // Only a trailing separator may leave an empty piece.
      if (position !== bounds.length - 1) return REJECTED;
    } else {
      const member = memberAt(text, open + 1 + start, open + 1 + stop, base);
      if (member === undefined) return REJECTED;
      members.push(member);
    }
    start = stop + 1;
  }
  return { kind: 'members', members };
};

// `(typeof Name)` with optional indexed-access text after the group. The
// returned span covers the qualified name only.
export const parseTypeQueryReference = (text: string, base: OpaqueTextBase): TypeQueryReference | undefined => {
  const match = TYPE_QUERY.exec(text);
  if (match === null) return undefined;
  const name = match[1] ?? '';
  const nameIndex = text.indexOf(name, text.indexOf('typeof') + 'typeof'.length);
  if (nameIndex === -1 || QUALIFIED_NAME.exec(name)?.[0] !== name) return undefined;
  return {
    name,
    span: {
      start: { line: base.baseLine, column: base.baseColumn + nameIndex },
      end: { line: base.baseLine, column: base.baseColumn + nameIndex + name.length },
    },
  };
};
