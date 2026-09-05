# 118 — opaque TypeExpr leaves yield no references (RFC-TM-14 §S4, leaves R3b, R4a, R4b)

Fixture number 118 is the Diamond Doc's proposed number (`rfc-tm-14-diamond.md`,
"Leaf specifications": R3b, R4a, R4b), free at `origin/main` d8acf75.
Quantum U4b (`feat/tm14-opaque-leaf-refs`); check file
`tests/ladder/opaque-leaf-references.test.ts`.

## Symptom (before, at d8acf75)

The converted document checks with exactly two findings:

```
checker/orphaned-entity: Orphaned entity 'CODES'
checker/orphaned-entity: Orphaned entity 'Legacy'
```

Both names are used in source, only through opaque TypeExpr leaves:

- `Legacy` inside the constructor payload `(args: Base & { kind: Legacy })` (part 1, R3b;
  live core `run-parameter-node.ts:16`) and inside the alias
  `Persisted = Omit<Base, "id"> & { ...; tier?: Legacy; send(cmd: Base): Promise<Legacy>; ... }`
  (part 2, R4a; live webhookstorage `tenant-billing.ts` `PersistedTenantRecord`).
- `CODES` inside `Code = (typeof CODES)[number]` (part 3, R4b; live core `check-codes.ts:140`
  `CheckCode`).

## Root cause

`lib/typed-mind/src/pipeline/type-reference-walk.ts` re-parsed an opaque leaf only as a
callable signature; an inline object body and a type query contributed nothing.

## Fix

- R4a: `opaque-object-references.ts` runs a bounded inline-object member parse (the doc's EBNF);
  member types fire `hooks.reference` at the leaf's position. Rejected shapes (index signature,
  accessor) make the whole leaf contribute nothing — the `IndexControl` / `AccessorControl`
  controls pin that.
- R4b: `(typeof X)` fires the NEW `hooks.valueReference`, consumed only by `check-orphans.ts`
  and `link-index.ts`, so the generic/DTO checks never see it and the misspelled control
  `(typeof CODEZ)` stays silent (non-goal N-tq-unknown).
- R3b: the `sourceSpan` closure is hoisted so the new arms map spans through a quoted
  payload's `textOffsets`.

## Out of scope, observed here

A single-quoted string literal inside a generic argument in the alias slot
(`Persisted = Omit<Base, 'id'> & { ... }`) parses with `syntax/missing: Missing '>'`; the
fixture uses double quotes, which the grammar accepts. Grammar gap, not owned by U4.
