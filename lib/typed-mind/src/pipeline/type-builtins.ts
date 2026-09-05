const PRIMITIVES = [
  'string',
  'number',
  'boolean',
  'object',
  // Intrinsic type keywords also appear in generic bounds and typed members.
  'unknown',
  'never',
  'bigint',
  'symbol',
  'any',
  'void',
  'null',
  'undefined',
  'Date',
  'Array',
  'Promise',
  'Map',
  'Set',
  'Record',
  'Partial',
  'Required',
  'Readonly', // issue #78 — asymmetric gap: `Required` was allowlisted, `Readonly` was not.
  'Pick',
  'Omit',
  // issue #89 — same class of gap as #78: these are real lib.es2015+/lib.es5
  // TS/JS builtins with no import statement (never from an npm package), so
  // `addExternalTypeToDepExports`'s package-based stubbing can never cover
  // them either. `ReadonlyMap`/`Uint8Array` were the two live corpus
  // instances (`lib/typed-mind`'s own `LinkIndexMaps`/`TypedMindParserOptions`);
  // `ReadonlySet`/`ReadonlyArray`/the rest of the typed-array family and
  // `WeakMap`/`WeakSet` are the same class of builtin, added on audit.
  'ReadonlyMap',
  'ReadonlySet',
  'ReadonlyArray',
  'WeakMap',
  'WeakSet',
  'Uint8Array',
  'Int8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Int16Array',
  'Uint32Array',
  'Int32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
];

export const isPrimitiveType = (typeName: string): boolean => {
  return PRIMITIVES.includes(typeName);
};

// A measured platform global, separate from legacy primitive-first handling.
// Callers must resolve real declarations before using this data-type fallback.
export const isImplicitPlatformDataType = (typeName: string): boolean => typeName === 'AbortSignal';
