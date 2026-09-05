// Part 3 (R4b): a parenthesized type query over a Constants value. `CODES` is
// referenced ONLY through the type query; `codeCount` exists so the file is
// consumed by a value import.
export const CODES = ['a', 'b'] as const;
export type Code = (typeof CODES)[number];
export const codeCount = (): number => 2;
