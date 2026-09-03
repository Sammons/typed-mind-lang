// KNOWN GAP fixture — property 3 of the reconciled mixin-heritage helper
// (`TypeScriptAnalyzer.getExtendsTargetName`).
//
// A mixin call with NO identifier argument (`makeWidget()`, or one whose
// arguments are all non-identifier expressions) has no nameable base. Both
// PR #152's and PR #153's original helpers fell back to the mixin's own
// CALLEE name, and the reconciled helper keeps that fallback for now.
//
// The fallback keeps the emitted line PARSABLE — `SelfMadeWidget <:
// makeWidget` is grammatical, unlike the `makeWidget()` text the defect
// used to leak — but the edge it states is wrong: it says the class
// extends the FACTORY FUNCTION rather than a base class. The factory is
// extracted as a Function entity, not a Class, so the checker reports an
// illegal reference (`Cannot use 'extends' to reference Function`).
//
// Not fixed here, and deliberately pinned rather than tolerated silently.
// The sound repair needs a real answer to "what is the base of a mixin
// that constructs its own base," which is a modeling question: the
// candidates are emitting no extends edge at all (losing the fact that a
// base exists), or synthesizing an opaque stub for the factory's return
// type (a new entity-synthesis rule, wider than a heritage-clause patch).
// That is an operator-level decision, above this rung's fix bar.
export class Widget {
  render(): string {
    return 'widget';
  }
}

export const makeWidget = (): typeof Widget => Widget;

export class SelfMadeWidget extends makeWidget() {
  label(): string {
    return 'self-made';
  }
}
