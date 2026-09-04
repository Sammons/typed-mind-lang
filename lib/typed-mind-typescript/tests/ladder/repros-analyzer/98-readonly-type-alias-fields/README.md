# 98 — `readonly` property modifiers drop every field of a type-alias DTO

Corpus: `sammons/slat` (`products/slat`), fixtures 98-101 rung.

## Symptom

An exported `type X = { readonly a: T }` emitted a field-LESS `X %`. Every
type reachable only through a dropped field then became
`checker/orphaned-entity`. On the live corpus this hollowed out **139 of 140**
emitted DTOs and produced 95 orphan errors from the `src/index.ts` entrypoint
alone.

The same shape spelled as an `interface` always emitted its fields correctly,
which is what makes the defect easy to miss: it is specific to the type-alias
path.

## Root cause

`typescript-to-typedmind-converter.ts`, `parseObjectLiteralProperty`.

The property regex is anchored at `^(\w+)`:

```
/^(\w+)(\?)?\s*:\s*(.+)$/s
```

`readonly edition: Edition` does not match — the space after `readonly` is not
a `\w` character. The function returns `undefined`, and
`parseInlineObjectLiteralToFields` `continue`s past the field, silently.

The interface path is unaffected because it reads modifiers off the TypeScript
AST rather than off type TEXT.

## Fix

Strip a leading `readonly` property modifier before matching. The strip
requires whitespace AND a following property-name character, so a property
legitimately named `readonly` (`{ readonly: boolean }`) still parses as the
field `readonly` — pinned by `NamedReadonly` in this fixture.
