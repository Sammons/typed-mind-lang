# Diagnostic style guide

This guide states the message-shape rule every checker `message`/`suggestion`
string and every extractor warning follows. `lib/typed-mind/scripts/check-diagnostic-jargon.mjs`
enforces the no-jargon rule below in CI; the three-clause and backtick rules
are not machine-checked (see "Scope" below).

## The rule

Every diagnostic message states, in order:

1. One clause naming WHAT is wrong.
2. One clause naming WHERE (the entity name and/or its span).
3. One clause naming WHAT TO DO about it.

Every named entity, code identifier, or file path is backtick-quoted. No
internal implementation vocabulary — a function name, an internal variable, an
implementation-detail noun the DSL author never typed — appears in the message
text.

A `CheckerFinding` (`lib/typed-mind/src/checker/finding.ts`) carries the first
two clauses in its `message` field and the third in its optional `suggestion`
field. A finding with no `suggestion` set is missing clause 3 unless the
`message` itself states the action (rare — most findings need a separate
`suggestion`).

## Rule 1: backtick every named entity

Wrap an entity name, a code identifier, or a file path in backticks inside the
message text.

**Before:**

```
Orphaned entity RecognizerName
```

**After:**

```
Orphaned entity 'RecognizerName'
```

This example is not a hypothetical: it is the codebase's actual current
shape. The guide documents the existing convention here — it does not invent
a new one. See `check-orphans.ts:122`'s `` `Orphaned entity '${name}'` ``.

## Rule 2: no internal implementation vocabulary

A message never names a function, an internal variable, or an
implementation-detail noun that exists only inside the extractor's or
checker's own source. A `.tmd` author never typed `isDTOLikeType` or
`traverseQueue` — those names mean nothing to them and leak an implementation
detail a message should describe in DSL terms instead.

**Before** (a hypothetical regression this rule exists to catch):

```
isDTOLikeType returned false for this field
```

**After:**

```
Field 'amount' has an unresolvable type 'CustomThing' — define it as a DTO or Class entity
```

The DSL's own public-surface vocabulary is not jargon. Grammar production
names (`entity_name`, `Program`, `File`, `Function`) and `TypeExprNode`'s
`kind` discriminant values (`named`, `generic`, `union`, `intersection`,
`array`, `literal`, `opaque`) are terms a DSL author is expected to encounter
— they are documented in `lib/typed-mind/grammar.md`. A message may use these
terms freely. The jargon lint's allowlist (below) carries exactly this
vocabulary; its denylist targets implementation-only names instead.

## Scope

The three-clause structure and the backtick rule are style guidance for a
human author and reviewer to apply when writing or editing a message. Neither
is machine-checked by this Quantum — enforcing sentence structure and
quoting via static analysis would need a message-string parser this mission
does not build. The jargon rule IS machine-checked (below), because a
denylist-token match is a checkable string-containment test with no parsing
required.

## The jargon-detection lint

`lib/typed-mind/scripts/check-diagnostic-jargon.mjs` statically extracts every
`message:`/`suggestion:` string from `lib/typed-mind/src/checker/*.ts` and
`lib/typed-mind/src/pipeline/*.ts`, then checks each extracted string against
a maintained denylist of internal-identifier-shaped tokens.

The denylist has two parts:

- An explicit list, seeded from this mission's own audit: `isDTOLikeType`,
  `traverseQueue`, `sanitizeEntityName`, `collectReferencedNames`. A future
  audit (RFC-TM-10's D-LEG-12) may append further names it finds to this same
  list.
- A general heuristic: a multi-word camelCase or snake_case token of 2+ words
  that does not appear in an explicit allowlist of public-API names
  (`entity_name`, `TypeExprNode`'s `kind` values, and similar DSL-surface
  vocabulary this guide's own examples use).

The lint exits nonzero on any match, printing the offending file, line, and
matched token. It runs inside `pnpm run ci` alongside the existing
`check:generated` gate — a message string containing a denylisted token fails
CI, the same way a drifted generated artifact does.

### False positives

A token that legitimately belongs in a message — a DSL-surface term the
allowlist has not yet caught up to, or a token whose camelCase/snake_case
shape coincidentally matches the heuristic without being implementation
vocabulary — is added to the script's `ALLOWLIST` array with a one-line
comment naming why it is DSL-surface vocabulary rather than an internal name.
The allowlist entry is the only sanctioned way to silence a match; there is no
inline suppression comment mechanism (unlike suppression of checker findings
in `.tmd` documents themselves, which is a distinct, unrelated mechanism —
see the `suppress` grammar production in `grammar.md` for that system). Adding
a token to the allowlist
without justification defeats the lint's purpose, so every addition is
reviewed the same way a change to `CHECK_CODES` (`check-codes.ts`) is
reviewed: the reviewer confirms the token is genuinely public DSL vocabulary,
not an implementation leak.

## Applying this guide to a new diagnostic

When adding a new checker rule or extractor warning:

1. Write the `message` as clause 1 (what) + clause 2 (where), with the entity
   name backtick-quoted.
2. Write a `suggestion` as clause 3 (what to do), unless the `message` already
   states the action.
3. Run `node lib/typed-mind/scripts/check-diagnostic-jargon.mjs` locally (or
   let `pnpm run ci` catch it) before opening a PR — a new message that
   accidentally names an internal function or variable fails the lint the
   same way an existing one would.
