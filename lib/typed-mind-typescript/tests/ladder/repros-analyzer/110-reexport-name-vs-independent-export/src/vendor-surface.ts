// Shape B — RFC-TM-11 Deferral RX-A's concern: a file that re-exports a
// name from an EXTERNAL package which happens to be spelled the same as a
// local declaration (`normalizeVehicleString` in normalize.ts). The two
// bindings are unrelated in TypeScript. In the emitted `.tmd` there is only
// one entity called `normalizeVehicleString`, so this File's `reexports:`
// line names normalize.ts's entity by coincidence of spelling.
export { normalizeVehicleString } from 'vehicle-vendor-sdk';
