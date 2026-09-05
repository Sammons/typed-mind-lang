// RFC-TM-11 Deferral RX-B's concern: a barrel that re-exports a sibling's
// name but that NOTHING imports. It is a genuine orphan — no importer names
// this file — yet `isFileConsumed`'s `reExports` branch (check-orphans.ts)
// asks only "is `normalizeVehicleString` imported anywhere?", which main.ts's
// DIRECT import of normalize.ts answers yes. The credit belongs to
// NormalizeFile, not to this barrel.
export { normalizeVehicleString } from './normalize.ts';
