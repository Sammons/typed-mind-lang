// RFC-TM-9 X-AN-5 — proves typeParameters flow through the reused signature
// builder for a generic arrow-const.
export const wrap = <T>(x: T): T[] => [x];
