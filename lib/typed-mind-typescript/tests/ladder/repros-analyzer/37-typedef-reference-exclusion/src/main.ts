// issue #88 — before this fix:
//   1. `SyntaxFormat` (a TypeDef-predicted type alias, exported directly
//      from this module) always ended up in this File's `exports:` list
//      (`convertExports` had no TypeDef exclusion, unlike
//      `resolveImportToEntity`), which `VALID_REFERENCES.exports.to` (no
//      TypeDef slot) always flags as `checker/reference-to-illegal`.
//   2. `detectFormat`'s parameter/return type both name `SyntaxFormat`,
//      which `isDTOLikeType` misclassified as DTO-like by elimination
//      (never consulted `typesRegistryPredictedKind`), routing it into
//      `input`/`output` — `VALID_REFERENCES.input.to`/`.output.to` (DTO
//      only) always flags this as `checker/reference-to-illegal`, and once
//      resolved, `checker/output-not-dto`/`checker/input-not-dto`. Mirrors
//      the real `printTypeExpr`/`typeExprFromCst` shape routing the real
//      `TypeExprNode` union type into input/output.
export type SyntaxFormat = 'shortform' | 'longform' | 'mixed';

export function detectFormat(input: SyntaxFormat): SyntaxFormat {
  return input;
}
