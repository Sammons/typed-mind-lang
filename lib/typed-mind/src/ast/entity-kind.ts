// RFC-TM-3 §2.2 (rfc-tm-3-diamond.md) — the kind discriminant vocabulary for
// the semantic AST. String-literal union (house rule: no enums); values match
// the legacy EntityType strings verbatim so the Q5 shadow projection and the
// TM-4 validator port compare kinds without a mapping table.

export type EntityKind =
  | 'Program'
  | 'File'
  | 'Function'
  | 'Class'
  | 'ClassFile'
  | 'Constants'
  | 'DTO'
  | 'Asset'
  | 'UIComponent'
  | 'RunParameter'
  | 'Dependency';

// RunParameter category sigil (grammar: env/iam/runtime/config), unchanged
// from the legacy literal union at types.ts RunParameterEntity.paramType.
export type RunParameterType = 'env' | 'iam' | 'runtime' | 'config';
