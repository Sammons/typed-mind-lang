// RFC-TM-3 §3.2 (rfc-tm-3-diamond.md) — the position vocabulary for the new AST.
// 1-based on both axes, converted once from tree-sitter's 0-based rows/columns
// at the generated-wrapper boundary (src/ast/gen/cst-nodes.ts spanOf), matching
// the legacy Position convention so the TM-4 validator port is a type change,
// not an off-by-one hunt.

export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface Span {
  readonly start: Position;
  readonly end: Position;
}
