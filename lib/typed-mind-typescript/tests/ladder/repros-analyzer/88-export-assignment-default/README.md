# 88 — `export default <identifier>` drops the import edge (knownGap)

Corpus: `sammons/bens-almanac`, `src/routes/*.ts` — eight Hono route modules,
each `const app = new Hono<AppEnv>(); ... export default app;`, all imported and
mounted by `src/api/index.ts:6-13` + `:24-31` (`app.route("/", health)`).

On the real target this produces 12 `checker/orphaned-file` findings
(`HealthFile`, `AuthFile`, `WebhooksFile`, `ProfileFile`, `EntriesFile`,
`ObservationsFile`, `Routes__ClimateFile`, `AdminFile`, plus the catalog files
reachable only through `admin.ts`) and a large share of the 45 orphaned-entity
findings that cascade from them.

## Root cause (two halves, two layers)

**Half 1 — analyzer, `typescript-analyzer.ts` `analyzeModule`'s visitor.**
The visitor has branches for `isImportDeclaration`, `isExportDeclaration`,
`isFunction`, `isClass`, `isInterface`, `isTypeAlias`, `isVariableStatement`,
and `isEnumDeclaration`. Every export-producing branch is gated on
`hasExportModifier`. There is no `ts.isExportAssignment` branch at all
(`grep -c isExportAssignment typescript-analyzer.ts` -> 0).

A bare `export default app;` carries no export *modifier* — the export-ness
lives in the `ExportAssignment` node itself — so the `const app = ...`
declaration looks unexported and the module is registered with no
`defaultExport`.

**Half 2 — converter, `typescript-to-typedmind-converter.ts:3260`.**
Even with half 1 fixed, `resolveImportToEntity` tests

```ts
moduleExports.defaultExport === importName
```

which compares the *exported* name (`app`) against the *local binding* at the
import site (`health`, from `import health from '../routes/health.js'`). A
default export is bound by position, not by name, so this comparison fails for
every default import whose local binding differs from the exported
identifier — which is the normal case.

## Why this is a knownGap and not a fix

Fixing half 1 alone is a ~58-line analyzer change that was written, measured
against the corpus, and reverted. It does **not** close any orphan (half 2
still drops the edge) and it introduces a regression: all eight route modules
name their router `app`, so registering each as a default export makes eight
files claim to export one entity —

```
Entity 'app' is exported by multiple files: HealthFile, AuthFile, WebhooksFile,
ProfileFile, EntriesFile, ObservationsFile, Routes__ClimateFile, AdminFile
```

`checker/multi-exported`, the same same-name-across-modules collision class as
closed issue #45. The converter reserves *file* names
(`reserveFileEntityNames`), *function* names (`reserveFunctionEntityNames`), and
*named type* names (`reserveNamedTypeEntityNames`), but has no equivalent pass
for constants — so `app` cannot currently be disambiguated per module.

Closing this gap therefore needs all three of: the analyzer branch, a
binding-aware default-import resolution in `resolveImportToEntity`, and a
constant-name reservation pass. That crosses two layers and adds a third
reservation mechanism, which is above a single rung's bar.

## What the test pins

`rung-bens-almanac.test.ts` asserts the CURRENT behaviour — the default export
is absent from the analyzer's `exports` for `health.ts`, and the importer's
`imports` list does not contain it — so the gap is a committed fact rather than
prose. When the gap is closed, those assertions fail and are updated to the
fixed expectations in the same change.
