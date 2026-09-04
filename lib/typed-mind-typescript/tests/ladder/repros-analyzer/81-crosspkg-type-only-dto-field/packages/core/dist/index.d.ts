// FIXTURE INPUT — committed on purpose, not build output. Nothing in this repo
// emits this file; the root .gitignore carries an explicit negation for it.
//
// This is the declaration file a pnpm `workspace:*` consumer actually resolves
// to: `packages/core/package.json` points `types`/`exports` here, so
// `ts.resolveModuleName('@fixture/core', ...)` lands on this path THROUGH the
// node_modules link and reports `isExternalLibraryImport: true`. That flag is
// the whole point of the fixture — it is the external verdict that
// `resolveImportPath` must now REVERSE, by mapping this path back to
// ../src/index.ts under the referenced project's rootDir.
//
// It must stay checked in: on a clean runner (`pnpm install --ignore-scripts`,
// then a build of the WORKSPACE packages only) nothing creates it, and without
// it the specifier does not resolve at all — that is the UNBUILT path, which
// fixture 81b covers deliberately and separately. Losing this file would
// silently collapse the two fixtures into one, and was the CI failure on PR
// #156 run 334.
//
// Keep in sync with ../src/index.ts (the source these declarations describe).
export type OutputFormat = 'json' | 'yaml' | 'text';
export interface NodeInfo {
    readonly name: string;
}
