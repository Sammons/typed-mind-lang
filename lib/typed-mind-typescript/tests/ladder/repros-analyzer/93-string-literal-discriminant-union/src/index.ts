// Corpus: sammons/mail-agent `src/harness/envelope.ts:266` (`DispatchResult`)
// and `src/store/activity.ts` (`InverseOp`) — the SAME house-style
// `kind`-discriminated union as fixture 90, but this fixture pins what remains
// AFTER fixture 90's converter fix lands.
//
// This WAS a knownGap; PR #163 closed it. Fixture 90 fixed the CONVERTER: the
// union now reaches the TypeDef alias lane carrying all of its members. What
// that unmasked was a LANGUAGE-layer limit — the grammar could not parse a
// string-literal discriminant inside a union of object literals, so
// `{ kind: "none"; ... }` reported `Unparsable text: '"none"'`. It now parses.
//
// The gap is pre-existing and independent of fixture 90: the single-line form
// below reproduces it on `main` with no converter change at all, which is what
// makes this a language gap rather than a regression. Fixture 51
// (`51-union-of-object-literals`, issue #114) DOES `--check` its output
// (union-of-object-literals.test.ts:69) and passes — because its discriminants
// are BOOLEANS (`{ tagged: false }`). A boolean discriminant is a bare token
// the grammar accepts; a quoted one is not. That is why the shape looked
// covered until this rung ran a corpus whose discriminants are strings.
//
// Root cause, as diagnosed while fixing it (NARROWER than this comment's
// original claim): there is no "union-member production", and the union is not
// the trigger — a single `{ kind: "none"; reason: string }` reproduced it
// identically. `_opaque_piece`'s fallback chunk token excludes `"` and the
// choice had no `$.string` alternative, so a quoted value anywhere inside a
// balanced group was structurally unrepresentable. PR #163 added `$.string` to
// the brace and bracket opaque-group bodies only — the top-level run keeps the
// `"` boundary, which is what opens a DTO field's description slot.
//
// The test now asserts ZERO syntax diagnostics. A diagnostic here is a
// regression of PR #163, not a gap to re-pin.
export type DispatchResult = { kind: "none"; reason: string } | { kind: "reply"; text: string };

export const dispatch = (result: DispatchResult): boolean => Boolean(result);
