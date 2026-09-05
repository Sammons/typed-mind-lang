import type { Position, Span } from '../ast/span.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { parseTypeExprText } from './type-expr-from-text.ts';

export type SignatureTypePosition =
  | { readonly kind: 'type'; readonly text: string; readonly span: Span; readonly typeExpr: TypeExprNode }
  | { readonly kind: 'callable'; readonly text: string; readonly span: Span; readonly signature: ParsedSignature };

export interface SignatureParameter {
  readonly binding: string;
  readonly span: Span;
  readonly type: SignatureTypePosition | undefined;
  readonly optional: boolean;
  readonly rest: boolean;
  readonly defaultText: string | undefined;
}

export interface ParsedSignature {
  readonly text: string;
  readonly span: Span;
  readonly displayName: string | undefined;
  readonly async: boolean;
  readonly typeParameterText: string | undefined;
  readonly typeParameterNames: readonly string[];
  readonly parameters: readonly SignatureParameter[];
  readonly returnType: SignatureTypePosition | undefined;
}

export type SignatureParseResult =
  | { readonly kind: 'parsed'; readonly signature: ParsedSignature }
  | {
      readonly kind: 'opaque';
      readonly text: string;
      readonly span: Span;
      readonly reason: 'unsupported-shape' | 'incomplete-signature' | 'unconsumed-text';
    };

export interface ParseSignatureTextOptions {
  readonly baseLine?: number;
  readonly baseColumn?: number;
  readonly allowMissingReturnType?: boolean;
}

type ParseFailure = Extract<SignatureParseResult, { kind: 'opaque' }>['reason'];
interface Delimiter {
  readonly index: number;
  readonly char: string;
}
type ScanResult =
  | { readonly kind: 'scanned'; readonly end: number; readonly delimiters: readonly Delimiter[] }
  | { readonly kind: 'failed'; readonly reason: ParseFailure };

const closerFor: Readonly<Record<string, string>> = { '(': ')', '[': ']', '{': '}', '<': '>' };
const isAssignment = (text: string, index: number): boolean => {
  return text[index] === '=' && !'=!<>'.includes(text[index - 1] ?? ' ') && !'=>'.includes(text[index + 1] ?? ' ');
};

// Scan delimiters, not identifiers. Defaults are expressions: comparisons and
// arrows there cannot open or close generic arguments. Unsupported lexical
// forms return opaque instead of allowing their punctuation to create types.
const scan = (text: string, start: number, stop: string | undefined, parameters: boolean): ScanResult => {
  const stack: string[] = [];
  const delimiters: Delimiter[] = [];
  const state = { quote: '', defaultExpression: false };
  for (let index = start; index < text.length; index += 1) {
    const char = text[index] ?? '';
    if (state.quote !== '') {
      if (char === '\\') {
        index += 1;
      } else if (char === state.quote) {
        state.quote = '';
      } else if (state.quote === '`' && char === '$' && text[index + 1] === '{') {
        return { kind: 'failed', reason: 'unsupported-shape' };
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      state.quote = char;
      continue;
    }
    if (char === '/') {
      return { kind: 'failed', reason: 'unsupported-shape' };
    }
    const arrowOrComparison = (char === '>' && text[index - 1] === '=') || ((char === '<' || char === '>') && text[index + 1] === '=');
    if (arrowOrComparison) {
      continue;
    }
    if (stack.length === 0) {
      if (char === stop) {
        return { kind: 'scanned', end: index, delimiters };
      }
      if (char === ',' || char === ':' || isAssignment(text, index)) {
        delimiters.push({ index, char });
      }
      if (parameters && isAssignment(text, index)) {
        state.defaultExpression = true;
      } else if (parameters && char === ',') {
        state.defaultExpression = false;
      }
    }
    if (state.defaultExpression && (char === '<' || char === '>')) {
      continue;
    }
    const closer = closerFor[char];
    if (closer !== undefined) {
      stack.push(closer);
    } else if (')]}>'.includes(char)) {
      if (stack.pop() !== char) {
        return { kind: 'failed', reason: 'incomplete-signature' };
      }
    }
  }
  if (stop !== undefined || stack.length !== 0 || state.quote !== '') {
    return { kind: 'failed', reason: 'incomplete-signature' };
  }
  return { kind: 'scanned', end: text.length, delimiters };
};

class SignatureSource {
  readonly text: string;
  readonly options: ParseSignatureTextOptions;

  constructor(text: string, options: ParseSignatureTextOptions) {
    this.text = text;
    this.options = options;
  }

  positionAt(index: number): Position {
    const prefix = this.text.slice(0, index);
    const lines = prefix.split('\n');
    return {
      line: (this.options.baseLine ?? 1) + lines.length - 1,
      column: lines.length === 1 ? (this.options.baseColumn ?? 1) + index : (lines.at(-1)?.length ?? 0) + 1,
    };
  }

  span(start: number, end: number): Span {
    return { start: this.positionAt(start), end: this.positionAt(end) };
  }

  skipWhitespace(start: number): number {
    return start + (this.text.slice(start).match(/^\s*/)?.[0].length ?? 0);
  }

  failure(reason: ParseFailure): SignatureParseResult {
    return { kind: 'opaque', text: this.text, span: this.span(0, this.text.length), reason };
  }

  // TypeExpr's text parser reports linear columns even for embedded newlines.
  // Remap its offsets here so the shared parser's public spans stay real.
  locateType(node: TypeExprNode, start: number): TypeExprNode {
    const span = this.span(start + node.span.start.column - 1, start + node.span.end.column - 1);
    switch (node.kind) {
      case 'generic':
        return {
          ...node,
          span,
          base: { ...node.base, span: this.span(start + node.base.span.start.column - 1, start + node.base.span.end.column - 1) },
          args: node.args.map((arg) => this.locateType(arg, start)),
        };
      case 'array':
        return { ...node, span, element: this.locateType(node.element, start) };
      case 'union':
      case 'intersection':
        return { ...node, span, members: node.members.map((member) => this.locateType(member, start)) };
      case 'named':
      case 'literal':
      case 'opaque':
        return { ...node, span };
    }
  }

  typeAt(start: number, end: number): SignatureTypePosition | ParseFailure {
    const raw = this.text.slice(start, end);
    const offset = start + raw.length - raw.trimStart().length;
    const text = raw.trim();
    if (text === '') {
      return 'incomplete-signature';
    }
    const span = this.span(offset, offset + text.length);
    const callable = parseSignatureText(text, { baseLine: span.start.line, baseColumn: span.start.column });
    if (callable.kind === 'parsed') {
      return { kind: 'callable', text, span, signature: callable.signature };
    }
    // A recognized callable with an invalid return cannot hide its leftover
    // text in TypeExpr's opaque fallback and partially consume other slots.
    if (callable.reason !== 'unsupported-shape' && text.includes('=>')) {
      return callable.reason;
    }
    const scanned = scan(text, 0, undefined, false);
    if (scanned.kind === 'failed') {
      return scanned.reason;
    }
    const parsed = parseTypeExprText(text);
    if (parsed.remainder.trim() !== '') {
      return 'unconsumed-text';
    }
    return { kind: 'type', text, span, typeExpr: this.locateType(parsed.typeExpr, offset) };
  }

  parameterAt(start: number, end: number): SignatureParameter | ParseFailure {
    const raw = this.text.slice(start, end);
    const offset = start + raw.length - raw.trimStart().length;
    const text = raw.trim();
    const scanned = scan(text, 0, undefined, true);
    if (scanned.kind === 'failed') {
      return scanned.reason;
    }
    const assignment = scanned.delimiters.find((delimiter) => delimiter.char === '=')?.index ?? text.length;
    const colon = scanned.delimiters.find((delimiter) => delimiter.char === ':' && delimiter.index < assignment)?.index ?? assignment;
    const writtenBinding = text.slice(0, colon).trim();
    const rest = writtenBinding.startsWith('...');
    const optional = writtenBinding.endsWith('?');
    const binding = writtenBinding.slice(rest ? 3 : 0, optional ? -1 : undefined).trim();
    if (
      !/^[A-Za-z_$][\w$]*$/.test(binding) &&
      !((binding.startsWith('{') && binding.endsWith('}')) || (binding.startsWith('[') && binding.endsWith(']')))
    ) {
      return 'unsupported-shape';
    }
    const type = colon < assignment ? this.typeAt(offset + colon + 1, offset + assignment) : undefined;
    if (typeof type === 'string') {
      return type;
    }
    const defaultText = assignment < text.length ? text.slice(assignment + 1).trim() : undefined;
    if (defaultText === '') {
      return 'incomplete-signature';
    }
    return { binding, span: this.span(offset, offset + text.length), type, optional, rest, defaultText };
  }
}

export const parseSignatureText = (text: string, options: ParseSignatureTextOptions = {}): SignatureParseResult => {
  const source = new SignatureSource(text, options);
  const state = { index: source.skipWhitespace(0) };
  const asyncPrefix = /^async\s+/.exec(text.slice(state.index));
  state.index += asyncPrefix?.[0].length ?? 0;
  const displayName = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/.exec(text.slice(state.index))?.[0];
  state.index = source.skipWhitespace(state.index + (displayName?.length ?? 0));
  const binderStart = state.index;
  const typeParameterNames: string[] = [];
  if (text[state.index] === '<') {
    const binders = scan(text, state.index + 1, '>', false);
    if (binders.kind === 'failed') {
      return source.failure(binders.reason);
    }
    const stops = [...binders.delimiters.filter((delimiter) => delimiter.char === ',').map((delimiter) => delimiter.index), binders.end];
    const cursor = { index: state.index + 1 };
    for (const stop of stops) {
      const binder = text.slice(cursor.index, stop).trim();
      if (binder === '' && stop === binders.end && typeParameterNames.length > 0) {
        break; // A trailing comma is valid in a generic arrow header.
      }
      const match = /^(?:const\s+)?(?:(?:in|out)\s+)*([A-Za-z_$][\w$]*)(?=\s+extends\b|\s*=|\s*$)/.exec(binder);
      if (match?.[1] === undefined) {
        return source.failure('unsupported-shape');
      }
      typeParameterNames.push(match[1]);
      cursor.index = stop + 1;
    }
    state.index = binders.end + 1;
  }
  const typeParameterText = state.index > binderStart ? text.slice(binderStart, state.index) : undefined;
  state.index = source.skipWhitespace(state.index);
  if (text[state.index] !== '(') {
    return source.failure('unsupported-shape');
  }
  const scanned = scan(text, state.index + 1, ')', true);
  if (scanned.kind === 'failed') {
    return source.failure(scanned.reason);
  }
  const parameters: SignatureParameter[] = [];
  const stops = [...scanned.delimiters.filter((delimiter) => delimiter.char === ',').map((delimiter) => delimiter.index), scanned.end];
  const cursor = { index: state.index + 1 };
  for (const stop of stops) {
    if (text.slice(cursor.index, stop).trim() === '') {
      if (stop !== scanned.end) {
        return source.failure('incomplete-signature');
      }
    } else {
      const parameter = source.parameterAt(cursor.index, stop);
      if (typeof parameter === 'string') {
        return source.failure(parameter);
      }
      parameters.push(parameter);
    }
    cursor.index = stop + 1;
  }
  state.index = source.skipWhitespace(scanned.end + 1);
  const hasArrow = text.slice(state.index, state.index + 2) === '=>';
  if (!hasArrow && !(state.index === text.length && options.allowMissingReturnType)) {
    return source.failure(state.index === text.length ? 'incomplete-signature' : 'unconsumed-text');
  }
  const returnType = hasArrow ? source.typeAt(state.index + 2, text.length) : undefined;
  if (typeof returnType === 'string') {
    return source.failure(returnType);
  }
  return {
    kind: 'parsed',
    signature: {
      text,
      span: source.span(0, text.length),
      displayName,
      async: asyncPrefix !== null,
      typeParameterText,
      typeParameterNames,
      parameters,
      returnType,
    },
  };
};
