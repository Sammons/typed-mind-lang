# 100 — a bare `Record<K, V>` alias emits a field-less DTO and loses its value type

Corpus: `sammons/slat` (`products/slat`), fixtures 98-101 rung.

## Symptom

`export type ExactRoutes = Record<string, RouteHandler>` emitted a field-LESS
`ExactRoutes %`. Both the index type and the value type vanished, and
`RouteHandler` — reachable only as the Record's value type — became
`checker/orphaned-entity`.

## Root cause

`typescript-to-typedmind-converter.ts`, `isObjectLikeType`:

```
return type.includes('{') || type.includes('Record<') || type.includes('Map<');
```

The `Record<`/`Map<` clauses claim the alias as DTO-like, routing it to the
field-splitting path. But a bare `Record<string, RouteHandler>` contains no
`{`, so `parseInlineObjectLiteralToFields` finds nothing to split and returns
an empty field list — the type is claimed and then discarded.

## Fix

Gate object-likeness on an actual inline object literal (`{`). A mapped or
indexed collection is DTO-like only when it carries a literal to split into
fields — `Record<string, { a: T }>` still contains a `{` and keeps its
existing routing (pinned by `NestedRoutes` here). Without a brace the TypeDef
path preserves the whole `Record<string, RouteHandler>` text, which keeps the
value type visible instead of discarding it.

The check runs after the union guard, so issue #114's union-of-object-literals
routing is unchanged.
