// Ladder rung: sammons/slat-harness, PR #162 review non-blocking finding —
// a GENERIC heritage target emits its argument list verbatim into the `<:`
// slot, which the checker reports as unparsable.
//
// This fixture exists to pin that the two heritage lanes AGREE, and that the
// residual diagnostic belongs to gap 68 rather than to this PR's interface
// classification.
//
// WHAT HAPPENS. `stripGenericArguments` resolves `Repo<Item>` to `Repo` for
// the heritage LOOKUP, so the shape decision correctly sees the parent's
// methods and `GenericChild` takes the Class lane. The emitted target keeps
// its arguments — `GenericChild <: Repo<Item>` — and the checker reports
// `Unparsable text: `<Item>``. The real-class lane below does the identical
// thing: `GenericDerived <: GenericBase<string>`.
//
// WHY IT IS NOT "FIXED" BY STRIPPING. The obvious one-line repair — strip the
// arguments when building the emitted inherit list — is a change this repo has
// already considered and deliberately rejected. It is PR #152's original bug:
// `slat-harness-mixin-heritage-controls.test.ts` pins `extends Container<string>`
// recording `Container<string>` verbatim as "property 1" of the #152/#153
// mixin-heritage reconciliation, and its own comment states that dropping the
// type arguments "would silence it by discarding real information, which is
// exactly the blocker this reconciliation fixes", warning that asserting zero
// diagnostics there "would pressure a future author to reintroduce the bug".
// Stripping on the interface lane alone would also make the two lanes diverge,
// which is the specific outcome the review asked to avoid.
//
// So the honest disposition is: the emission is intentional, both lanes do it,
// and the unresolvable generic base is gap 68's territory (type parameters are
// unmodeled language-wide). Fixing it means deciding how TypedMind represents a
// parameterized base — a language question, not an extractor patch.
//
// WHAT THIS PR ACTUALLY CHANGED IS EXPOSURE. A generic method-bearing
// interface previously took the silent DTO lane and emitted a clean
// `GenericChild %` with its inherited contract dropped. It now takes the Class
// lane, where the pre-existing emission surfaces as a diagnostic. Loud beats
// silent — the same principle the rest of this rung enforces.
//
// MEASURED against origin/main with this exact fixture copied in:
//   main:   `Repo %` (an EMPTY DTO — `find` dropped), and `GenericChild %`
//           carrying its `tag` field but with NO `<:` edge and NO warning.
//           ONE unparsable diagnostic: the real-class lane's, pre-existing.
//   branch: `Repo <:` / `=> [find]`, `GenericChild <: Repo<Item>`, plus a
//           property-loss warning for `tag`. TWO unparsable diagnostics.
// The second diagnostic is the pre-existing emission becoming REACHABLE, not
// a new defect — on main this shape was simply never emitted.
export interface Item {
  id: string;
}

export interface Repo<T> {
  find(id: string): T;
}

// Interface lane: inherits `find` through a generic parent.
export interface GenericChild extends Repo<Item> {
  tag: string;
}

// Real-class lane: the identical shape, unchanged by this PR and present on
// main today. Pinning both together is what proves the lanes agree.
export class GenericBase<T> {
  hold(value: T): void {
    void value;
  }
}

export class GenericDerived extends GenericBase<string> {
  run(): void {}
}

export const drive = (a: GenericChild, b: GenericDerived): void => {
  void a;
  void b;
};
