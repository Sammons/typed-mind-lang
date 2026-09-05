import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { type ParsedSignature, parseSignatureText, type SignatureTypePosition } from '../pipeline/parse-signature-text.ts';
import { isPrimitiveType } from './type-builtins.ts';

const collectType = (type: TypeExprNode, referenced: Set<string>, binders: ReadonlySet<string>): void => {
  switch (type.kind) {
    case 'named':
      if (!binders.has(type.name)) {
        referenced.add(type.name);
      }
      return;
    case 'generic':
      if (!isPrimitiveType(type.base.name) && !binders.has(type.base.name)) {
        referenced.add(type.base.name);
      }
      for (const arg of type.args) {
        collectType(arg, referenced, binders);
      }
      return;
    case 'array':
      collectType(type.element, referenced, binders);
      return;
    case 'union':
    case 'intersection':
      for (const member of type.members) {
        collectType(member, referenced, binders);
      }
      return;
    case 'opaque': {
      const parsed = parseSignatureText(type.text, { baseLine: type.span.start.line, baseColumn: type.span.start.column });
      if (parsed.kind === 'parsed') {
        collectSignatureReferences(parsed.signature, referenced, binders);
      }
      return;
    }
    case 'literal':
      return;
  }
};

const collectPosition = (position: SignatureTypePosition, referenced: Set<string>, binders: ReadonlySet<string>): void => {
  if (position.kind === 'callable') {
    collectSignatureReferences(position.signature, referenced, binders);
  } else {
    collectType(position.typeExpr, referenced, binders);
  }
};

// B3 reuses this collector for typed members. Binder names are lexical;
// they never consume an unrelated entity with the same global name.
export const collectSignatureReferences = (
  signature: ParsedSignature,
  referenced: Set<string>,
  outerBinders: ReadonlySet<string> = new Set(),
): void => {
  const binders = new Set([...outerBinders, ...signature.typeParameterNames]);
  for (const parameter of signature.parameters) {
    if (parameter.type !== undefined) {
      collectPosition(parameter.type, referenced, binders);
    }
  }
  if (signature.returnType !== undefined) {
    collectPosition(signature.returnType, referenced, binders);
  }
};
