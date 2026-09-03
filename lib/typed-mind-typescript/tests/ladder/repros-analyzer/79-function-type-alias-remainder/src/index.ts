// Corpus: sammons/code-outline-cli packages/parser/src/tree-utils.ts, whose
// `TreeVisitor`/`NodePredicate` are function-type aliases authored across
// multiple lines. `parseTypeExprText`'s `(` branch treats the function's
// PARAMETER LIST as a parenthesized type GROUP: it returns the inner type
// and leaves `) => T` in `remainder`, which every call site discards
// (`parseTypeExprText(...).typeExpr`). The emitted TypeDef is then the bare
// parameter text — multi-line and ungrammatical.
export type TreeVisitor<T = void> = (
  node: NodeInfo,
  depth: number,
  parent?: NodeInfo
) => T;

export type NodePredicate = (node: NodeInfo, depth: number) => boolean;

export interface NodeInfo {
  name: string;
}

export const visitTree = (visitor: TreeVisitor<void>, predicate: NodePredicate): void => {
  const root: NodeInfo = { name: 'root' };
  if (predicate(root, 0)) {
    visitor(root, 0, undefined);
  }
};
