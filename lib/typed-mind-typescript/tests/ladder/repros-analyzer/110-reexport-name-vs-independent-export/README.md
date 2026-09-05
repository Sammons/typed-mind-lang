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

## Shape B — `vendor-surface.ts`, the deferral's concern: PINNED, not fixed

```ts
export { normalizeVehicleString } from 'vehicle-vendor-sdk';
```

The external binding shares its spelling with the local declaration. The
emitted document has one entity called `normalizeVehicleString`, so
`VendorSurfaceFile: <-> [normalizeVehicleString]` (with no `<-`, since the
external import resolves to no entity) names normalize.ts's entity by
coincidence. The checker is silent: `valid: true`, zero diagnostics. The
analyzer knows the truth (`ParsedExport.source = 'vehicle-vendor-sdk'`),
but the `.tmd` language has no slot to carry it — a `reexports:` entry is a
bare name.

### Mechanism needed

A per-entry provenance slot on `reexports:` (RX-A's own prescription:
"the fix ... is the provenance field, not a `reExports`-specific patch"),
or an equivalent language-level statement of WHICH binding a re-export
forwards. Converter-only options were measured and rejected:

- Dropping an external re-export name that collides with a local entity
  empties `VendorSurfaceFile.reExports`, so RX-6's
  `foldReExportedNamesIntoImporterFiles` no longer folds the barrel's name
  into `main.ts`'s imports and the barrel becomes a false
  `checker/orphaned-file` — trading a silent misattribution for a false
  positive.
- A converter warning changes no emitted fact.

Zero corpus instances of shape B exist (RX-A: "re-exported names are drawn
from real TypeScript re-export statements, not invented"); the deferral
stays theoretical.

## What the test pins

`reexport-provenance-residuals.test.ts` (Q7 item 2) asserts shape A's
clean check with the barrel's `exports` empty and `reExports` populated,
and pins shape B's current output (empty `exports`, empty `imports`,
`reExports` = the colliding name, zero diagnostics). The Q7 control
rewrites this fixture's barrel `<->` to `->` — the pre-R emission — and
asserts exactly one `checker/multi-exported` naming both files.
