/**
 * Branded types for TypedMind - provides compile-time type safety for strings
 * that should not be interchangeable even if they have the same runtime type.
 *
 * This prevents bugs like passing a file path where an entity name is expected.
 *
 * RFC-TM-4 §5 (rfc-tm-4-diamond.md, dead-today deletion inventory): trimmed to
 * FilePath (index.ts's CheckerFilePath) — the only half still consumed once
 * entity-builder.ts/entity-map.ts/error-types.ts (the sole consumers of
 * EntityName/FunctionSignature/Version/Description/EntityTypeName/unbrand)
 * were deleted as dead-today, reference-free code.
 */

// Brand utility type for creating branded types
type Brand<T, U> = T & { readonly __brand: U };

export type FilePath = Brand<string, 'FilePath'>;

export const FilePath = {
  create: (path: string): FilePath => {
    if (!path.trim()) {
      throw new Error('File path cannot be empty');
    }
    return path as FilePath;
  },

  isValid: (path: string): path is FilePath => {
    return path.trim().length > 0;
  },

  unsafe: (path: string): FilePath => path as FilePath,
};
