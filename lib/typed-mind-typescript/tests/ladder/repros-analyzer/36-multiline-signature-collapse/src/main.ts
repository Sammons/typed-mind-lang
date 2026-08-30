// issue #86 (found during tm10-inc2's live ladder re-run) — a parameter or
// return type authored across multiple lines in the source TypeScript
// embeds its raw newlines into `buildFunctionSignature`'s `::` shortform
// signature line, desyncing the grammar's single-line signature production.
// This fixture isolates the multi-line-newline defect ITSELF, using shapes
// whose SINGLE-LINE form already parses cleanly (a bare literal union, a
// generic type, a named-interface parameter) — so any remaining diagnostic
// after collapsing whitespace is provably the newline, not a pre-existing,
// separately-tracked grammar limitation on a DIFFERENT type shape (the
// inline-object-literal-in-signature-text gap, confirmed pre-existing and
// out of #86's own scope by isolated single-line repro, filed separately).

export interface Widget {
  id: string;
  label: string;
}

// Multi-line-authored numeric-literal-union PARAMETER type — the same
// CLASS of shape confirmed live on webhookstorage/web-main's
// `PublicHeader` (a multi-line union), but written here as a bare
// (non-destructured, non-object-literal, non-string-literal) parameter
// type so the fixture isolates the newline defect from two SEPARATE,
// pre-existing, out-of-scope grammar gaps confirmed by isolated repro
// during this item's own investigation: an inline object-literal type in
// signature text (braces/semicolons unrepresentable in the `signature`/`::`
// grammar slot) and a quoted-string-literal union in signature text (the
// `$.string` alternative in the `signature` production does not compose
// cleanly with adjacent `_sig_chunk` tokens at a `"literal") => ...`
// boundary) — both filed separately, not fixed here.
export function setView(
  view: 1 |
    2 |
    3 |
    4
): void {
  void view;
}

// Multi-line-authored generic RETURN type.
export function loadWidgets(): Promise<
  Widget[]
> {
  return Promise.resolve([]);
}

// Control case: a NAMED interface parameter with a multi-line-authored
// generic RETURN type. `input`/`output` must still resolve to `Widget`/
// `WidgetList` cleanly — the corruption is isolated to the signature
// line's own text, independent of input/output classification (per issue
// #86's own disposition).
export interface WidgetList {
  items: Widget[];
}

export function widgetTransform(
  widget: Widget
): Promise<
  WidgetList
> {
  return Promise.resolve({ items: [widget] });
}
