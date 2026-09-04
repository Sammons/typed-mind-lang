// Corpus: sammons/mail-agent `src/harness/envelope.ts:266` (`DispatchResult`)
// and `src/store/activity.ts` (`InverseOp`) — the SAME house-style
// `kind`-discriminated union as fixture 90, but this fixture pins what remains
// AFTER fixture 90's converter fix lands.
//
// This is a knownGap. Fixture 90 fixed the CONVERTER: the union now reaches the
// TypeDef alias lane carrying all of its members. What that unmasked is a
// LANGUAGE-layer limit — the grammar cannot parse a string-literal discriminant
// inside a union of object literals, so `{ kind: "none"; ... }` reports
// `Unparsable text: '"none"'`.
//
// The gap is pre-existing and independent of fixture 90: the single-line form
// below reproduces it on `main` with no converter change at all, which is what
// makes this a language gap rather than a regression. Fixture 51
// (`51-union-of-object-literals`, issue #114) emits this exact shape but only
// asserts on the emitted TEXT and never `--check`s it, so the grammar's
// inability to parse the result went unrecorded until this rung ran a checker
// pass over a corpus that uses the shape heavily.
//
// Root cause: `lib/typed-mind/grammar/grammar.js` — the union-member production
// reached by a `{`-opening member does not admit a quoted string literal in the
// value position of a member field. Fixing it is a grammar change plus a
// regenerated parser, which is a language-layer decision above this rung's bar
// (the same reasoning that deferred issue #118).
//
// This test pins the CURRENT behaviour so the gap is a committed fact rather
// than prose. When the grammar learns this shape, this test fails loudly and is
// the signal to promote the gap to fixed.
export type DispatchResult = { kind: "none"; reason: string } | { kind: "reply"; text: string };

export const dispatch = (result: DispatchResult): boolean => Boolean(result);
