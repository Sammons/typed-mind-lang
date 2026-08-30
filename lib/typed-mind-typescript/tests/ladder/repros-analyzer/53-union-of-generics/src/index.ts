// Adversarial-review regression repro, round 2 (PR #115 comment) — a
// top-level union of two GENERICS, each internally containing its own
// nested union of object literals, must NOT trip isUnionOfObjectLiterals:
// the narrowed guard requires EVERY top-level-split member to itself be a
// bare object literal (`isInlineObjectLiteralType`) — `Record<...>` and
// `Map<...>` are not, so this whole alias stays on the DTO path exactly
// as it did before issue #114's fix landed. Routing this shape into
// parseTypeExprText instead would hit that module's own pre-existing,
// PR-independent bracket-depth bug (type-expr-from-text.ts's
// scanOpaqueRun also omits `<`/`>` — tracked separately as issue #118,
// not fixed in this increment).

export type SideBySideGenerics = Record<string, { a: string } | { b: string }> | Map<string, { c: string } | { d: string }>;

export const app = (x: SideBySideGenerics): boolean => x !== undefined;
