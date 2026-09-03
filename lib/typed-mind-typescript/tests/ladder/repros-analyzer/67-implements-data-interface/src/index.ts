// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2 re-evaluation).
//
// A class that `implements` a DATA-SHAPED interface. Distilled from
// packages/hub/src/observability/telemetry.ts:13,19,28,41,82,104 — `Span`
// and `Telemetry` are implemented by NoopSpan/NoopTelemetry/RecordingSpan/
// RecordingTelemetry, producing 3 checker errors on the hub-http target.
//
// KNOWN GAP — deliberately left failing, no analyzer fix attached.
//
// Adjudication: the ANALYZER AND CONVERTER ARE CORRECT here. Verified by
// reading the converted entity directly: NoopSpan carries
// `extends: undefined, implements: ['Span']` — the right slot — and `Span`
// is correctly classified DTO because it is data-shaped (properties only).
//
// The defect is in the LANGUAGE layer, `lib/typed-mind/src/checker/
// valid-references.ts:49-52`: `implements` is declared `to: ['Class',
// 'ClassFile']` with the comment "In TypedMind, interfaces are represented
// as Classes". That assumption does not hold once the converter classifies
// a property-only interface as a DTO — a legal, correct classification —
// so the pair is unsatisfiable: implementing a data interface is
// unrepresentable no matter which slot the converter picks.
//
// Confirmed via longform round-trip (which preserves the slot exactly,
// unlike shortform's single `<:` inherit list): the diagnostic is
// `Cannot use 'implements' to reference DTO 'Span'`. Shortform reports the
// same defect as `Cannot use 'extends' to reference DTO 'Span'` only
// because emit-shortform.ts:187-192 collapses extends+implements into one
// `<:` list, so the re-parse attributes the first item to `extends`.
//
// Fixing it means widening VALID_REFERENCES.implements to accept DTO
// targets (a language-grammar/checker decision with blast radius beyond
// the extractor), so it is out of the ~60-line/one-owning-layer bar and is
// recorded here as a documented failing expectation for the operator.
export interface Span {
  name: string;
  ended: boolean;
}

export class NoopSpan implements Span {
  name = 'noop';
  ended = false;
}

export const endSpan = (span: Span): void => {
  void span;
};
