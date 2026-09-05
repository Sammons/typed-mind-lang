import { parseSignatureText, type Span } from '@sammons/typed-mind';
import { mapStructuralSegments, stripComments } from './type-text-segments.ts';

const collapseTypeWhitespace = (text: string): string =>
  mapStructuralSegments(stripComments(text), (segment) => segment.replace(/\s+/g, ' ')).trim();
const offsetAt = (text: string, position: Span['start']): number =>
  text
    .split('\n')
    .slice(0, position.line - 1)
    .reduce((offset, line) => offset + line.length + 1, 0) +
  position.column -
  1;

import type { DeclarationIdentity, ParsedConstructor, ParsedModule, ParsedTypeParameter, ParsedTypeText } from './types.ts';

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
  const functionLike = <T extends FunctionLike | ParsedConstructor>(func: T): T => {
    const args = func.parameters.map((parameter) => ({ ...parameter, type: rewrite(parameter.typeInfo, parameter.type) }));
    const returnType = 'returnType' in func ? rewrite(func.returnTypeInfo, func.returnType) : undefined;
    const changed =
      args.some((parameter, index) => parameter.type !== func.parameters[index]?.type) ||
      ('returnType' in func && returnType !== func.returnType);
    // Parse only the existing signature's slot boundaries. Retain its header,
    // labels and separators rather than rebuilding from name conventions.
    const parsed = parseSignatureText(func.signature, { allowMissingReturnType: !('returnType' in func) });
    const edits: { start: number; end: number; text: string }[] = [];
    if (changed && parsed.kind === 'parsed' && parsed.signature.parameters.length === args.length) {
      for (const [index, parameter] of parsed.signature.parameters.entries()) {
        if (parameter.type !== undefined && args[index] !== undefined && args[index].type !== func.parameters[index]?.type)
          edits.push({
            start: offsetAt(func.signature, parameter.type.span.start),
            end: offsetAt(func.signature, parameter.type.span.end),
            text: collapseTypeWhitespace(args[index].type),
          });
      }
      if (parsed.signature.returnType !== undefined && returnType !== undefined && 'returnType' in func && returnType !== func.returnType)
        edits.push({
          start: offsetAt(func.signature, parsed.signature.returnType.span.start),
          end: offsetAt(func.signature, parsed.signature.returnType.span.end),
          text: collapseTypeWhitespace(returnType),
        });
    }
    const signature = edits
      .sort((left, right) => right.start - left.start)
      .reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), func.signature);
    return 'returnType' in func
      ? { ...func, parameters: args, returnType, signature, typeParameters: parameters(func.typeParameters) }
      : { ...func, parameters: args, signature };
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
            ...(cls.constructors === undefined ? {} : { constructors: cls.constructors.map(functionLike) }),
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
