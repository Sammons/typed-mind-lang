// Adversarial-review regression repro (PR #115 comment) — a union of
// object literals NESTED INSIDE a generic (`Record<K, A | B>`) must NOT
// trip `isUnionOfObjectLiterals` (issue #114's fix): the top-level `|`
// sits inside Record's own angle brackets, not at the alias's own top
// level, so `Shapes` must stay on the DTO field-splitting path exactly as
// it did before issue #114's fix landed. Pre-fix-of-the-fix, the bracket
// depth tracker didn't count `<`/`>`, so it misread this `|` as top-level
// and corrupted a previously-correct emission.

export type Shapes = Record<string, { a: string } | { b: string }>;

export const useShapes = (shapes: Shapes): number => Object.keys(shapes).length;
