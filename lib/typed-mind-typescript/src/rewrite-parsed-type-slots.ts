import { parseSignatureText } from '@sammons/typed-mind';

const collapseTypeWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

import type { DeclarationIdentity, ParsedModule, ParsedTypeParameter, ParsedTypeText } from './types.ts';

type FunctionLike = ParsedModule['functions'][number] | ParsedModule['classes'][number]['methods'][number];
export const rewriteParsedTypeSlots = (
  modules: readonly ParsedModule[],
  canRewriteOwner: (identity: DeclarationIdentity | undefined) => boolean,
  rewrite: (info: ParsedTypeText | undefined, fallback: string) => string,
): ParsedModule[] => {
  const parameters = (items: readonly ParsedTypeParameter[] | undefined): readonly ParsedTypeParameter[] | undefined => {
    for (const parameter of items ?? []) {
      if (parameter.constraint !== undefined) rewrite(parameter.constraint, parameter.constraint.text);
      if (parameter.defaultType !== undefined) rewrite(parameter.defaultType, parameter.defaultType.text);
    }
    // G consumes rewriteTypeSlot on these original companions before parsing.
    return items;
  };
  const functionLike = <T extends FunctionLike>(func: T): T => {
    const args = func.parameters.map((parameter) => ({ ...parameter, type: rewrite(parameter.typeInfo, parameter.type) }));
    const returnType = rewrite(func.returnTypeInfo, func.returnType);
    const changed = args.some((parameter, index) => parameter.type !== func.parameters[index]?.type) || returnType !== func.returnType;
    // Parse only the existing signature's slot boundaries. Retain its header,
    // labels and separators rather than rebuilding from name conventions.
    const parsed = parseSignatureText(func.signature);
    const edits: { start: number; end: number; text: string }[] = [];
    if (changed && parsed.kind === 'parsed' && parsed.signature.parameters.length === args.length) {
      for (const [index, parameter] of parsed.signature.parameters.entries()) {
        if (parameter.type !== undefined && args[index] !== undefined)
          edits.push({
            start: parameter.type.span.start.column - 1,
            end: parameter.type.span.end.column - 1,
            text: collapseTypeWhitespace(args[index].type),
          });
      }
      if (parsed.signature.returnType !== undefined)
        edits.push({
          start: parsed.signature.returnType.span.start.column - 1,
          end: parsed.signature.returnType.span.end.column - 1,
          text: collapseTypeWhitespace(returnType),
        });
    }
    const signature = edits
      .sort((left, right) => right.start - left.start)
      .reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), func.signature);
    return { ...func, parameters: args, returnType, signature, typeParameters: parameters(func.typeParameters) };
  };
  return modules.map((module) => ({
    ...module,
    functions: module.functions.map((func) => (canRewriteOwner(func.declaration) ? functionLike(func) : func)),
    classes: module.classes.map((cls) =>
      !canRewriteOwner(cls.declaration)
        ? cls
        : {
            ...cls,
            properties: cls.properties.map((property) => ({ ...property, type: rewrite(property.typeInfo, property.type) })),
            methods: cls.methods.map(functionLike),
            extends: cls.extends.map((type, index) => rewrite(cls.extendsTypeInfo?.[index], type)),
            implements: cls.implements.map((type, index) => rewrite(cls.implementsTypeInfo?.[index], type)),
            typeParameters: parameters(cls.typeParameters),
          },
    ),
    interfaces: module.interfaces.map((iface) =>
      !canRewriteOwner(iface.declaration)
        ? iface
        : {
            ...iface,
            properties: iface.properties.map((property) => ({ ...property, type: rewrite(property.typeInfo, property.type) })),
            methods: iface.methods.map(functionLike),
            extends: iface.extends.map((type, index) => rewrite(iface.extendsTypeInfo?.[index], type)),
            typeParameters: parameters(iface.typeParameters),
          },
    ),
    types: module.types.map((alias) =>
      !canRewriteOwner(alias.declaration)
        ? alias
        : {
            ...alias,
            type: rewrite(alias.typeInfo, alias.type),
            typeParameters: parameters(alias.typeParameters),
          },
    ),
    constants: module.constants.map((constant) =>
      !canRewriteOwner(constant.declaration)
        ? constant
        : {
            ...constant,
            type: rewrite(constant.typeInfo, constant.type),
          },
    ),
  }));
};
