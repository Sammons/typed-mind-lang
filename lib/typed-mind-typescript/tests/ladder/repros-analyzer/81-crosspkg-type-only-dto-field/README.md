# 81 — cross-package `workspace:*` import misclassified as external (knownGap)

Corpus: `sammons/code-outline-cli`, `packages/cli/src/cli-argument-parser.ts:4`
(`import type { OutputFormat } from '@sammons/code-outline-parser'`) and
`packages/cli/src/file-processor.ts:4` (`NodeInfo`). Both produce
`checker/dto-field-unknown-type` on the real target.

## Shape

This fixture is a two-package mini-workspace, mirroring the real repo:

- `packages/core` declares `OutputFormat` and `NodeInfo` in `src/index.ts`, and
  ships built declarations at `dist/index.d.ts` (what a consumer resolves to).
- `packages/cli` imports them by PACKAGE NAME and types two DTO fields with them.
- `packages/cli/node_modules/@fixture/core` is the pnpm workspace symlink
  (`../../../core`), which is how a `workspace:*` dependency is materialized.
- `packages/cli/tsconfig.json` declares `references: [{ "path": "../core" }]`.

## Root cause

`typescript-analyzer.ts:1695` (`resolveImportPath`):

```ts
const isExternal = resolvedModule.isExternalLibraryImport === true || resolvedPath.includes('node_modules');
```

A pnpm workspace sibling resolves through the `node_modules` symlink to the
package's `types` entry (`dist/index.d.ts`), so BOTH clauses fire:
`isExternalLibraryImport` is `true` and the path contains `node_modules`. The
sibling package is classified external, never traversed, and its types never
become entities — so every DTO field typed by one emits
`checker/dto-field-unknown-type`.

Verified with `ts.resolveModuleName` directly:

```
resolved = .../packages/core/dist/index.d.ts
extLib   = true
packageId = { name: '@fixture/core', subModuleName: 'dist/index.d.ts', version: '1.0.0' }
```

Note the reference-graph walk (`unionFileNamesAcrossReferences`,
`typescript-analyzer.ts:132-174`) DOES pull `packages/core/src/**` into the
program's file set. The break is purely the internal/external classification of
the resolved specifier, not the program's file set.

A second, independent trigger sits underneath: in an unbuilt clone
(`pnpm install --ignore-scripts`, no `dist/`) the specifier does not resolve at
all (`classification: 'unresolved'`), because `types` points at a file that does
not exist yet. Extraction must not depend on the target having been built.

## Why this is a knownGap, not a fix here

The correct fix reverse-maps the resolved declaration file back to its source:
read the resolved package's own tsconfig via the importing project's
`projectReferences`, take its `outDir`/`declarationDir` and `rootDir`, and map
`<outDir>/index.d.ts` back to `<rootDir>/index.ts` — then reclassify as
internal. That spans two layers (the reference-graph walk and
`resolveImportPath`) and needs its own handling for `exports`-map subpaths,
`declarationDir` differing from `outDir`, and the unbuilt-`dist` case above. It
is well past the "small and local, under ~60 lines, one owning layer" bar this
rung applies, so it is recorded here with its root cause instead of half-fixed.

Owner: typedmind-lead. Breaks if wrong: every pnpm/npm workspace target
extracts each package in isolation, and cross-package types silently degrade to
`checker/dto-field-unknown-type` instead of resolving.

`81-crosspkg-type-only-dto-field.test.ts` pins the CURRENT behaviour so the
gap's shape is a committed, reviewable fact; when the fix lands, that test's
assertions invert and this file is deleted.
