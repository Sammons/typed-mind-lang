// Corpus: sammons/bens-almanac packages/vehicle-data/src/index.ts, a barrel
// whose entrypoint re-exports sibling names EXPLICITLY (`export { a, b } from
// './normalize.ts'`), not via `export *`.
//
// `extractPublicExportsFromEntrypoint` reads `moduleExports.namedExports`,
// which `registerModuleExports` fills unconditionally — it never checks
// `exp.source !== undefined` (the `isReExport` predicate `convertExports`
// already branches on at its own call sites, precisely to route a re-exported
// name away from the module's own export list). So a re-exported name landed
// in `Program.exports` while the DEFINING file also listed it in its `-> [...]`,
// and the checker correctly flagged `checker/multi-exported`: two files each
// claiming to export one entity.
//
// Distinct from fixture 78, which fixed only the literal `'*'` NAME case
// inside this same function; an `export *` barrel never reaches the ordinary
// named-re-export path this fixture exercises.
//
// `barrelOwnHelper` is the control: a name the barrel itself DECLARES, which
// legitimately belongs to the entrypoint's own exports and must stay there.
export { normalizeVehicleString, canonicalVehicleSlug } from './normalize.ts';

export const barrelOwnHelper = (): string => 'own';
