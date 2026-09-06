import type { ParsedSignature, SignatureParseResult, SignatureTypePosition } from '../ast/callable-signature.ts';
import type { PropertyDeclarationNode } from '../ast/class-members.ts';
import type { Span } from '../ast/span.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { decodeQuotedString } from '../quoted-string.ts';
import { parseSignatureText } from './parse-signature-text.ts';
import { parseTypeExprText } from './type-expr-from-text.ts';

// Quoted member payloads are single-line strings. Map decoded offsets back to
// their actual token columns, including the outer quote and escaped quotes or
// backslashes; unknown escape pairs remain two decoded characters in the codec.
// `quotedPayloadMapper` is shared by the signature parser (`method:` /
// `constructor:`) and the property parser (`property:`, RFC-TM-14 §S4 R3a).
const quotedPayloadMapper = (raw: string, tokenSpan: Span) => {
  const offsets = [1];
  for (let index = 1; index < raw.length - 1; ) {
    index += raw[index] === '\\' && (raw[index + 1] === '"' || raw[index + 1] === '\\') ? 2 : 1;
    offsets.push(index);
  }
  const span = (value: Span): Span => ({
    start: { line: tokenSpan.start.line, column: tokenSpan.start.column + (offsets[value.start.column - 1] ?? raw.length - 1) },
    end: { line: tokenSpan.start.line, column: tokenSpan.start.column + (offsets[value.end.column - 1] ?? raw.length - 1) },
  });
  const type = (node: TypeExprNode): TypeExprNode => {
    switch (node.kind) {
      case 'generic':
        return { ...node, span: span(node.span), base: { ...node.base, span: span(node.base.span) }, args: node.args.map(type) };
      case 'array':
        return { ...node, span: span(node.span), element: type(node.element) };
      case 'union':
      case 'intersection':
        return { ...node, span: span(node.span), members: node.members.map(type) };
      case 'opaque': {
        const start = node.span.start.column - 1;
        const end = node.span.end.column - 1;
        const base = offsets[start] ?? 1;
        return {
          ...node,
          span: span(node.span),
          textOffsets: offsets.slice(start, end + 1).map((offset) => offset - base),
        };
      }
      default:
        return { ...node, span: span(node.span) };
    }
  };
  return { span, type };
};

export const parseQuotedSignature = (raw: string, tokenSpan: Span, isConstructor: boolean): SignatureParseResult => {
  const decoded = decodeQuotedString(raw);
  const { span, type } = quotedPayloadMapper(raw, tokenSpan);
  const position = (value: SignatureTypePosition): SignatureTypePosition =>
    value.kind === 'type'
      ? { ...value, span: span(value.span), typeExpr: type(value.typeExpr) }
      : { ...value, span: span(value.span), signature: signature(value.signature) };
  const signature = (value: ParsedSignature): ParsedSignature => ({
    ...value,
    span: span(value.span),
    ...(value.typeParameters === undefined
      ? {}
      : {
          typeParameters: value.typeParameters.map((parameter) => ({
            ...parameter,
            span: span(parameter.span),
            constraint: parameter.constraint === undefined ? undefined : type(parameter.constraint),
            defaultType: parameter.defaultType === undefined ? undefined : type(parameter.defaultType),
          })),
        }),
    parameters: value.parameters.map((parameter) => ({
      ...parameter,
      span: span(parameter.span),
      type: parameter.type === undefined ? undefined : position(parameter.type),
    })),
    returnType: value.returnType === undefined ? undefined : position(value.returnType),
  });
  const parsed = parseSignatureText(decoded, { allowMissingReturnType: isConstructor });
  return parsed.kind === 'opaque' ? { ...parsed, span: span(parsed.span) } : { kind: 'parsed', signature: signature(parsed.signature) };
};

// RFC-TM-14 §S4 R3a: `property: "[readonly] name[?]: Type"`. The type text is
// parsed at its decoded column and mapped through the same offset table, so
// spans inside an escaped payload land on real source columns (G-7).
// `undefined` means the payload is not a property declaration.
const PROPERTY_HEAD = /^\s*(readonly\s+)?([A-Za-z_]\w*)\s*(\?)?\s*:\s*/;

export const parseQuotedTypeExpr = (raw: string, tokenSpan: Span, memberSpan: Span): PropertyDeclarationNode | undefined => {
  const decoded = decodeQuotedString(raw);
  const head = PROPERTY_HEAD.exec(decoded);
  if (head === null || head[0].length === decoded.length) return undefined;
  const { type } = quotedPayloadMapper(raw, tokenSpan);
  const parsed = parseTypeExprText(decoded.slice(head[0].length), { baseLine: 1, baseColumn: head[0].length + 1 });
  if (parsed.remainder.trim() !== '') return undefined;
  return {
    name: head[2] ?? '',
    optionality: head[3] === undefined ? 'none' : 'question',
    readonly: head[1] !== undefined,
    typeExpr: type(parsed.typeExpr),
    span: memberSpan,
  };
};
