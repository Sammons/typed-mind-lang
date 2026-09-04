# 81b — a referenced sibling that has never been built

The second, independent trigger named in fixture 81's own root-cause note:

> A second, independent trigger sits underneath: in an unbuilt clone
> (`pnpm install --ignore-scripts`, no `dist/`) the specifier does not resolve at
> all (`classification: 'unresolved'`), because `types` points at a file that
> does not exist yet. Extraction must not depend on the target having been built.

## Shape

Identical to fixture 81 except for the one thing under test: `packages/core`
ships **no** `dist/` directory.

- `packages/core/package.json` still declares `types: dist/index.d.ts` and
  `exports["."].types: ./dist/index.d.ts` — the entry a built package would have.
- `packages/core/tsconfig.json` declares `outDir: ./dist` and `rootDir: ./src`.
- `packages/cli/tsconfig.json` declares `references: [{ "path": "../core" }]`.
- No `node_modules` link is needed, and none is created: the specifier does not
  resolve through node_modules at all here, because there is nothing to resolve
  to. That is the state under test.

## Behaviour before the fix

`ts.resolveModuleName('@fixture-unbuilt/core', ...)` returns no
`resolvedModule`, so `resolveImportPath` classified the edge `'unresolved'`,
`analyzeFromEntrypoint` emitted an `unresolvable-import` diagnostic, and the
sibling was never traversed. `ReportFormat` and `ReportRow` never became
entities, so both DTO fields typed by them emitted
`checker/dto-field-unknown-type` — the same visible damage as fixture 81, from a
different cause.

## Behaviour after the fix

`resolveUnbuiltReferencedProject` matches the bare specifier against each
referenced project's package.json `name`, takes that package's DECLARED
`types`/`main` path, and runs it through the same outDir -> rootDir mapping the
built case uses. `dist/index.d.ts` maps to `src/index.ts`, which the union
program already contains, so the edge classifies internal and is traversed.

The declared path is what a build WOULD emit, so the mapped source is the same
file a built sibling would have redirected to — the extraction is identical
whether or not the sibling has been built. That equivalence is what this fixture
pins, alongside fixture 81's built counterpart.

## Failure mode preserved

When the specifier names no referenced project, or the referenced project's
tsconfig omits `outDir`/`rootDir`, or the mapped source is absent from disk, the
fallback declines and the pre-existing `unresolvable-import` diagnostic fires.
The fallback never silently drops an edge.
