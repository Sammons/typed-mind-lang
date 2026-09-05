// One alphabetised allowlist of ambient types: the names TypeScript resolves
// without an import on Node 26 + the DOM lib. Three families live here on
// purpose, in one list, so a gap in any family is one audit of one table:
//   - intrinsic keywords (`string`, `unknown`, ...);
//   - TS utility types from lib.es5.d.ts (`Partial`, `Pick`, `Readonly` — issue
//     #78 was the asymmetric gap where `Required` was listed and `Readonly`
//     was not);
//   - platform globals (`Date`, `Map`, the typed-array family per issue #89,
//     and the web/Node globals `Buffer`, `ReadableStream`, `Request`,
//     `Response`, `URL`, ... per RFC-TM-13 residual R7/R8).
// None of these ever comes from an npm package, so
// `addExternalTypeToDepExports`'s package-based stubbing can never cover them.
//
// Resolve-first rule (RFC-TM-13, formerly the `AbortSignal` special case):
// a project declaration with the same name wins. Callers resolve the name
// against the entity table FIRST and consult this list only for a name that
// resolved to nothing; a declared `Response %` is a real DTO reference and a
// declared `Response :: () => void` is a wrong-kind finding.
export const AMBIENT_PLATFORM_TYPES: readonly string[] = [
  'AbortSignal',
  'Array',
  'ArrayBuffer',
  'AsyncIterable',
  'AsyncIterableIterator',
  'AsyncIterator',
  'Awaited',
  'BigInt64Array',
  'BigUint64Array',
  'Blob',
  'Buffer',
  'DataView',
  'Date',
  'Error',
  'Exclude',
  'Extract',
  'Float32Array',
  'Float64Array',
  'FormData',
  'Headers',
  'InstanceType',
  'Int16Array',
  'Int32Array',
  'Int8Array',
  'Iterable',
  'IterableIterator',
  'Iterator',
  'Map',
  'NonNullable',
  'Omit',
  'Parameters',
  'Partial',
  'Pick',
  'Promise',
  'ReadableStream',
  'Readonly',
  'ReadonlyArray',
  'ReadonlyMap',
  'ReadonlySet',
  'Record',
  'RegExp',
  'Request',
  'Required',
  'Response',
  'ReturnType',
  'Set',
  'SharedArrayBuffer',
  'TextDecoder',
  'TextEncoder',
  'URL',
  'URLSearchParams',
  'Uint16Array',
  'Uint32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'WeakMap',
  'WeakSet',
  'WritableStream',
  'any',
  'bigint',
  'boolean',
  'never',
  'null',
  'number',
  'object',
  'string',
  'symbol',
  'undefined',
  'unknown',
  'void',
];

const AMBIENT_PLATFORM_TYPE_SET: ReadonlySet<string> = new Set(AMBIENT_PLATFORM_TYPES);

export const isAmbientPlatformType = (typeName: string): boolean => AMBIENT_PLATFORM_TYPE_SET.has(typeName);

// Compatibility name kept for the reference collectors (link-index,
// check-orphans, collect-signature-references), which skip only a
// generic HEAD that is ambient (`Map<Foo>` references `Foo`, not `Map`).
export const isPrimitiveType = isAmbientPlatformType;
