# 112 — whole-project `analyze()` resolves re-export sources through the analyzer's resolver

Companion to fixture 111's "Out of scope, observed here" note.
`TypeScriptAnalyzer.analyze()` recorded no `moduleGraph` edges, so the
converter's `processReExport` fell back to its private `resolveModulePath`
extension probe, which appended `.ts` to the already `.ts`-suffixed
specifier `./normalize.ts` and warned
`Re-export source module not found: ./normalize.ts` for a file that
exists (the fixture-71 defect surviving in that fallback).
`analyzeFromEntrypoint` never warned, because its traversal resolved the
edge through `ts.resolveModuleName` (X-AN-1).

Fix: both analysis modes record every import, re-export, and dynamic-import
edge through the one `recordModuleEdges` path in the analyzer, and the
converter's probe is deleted. A re-export the analyzer resolved is trusted;
a re-export it could not resolve is reported.

`barrel.ts` carries the two shapes:

- `export { normalizeVehicleString } from './normalize.ts'` — exists. No
  warning in either mode; the barrel records the re-export.
- `export { missingHelper } from './missing.ts'` — control. Warns in both
  modes, and the analyzer raises `unresolvable-import` for it.

Pinned by `whole-project-reexport-resolution.test.ts`.
