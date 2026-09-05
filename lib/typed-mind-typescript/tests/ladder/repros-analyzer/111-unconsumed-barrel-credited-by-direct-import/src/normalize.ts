// The declaring module. main.ts imports `normalizeVehicleString` from HERE,
// directly — never through the barrel.
export const normalizeVehicleString = (raw: string): string => raw.trim().toLowerCase();
