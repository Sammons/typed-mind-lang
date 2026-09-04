// Corpus: sammons/bens-almanac packages/{nhtsa,usda}-ingestion/src/handler.ts,
// whose `IngestionDeps` declares dependency-injection fields as function types
// returning a generic over a union (`=> Promise<DedupRecord | null>`).
//
// `scanOpaqueRun` counted angle-bracket depth ONLY when `inGenericArgs` was
// true, but consulted that same `angleDepth` in its top-level `|`/`&` break
// REGARDLESS of `inGenericArgs`. At the top level the `<` of `Promise<` never
// bumped the depth, so the `|` inside the generic's arguments read as a
// TOP-LEVEL union operator and ended the opaque run mid-type. The function
// type split into the bogus union `(pk: string, sk: string) => Promise<DedupRecord`
// plus `null`, orphaning the trailing `>` into `remainder` — the non-empty
// remainder this module's own doc comment calls a parser bug.
//
// `getWatermark` and `writeDedupRecord` are the controls: a generic return
// with no union, and a union-free function type. Both parsed correctly before
// the fix and must stay correct after it.
export interface DedupRecord {
  fingerprint: string;
}

export interface IngestionDeps {
  getWatermark: () => Promise<string>;
  getDedupRecord: (pk: string, sk: string) => Promise<DedupRecord | null>;
  writeDedupRecord: (record: DedupRecord) => Promise<void>;
}

export const runIngestion = (deps: IngestionDeps): void => {
  void deps;
};
