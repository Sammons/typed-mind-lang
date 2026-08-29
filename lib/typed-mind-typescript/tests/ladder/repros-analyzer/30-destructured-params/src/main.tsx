// D-LEG-5 (rfc-tm-10-diamond.md §5, issue #66) — parseParameters's blind
// `(param.name as ts.Identifier).text` cast returns `undefined` for a
// destructured parameter (an ObjectBindingPattern/ArrayBindingPattern has
// no `.text`), and template-string interpolation stringifies that into the
// literal parameter name "undefined". The exact cited evidence:
// webhookstorage's web-main `PublicHeader({ current }: { current?: string })`.

// web-main-shaped: a single-property destructured parameter. The synthesized
// name must be the joined property name ("current"), not "undefined", and
// the inline object type must appear exactly once (no duplicated raw
// continuation line — the D-LEG-1 consequence this item's own fixture
// asserts as a negative check).
export function PublicHeader({ current }: { current?: string }): string {
  return current ?? '';
}

// App.tsx-shaped: a two-property destructured parameter. Still within the
// 1-3 element joined-name range — "label" joins with "current" by
// declaration order.
export function NavLink({ current, label }: { current?: string; label: string }): string {
  return `${label}:${current ?? ''}`;
}

// Positional-fallback: more than 3 bound elements falls back to the
// parameter's own positional synthetic name (arg0), not a joined name.
export function Toolbar({ a, b, c, d }: { a?: string; b?: string; c?: string; d?: string }): string {
  return [a, b, c, d].join('');
}

// Positional-fallback: array destructuring carries no stable property-name
// signal, so it always falls back to the positional synthetic name (arg0),
// regardless of element count.
export function Pair([first, second]: [string, string]): string {
  return `${first}${second}`;
}

// Control case: a plain identifier parameter must be unaffected by the new
// destructuring branches — same emission as before this fix.
export function Plain(current: string): string {
  return current;
}

// D-LEG-5 amendment (issue #72) — the Diamond's §5 claim that the
// duplication half is "resolved as a CONSEQUENCE of D-LEG-1" was only
// PARTIALLY true: this destructured parameter's inline object-literal type
// (no enclosing Class/Interface name to resolve) fell through
// isDTOLikeType's "DTO-like by elimination" branch and produced a bare
// `<- { ... }` continuation line the grammar's entity_name-only
// input_name/output_name productions cannot parse — a genuine syntax/error,
// not a benign duplicate. isDTOLikeType now excludes any type text starting
// with `{`. Widget below is the control: a NAMED interface destructured
// parameter must still route through input/output (the true positive
// D-LEG-1 preserves), so `<- Widget` keeps emitting.
export interface Widget {
  name: string;
}

export function DestructuredWidget({ name }: Widget): string {
  return name;
}
