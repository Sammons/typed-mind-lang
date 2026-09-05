import type { ParsedModule, ParsedTypeParameter, ParsedTypeText } from './types.ts';

export const getModuleTypeInfos = (module: ParsedModule): readonly ParsedTypeText[] => {
  const infos: ParsedTypeText[] = [];
  const add = (info: ParsedTypeText | undefined): void => {
    if (info !== undefined) infos.push(info);
  };
  const generics = (parameters: readonly ParsedTypeParameter[] | undefined): void => {
    for (const parameter of parameters ?? []) {
      add(parameter.constraint);
      add(parameter.defaultType);
    }
  };
  for (const functionLike of [
    ...module.functions,
    ...module.classes.flatMap((cls) => cls.methods),
    ...module.interfaces.flatMap((iface) => iface.methods),
  ]) {
    for (const parameter of functionLike.parameters) add(parameter.typeInfo);
    add(functionLike.returnTypeInfo);
    generics(functionLike.typeParameters);
  }
  for (const owner of [...module.classes, ...module.interfaces]) {
    for (const property of owner.properties) add(property.typeInfo);
    owner.extendsTypeInfo?.forEach(add);
    generics(owner.typeParameters);
  }
  for (const cls of module.classes) {
    cls.implementsTypeInfo?.forEach(add);
    for (const member of cls.constructors ?? []) for (const parameter of member.parameters) add(parameter.typeInfo);
  }
  for (const alias of module.types) {
    add(alias.typeInfo);
    generics(alias.typeParameters);
  }
  for (const constant of module.constants) add(constant.typeInfo);
  return infos;
};
