// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2 re-evaluation).
//
// Generic type parameters on a declaration are entirely unmodeled: the
// analyzer never reads `node.typeParameters` (zero occurrences of that
// property anywhere in typescript-analyzer.ts). A generic interface or type
// alias therefore emits DTO fields whose types name the type PARAMETER,
// which resolves to nothing — `DTO 'X' field 'y' references undefined type
// 'T'`.
//
// FIXED (RFC-TM-13 G, gap 68): the analyzer now reads `node.typeParameters`,
// declares them on the emitted DTO/type-alias entity, and the checker binds
// them lexically to the declaration instead of resolving them as undefined
// global types. See the 'FIXED GAP 68' describe block in
// slat-harness-known-gaps.test.ts and
// https://git.tail4ea214.ts.net/sammons/typed-mind-lang/pulls/181.
//
// Distilled from packages/tui/src/hal-client.ts:5 (`HalEnvelope<T>`, whose
// `data: T` field produced the diagnostic on the tui target) and used at
// tui/src/main.ts:27,32,35 and tui/src/view-model.ts:13,23,30,41.
//
// Both the interface and the type-alias spellings are included: they share
// one root cause (no typeParameters handling) but travel different
// converter paths (convertInterfaceToDTO vs convertTypeAliasToDTO), so a
// fix that only covered one would have left the other emitting dangling names.
export interface HalEnvelope<T> {
  data: T;
  self: string;
}

export type Pair<A, B> = {
  left: A;
  right: B;
};

export const unwrap = (envelope: HalEnvelope<string>, pair: Pair<number, string>): void => {
  void envelope;
  void pair;
};
