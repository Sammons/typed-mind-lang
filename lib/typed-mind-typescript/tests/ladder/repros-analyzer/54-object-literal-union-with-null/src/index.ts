// Boundary case for isUnionOfObjectLiterals's narrowed guard — a union
// mixing a bare object literal with `null` (not itself an object
// literal). The narrowed guard (every top-level-split member must be
// isInlineObjectLiteralType) correctly says `false` for this shape, so it
// stays on the ORIGINAL DTO path (isObjectLikeType's naive `.includes('{')`
// check, which is what this shape used before issue #114's fix ever
// existed) — matching main's exact pre-existing degrade rather than
// being newly routed anywhere.

export type MaybeThing = { a: string } | null;

export const app = (x: MaybeThing): boolean => x !== null;
