import type { SignatureParseResult } from './callable-signature.ts';
import type { Span } from './span.ts';

export interface MethodDeclarationNode {
  readonly name: string | undefined;
  readonly signature: SignatureParseResult | undefined;
  readonly span: Span;
}
export interface ConstructorDeclarationNode {
  readonly signature: SignatureParseResult;
  readonly span: Span;
}
export interface ClassMembers {
  readonly methods: readonly MethodDeclarationNode[];
  readonly constructors: readonly ConstructorDeclarationNode[];
}
export type ClassMemberArgs =
  | { readonly methods: readonly string[]; readonly members?: never }
  | { readonly members: ClassMembers; readonly methods?: never };

// Typed declarations belong to their class. Only legacy name-list entries
// refer to independently declared global Functions.
export const legacyMethodNames = (entity: {
  readonly methods: readonly string[];
  readonly members: ClassMembers | undefined;
}): readonly string[] =>
  entity.members === undefined
    ? entity.methods
    : entity.members.methods.flatMap((method) => (method.signature === undefined && method.name !== undefined ? [method.name] : []));

export const methodSignature = (member: MethodDeclarationNode) => {
  const parsed = member.signature?.kind === 'parsed' ? member.signature.signature : undefined;
  return parsed !== undefined && member.name !== undefined && /^[A-Za-z_]\w*$/.test(member.name) && parsed.displayName === member.name
    ? parsed
    : undefined;
};

export const constructorSignature = (member: ConstructorDeclarationNode) => {
  const parsed = member.signature.kind === 'parsed' ? member.signature.signature : undefined;
  return parsed !== undefined &&
    parsed.displayName === undefined &&
    !parsed.async &&
    parsed.returnType === undefined &&
    parsed.typeParameterNames.length === 0 &&
    (parsed.typeParameters?.length ?? 0) === 0
    ? parsed
    : undefined;
};
