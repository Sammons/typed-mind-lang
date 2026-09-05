import type { Span } from './span.ts';
import type { TypeExprNode, TypeNamedNode } from './type-expr-node.ts';

export type HeritageReference =
  | { readonly kind: 'named'; readonly base: TypeNamedNode; readonly args: readonly TypeExprNode[]; readonly span: Span }
  | { readonly kind: 'opaque'; readonly text: string; readonly span: Span };

export interface ClassHeritage {
  readonly extends: HeritageReference | undefined;
  readonly implements: readonly HeritageReference[];
}

export type ClassHeritageArgs =
  | { readonly heritage: ClassHeritage; readonly extends?: never; readonly implements?: never }
  | { readonly heritage?: undefined; readonly extends?: string; readonly implements: readonly string[] };

// Legacy constructors carry bare entity identities, not type expressions.
export const classHeritageFromArgs = (args: ClassHeritageArgs, span: Span): ClassHeritage => {
  if (args.heritage !== undefined) return args.heritage;
  const named = (name: string): HeritageReference => ({ kind: 'named', base: { kind: 'named', name, span }, args: [], span });
  return { extends: args.extends === undefined ? undefined : named(args.extends), implements: args.implements.map(named) };
};
