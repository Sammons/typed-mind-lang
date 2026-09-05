# 127 — a private same-file class constructed in a function is referenced

RFC-TM-14 (`rfc-tm-14-diamond.md`) §S1, leaf **R1b**, Quantum U1.
The doc proposes number 113 for this fixture; 113 was taken by Q10
(`113-self-invoked-collision-remap`, PR #189) after the doc froze, so this
fixture uses the next free number, 127.

## Shape

`src/main.ts` (the entry): `class Registry {}` (not exported) and
`export const make = () => new Registry()`.

## Expected

- `make ~> [Registry.constructor]`.
- Converter suppressions: `checker/class-not-exported` only (the non-export is
  true); the `checker/orphaned-entity` pre-suppression is NOT emitted for a
  construct target.
- Zero active (unsuppressed) findings.

## Before

The same-file fold refused a private class by design (X-SUPP-6) and emitted
both suppressions; the orphan finding was pre-suppressed, not closed.
