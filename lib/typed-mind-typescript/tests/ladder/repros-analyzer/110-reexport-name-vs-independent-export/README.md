# 110 — RFC-TM-11 Deferral RX-A: `reExports` is invisible to `checkDuplicateExports`

Citation: `rfc-tm-11-diamond.md:373-406` (Deferral RX-A). Verified on
current main after RFC-TM-13 unit R, PR #170, PR #181.

Two shapes in one fixture; `normalize.ts` declares and exports
`normalizeVehicleString`, and `main.ts` imports through both forwarders.

## Shape A — `barrel.ts`, a real re-export of the sibling: CLEAN

```ts
export { normalizeVehicleString } from './normalize.ts';
```

Emits `BarrelFile: <- [normalizeVehicleString]  <-> [normalizeVehicleString]`,
`NormalizeFile: -> [normalizeVehicleString]`. `checkDuplicateExports` reads
`exports` only (`exportsOf`), never `reExports`, so the barrel does not
double-claim the name and no `checker/multi-exported` fires. Zero
diagnostics. This is the behaviour RX-3 designed and the reason RX-A was
deferred: a `reExports`-aware duplicate check would flag this legitimate
shape unless it could tell A from B.

## Shape B — `vendor-surface.ts`, the deferral's concern: FIXED (RFC-TM-15 §S2, leaf X1)

```ts
export { normalizeVehicleString } from 'vehicle-vendor-sdk';
```

The external binding shares its spelling with the local declaration. Before
RFC-TM-15 the emitted document had one entity called
`normalizeVehicleString`, so `VendorSurfaceFile: <-> [normalizeVehicleString]`
named normalize.ts's entity by coincidence and the checker was silent. The
analyzer knew the truth (`ParsedExport.source = 'vehicle-vendor-sdk'`) and
the converter dropped it.

### Mechanism (rfc-tm-15-diamond.md §S2)

A `reexports:` entry is bare when the re-exported binding resolves to a
project declaration and `Owner.member` when its source is external
(`isExternalPackage`, which also treats tsconfig-paths aliases and
workspace packages as external). No grammar change: `list_entry` already
accepts dotted tokens and the resolver gives a qualified name checked
ownership.

- Converter (`convertExports` -> `reExportEntryWithProvenance`): creates the
  Dependency for the external source through `createDependencyEntity` (name
  pre-reserved in `reserveEntityNames`), appends the re-exported name to its
  `exports`, and emits `VendorSurfaceFile: <-> [VehicleVendorSdk.normalizeVehicleString]`
  beside `VehicleVendorSdk ^ "vehicle vendor sdk library" -> [normalizeVehicleString]`.
- Fold (`foldReExportedNamesIntoImporterFiles`): matches on the member part,
  so `MainFile: <- [..., VendorSurfaceFile]` survives and no
  `checker/orphaned-file` fires.
- Resolver (`qualified-name-resolver.ts`): a qualified re-export entry is
  matched on its member part and resolved on its own — `external` for the
  Dependency owner — instead of binding the same-spelled local entity.
- Checker (`check-orphans.ts isFileConsumed`): an entry that resolves
  `external` credits nothing; `check-exports.ts checkDuplicateExports` keys a
  Dependency exporter by its qualified member, so the Dependency's
  `-> [normalizeVehicleString]` is not a duplicate of `NormalizeFile`'s.

Rejected converter-only options (measured before the fix): dropping the
colliding name emptied `VendorSurfaceFile.reExports` and turned the barrel
into a false `checker/orphaned-file`; a converter warning changed no emitted
fact.

## What the test pins

`reexport-provenance-residuals.test.ts` (Q7 item 2) asserts shape A's
clean check with the barrel's `exports` empty and `reExports` populated,
and (`TM15 V2: ...`) shape B's qualified entry, the Dependency with its
export, the surviving RX-6 fold in `MainFile.imports`, and zero
diagnostics. The Q7 control rewrites this fixture's barrel `<->` to `->` —
the pre-R emission — and asserts exactly one `checker/multi-exported`
naming both files.
