// Distilled from itp-maker's Lit + MobX frontend — five components
// (`frontend/src/components/views/app-shell.ts:20`, `file-list.ts:13`,
// `toast-host.ts:11`, `job-list-view.ts:13`,
// `job-detail-view.ts:32`) each written as
// `class X extends withMobx(LitElement)`.
//
// `parseClass` reads a heritage clause via
// `clause.types.map((type) => this.getTypeString(type))`
// (typescript-analyzer.ts:1136), and `getTypeString` is
// `typeNode.getText()` (:1561-1564) — verbatim source text with no shape
// check. For a mixin application the heritage type is an
// `ExpressionWithTypeArguments` wrapping a CallExpression, so the
// extends target is recorded as the literal string
// `withMobx(BaseElement)`. The converter emits that straight into the
// `<:` inherit position (typescript-to-typedmind-converter.ts:1631),
// where the grammar's `inherit_list` accepts only bare entity names —
// producing an `Unparsable text: \`(BaseElement)\`` finding per class.
//
// `PlainChild` is the in-fixture control: a plain-identifier extends
// clause must keep emitting exactly as before.

export class BaseElement {
  render(): string {
    return 'base';
  }
}

// Deliberately NOT generic. The real `withMobx` is a generic mixin
// factory, but a generic type parameter in the factory's own signature
// exercises an unrelated pre-existing behavior (a bare `T` reaching the
// input/output DTO slot) that would confound this fixture's assertion.
// The heritage-clause shape under test — a CallExpression in the
// `extends` position — is identical either way.
export const withMobx = (Base: typeof BaseElement): typeof BaseElement => {
  return Base;
};

export class MixedChild extends withMobx(BaseElement) {
  render(): string {
    return 'mixed';
  }
}

export class PlainChild extends BaseElement {
  render(): string {
    return 'plain';
  }
}
