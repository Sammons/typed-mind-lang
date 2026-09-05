import type { ParsedSignature, SignatureParseResult, SignatureTypePosition } from '../ast/callable-signature.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { parseSignatureText } from '../pipeline/parse-signature-text.ts';
import { printTypeParameter } from './generic-declaration-emission.ts';
import { printTypeExpr } from './print-type-expr.ts';

const printableType = (node: TypeExprNode): TypeExprNode => {
  if (node.kind === 'generic') return { ...node, args: node.args.map(printableType) };
  if (node.kind === 'union' || node.kind === 'intersection') return { ...node, members: node.members.map(printableType) };
  if (node.kind === 'array') return { ...node, element: printableType(node.element) };
  if (node.kind === 'opaque') {
    const parsed = parseSignatureText(node.text);
    if (parsed.kind === 'parsed') return { ...node, text: printParsedSignature(parsed.signature) };
  }
  return node;
};

export const printSignatureType = (position: SignatureTypePosition): string =>
  position.kind === 'callable' ? printParsedSignature(position.signature) : printTypeExpr(printableType(position.typeExpr));

export const printParsedSignature = (signature: ParsedSignature): string => {
  const parameters = signature.parameters.map(
    (parameter) =>
      `${parameter.rest ? '...' : ''}${parameter.binding}${parameter.optional ? '?' : ''}${parameter.type === undefined ? '' : `: ${printSignatureType(parameter.type)}`}${parameter.defaultText === undefined ? '' : ` = ${parameter.defaultText}`}`,
  );
  const generics =
    signature.typeParameters === undefined
      ? (signature.typeParameterText ?? '')
      : signature.typeParameters.length === 0
        ? ''
        : `<${signature.typeParameters.map(printTypeParameter).join(', ')}>`;
  return `${signature.async ? 'async ' : ''}${signature.displayName ?? ''}${generics}(${parameters.join(', ')})${signature.returnType === undefined ? '' : ` => ${printSignatureType(signature.returnType)}`}`;
};

export const printSignature = (result: SignatureParseResult): string =>
  result.kind === 'opaque' ? result.text : printParsedSignature(result.signature);
