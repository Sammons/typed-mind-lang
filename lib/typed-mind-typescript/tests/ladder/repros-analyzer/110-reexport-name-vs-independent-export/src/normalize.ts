// The declaring module: the only file that legitimately EXPORTS `normalizeVehicleString`.
export const normalizeVehicleString = (raw: string): string => raw.trim().toLowerCase();
