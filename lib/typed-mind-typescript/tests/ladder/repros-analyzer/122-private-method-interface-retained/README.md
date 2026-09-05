# 122 — a retained private method-bearing interface is owner-qualified

RFC-TM-14 (`rfc-tm-14-diamond.md`) S7 / P6, leaf R9, Quantum U7. Fixture
number 122 as the doc proposes. Test: `ladder/private-identities.test.ts`.

## Shape

- `src/run.ts`: `interface ClientLike { send(command: UpdateCommand): Promise<unknown> }`
  is NOT exported; `UpdateCommand` comes from the package `update-client`;
  `export async function run(c: ClientLike) {}` retains the interface.
- `src/main.ts` (entry) imports `run` and the DTO `Job`.
- `src/shapes.ts` is a pure-types module: a private method-bearing
  `Reporter` reached from two DTO carriers, `export interface Job` and the
  type alias `export type Batch = { readonly reporters: Reporter[]; fallback?: Reporter }`.

The package `update-client` is a stub the test writes into a tmpdir copy of
this fixture (the repo ignores `node_modules/`), so the fixture is analyzed
from that copy, never in place.

## Before (origin/main)

```
class ClientLike {
  type: Class
  method: "send(command: UpdateClient.UpdateCommand) => Promise<unknown>"
}
class Reporter { ... }
run :: async run(c: ClientLike) => any
```

Checker: `checker/class-not-exported` twice (`ClientLike`, `Reporter`) for
classes the source never exported. Live instances: `DocumentClientLike` in
the webhookstorage ingest and api captures (`rfc-tm-13-evidence/webhook-dispositions.md`).

## After

```
RunFile @ src/run.ts:
  <- [UpdateClient]
  -> [run]
ShapesFile @ src/shapes.ts:
  -> [Job]
class RunFile.ClientLike { ... }
class ShapesFile.Reporter { ... }
run :: async run(c: RunFile.ClientLike) => any
Job %
  - reporter: ShapesFile.Reporter
```

```
Batch %
  - reporters: ShapesFile.Reporter[]
  - fallback?: ShapesFile.Reporter
```

Zero findings. `ShapesFile` exists only because a private Class needs an
owner (`needsOwner`). The `Batch` alias carrier needs the A2 rewrite to
walk inline object-literal members (`type-reference-rewrite.ts`,
`visitInlineObjectMembers`): before that walk the alias body kept the bare
`Reporter` while the declaration was renamed, which produced
`orphaned-entity` + `dto-field-unknown-type` (reviewer blocker B1 on PR #196). Control: adding `RunFile.ClientLike` to `MainFile`'s
imports reports `Qualified name 'RunFile.ClientLike' is owned by 'RunFile'
but is not exported for this reference` (`check-context.ts`, `private-member`).

## Mechanism

`typescript-to-typedmind-converter.ts`, `reserveEntityNames`: a retained
non-exported interface on the Class lane (`isRetainedPrivateClassInterface`)
is partitioned out of the bare-name contest and reserved as `${owner}.${name}`
once File owners exist; its module joins `needsOwner`. Private DTO-lane
interfaces and TypeDefs keep their standalone names (non-goal N-9u).

`type-reference-rewrite.ts`: `structuralNames` descends into an opaque
inline object literal and marks each `[readonly] key?: type` member's type
slot structural (same depth/quote/separator rules as the converter's
`splitObjectLiteralProperties`). Method and index-signature members stay
unsupported. One divergence from the converter's field parser: the rewrite
also accepts string-literal keys (`'quoted': T`), which
`parseObjectLiteralProperty` (`^(\w+)`) drops — the rewrite renames a slot
the converter never emits, harmless on output.
