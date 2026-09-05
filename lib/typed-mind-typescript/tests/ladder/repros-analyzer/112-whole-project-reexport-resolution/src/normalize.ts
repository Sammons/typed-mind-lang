// The declaring module, re-exported by barrel.ts through a `.ts`-suffixed
// specifier (legal under `allowImportingTsExtensions` /
// `rewriteRelativeImportExtensions`, idiomatic in Node type-stripping code).
export const normalizeVehicleString = (raw: string): string => raw.trim().toLowerCase();
