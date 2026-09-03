// Control fixture for the reconciled mixin-heritage helper
// (`TypeScriptAnalyzer.getExtendsTargetName`), which merges PR #152's
// `getExtendsTargetName` and PR #153's `getHeritageTypeString` into one
// implementation. Each declaration below pins one property that exactly
// one of the two original versions got right, so neither behavior can
// regress out again.
//
// See slat-harness-mixin-heritage-controls.test.ts for the assertions.

export class BaseWidget {
  render(): string {
    return 'base';
  }
}

// PROPERTY 1 — a NON-CallExpression heritage clause must be returned by
// `getTypeString(typeNode)` on the whole type node, preserving type
// arguments. PR #152's version used `type.expression.getText()`, which
// dropped them and turned `Container<string>` into `Container`. This is
// the blocker that reconciliation fixes.
export class Container<T> {
  constructor(readonly value: T) {}
}

export class StringBox extends Container<string> {
  unwrap(): string {
    return this.value;
  }
}

// PROPERTY 2a — the base is found by SEARCHING the arguments, not by
// taking position 0: a leading options object must be skipped.
// PR #152's version took `arguments[0]` and re-leaked `{ opt: 1 }`.
export const configurableMixin = (_options: { opt: number }, base: typeof BaseWidget): typeof BaseWidget => base;

export class ConfiguredWidget extends configurableMixin({ opt: 1 }, BaseWidget) {
  label(): string {
    return 'configured';
  }
}

// PROPERTY 2b — a nested mixin application recurses to the innermost
// base. PR #153's version searched only one level and returned nothing
// useful for `outer(inner(BaseWidget))`.
export const inner = (base: typeof BaseWidget): typeof BaseWidget => base;
export const outer = (base: typeof BaseWidget): typeof BaseWidget => base;

export class NestedWidget extends outer(inner(BaseWidget)) {
  depth(): number {
    return 2;
  }
}
