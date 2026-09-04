// Corpus: sammons/bens-almanac packages/vehicle-data/src/normalize.ts, whose
// two functions the package barrel re-exports by NAME (not via `export *`).
export const normalizeVehicleString = (raw: string): string => raw.trim().toLowerCase();

export const canonicalVehicleSlug = (raw: string): string => normalizeVehicleString(raw).replace(/\s+/g, '-');
