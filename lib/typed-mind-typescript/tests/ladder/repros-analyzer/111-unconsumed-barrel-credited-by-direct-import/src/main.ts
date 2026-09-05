import { normalizeVehicleString } from './normalize.ts';

export const run = (raw: string): string => normalizeVehicleString(raw);
