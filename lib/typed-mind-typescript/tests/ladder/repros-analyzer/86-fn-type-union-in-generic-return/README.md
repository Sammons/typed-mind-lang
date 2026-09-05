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

## Fixed by RFC-TM-13 C — the grammar half

The atomic `_opaque_angle_group` scanner now owns `<` on opaque derivations;
the fallback chunk excludes it. It balances nested groups and quoted payloads
without exposing their unions to the surrounding field. The original fixture
checks with zero findings; removing its closing `>` restores a syntax error.
Fixtures82 and87 share this fix. Structured generic CSTs and outer union and
description boundaries retain their existing shape.

The following records the historical diagnosis before that fix.

### Historical grammar gap

The emitted `.tmd` is now correct, but `--check` still reports one
`syntax/error` on the field, because the tree-sitter grammar is a **separate
parser** with the same blind spot.

`grammar/grammar.js`'s `_opaque_piece` offers three balanced-group
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

### Scope correction (measured in PR #163)

Whitespace is necessary but **not sufficient**. The function type must also sit
at the **top level** of the field's type. Measured against pristine `main`
(e461e24) with an isolated `XDG_CACHE_HOME`, counting `(ERROR` nodes:

| input | result |
|---|---|
| `- b: (x: string) => Promise<Rec \| null>` | **1 ERROR node** |
| `- b: { f: (x: string) => Promise<Rec \| null> }` | **clean** |
| `- b: Promise<Rec \| null>` | clean (`type_generic` owns it) |
| `- b: (x: string) => Rec \| null` | clean (no generic) |
| `- b: (x: string) => Promise<Rec>` | clean (no union) |

The second row is the finding: **the identical function type wrapped in braces
parses fine.** Inside a brace group the enclosing `_opaque_brace_group` already
absorbs the `|`, so `type_union` never sees it. The gap needs the full
conjunction — a `_paramlist_opaque_run` at top level, containing a generic,
containing a space-separated `|`.

### The angle-group hypothesis is a no-op, not a regression

This README previously argued an `_opaque_angle_group` would break the legal
unpaired-`<` case. That was implemented on a clean copy of `main` and measured
(PR #163):

```js
_opaque_angle_open: () => token(seq(/[A-Za-z_]\w*/, '<')),
_opaque_angle_group: ($) => seq($._opaque_angle_open, prec.right(repeat($._opaque_piece)), '>'),
```

- `tree-sitter generate` — succeeds, **no conflicts**.
- Grammar corpus — **138/138, unchanged**.
- `- a: (x: string) => A < B` — still parses clean. **It does NOT break the
  case this README feared.**
- `- b: (x: string) => Promise<Rec | null>` — **still 1 ERROR node. Unchanged.**

It neither helps nor harms, because by the time the run reaches `Promise<` the
fallback chunk token has already consumed it as opaque text; the angle group
never gets the chance to open. **An angle group in `_opaque_piece` is not the
lever.**

(For contrast, a bare `X = A < B` at top level yields `MISSING ">"` on `main` —
so "a bare `<` is legal opaque text" holds in the opaque-run position, not
universally.)

### What a real fix requires

The `|` must stop being visible to `type_union` while inside an unclosed `<`.
That is **lexer-level** state, not a parser production, because the split
happens at `type_union` before any opaque sub-rule is consulted. The honest fix
is an external C scanner tracking `<`/`>` depth with the same guards the
pipeline parser needs (`<=`/`>=`/`=>` must not bump depth — see
`type-expr-from-text.ts`, learned from PR #119's review). The grammar header
reserves the external scanner as a **stop-and-report** boundary (S-GRAMMAR-3),
which is exactly what this is.

Staying a knownGap is the recommendation: zero corpus instances
(grep-verified across all 268 `.tmd`), the brace-wrapped form already works,
the pipeline half is fixed, and any angle-depth work lands in the same
`(`-position neighborhood where `_paramlist_opaque_run` and
`_opaque_paren_group` already collide (PR #163 hit that conflict directly), so
it carries real regression risk against issue #50's fix for a shape nothing
uses. If prioritized, scope it as an external-scanner RFC, not a local tweak.

## What the tests pin

`rung-bens-almanac.test.ts` asserts the pipeline half directly (empty
remainder, one opaque leaf, correct emitted text) and pins the residual
`syntax/error` as the committed grammar knownGap.
