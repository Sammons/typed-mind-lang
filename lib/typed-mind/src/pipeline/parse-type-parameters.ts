import type { Position, Span } from '../ast/span.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import type { TypeParameterNode } from '../ast/type-parameter-node.ts';
import { parseTypeExprText } from './type-expr-from-text.ts';
import { canonicalizeTypeText, type NormalizedTypeText, scanTypeDelimiters } from './type-text-lexical.ts';

export interface ParseTypeParameterOptions {
  readonly baseLine?: number;
  readonly baseColumn?: number;
}

export type TypeParameterParseResult =
  | { readonly kind: 'parsed'; readonly parameters: readonly TypeParameterNode[] }
  | {
      readonly kind: 'invalid';
      readonly text: string;
      readonly span: Span;
      readonly reason: 'empty-parameter' | 'invalid-binding' | 'unbalanced-parameter' | 'missing-type' | 'unsupported-multiline-literal';
    };

type Failure = Extract<TypeParameterParseResult, { kind: 'invalid' }>['reason'];
class ParameterSource {
  readonly raw: string;
  readonly normalized: NormalizedTypeText;
  readonly options: ParseTypeParameterOptions;

  constructor(raw: string, normalized: NormalizedTypeText, options: ParseTypeParameterOptions) {
    this.raw = raw;
    this.normalized = normalized;
    this.options = options;
  }

  position(index: number): Position {
    const before = this.raw.slice(0, index);
    const lines = before.split('\n');
    return {
      line: (this.options.baseLine ?? 1) + lines.length - 1,
      column: lines.length === 1 ? (this.options.baseColumn ?? 1) + index : (lines.at(-1)?.length ?? 0) + 1,
    };
  }

  span(start: number, end: number): Span {
    return {
      start: this.position(this.normalized.offsets[start] ?? this.raw.length),
      end: this.position(this.normalized.offsets[end] ?? this.raw.length),
    };
  }

  locate(node: TypeExprNode, start: number): TypeExprNode {
    const span = this.span(start + node.span.start.column - 1, start + node.span.end.column - 1);
    switch (node.kind) {
      case 'generic':
        return {
          ...node,
          span,
          base: { ...node.base, span: this.span(start + node.base.span.start.column - 1, start + node.base.span.end.column - 1) },
          args: node.args.map((arg) => this.locate(arg, start)),
        };
      case 'array':
        return { ...node, span, element: this.locate(node.element, start) };
      case 'union':
      case 'intersection':
        return { ...node, span, members: node.members.map((member) => this.locate(member, start)) };
      default:
        return { ...node, span };
    }
  }

  type(start: number, end: number): TypeExprNode | undefined {
    const slice = this.normalized.text.slice(start, end);
    const text = slice.trim();
    if (text === '') return undefined;
    const offset = start + slice.indexOf(text);
    const parsed = parseTypeExprText(text);
    return parsed.remainder.trim() === ''
      ? this.locate(parsed.typeExpr, offset)
      : { kind: 'opaque', text, span: this.span(offset, offset + text.length) };
  }
}

const parse = (raw: string, list: boolean, options: ParseTypeParameterOptions): TypeParameterParseResult => {
  const normalized = canonicalizeTypeText(raw);
  const source = new ParameterSource(
    raw,
    typeof normalized === 'string' ? { text: raw, offsets: Array.from({ length: raw.length + 1 }, (_, index) => index) } : normalized,
    options,
  );
  const invalid = (reason: Failure): TypeParameterParseResult => ({
    kind: 'invalid',
    text: raw,
    span: { start: source.position(0), end: source.position(raw.length) },
    reason,
  });
  if (typeof normalized === 'string') return invalid(normalized);
  const trimmed = normalized.text.trim();
  const outerStart = normalized.text.indexOf(trimmed);
  if (list && (!trimmed.startsWith('<') || !trimmed.endsWith('>'))) return invalid('unbalanced-parameter');
  const start = outerStart + (list ? 1 : 0);
  const end = outerStart + trimmed.length - (list ? 1 : 0);
  const body = normalized.text.slice(start, end);
  const separators = scanTypeDelimiters(body);
  if (separators === undefined) return invalid('unbalanced-parameter');
  const commas = separators.filter((entry) => entry.char === ',').map((entry) => start + entry.index);
  if (!list && commas.length > 0) return invalid('invalid-binding');
  const parameters: TypeParameterNode[] = [];
  let offset = start;
  for (const stop of [...commas, end]) {
    const chunk = normalized.text.slice(offset, stop);
    const text = chunk.trim();
    const entryStart = offset + chunk.indexOf(text);
    offset = stop + 1;
    if (text === '') {
      if (list && stop === end && parameters.length > 0) continue;
      return invalid('empty-parameter');
    }
    const head = /^((?:(?:const|in|out)\s+)*)([A-Za-z_$][\w$]*)(?=\s|=|$)/.exec(text);
    if (head === null) return invalid('invalid-binding');
    const name = head[2];
    if (name === undefined) return invalid('invalid-binding');
    const modifiers = (head[1]?.trim().split(/\s+/).filter(Boolean) ?? []) as ('const' | 'in' | 'out')[];
    const remainderStart = entryStart + head[0].length;
    const tail = normalized.text.slice(remainderStart, stop).trimStart();
    const tailStart = stop - tail.length;
    const assignments = scanTypeDelimiters(tail)?.filter((entry) => entry.char === '=') ?? [];
    if (assignments.length > 1) return invalid('invalid-binding');
    const assignment = assignments[0]?.index;
    const beforeDefault = assignment === undefined ? tail : tail.slice(0, assignment).trimEnd();
    if (beforeDefault !== '' && !/^extends\b/.test(beforeDefault)) return invalid('invalid-binding');
    const constraint = beforeDefault === '' ? undefined : source.type(tailStart + 'extends'.length, tailStart + beforeDefault.length);
    if (beforeDefault !== '' && constraint === undefined) return invalid('missing-type');
    const defaultType = assignment === undefined ? undefined : source.type(tailStart + assignment + 1, stop);
    if (assignment !== undefined && defaultType === undefined) return invalid('missing-type');
    parameters.push({
      name,
      modifiers,
      constraint,
      defaultType,
      raw: raw.slice(normalized.offsets[entryStart], normalized.offsets[entryStart + text.length]),
      span: source.span(entryStart, entryStart + text.length),
    });
  }
  return { kind: 'parsed', parameters };
};

export const parseTypeParameterText = (text: string, options: ParseTypeParameterOptions = {}): TypeParameterParseResult =>
  parse(text, false, options);
export const parseTypeParameterListText = (text: string, options: ParseTypeParameterOptions = {}): TypeParameterParseResult =>
  parse(text, true, options);
