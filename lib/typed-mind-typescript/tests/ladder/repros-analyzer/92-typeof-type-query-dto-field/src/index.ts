// Corpus: sammons/mail-agent `src/model/client.ts:19` (`ModelDeps`'s
// `fetchImpl: typeof fetch`) and `src/http/routes-activity.ts:40`
// (`ActivityRouteDeps`'s `revert: ReturnType<typeof makeRevert>`). Both are
// the house-style injectable seam — `typeof fetch` types a fetch-shaped
// collaborator without redeclaring its signature.
//
// The TypedMind grammar DOES have a `typeof` production, but its trigger token
// requires a leading `(` (grammar.js `_typeof_opaque_open`, added for issue
// #83's `(typeof CHECK_CODES)[number]`). A BARE `typeof fetch` never matches
// it, so `entity_name` matched `typeof` as an ordinary identifier and the
// checker choked on the next token: `Unparsable text: 'fetch'`.
//
// Nested inside a generic argument the same defect recurs one level deeper:
// the corpus writes `ReturnType<typeof makeRevert>`, whose argument parsed as a
// named type literally called `typeof` — which additionally fed
// `walkGenericArgsForExternalStubs` a bogus external type named `typeof`, a
// stub for a keyword. The fixture uses `Array<...>` rather than `ReturnType`
// so the assertion isolates the type query: `ReturnType` is an ambient TS
// utility type the converter models as an undefined reference, a separate
// pre-existing gap that would otherwise mask this one.
//
// One defect, two depths, so one fix: parenthesize every type query. That lands
// the text inside the grammar's existing, already-correct `(typeof X)`
// production rather than widening the grammar to parse TS type-query syntax.
//
// `alreadyParenthesized` is the idempotence control — issue #83's own corpus
// shape must not become `((typeof CHECK_CODES))[number]`. Its indexed access
// uses `[number]` rather than a quoted key so the fixture isolates the type
// query; a quoted key trips the separate string-literal gap fixture 93 pins.
export const CHECK_CODES = ["a", "b"] as const;

export const makeRevert = (id: string): boolean => Boolean(id);

export type ModelDeps = {
  fetchImpl: typeof fetch;
  revert: Array<typeof makeRevert>;
  alreadyParenthesized: (typeof CHECK_CODES)[number];
  plainControl: string;
};

export const call = (deps: ModelDeps): boolean => Boolean(deps);
