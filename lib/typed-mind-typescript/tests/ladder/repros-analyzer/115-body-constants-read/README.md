# 115 — function-body Constants reads emit consumes

RFC-TM-14 (`rfc-tm-14-diamond.md`) §S1 (P3), leaf **R2a**, Quantum U1.
The doc assigns this fixture number 115.

## Shape

`src/main.ts` (the entry): Constants `LIMIT` and `TABLE`; `apply` reads both
(`Math.min(n, LIMIT)` and the receiver `TABLE.get('x')`); `pack` reads `LIMIT`
through a shorthand property (`{ LIMIT }`, A-10). Controls: `shadow`
reads a parameter named `LIMIT`; `local` reads a function-local `const LIMIT`.
The doc spells `shadow` without `export`; this fixture exports it so the control
is asserted on the emitted Function entity as well as on the analyzer's
`bodyReferences`.

## Expected

- `apply $< [LIMIT, TABLE]`, `pack $< [LIMIT]`; `shadow` and `local` carry no `consumes`.
- Zero `checker/orphaned-entity` findings for `LIMIT` and `TABLE`.

## Before

The body walk recorded call and `new` targets only; a value read was never
collected, so both Constants were orphans.
