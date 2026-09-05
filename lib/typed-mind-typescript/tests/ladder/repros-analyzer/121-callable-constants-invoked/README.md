# Fixture 121 — callable constants invoked

RFC-TM-14 §S6 leaf R5. A `const` whose call/new initializer produces a callable
type is reclassified from Constants to Function.

Test cases:
- `auth = createMiddleware<{v:1}>(...)` — callable, becomes Function
- `both = createMiddleware<{v:1}>(async (c) => { await auth(c) })` — callable with cross-file body edge
- `N = 1` — not callable, stays Constants
- `maybe = maybeCallable(true)` where `maybeCallable(): (() => void) | number` — checker
  type is a union not fully callable, stays Constants
- `audit()` cross-file callee inside `both`'s callback — asserts `both ~> [auth, audit]`
  (the initializer's own factory callee, `createMiddleware`, is excluded — only the
  callback arguments are walked for body references)
