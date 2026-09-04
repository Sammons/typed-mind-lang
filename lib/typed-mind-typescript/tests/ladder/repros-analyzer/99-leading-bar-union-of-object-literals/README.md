# 99 — a leading `|` must not defeat the union-of-object-literals guard

Corpus: `sammons/slat` (`products/slat`), fixtures 98-101 rung.

## Status: regression pin, not a new fix

This gap was found independently against the slat corpus and fixed in
**PR #158 (fixture 90, `90-multiline-union-alias-leading-bar`)** while this
rung was in review. The two rungs hit the same defect from different corpora,
the same way fixtures 66/70/76 converged on mixin heritage.

PR #158's `normalizeUnionAliasText` is the single surviving implementation.
This rung's own `.filter(...)` on `isUnionOfObjectLiterals` and its analyzer-
side leading-bar strip were **dropped** on review (PR #165, comment 22273) as
duplicates.

The fixture is kept as a **regression pin from a second corpus**. It is a real
pin, not a vacuous one: verified to FAIL on `e461e24` (main immediately before
PR #158 merged) and to PASS on `c9af608` (#158's merge) with none of this
branch's source changes applied.

## Symptom

`type RestoreFailure =\n  | { ... }\n  | { ... }` emitted a field-LESS
`RestoreFailure %`, discarding all 7 variants of the live type. The
single-line spelling (`{ a } | { b }`) routed correctly to a TypeDef.

Because the emitted entity was structurally empty but syntactically valid,
`--check` reported the `scripts/backup.ts` target **clean** — a false
negative.

## Root cause

`isUnionOfObjectLiterals` calls `splitTopLevelUnionMembers`, which splits on
EVERY top-level `|`. A leading bar therefore yields an empty first member;
`''` fails `isInlineObjectLiteralType`, `every(...)` returns false, and the
alias falls through to the DTO field-splitting path the guard exists to avoid.

Separately, TypeScript's `getText()` preserves the leading bar, so even once
routing was correct an unnormalized alias emitted a truncated `X = |`.

PR #158's `normalizeUnionAliasText` addresses both: it strips comments,
collapses the type to one line, and removes a leading bar before the guard
runs.
