// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2 re-evaluation).
//
// A mixin application in an `extends` clause. Distilled from
// packages/harness/src/lib/element.ts:12,19 — the Lit + @lit-labs/signals
// idiom `class SlatElement extends SignalWatcher(LitElement)`, which every
// one of the repo's ~30 slat-* components inherits from.
//
// The extends target parses as an ExpressionWithTypeArguments whose
// `expression` is a CallExpression, so the analyzer's `getTypeString`
// returned the whole call text (`applyMixin(BaseWidget)`). The converter
// emits an extends target verbatim, so the emitted `.tmd` carried
// `IsolatedLeaf <: applyMixin(BaseWidget)` — the grammar's entity_name
// token accepts no parentheses, producing `Unparsable text: \`(BaseWidget)\``.
//
// Only the ZERO-METHOD class leaked: a class with at least one method takes
// the ClassFile-fusion path. Both shapes are present below so the fixture
// pins the discriminator, matching the real file (SlatElement has a method,
// SlatLeaf has an empty body — only SlatLeaf leaked).
export class BaseWidget {
  render(): string {
    return '';
  }
}

// Deliberately NOT generic: a generic factory signature would drag this
// fixture into gap 68's undefined-type-parameter diagnostics and stop it
// isolating the extends-clause defect. The mixin's runtime shape (a
// function returning a subclass of its argument) is what matters here.
export const applyMixin = (base: typeof BaseWidget): typeof BaseWidget => base;

/** The zero-method shape — this is the one that leaked unparsable text. */
export class IsolatedLeaf extends applyMixin(BaseWidget) {}

/** The with-methods shape — took the ClassFile path and emitted safely. */
export class LightWidget extends applyMixin(BaseWidget) {
  protected createRoot(): string {
    return 'root';
  }
}
