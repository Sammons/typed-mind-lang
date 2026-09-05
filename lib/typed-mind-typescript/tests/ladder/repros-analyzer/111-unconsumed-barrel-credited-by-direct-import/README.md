# 111 — RFC-TM-11 Deferral RX-B: `isFileConsumed`'s re-export branch and bare-name credit

Citation: `rfc-tm-11-diamond.md:373-406` (Deferral RX-B). Verified on
current main after RFC-TM-13 unit R, PR #170, PR #181.

`normalize.ts` declares `normalizeVehicleString`; `barrel.ts` re-exports it;
`main.ts` imports it DIRECTLY from `normalize.ts`. Nothing imports
`barrel.ts`. The fixture is analyzed with `TypeScriptAnalyzer.analyze()`
(whole project): the CLI's entrypoint traversal never reaches a file nothing
imports, so an unimported barrel only appears in a document through
whole-project analysis or hand authoring.

Emitted:

```
BarrelFile @ src/barrel.ts:
  <- [normalizeVehicleString]
  <-> [normalizeVehicleString]

MainFile @ src/main.ts:
  <- [normalizeVehicleString]
  -> [run]

NormalizeFile @ src/normalize.ts:
  -> [normalizeVehicleString]
```

Two shapes, split by whether `main.ts`'s direct import is present.

## Self-credit shape: FIXED in `check-orphans.ts`

Remove `main.ts`'s import and `BarrelFile` is a dead file with one claim
to consumption: its OWN `<- [normalizeVehicleString]` edge (the converter
records `export { X } from` as import + re-export). `isEntityImported`
scanned every entity's imports, found the barrel's own, and credited the
barrel with consuming itself. `checker/orphaned-file` never fired.

The fix passes the File under evaluation as `excluding` to
`isEntityImported` in the `reExports` branch only. A barrel's own imports
prove it consumes its source, never that anything consumes the barrel.
Removal control: `lib/typed-mind/src/checker/ast-validator.test.ts`
("does not let a re-exporting file prove its own consumption from its own
import edge") fails without the exclusion and passes with it; the sibling
test proves a through-barrel importer (the RX-6 fold shape, `<- [helper,
Barrel]`) still counts.

## Unrelated-importer shape (the fixture as committed): PINNED, not fixed

With `main.ts`'s direct import present, `isEntityImported` finds
`normalizeVehicleString` in `MainFile`'s imports and credits `BarrelFile`
— but `MainFile` imports from `normalize.ts`, not the barrel. The barrel is
still dead and still not reported. `valid: true`.

### Mechanism needed

Per-File import provenance in the document. An extracted document already
carries the distinguishing fact: RX-6's fold writes the barrel's own File
name into any importer that goes THROUGH the barrel (`<- [X, BarrelFile]`),
so `isFileConsumed`'s third branch (`isEntityImported(context, file.name)`)
is sufficient for extracted documents and the `reExports` branch is only
load-bearing for hand-authored ones. Making the `reExports` branch require
the fold would change RX-3's accepted trust model for hand-authored
documents (`<-> [X]` plus some `<- [X]` counts today) and is a policy
change to the language, not a checker-local fix — the same provenance work
RX-A names.

## Out of scope, observed here

Whole-project `analyze()` mode emits a converter warning
`Re-export source module not found: ./normalize.ts` for a file that plainly
exists: `recordModuleGraphEdge` runs only inside `analyzeFromEntrypoint`'s
traversal, so `analyze()` records no `moduleGraph` edges at all and
`processReExport` falls back to `resolveModulePath`, which appends an
extension to the already `.ts`-suffixed specifier (the fixture-71 defect
surviving in that fallback). Entrypoint mode does not warn. Not fixed in
Q7.

## What the test pins

`reexport-provenance-residuals.test.ts` (Q7 item 3) pins the
unrelated-importer shape (no `checker/orphaned-file`, and no importer names
the barrel) and asserts the self-credit shape now reports exactly
`Orphaned file 'BarrelFile' - none of its exports are imported`.
