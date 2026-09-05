// RFC-TM-14 R2a — a value READ of a top-level Constants inside a function body
// is a `consumes` edge (the live FREE_INGEST_EVENTS_LIMIT / RECORDED_RENAMES
// shapes). `shadow` and `local` are the shadowing controls: a parameter and a
// function-local binding named LIMIT resolve to their own declarations, never
// to the top-level Constants.
export const LIMIT = 10;

export const TABLE: ReadonlyMap<string, number> = new Map();

export function apply(n: number): number {
  return Math.min(n, LIMIT) + (TABLE.get('x') ?? 0);
}

export function shadow(LIMIT: number): number {
  return LIMIT;
}

export function local(): number {
  const LIMIT = 1;
  return LIMIT;
}
