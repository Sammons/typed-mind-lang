// Sibling package source. Unlike fixture 81, this package ships NO `dist/`:
// the checkout is the `pnpm install --ignore-scripts`, never-built state a
// clean CI runner produces. `packages/core/package.json` still points `types`
// at `dist/index.d.ts`, so `ts.resolveModuleName('@fixture-unbuilt/core', ...)`
// fails outright — there is no file at the declared entry to resolve to.
//
// The analyzer's unbuilt fallback maps that DECLARED output path
// (`dist/index.d.ts`) through the referenced project's outDir/rootDir pair back
// to THIS file, so the edge still classifies internal and still gets traversed.
export type ReportFormat = 'summary' | 'detail';

export interface ReportRow {
  readonly label: string;
}
