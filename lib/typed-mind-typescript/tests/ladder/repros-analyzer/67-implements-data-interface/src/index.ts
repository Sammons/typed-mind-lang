// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2 re-evaluation).
//
// A class that `implements` a DATA-SHAPED interface. Distilled from
// packages/hub/src/observability/telemetry.ts:13,19,28,41,82,104 — `Span`
// and `Telemetry` are implemented by NoopSpan/NoopTelemetry/RecordingSpan/
// RecordingTelemetry, producing 3 checker errors on the hub-http target.
//
// FIXED — this fixture now checks CLEAN. Regressions in
// tests/ladder/slat-harness-known-gaps.test.ts.
//
// The extractor was always correct here, and the original adjudication said
// so: NoopSpan carries `extends: undefined, implements: ['Span']` — the right
// slot — and `Span` is correctly classified DTO because it is data-shaped
// (properties only). The defect was in the LANGUAGE layer,
// `lib/typed-mind/src/checker/valid-references.ts`, where `implements` was
// declared `to: ['Class', 'ClassFile']` with the comment "In TypedMind,
// interfaces are represented as Classes".
//
// That comment was a half truth. A TypeScript interface has no single
// TypedMind kind: the extractor classifies it BY SHAPE, because the language
// models a method surface only on Class (`ClassNode.methods`) and a field
// surface only on DTO (`DtoNode.fields`). A method-bearing interface is a
// Class (fixture 69); a property-only interface like `Span` is a DTO. Both
// are correct, and both are legitimate `implements` targets in the source
// language — so restricting the slot to Class/ClassFile hard-coded one half
// of a two-way classification and made this legal source shape
// unrepresentable no matter which kind the converter picked.
//
// The fix widens `VALID_REFERENCES.extends` and `.implements` to accept a
// DTO target. BOTH slots widen, not just `implements`, because shortform
// emission collapses them into one `<:` inherit list
// (emit-shortform.ts `inheritanceSuffix`), so a round-trip re-parse
// attributes the first target to `extends` — which is why this fixture's
// diagnostic read `Cannot use 'extends' to reference DTO 'Span'` in
// shortform and `Cannot use 'implements' ...` in longform. Still enforced:
// the `from` side (only a Class/ClassFile may declare inheritance), target
// existence, and cycle rejection. Forcing `Span` into the Class kind instead
// was rejected — ClassNode has no field surface, so it would have stripped
// `name`/`ended` and traded a checker error for silent data loss.
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
