// Corpus: sammons/artifice-with-intelligence server/lib/parse-embed.ts:7
// (`export const embedWhitelist: ReadonlySet<string> = new Set([...])`).
//
// An exported const whose declared type is a GENERIC outside the converter's
// hardcoded allowlist emits that generic verbatim into the Constants type
// slot. The grammar restricts that slot to a bare `entity_name`
// (`grammar/grammar.js:761`: `optional(seq(':', $.entity_name))`), so the
// emitted line `embedWhitelist ! src/index.ts : ReadonlySet<string>` is
// rejected with "Unparsable text: `<string>`".
//
// Root cause: `convertTypeToSchema`
// (typescript-to-typedmind-converter.ts:3985) recognizes only `[]` -> Array,
// `Record<` -> Record, `Map<` -> Map, and inline object literals -> Object.
// Every other generic falls through its final `return type`, which hands the
// raw TypeScript text to a slot that cannot hold it.
//
// Controls below are the shapes the allowlist already handles correctly on
// main; they must keep emitting their bare schema names.

// The gap: a generic outside the allowlist, emitted verbatim.
export const embedWhitelist: ReadonlySet<string> = new Set<string>(['revisions']);

// Control: `Record<...>` is allowlisted -> `Record`. Correct on main.
export const headerDefaults: Record<string, string> = { accept: 'application/json' };

// Control: `Map<...>` is allowlisted -> `Map`. Correct on main.
export const slotIndex: Map<string, number> = new Map();

// Control: an array type is allowlisted -> `Array`. Correct on main.
export const knownRels: string[] = ['self', 'next'];

// Control: a non-generic named type passes through unchanged. Correct on main.
export const skillDoc: string = 'artifice';

export const listRels = (): readonly string[] => {
  return knownRels.filter((rel) => embedWhitelist.has(rel) || slotIndex.has(rel));
};
