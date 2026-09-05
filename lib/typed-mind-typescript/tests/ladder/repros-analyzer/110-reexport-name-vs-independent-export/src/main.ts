import { normalizeVehicleString } from './barrel.ts';
import { normalizeVehicleString as vendorNormalize } from './vendor-surface.ts';

export const run = (raw: string): string => normalizeVehicleString(raw) + vendorNormalize(raw);
