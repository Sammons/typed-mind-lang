import type { ParsedSignature, SignatureParseResult, SignatureTypePosition } from '../ast/callable-signature.ts';
import type { Span } from '../ast/span.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { decodeQuotedString } from '../quoted-string.ts';
import { parseSignatureText } from './parse-signature-text.ts';

// Quoted member payloads are single-line strings. Map decoded offsets back to
// their actual token columns, including the outer quote and escaped quotes or
// backslashes; unknown escape pairs remain two decoded characters in the codec.
export const parseQuotedSignature = (raw: string, tokenSpan: Span, isConstructor: boolean): SignatureParseResult => {
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
      default:
        return { ...node, span: span(node.span) };
    }
  };
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
  const parsed = parseSignatureText(decodeQuotedString(raw), { allowMissingReturnType: isConstructor });
  return parsed.kind === 'opaque' ? { ...parsed, span: span(parsed.span) } : { kind: 'parsed', signature: signature(parsed.signature) };
};
