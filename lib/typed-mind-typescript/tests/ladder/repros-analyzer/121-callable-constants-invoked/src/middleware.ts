export interface Env {
  Variables: Record<string, unknown>;
}

export function createMiddleware<E extends Env>(
  fn: (c: E, next: () => Promise<void>) => Promise<void | Response>,
): (c: E, next: () => Promise<void>) => Promise<void | Response> {
  return fn;
}

// RFC-TM-14 §S6 control: a call/new initializer whose checker type is a
// union with a non-callable constituent stays Constants — "a union is
// callable only when every constituent is" (rfc-tm-14-diamond.md §S6).
export function maybeCallable(flag: boolean): (() => void) | number {
  return flag ? () => {} : 1;
}
