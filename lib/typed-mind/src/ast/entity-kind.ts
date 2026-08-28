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
  | 'Dependency'
  | 'TypeDef';

// RFC-TM-8 §5 (rfc-tm-8-diamond.md, X-TYPE-7) — one entity kind covers both
// enum and alias named-type declarations (RULING: two kinds were rejected —
// the census evidence shows both constructs share every reference position,
// so doubling VALID_REFERENCES and the grammar surface for a distinction one
// discriminant carries is not worth it). `variant` is TypeDefNode's own
// discriminant, one level below EntityKind's own `kind`.
export type TypeDefVariant = 'enum' | 'alias';

// RunParameter category sigil (grammar: env/iam/runtime/config), unchanged
// from the legacy literal union at types.ts RunParameterEntity.paramType.
export type RunParameterType = 'env' | 'iam' | 'runtime' | 'config';
