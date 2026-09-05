// RFC-TM-8 §9 (rfc-tm-8-diamond.md, X-SUPP-7) — the frozen public checker-
// code registry. `code:` strings are load-bearing the moment a document
// suppresses one (SuppressionNode.code, doc §7): a rename becomes a silent
// breaking language change unless something asserts stability. This module
// is that assertion's baseline — `check-codes.test.ts` greps every `code:'
// site across src/checker/ and src/pipeline/, resolves the two template-
// literal sites (checkDtoSlot's `checker/${slot}-dto-not-found` /
// `checker/${slot}-not-dto`, check-function-graph.ts, closed over
// `slot: 'input' | 'output'`) to their four concrete strings, and deep-equals
// the result against CHECK_CODES below.
//
// Changing a code requires editing this registry in the same diff (doc §9:
// "reviewable") plus a RECORDED_RENAMES entry (doc §9/§FAQ: "Does renaming a
// checker code break documents that suppress it? No — the recorded-renames
// table feeds the suppression matcher"). The baseline freezes as of this
// Quantum (Q4) — every code below shipped before the freeze, so no rename
// entries exist yet; the ladder is empty until the first post-freeze rename.
//
// Rename-aware stale matching (doc §9): `apply-suppressions.ts` resolves a
// suppression's `code` through RECORDED_RENAMES before comparing against a
// diagnostic's code, so a suppression naming the OLD spelling keeps matching
// the renamed code's findings for as long as the record exists. Deleting the
// record is the deliberate, breaking act (doc's closing FAQ).

// The frozen baseline (62 codes, alphabetized). Grouped by producing module
// with a one-line pointer so a reviewer can find the emission site; the
// registry itself is a flat set — grouping is a comment convenience only.
//
// RFC-TM-10 mandatory-first-act (rfc-tm-10-diamond.md, Q1 drive-by) — this
// comment previously understated the array's actual length as 60. A direct
// count of CHECK_CODES below returns 62 string literals, confirmed both by
// a deduplicated scan of the array literal and by check-codes.test.ts's own
// stability assertion (the extracted live code set deep-equals this array
// sorted) — 62 is both the array's length and the live emitted code count.
export const CHECK_CODES = [
  // check-assets.ts
  'checker/asset-contains-non-program',
  'checker/asset-program-unknown',
  // check-cycles.ts
  'checker/circular-containment',
  'checker/circular-import',
  'checker/circular-inheritance',
  'checker/self-containment',
  'checker/self-inheritance',
  'checker/unknown-base-class',
  'checker/unknown-interface',
  // check-dto-fields.ts (X-TYPE-4/X-TYPE-7)
  'checker/dto-field-function-type',
  'checker/dto-field-non-data-type',
  'checker/dto-field-unknown-type',
  'checker/enum-literal-outside-members',
  // check-duplicate-names.ts
  'checker/duplicate-name',
  // check-entry-point.ts
  'checker/entry-not-file',
  'checker/entry-not-found',
  'checker/no-entry-point',
  // check-exports.ts
  'checker/class-not-exported',
  'checker/function-not-exported',
  'checker/multi-exported',
  'checker/undefined-export',
  // check-function-graph.ts — 'input'/'output' template-literal sites
  // (checkDtoSlot) resolve to four concrete codes; the other two are plain
  // literals.
  'checker/consumes-invalid-kind',
  'checker/consumes-unknown',
  'checker/dependency-direct-consumption',
  'checker/dependency-not-found',
  'checker/input-dto-not-found',
  'checker/input-not-dto',
  'checker/output-dto-not-found',
  'checker/output-not-dto',
  // check-imports.ts
  'checker/import-not-found',
  'checker/import-pattern-unmatched',
  // check-method-calls.ts
  'checker/method-call-on-non-class',
  'checker/unknown-call-target',
  'checker/unknown-method',
  // check-orphans.ts
  'checker/orphaned-entity',
  'checker/qualified-name-unresolved',
  'checker/orphaned-file',
  // check-reference-legality.ts
  'checker/reference-from-illegal',
  'checker/reference-to-illegal',
  'checker/reference-unknown-type',
  // check-run-parameters.ts
  'checker/consumedby-disagreement',
  'checker/consumedby-non-function',
  'checker/consumedby-unknown-function',
  // check-ui-components.ts
  'checker/affectedby-disagreement',
  'checker/affects-non-uicomponent',
  'checker/affects-unknown',
  'checker/containedby-non-uicomponent',
  'checker/containedby-unknown-parent',
  'checker/contains-non-uicomponent',
  'checker/contains-unknown',
  'checker/uncontained-uicomponent',
  // check-unique-paths.ts
  'checker/duplicate-path',
  // apply-suppressions.ts (X-SUPP-3) — suppression-machinery codes, not
  // suppressible themselves (doc §8's meta-suppression closing rule).
  'checker/meta-suppression-rejected',
  'checker/stale-suppression',
  // pipeline/import-resolver.ts
  'imports/circular',
  'imports/duplicate-name',
  'imports/read-failure',
  // pipeline/forward-semantics.ts
  'semantics/dependency-direct-consumption',
  'semantics/extra-input-dto',
  // pipeline/attachment-rules.ts
  'semantics/illegal-continuation',
  'semantics/orphan-continuation',
  // pipeline/syntax-diagnostics.ts
  'syntax/error',
  'syntax/missing',
] as const;

export type CheckCode = (typeof CHECK_CODES)[number];

// The rename ladder (doc §9/FAQ): `oldCode -> newCode`. A suppression naming
// `oldCode` matches `newCode`'s findings for as long as its entry survives
// here; removing the entry is the breaking act the stability test does NOT
// gate (only CHECK_CODES itself is stability-gated) — reviewers gate renames
// by reading this diff, the same discipline as the CHECK_CODES edit itself.
// Empty at freeze time: every code above predates this Quantum, so no rename
// has happened yet.
export const RECORDED_RENAMES: ReadonlyMap<string, CheckCode> = new Map([]);

// Resolves a suppression's code through the rename ladder to the code it
// should match against today's findings. A code with no recorded rename
// resolves to itself (the common case — most suppressions name a code that
// has never been renamed).
export const resolveSuppressionCode = (code: string): string => {
  return RECORDED_RENAMES.get(code) ?? code;
};
