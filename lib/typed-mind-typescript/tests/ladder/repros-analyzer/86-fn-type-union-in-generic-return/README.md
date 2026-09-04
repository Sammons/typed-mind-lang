# 86 — a union inside a generic in a function-type return position

Corpus: `sammons/bens-almanac`,
`packages/{nhtsa,usda}-ingestion/src/handler.ts`, whose `IngestionDeps`
declares dependency-injection fields as function types returning a generic over
a union:

```ts
getDedupRecord: (pk: string, sk: string) => Promise<DedupRecord | null>;
```

## Fixed here — the pipeline half

`lib/typed-mind/src/pipeline/type-expr-from-text.ts`, `scanOpaqueRun`.

The scanner counted angle-bracket depth only inside
`if (inGenericArgs && stack.length === 0 && ...)`, but its top-level
`|`/`&` break consulted that same `angleDepth` **regardless** of
`inGenericArgs`:

```ts
if (stack.length === 0 && angleDepth === 0 && (ch === '|' || ch === '&')) { break; }
```

At the top level (`inGenericArgs === false`, which is what `parseAtom`'s `=>`
rescan passes for a field's own type) the `<` of `Promise<` never bumped the
depth, so the `|` inside the generic's arguments read as a TOP-LEVEL union
operator and ended the opaque run mid-type. Observable result — a non-empty
`remainder`, which this module's own doc comment calls a parser bug:

```
'(x: string) => Promise<Rec | null>'
  remainder = '>'
  typeExpr  = union[ opaque'(x: string) => Promise<Rec', named'null' ]
```

The fix counts `<`/`>` unconditionally and keeps only the *break* on a closing
`>` at depth 0 gated on `inGenericArgs` (that `>` belongs to an enclosing
generic and must be left unconsumed — issue #118). At the top level there is no
enclosing generic, so an unmatched `>` is ordinary opaque text and the counter
clamps at zero. After the fix all four probe shapes return an empty remainder
and one opaque leaf.

## knownGap — the grammar half

The emitted `.tmd` is now correct, but `--check` still reports one
`syntax/error` on the field, because the tree-sitter grammar is a **separate
parser** with the same blind spot.

`grammar/grammar.js:1221` (`_opaque_piece`) offers three balanced-group
productions — `_opaque_paren_group`, `_opaque_bracket_group`,
`_opaque_brace_group` — and a fallback token
`/[^ \t\n"(){}\[\]]+/`. There is no `_opaque_angle_group`, and the fallback
token excludes whitespace. So `Promise<Rec | null>` cannot be scanned as one
piece: the spaces around `|` split the run, and the `|` escapes to the
DTO-field union rule, stranding the trailing `>`.

Confirmed by whitespace sensitivity — the unspaced form parses, the spaced form
does not:

```
- a: (x: string) => Promise<Rec|null>     # parses clean
- b: (x: string) => Promise<Rec | null>   # Unparsable text: `>`
```

Adding an `_opaque_angle_group` is NOT a safe local change: `<`/`>` are not
reliably paired in this position, which is exactly why the pipeline parser
tracks them on a separate clamped counter instead of the bracket stack
(see `type-expr-from-text.ts`'s own comment on issue #118). A bare `<` is legal
opaque text today and parses:

```
- a: (x: string) => A < B                 # parses clean today
```

An angle-group production would make that input unbalanced and break it. Fixing
the grammar half needs a design answer for how `<`/`>` pair inside an opaque
run — an operator-level decision above a single rung's bar, and one that must
not regress the unpaired-`<` case above.

## What the tests pin

`rung-bens-almanac.test.ts` asserts the pipeline half directly (empty
remainder, one opaque leaf, correct emitted text) and pins the residual
`syntax/error` as the committed grammar knownGap.
