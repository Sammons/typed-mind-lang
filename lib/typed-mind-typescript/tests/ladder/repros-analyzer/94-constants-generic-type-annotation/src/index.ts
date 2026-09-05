// Corpus: sammons/artifice-with-intelligence server/lib/parse-embed.ts:7
// (`export const embedWhitelist: ReadonlySet<string> = new Set([...])`).
//
// ORIGINAL DEFECT: an exported const whose declared type was a GENERIC
// outside the converter's hardcoded allowlist emitted that generic verbatim
// into the Constants type slot, which the grammar restricted to a bare
// `entity_name`, so `embedWhitelist ! src/index.ts : ReadonlySet<string>` was
// rejected with "Unparsable text: `<string>`". The first fix reduced every
// generic to its base name (`ReadonlySet`, `Record`, `Map`, `Array`).
//
// RFC-TM-14 U5a, leaf R6a (rfc-tm-14-diamond.md §S5): the schema slot is a
// `type_expr` (grammar/grammar.js constants_declaration, the
// typedef_declaration twin), so the SAME lines now emit the whole
// annotation. The fixture keeps pinning the original defect through the
// zero-diagnostics check; the four reductions below migrated to full text
// (rung-artifice-with-intelligence.test.ts, cause link S-11).

// The former gap: a generic outside the allowlist, now emitted whole.
export const embedWhitelist: ReadonlySet<string> = new Set<string>(['revisions']);

// Was `Record`; now `Record<string, string>`.
export const headerDefaults: Record<string, string> = { accept: 'application/json' };

// Was `Map`; now `Map<string, number>`.
export const slotIndex: Map<string, number> = new Map();

// Was `Array`; now `string[]`.
export const knownRels: string[] = ['self', 'next'];

// Control: a non-generic named type passes through unchanged.
export const skillDoc: string = 'artifice';

export const listRels = (): readonly string[] => {
  return knownRels.filter((rel) => embedWhitelist.has(rel) || slotIndex.has(rel));
};
