# 111 — RFC-TM-11 Deferral RX-B: `isFileConsumed`'s re-export branch and bare-name credit

Citation: `rfc-tm-11-diamond.md:373-406` (Deferral RX-B). Verified on
current main after RFC-TM-13 unit R, PR #170, PR #181.

`normalize.ts` declares `normalizeVehicleString`; `barrel.ts` re-exports it;
`main.ts` imports it DIRECTLY from `normalize.ts`. Nothing imports
`barrel.ts`. The fixture is analyzed with `TypeScriptAnalyzer.analyze()`
(whole project): the CLI's entrypoint traversal never reaches a file nothing
imports, so an unimported barrel only appears in a document through
whole-project analysis or hand authoring.

Emitted (after RFC-TM-15 §S3, leaf I1):

```
BarrelFile @ src/barrel.ts:
  <- [NormalizeFile.normalizeVehicleString]
  <-> [normalizeVehicleString]

MainFile @ src/main.ts:
  <- [NormalizeFile.normalizeVehicleString]
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

## Unrelated-importer shape (the fixture as committed): FIXED by RFC-TM-15 §S3 (leaf I1)

Before: with `main.ts`'s direct import present, `isEntityImported` found the
bare `normalizeVehicleString` in `MainFile`'s imports and credited
`BarrelFile` — but `MainFile` imports from `normalize.ts`, not the barrel.
The barrel was dead and not reported (`valid: true`).

### Mechanism: owner-qualified import entries

The rule (`rfc-tm-15-diamond.md` §S3): an import entry is `Owner.name` when
more than one File exports or re-exports `name`; otherwise it is bare.
Hand-authors may always qualify. `Owner` is the File entity of the module
the specifier resolved to.

- Converter: `qualifyAmbiguousImportEntries`
  (`typescript-to-typedmind-converter.ts`), a post-pass after the RX-6
  fold, counts the Files that export or re-export each name and rewrites
  the ambiguous bare entries `convertImports` produced. Here
  `normalizeVehicleString` is exported by `NormalizeFile` and re-exported by
  `BarrelFile`, so `main.ts`'s import from `./normalize.ts` becomes
  `NormalizeFile.normalizeVehicleString` (and the barrel's own re-export
  import likewise). An importer that goes THROUGH the barrel gets
  `BarrelFile.normalizeVehicleString` next to the RX-6 fold's `BarrelFile`
  (fixture 110's `MainFile`).
- Checker: `isFileConsumed`'s `reExports` branch (`check-orphans.ts`)
  passes `owner = file.name` to `isEntityImported`; a qualified entry
  credits the barrel only when its owner IS the barrel. A bare entry keeps
  today's credit — hand-authored documents are trusted as before (non-goal
  N-15-hand-authored), so RX-3's trust model is unchanged. The `exports`
  branch and the fold branch pass no owner.

Result: exactly one `checker/orphaned-file` for `BarrelFile`, no
`checker/qualified-name-unresolved`. The resolver binds
`NormalizeFile.normalizeVehicleString` through `NormalizeFile`'s `exports`
with no core change.

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

`reexport-provenance-residuals.test.ts` (Q7 item 3):

- `TM15 V3: an unrelated importer no longer credits an unimported barrel` —
  `MainFile: <- [NormalizeFile.normalizeVehicleString]`, no importer names
  the barrel, exactly one `checker/orphaned-file` for `BarrelFile`.
- Controls: the through-barrel spelling
  (`<- [BarrelFile.normalizeVehicleString, BarrelFile]`) and the
  hand-authored bare spelling (`<- [normalizeVehicleString]`) both still
  credit the barrel.
- The self-credit shape still reports exactly
  `Orphaned file 'BarrelFile' - none of its exports are imported`.

Core-level checks live in `lib/typed-mind/src/checker/ast-validator.test.ts`
(`TM15 V3: ...`).
