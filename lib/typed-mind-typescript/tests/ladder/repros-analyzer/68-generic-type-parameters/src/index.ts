// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2 re-evaluation).
//
// Generic type parameters on a declaration are entirely unmodeled: the
// analyzer never reads `node.typeParameters` (zero occurrences of that
// property anywhere in typescript-analyzer.ts). A generic interface or type
// alias therefore emits DTO fields whose types name the type PARAMETER,
// which resolves to nothing — `DTO 'X' field 'y' references undefined type
// 'T'`.
//
// KNOWN GAP — deliberately left failing, no analyzer fix attached.
//
// Distilled from packages/tui/src/hal-client.ts:5 (`HalEnvelope<T>`, whose
// `data: T` field produces the diagnostic on the tui target) and used at
// tui/src/main.ts:27,32,35 and tui/src/view-model.ts:13,23,30,41.
//
// Both the interface and the type-alias spellings are included: they share
// one root cause (no typeParameters handling) but travel different
// converter paths (convertInterfaceToDTO vs convertTypeAliasToDTO), so a
// fix that only covers one would leave the other emitting dangling names.
//
// Not fixed here: modeling type parameters properly is a cross-layer design
// question — whether TypedMind erases them (emit `data: any`), represents
// them as a real generic-parameter concept in the grammar, or keeps the
// name and teaches the checker a scoping rule. That is an operator-level
// language decision, not a local extractor patch.
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
