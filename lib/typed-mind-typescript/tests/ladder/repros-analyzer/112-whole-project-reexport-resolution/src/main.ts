import { normalizeVehicleString } from './barrel.ts';

export const run = (raw: string): string => normalizeVehicleString(raw);
