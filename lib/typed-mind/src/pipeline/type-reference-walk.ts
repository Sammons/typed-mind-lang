import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { parametersOf } from '../ast/declared-type-parameters.ts';
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import type { HeritageReference } from '../ast/heritage-reference.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import type { TypeExprNode, TypeNamedNode, TypeOpaqueNode } from '../ast/type-expr-node.ts';
import type { TypeParameterNode } from '../ast/type-parameter-node.ts';
import { type ParsedSignature, parseSignatureText, type SignatureTypePosition } from './parse-signature-text.ts';

export type TypeReferencePosition = 'field' | 'alias' | 'signature' | 'constraint' | 'default' | 'heritage-base' | 'heritage-argument';
export interface TypeReferenceHooks {
  readonly reference: (node: TypeNamedNode, args: readonly TypeExprNode[], position: TypeReferencePosition) => void;
  readonly parameters?: (parameters: readonly TypeParameterNode[]) => void;
  readonly opaque?: (node: TypeOpaqueNode, position: TypeReferencePosition) => void;
  readonly heritage?: (reference: HeritageReference, role: 'extends' | 'implements', binders: ReadonlySet<string>) => void;
}

export const walkTypeReferences = (
  node: TypeExprNode,
  binders: ReadonlySet<string>,
  hooks: TypeReferenceHooks,
  position: TypeReferencePosition,
): void => {
  switch (node.kind) {
    case 'named':
      if (!binders.has(node.name)) hooks.reference(node, [], position);
      return;
    case 'generic':
      if (!binders.has(node.base.name)) hooks.reference(node.base, node.args, position);
      for (const argument of node.args) walkTypeReferences(argument, binders, hooks, position);
      return;
    case 'array':
      if (node.spelling === 'generic' && !node.readonly && !binders.has('Array')) {
        const start = node.span.start;
        hooks.reference(
          { kind: 'named', name: 'Array', span: { start, end: { line: start.line, column: start.column + 5 } } },
          [node.element],
          position,
        );
      }
      walkTypeReferences(node.element, binders, hooks, position);
      return;
    case 'union':
    case 'intersection':
      for (const member of node.members) walkTypeReferences(member, binders, hooks, position);
      return;
    case 'opaque': {
      const parsed = parseSignatureText(node.text, { baseLine: node.span.start.line, baseColumn: node.span.start.column });
      if (parsed.kind === 'parsed') walkSignatureTypes(parsed.signature, binders, hooks, position);
      else hooks.opaque?.(node, position);
      return;
    }
    case 'literal':
      return;
  }
};

const walkParameterTypes = (parameters: readonly TypeParameterNode[], binders: ReadonlySet<string>, hooks: TypeReferenceHooks): void => {
  hooks.parameters?.(parameters);
  for (const parameter of parameters) {
    if (parameter.constraint !== undefined) walkTypeReferences(parameter.constraint, binders, hooks, 'constraint');
    if (parameter.defaultType !== undefined) walkTypeReferences(parameter.defaultType, binders, hooks, 'default');
  }
};

export const walkSignatureTypes = (
  signature: ParsedSignature,
  outerBinders: ReadonlySet<string>,
  hooks: TypeReferenceHooks,
  position: TypeReferencePosition = 'signature',
  includeRootParameters = true,
): void => {
  const names = signature.typeParameters?.map((parameter) => parameter.name) ?? signature.typeParameterNames;
  const binders = new Set([...outerBinders, ...(includeRootParameters ? names : [])]);
  if (includeRootParameters && signature.typeParameters !== undefined) walkParameterTypes(signature.typeParameters, binders, hooks);
  const visit = (type: SignatureTypePosition): void => {
    if (type.kind === 'callable') walkSignatureTypes(type.signature, binders, hooks, position);
    else walkTypeReferences(type.typeExpr, binders, hooks, position);
  };
  for (const parameter of signature.parameters) if (parameter.type !== undefined) visit(parameter.type);
  if (signature.returnType !== undefined) visit(signature.returnType);
};

export const walkEntityTypeReferences = (entity: EntityNode, hooks: TypeReferenceHooks): void => {
  const parameters = parametersOf(entity);
  const binders = new Set(parameters?.map((parameter) => parameter.name));
  if (parameters !== undefined) walkParameterTypes(parameters, binders, hooks);
  if (entity instanceof DtoNode) {
    for (const field of entity.fields) walkTypeReferences(field.typeExpr, binders, hooks, 'field');
  } else if (entity instanceof TypeDefNode && entity.aliasType !== undefined) {
    walkTypeReferences(entity.aliasType, binders, hooks, 'alias');
  } else if (entity instanceof FunctionNode) {
    const parsed = parseSignatureText(entity.signature, { baseLine: entity.span.start.line, baseColumn: entity.span.start.column });
    if (parsed.kind === 'parsed') walkSignatureTypes(parsed.signature, binders, hooks, 'signature', parameters === undefined);
  }
  const heritage = (reference: HeritageReference, role: 'extends' | 'implements'): void => {
    hooks.heritage?.(reference, role, binders);
    if (reference.kind !== 'named') return;
    if (!binders.has(reference.base.name)) hooks.reference(reference.base, reference.args, 'heritage-base');
    for (const argument of reference.args) walkTypeReferences(argument, binders, hooks, 'heritage-argument');
  };
  if (entity instanceof ClassNode || entity instanceof ClassFileNode) {
    if (entity.heritage.extends !== undefined) heritage(entity.heritage.extends, 'extends');
    for (const reference of entity.heritage.implements) heritage(reference, 'implements');
  } else if (entity instanceof DtoNode) {
    for (const reference of entity.extendsReferences ?? []) heritage(reference, 'extends');
  }
};
