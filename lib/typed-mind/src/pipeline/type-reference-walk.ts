import { ClassFileNode } from '../ast/class-file-node.ts';
import { constructorSignature, methodSignature } from '../ast/class-members.ts';
import { ClassNode } from '../ast/class-node.ts';
import { ConstantsNode } from '../ast/constants-node.ts';
import { parametersOf } from '../ast/declared-type-parameters.ts';
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import type { HeritageReference } from '../ast/heritage-reference.ts';
import type { Span } from '../ast/span.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import type { TypeExprNode, TypeNamedNode, TypeOpaqueNode } from '../ast/type-expr-node.ts';
import type { TypeParameterNode } from '../ast/type-parameter-node.ts';
import { parseOpaqueObjectMembers, parseTypeQueryReference } from './opaque-object-references.ts';
import { type ParsedSignature, parseSignatureText, type SignatureTypePosition } from './parse-signature-text.ts';

export type TypeReferencePosition =
  | 'field'
  | 'alias'
  | 'signature'
  | 'member-signature'
  | 'constraint'
  | 'default'
  | 'heritage-base'
  | 'heritage-argument';
export interface TypeReferenceHooks {
  readonly reference: (node: TypeNamedNode, args: readonly TypeExprNode[], position: TypeReferencePosition) => void;
  readonly parameters?: (parameters: readonly TypeParameterNode[]) => void;
  readonly opaque?: (node: TypeOpaqueNode, position: TypeReferencePosition) => void;
  // RFC-TM-14 §S4 R4b: a `(typeof X)` opaque leaf names a VALUE (Constants,
  // Function, Class). Only orphan credit and the link index consume it; the
  // generic and DTO checks stay blind to it so no type finding is fabricated.
  readonly valueReference?: (name: string, span: Span) => void;
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
      // RFC-TM-14 §S4 (rfc-tm-14-diamond.md, R4a/R4b): `sourceSpan` is hoisted
      // above the callable test so every branch maps spans through a quoted
      // payload's `textOffsets` (G-6, G2-6). `mapped` forwards each hook with
      // its span re-mapped; the `valueReference` arm keeps a `(typeof X)` leaf
      // inside a `constructor:` payload on real columns (G2-5).
      const base = { baseLine: node.span.start.line, baseColumn: node.span.start.column };
      const sourceSpan = (value: Span): Span => {
        if (node.textOffsets === undefined) return value;
        const point = (value: Span['start']): Span['start'] => {
          const offset = node.textOffsets?.[value.column - node.span.start.column];
          return offset === undefined ? value : { line: value.line, column: node.span.start.column + offset };
        };
        return { start: point(value.start), end: point(value.end) };
      };
      const mapped: TypeReferenceHooks =
        node.textOffsets === undefined
          ? hooks
          : {
              ...hooks,
              reference: (reference, args, role) => hooks.reference({ ...reference, span: sourceSpan(reference.span) }, args, role),
              ...(hooks.parameters === undefined
                ? {}
                : {
                    parameters: (parameters: readonly TypeParameterNode[]) =>
                      hooks.parameters?.(parameters.map((parameter) => ({ ...parameter, span: sourceSpan(parameter.span) }))),
                  }),
              ...(hooks.opaque === undefined
                ? {}
                : {
                    opaque: (opaque: TypeOpaqueNode, role: TypeReferencePosition) =>
                      hooks.opaque?.({ ...opaque, span: sourceSpan(opaque.span) }, role),
                  }),
              ...(hooks.valueReference === undefined
                ? {}
                : { valueReference: (name: string, span: Span) => hooks.valueReference?.(name, sourceSpan(span)) }),
            };
      const parsed = parseSignatureText(node.text, base);
      if (parsed.kind === 'parsed') {
        walkSignatureTypes(parsed.signature, binders, mapped, position);
        return;
      }
      // The leaf stays opaque to every consumer that keys on it
      // (`unsupported-generic-type` at constraint/default positions, G2-5);
      // the arms below ADD references, they never replace the opaque fact.
      hooks.opaque?.(node, position);
      const query = parseTypeQueryReference(node.text, base);
      if (query !== undefined) {
        // R4b: a value query names a VALUE, so it never reaches the type-only
        // consumers (`hooks.reference`; G-1). A miss is silent by design
        // (non-goal N-tq-unknown).
        mapped.valueReference?.(query.name, query.span);
        return;
      }
      const object = parseOpaqueObjectMembers(node.text, base);
      if (object.kind === 'rejected') return;
      for (const member of object.members) {
        if (member.kind === 'property') walkTypeReferences(member.typeExpr, binders, mapped, position);
        else walkSignatureTypes(member.signature, binders, mapped, position);
      }
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

export const walkClassMemberTypeReferences = (entity: ClassNode | ClassFileNode, hooks: TypeReferenceHooks): void => {
  const binders = new Set(entity.typeParameters?.map((parameter) => parameter.name));
  for (const member of entity.members?.methods ?? []) {
    const signature = methodSignature(member);
    if (signature !== undefined) walkSignatureTypes(signature, binders, hooks, 'member-signature');
  }
  for (const member of entity.members?.constructors ?? []) {
    const signature = constructorSignature(member);
    if (signature !== undefined) walkSignatureTypes(signature, binders, hooks, 'member-signature');
  }
  // RFC-TM-14 §S4 R3a: property types share the member position, which the
  // generic check treats as today's member position (G2-2).
  for (const member of entity.members?.properties ?? []) walkTypeReferences(member.typeExpr, binders, hooks, 'member-signature');
};

export const walkEntityTypeReferences = (entity: EntityNode, hooks: TypeReferenceHooks): void => {
  const parameters = parametersOf(entity);
  const binders = new Set(parameters?.map((parameter) => parameter.name));
  if (parameters !== undefined) walkParameterTypes(parameters, binders, hooks);
  if (entity instanceof DtoNode) {
    for (const field of entity.fields) walkTypeReferences(field.typeExpr, binders, hooks, 'field');
  } else if (entity instanceof TypeDefNode && entity.aliasType !== undefined) {
    walkTypeReferences(entity.aliasType, binders, hooks, 'alias');
  } else if (entity instanceof ConstantsNode && entity.schemaType !== undefined) {
    // RFC-TM-14 R6a: a Constants schema is walked exactly like a TypeDef
    // alias. Position 'alias' with no declared parameters keeps
    // check-generic-declarations.ts's early return (no generic-unknown-type
    // for `Config : NonExistentSchema`, the scenario-60 pin), while the
    // orphan walk and the link index credit every named leaf.
    walkTypeReferences(entity.schemaType, binders, hooks, 'alias');
  } else if (entity instanceof FunctionNode) {
    const parsed = parseSignatureText(entity.signature, { baseLine: entity.span.start.line, baseColumn: entity.span.start.column });
    if (parsed.kind === 'parsed') walkSignatureTypes(parsed.signature, binders, hooks, 'signature', parameters === undefined);
  }
  if (entity instanceof ClassNode || entity instanceof ClassFileNode) walkClassMemberTypeReferences(entity, hooks);
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
