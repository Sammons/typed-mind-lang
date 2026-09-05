// Two re-exports with `.ts`-suffixed specifiers. The first names a file
// that exists (the fixture-111 shape that used to warn in whole-project
// mode); the second names a file that does NOT exist and is the control —
// it must keep warning in both analysis modes.
export { normalizeVehicleString } from './normalize.ts';
export { missingHelper } from './missing.ts';
