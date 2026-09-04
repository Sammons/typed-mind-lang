# 81 — cross-package `workspace:*` import classified as internal (FIXED)

Corpus: `sammons/code-outline-cli`, `packages/cli/src/cli-argument-parser.ts:4`
(`import type { OutputFormat } from '@sammons/code-outline-parser'`) and
`packages/cli/src/file-processor.ts:4` (`NodeInfo`). Both produced
`checker/dto-field-unknown-type` on the real target before this fix.

## Shape

This fixture is a two-package mini-workspace, mirroring the real repo:

- `packages/core` declares `OutputFormat` and `NodeInfo` in `src/index.ts`, and
  ships built declarations at `dist/index.d.ts` (what a consumer resolves to).
- `packages/cli` imports them by PACKAGE NAME and types two DTO fields with them.
- `packages/cli/node_modules/@fixture/core` is the pnpm workspace symlink
  (`../../../core`), which is how a `workspace:*` dependency is materialized.
- `packages/cli/tsconfig.json` declares `references: [{ "path": "../core" }]`.
- `packages/cli/src/vendor-consumer.ts` is the external CONTROL entrypoint. It
  imports `@fixture/vendor`, a stub package the test's `before()` hook writes
  into `packages/cli/node_modules/` — same installed-package shape, but named by
  no `references` entry, so it must stay external.

## The defect (historical)

`resolveImportPath` classified with one line:

```ts
const isExternal = resolvedModule.isExternalLibraryImport === true || resolvedPath.includes('node_modules');
```

A pnpm workspace sibling resolves through the `node_modules` symlink to the
package's `types` entry (`dist/index.d.ts`), so BOTH clauses fired. The sibling
package was classified external, never traversed, and its types never became
entities — so every DTO field typed by one emitted
`checker/dto-field-unknown-type`.

Note the reference-graph walk (`unionFileNamesAcrossReferences`) ALREADY pulled
`packages/core/src/**` into the program's file set. The break was purely the
internal/external classification of the resolved specifier, never the program's
file set — traversal was not the limit, classification was.

## The fix

A declared `references` entry is the author stating that the target is part of
this compilation, which is why the union program pulls its sources in. So the
classifier now reverses the emit before honoring an external verdict:

1. `unionFileNamesAcrossReferences` records each referenced project's
   `declarationDir || outDir` and `rootDir` (realpath'd) while walking the
   reference graph it already walks.
2. `resolveImportPath` realpaths an external-classified resolution and asks
   whether it lies under any referenced project's declaration output.
3. If it does, the path maps back to the corresponding source under that
   project's `rootDir` (`.d.ts` -> `.ts`, falling back to `.tsx`), the source's
   existence is verified on disk, and the edge classifies internal.

TypeScript's own source-of-project-reference redirect is not a usable lever
here: passing `projectReferences` plus a `getParsedCommandLine` host does not
redirect this program's resolutions to source, so the mapping is done directly.

Genuine third-party packages are unaffected — their realpath is under
`node_modules/<name>`, never under a referenced project's `outDir`, so the
reverse-map declines and the external classification stands. The
`vendor-consumer.ts` control asserts exactly that.

A project whose tsconfig omits `outDir`/`rootDir` also declines to map: the
emit layout is ambiguous, and declining is safe because the pre-fix behaviour is
the fallback.

## Sibling fixture

`81b-crosspkg-unbuilt-sibling` covers the second trigger this fixture's original
root-cause note named: a referenced project that has never been built, where the
specifier does not resolve at all. See that fixture's README.
