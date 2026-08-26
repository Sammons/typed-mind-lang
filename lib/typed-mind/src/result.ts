/**
 * Result type for functional error handling in TypedMind
 *
 * This provides a type-safe way to handle operations that can fail,
 * inspired by Rust's Result<T, E> type and functional programming patterns.
 *
 * Use this instead of throwing exceptions for expected error conditions.
 */

export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly _tag: 'success';
  readonly value: T;
}

export interface Failure<E> {
  readonly _tag: 'failure';
  readonly error: E;
}

// Constructors
export const Ok = <T>(value: T): Success<T> => ({
  _tag: 'success',
  value,
});

export const Err = <E>(error: E): Failure<E> => ({
  _tag: 'failure',
  error,
});

// Type guards
export const isOk = <T, E>(result: Result<T, E>): result is Success<T> => result._tag === 'success';

export const isErr = <T, E>(result: Result<T, E>): result is Failure<E> => result._tag === 'failure';

// Utility functions for working with Results
export const Result = {
  /**
   * Create a successful result
   */
  ok: Ok,

  /**
   * Create a failed result
   */
  err: Err,

  /**
   * Check if result is successful
   */
  isOk,

  /**
   * Check if result is failed
   */
  isErr,

  /**
   * Map over the success value, leaving errors unchanged
   */
  map: <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
    return isOk(result) ? Ok(fn(result.value)) : result;
  },

  /**
   * Map over the error value, leaving success unchanged
   */
  mapErr: <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> => {
    return isErr(result) ? Err(fn(result.error)) : result;
  },

  /**
   * Chain operations that return Results (flatMap)
   */
  andThen: <T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> => {
    return isOk(result) ? fn(result.value) : result;
  },

  /**
   * Provide a default value for failed results
   */
  unwrapOr: <T, E>(result: Result<T, E>, defaultValue: T): T => {
    return isOk(result) ? result.value : defaultValue;
  },

  /**
   * Extract the value or throw the error
   */
  unwrap: <T, E>(result: Result<T, E>): T => {
    if (isOk(result)) {
      return result.value;
    }
    throw result.error;
  },

  /**
   * Extract the error or throw if successful
   */
  unwrapErr: <T, E>(result: Result<T, E>): E => {
    if (isErr(result)) {
      return result.error;
    }
    throw new Error('Called unwrapErr on a successful result');
  },

  /**
   * Combine multiple Results into a single Result containing an array
   * If any Result is an error, return the first error
   */
  all: <T, E>(results: Result<T, E>[]): Result<T[], E> => {
    const values: T[] = [];
    for (const result of results) {
      if (isErr(result)) {
        return result;
      }
      values.push(result.value);
    }
    return Ok(values);
  },

  /**
   * Try to execute a function that might throw, converting to Result
   */
  try: <T>(fn: () => T): Result<T, Error> => {
    try {
      return Ok(fn());
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  },

  /**
   * Try to execute an async function that might throw, converting to Result
   */
  tryAsync: async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> => {
    try {
      const value = await fn();
      return Ok(value);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  },

  /**
   * Apply a function to both success and error cases
   */
  match: <T, E, U>(
    result: Result<T, E>,
    handlers: {
      ok: (value: T) => U;
      err: (error: E) => U;
    },
  ): U => {
    return isOk(result) ? handlers.ok(result.value) : handlers.err(result.error);
  },
};

// RFC-TM-4 §5 (rfc-tm-4-diamond.md, dead-today deletion inventory): AsyncResult
// dropped here — zero consumers anywhere in the workspace (grep-verified),
// the "unconsumed result half" named in the deletion inventory. Result/Ok/Err/
// isOk/isErr stay: index.ts (checkSafe/toggleFormat/toShortform/toLongform)
// and syntax-generator.ts both consume them, and both are live bridge code
// through Q5.
