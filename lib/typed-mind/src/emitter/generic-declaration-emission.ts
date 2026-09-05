import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import type { Diagnostic } from '../ast/diagnostic.ts';
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import type { HeritageReference } from '../ast/heritage-reference.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import type { TypeParameterNode } from '../ast/type-parameter-node.ts';
import { printTypeExpr } from './print-type-expr.ts';
import { quoteStringLiteral } from './quote-string-literal.ts';

export const parametersOf = (entity: EntityNode): readonly TypeParameterNode[] | undefined => {
  if (
    entity instanceof ClassNode ||
    entity instanceof ClassFileNode ||
    entity instanceof DtoNode ||
    entity instanceof FunctionNode ||
    entity instanceof TypeDefNode
  )
    return entity.typeParameters;
  return undefined;
};

export const printTypeParameter = (parameter: TypeParameterNode): string => {
  const binding = [...parameter.modifiers, parameter.name].join(' ');
  const constraint = parameter.constraint === undefined ? '' : ` extends ${printTypeExpr(parameter.constraint)}`;
  const defaultType = parameter.defaultType === undefined ? '' : ` = ${printTypeExpr(parameter.defaultType)}`;
  return binding + constraint + defaultType;
};

export const parameterHeader = (entity: EntityNode): string => {
  const parameters = parametersOf(entity);
  return parameters === undefined || parameters.length === 0 ? '' : `<${parameters.map((parameter) => parameter.name).join(', ')}>`;
};

export const parameterLines = (entity: EntityNode): string[] =>
  (parametersOf(entity) ?? []).map((parameter) => `typeParameter: ${quoteStringLiteral(printTypeParameter(parameter))}`);

export const printHeritage = (reference: HeritageReference): string => {
  if (reference.kind === 'opaque') return reference.text;
  return (
    reference.base.name + (reference.args.length === 0 ? '' : `<${reference.args.map((argument) => printTypeExpr(argument)).join(', ')}>`)
  );
};

export const heritageLines = (entity: ClassNode | ClassFileNode): string[] => {
  const lines: string[] = [];
  const base = entity.heritage.extends;
  if (base !== undefined)
    lines.push(`extends: ${base.kind === 'named' && base.args.length === 0 ? base.base.name : quoteStringLiteral(printHeritage(base))}`);
  const implementations = entity.heritage.implements;
  if (implementations.every((reference) => reference.kind === 'named' && reference.args.length === 0)) {
    if (implementations.length > 0) lines.push(`implements: [${implementations.map(printHeritage).join(', ')}]`);
  } else lines.push(...implementations.map((reference) => `implements: ${quoteStringLiteral(printHeritage(reference))}`));
  return lines;
};

const containsOpaque = (node: TypeExprNode): boolean => {
  if (node.kind === 'opaque') return true;
  if (node.kind === 'generic') return node.args.some(containsOpaque);
  if (node.kind === 'array') return containsOpaque(node.element);
  if (node.kind === 'union' || node.kind === 'intersection') return node.members.some(containsOpaque);
  return false;
};

export const genericNeedsLongform = (entity: EntityNode): boolean => {
  if (
    (parametersOf(entity) ?? []).some(
      (parameter) =>
        parameter.modifiers.length > 0 ||
        parameter.constraint !== undefined ||
        parameter.defaultType !== undefined ||
        !/^[A-Za-z_]\w*$/.test(parameter.name),
    )
  )
    return true;
  if (entity instanceof DtoNode && (entity.extendsReferences?.length ?? 0) > 0) return true;
  if (entity instanceof ClassNode || entity instanceof ClassFileNode) {
    if (entity.heritage.extends === undefined && entity.heritage.implements.length > 0) return true;
    const references = [...(entity.heritage.extends === undefined ? [] : [entity.heritage.extends]), ...entity.heritage.implements];
    return references.some((reference) => reference.kind === 'opaque' || reference.args.some(containsOpaque));
  }
  return false;
};

export const genericEmissionDiagnostics = (entity: EntityNode): Diagnostic[] => {
  const parameters = parametersOf(entity) ?? [];
  return parameters
    .filter((parameter) => /[\r\n]/.test(printTypeParameter(parameter)))
    .map((parameter) => ({
      code: 'emitter/unsupported-multiline-type-parameter',
      severity: 'error',
      span: parameter.span,
      message: `Type parameter '${parameter.name}' in '${entity.name}' contains a multiline value; use a single-line literal before emission.`,
    }));
};
