# Diagnostic code audit

RFC-TM-10 §12 (`rfc-tm-10-diamond.md`, D-LEG-12, Diamond DAG Q7) — the full
per-code read-and-grade pass against every `addFinding`/diagnostic
construction site in the checker-code registry
(`lib/typed-mind/src/checker/check-codes.ts`). Every row is graded against
`diagnostic-style-guide.md`'s three-clause/backtick/no-jargon rule, read at
the code's own construction site.

Two dispositions:

- **PASS** — the current message (plus `suggestion`, when the finding type
  carries one) satisfies the rule as written.
- **FIXED** — the current message failed the rule; this audit rewrote it in
  the same change. The "fixed to" column is the new text (or "message" when
  the fix added/changed the message itself rather than only a `suggestion`).

Two finding shapes exist in this codebase, and the rule applies differently
to each (see `diagnostic-style-guide.md`'s "A `CheckerFinding`..." paragraph):

- **`CheckerFinding`** (`checker/*` codes constructed via
  `CheckContext.addFinding`): carries an optional `suggestion` field. Clause 3
  (WHAT TO DO) normally lives there.
- **`Diagnostic`** (`imports/*`, `semantics/*`, `syntax/*` codes constructed
  directly by pipeline phases, per `ast/diagnostic.ts`): has NO `suggestion`
  field — "the Diagnostic catalog is message-only by TM-3 design"
  (`checker/finding.ts`'s own header comment). For this shape, clause 3 folds
  into `message` itself, matching the pre-existing `imports/duplicate-name`
  precedent (`pipeline/import-resolver.ts`) — this audit did not reopen the
  TM-3 message-only design to add a `suggestion` field.

Completeness: `lib/typed-mind/scripts/check-diagnostic-code-audit.mjs` deep-
equals this table's row set (below) against `extractCheckCodes`'s live-scanned
set (`lib/typed-mind/src/checker/extract-check-codes.ts`, the same extractor
`check-codes.test.ts` uses for the registry's own stability test). 62 rows,
100% of the registry, verified by that script — wired into `pnpm run ci`.

## Audit table

| Code | File:line | Shape | Disposition | Fixed to |
|---|---|---|---|---|
| `checker/asset-contains-non-program` | check-assets.ts:22 | CheckerFinding | PASS | — |
| `checker/asset-program-unknown` | check-assets.ts:14 | CheckerFinding | PASS | — |
| `checker/circular-containment` | check-cycles.ts:133 | CheckerFinding | PASS | — |
| `checker/circular-import` | check-cycles.ts:95 | CheckerFinding | PASS | — |
| `checker/circular-inheritance` | check-cycles.ts:203 | CheckerFinding | PASS | — |
| `checker/self-containment` | check-cycles.ts:121 | CheckerFinding | PASS | — |
| `checker/self-inheritance` | check-cycles.ts:156 | CheckerFinding | PASS | — |
| `checker/unknown-base-class` | check-cycles.ts:166 | CheckerFinding | PASS | — |
| `checker/unknown-interface` | check-cycles.ts:183 | CheckerFinding | PASS | — |
| `checker/dto-field-function-type` | check-dto-fields.ts:189 | CheckerFinding | PASS | — |
| `checker/dto-field-non-data-type` | check-dto-fields.ts:85 | CheckerFinding | PASS | — |
| `checker/dto-field-unknown-type` | check-dto-fields.ts:75 | CheckerFinding | PASS | — |
| `checker/enum-literal-outside-members` | check-dto-fields.ts:167 | CheckerFinding | PASS | — |
| `checker/duplicate-name` | check-duplicate-names.ts:44,57 | CheckerFinding | PASS | — |
| `checker/entry-not-file` | check-entry-point.ts:47 | CheckerFinding | PASS | — |
| `checker/entry-not-found` | check-entry-point.ts:39 | CheckerFinding | PASS | — |
| `checker/no-entry-point` | check-entry-point.ts:27 | CheckerFinding | PASS | — |
| `checker/class-not-exported` | check-exports.ts:56 | CheckerFinding | PASS | — |
| `checker/function-not-exported` | check-exports.ts:64 | CheckerFinding | PASS | — |
| `checker/multi-exported` | check-exports.ts:91 | CheckerFinding | PASS | — |
| `checker/undefined-export` | check-exports.ts:110 | CheckerFinding | PASS | — |
| `checker/consumes-invalid-kind` | check-function-graph.ts:116 | CheckerFinding | PASS | — |
| `checker/consumes-unknown` | check-function-graph.ts:108 | CheckerFinding | PASS | — |
| `checker/dependency-direct-consumption` | check-function-graph.ts:86 | CheckerFinding | PASS | — |
| `checker/dependency-not-found` | check-function-graph.ts:75 | CheckerFinding | PASS | — |
| `checker/input-dto-not-found` / `checker/output-dto-not-found` | check-function-graph.ts:34 (slot template) | CheckerFinding | PASS | — |
| `checker/input-not-dto` / `checker/output-not-dto` | check-function-graph.ts:43 (slot template) | CheckerFinding | PASS | — |
| `checker/import-not-found` | check-imports.ts:47 | CheckerFinding | PASS | — |
| `checker/import-pattern-unmatched` | check-imports.ts:34 | CheckerFinding | **FIXED** (pre-seeded, RFC-TM-10 §12) | added `suggestion`: "Check the pattern's glob syntax or the target module's actual export names" |
| `checker/method-call-on-non-class` | check-method-calls.ts:31 | CheckerFinding | PASS | — |
| `checker/unknown-call-target` | check-method-calls.ts:24 | CheckerFinding | **FIXED** (pre-seeded, RFC-TM-10 §12) | added `suggestion`: "Define '${objectName}' before calling '${call}' on it, or fix the typo" |
| `checker/unknown-method` | check-method-calls.ts:39 | CheckerFinding | PASS | — |
| `checker/orphaned-entity` | check-orphans.ts:118 | CheckerFinding | PASS | — |
| `checker/orphaned-file` | check-orphans.ts:108 | CheckerFinding | PASS | — |
| `checker/reference-from-illegal` | check-reference-legality.ts:63 | CheckerFinding | PASS | — |
| `checker/reference-to-illegal` | check-reference-legality.ts:74 | CheckerFinding | PASS | — |
| `checker/reference-unknown-type` | check-reference-legality.ts:53 | CheckerFinding | **FIXED** | message gained the referencer's name (WHERE): "Unknown reference type '${referenceKind}' on '${from.name}'"; added `suggestion`: "File a bug report — this reference kind should never reach the checker" (defensive branch, unreachable through the closed `ReferenceKind` union in production) |
| `checker/consumedby-disagreement` | check-run-parameters.ts:40 | CheckerFinding | PASS | — |
| `checker/consumedby-non-function` | check-run-parameters.ts:33 | CheckerFinding | **FIXED** | added `suggestion`: "Change '${funcName}' to a Function entity that consumes '${entity.name}'" |
| `checker/consumedby-unknown-function` | check-run-parameters.ts:26 | CheckerFinding | **FIXED** | added `suggestion`: "Define '${funcName}' as a Function entity that consumes '${entity.name}'" |
| `checker/affectedby-disagreement` | check-ui-components.ts:110 | CheckerFinding | PASS | — |
| `checker/affects-non-uicomponent` | check-ui-components.ts:86 | CheckerFinding | PASS | — |
| `checker/affects-unknown` | check-ui-components.ts:78 | CheckerFinding | PASS | — |
| `checker/containedby-non-uicomponent` | check-ui-components.ts:57 | CheckerFinding | PASS | — |
| `checker/containedby-unknown-parent` | check-ui-components.ts:50 | CheckerFinding | PASS | — |
| `checker/contains-non-uicomponent` | check-ui-components.ts:38 | CheckerFinding | PASS | — |
| `checker/contains-unknown` | check-ui-components.ts:30 | CheckerFinding | PASS | — |
| `checker/uncontained-uicomponent` | check-ui-components.ts:131 | CheckerFinding | PASS | — |
| `checker/duplicate-path` | check-unique-paths.ts:44 | CheckerFinding | PASS | — |
| `checker/meta-suppression-rejected` | apply-suppressions.ts:123 | Diagnostic | **FIXED** | message gained WHAT-TO-DO clause (folded — no `suggestion` field on `Diagnostic`): "...suppression-machinery codes are not suppressible — remove this suppression entry" |
| `checker/stale-suppression` | apply-suppressions.ts:133 | Diagnostic | **FIXED** | message gained WHAT-TO-DO clause (folded): "...matches no finding this run — remove this suppression entry" |
| `imports/circular` | pipeline/import-resolver.ts:96 | Diagnostic | **FIXED** | message gained WHAT-TO-DO clause (folded): "...— break the cycle by removing one of these imports" |
| `imports/duplicate-name` | pipeline/import-resolver.ts:118 | Diagnostic | PASS | — (WHAT-TO-DO already folded into message: "use an alias to avoid naming conflicts") |
| `imports/read-failure` | pipeline/import-resolver.ts:161 | Diagnostic | **FIXED** | message gained WHAT-TO-DO clause (folded): "...— check the path exists and is readable" |
| `semantics/dependency-direct-consumption` | pipeline/forward-semantics.ts:46 | Diagnostic | PASS | — (WHAT-TO-DO already folded into message: "a File must import '${dependencyName}' first") |
| `semantics/extra-input-dto` | pipeline/forward-semantics.ts:55 | Diagnostic | PASS | — (explains the rule inline; the extra DTO is silently ignored, not something the author must act on) |
| `semantics/illegal-continuation` | pipeline/attachment-rules.ts:277 | Diagnostic | **FIXED** | full message rewrite — the "illegal continuation:" leading log-tag phrasing read as internal terminology rather than prose; new: "This ${label} cannot attach to a ${kind} entity — move it under an entity kind that accepts it, or remove it" |
| `semantics/orphan-continuation` | pipeline/attachment-rules.ts:268 | Diagnostic | **FIXED** | full message rewrite, same rationale as `illegal-continuation`; new: "This ${label} has no preceding entity declaration to attach to — move it directly under an entity declaration, or remove it" |
| `syntax/error` | pipeline/syntax-diagnostics.ts:25 | Diagnostic | **FIXED** | message capitalized + gained WHAT-TO-DO clause (folded): "Unparsable text: \`...\` — check this line against the grammar and fix or remove it" |
| `syntax/missing` | pipeline/syntax-diagnostics.ts:34 | Diagnostic | **FIXED** | message capitalized, backticked the grammar-production-name token, gained WHAT-TO-DO clause (folded): "Missing \`${syntaxNode.type}\` — add the required token at this position" |

## Grading notes

- Row count: 62, matching `check-codes.ts`'s `CHECK_CODES` array exactly
  (verified: `extractCheckCodes(['checker', 'pipeline'])` returns 62 codes,
  identical set).
- 14 FIXED dispositions total: the 2 pre-seeded from the Diamond's own review
  round (`import-pattern-unmatched`, `unknown-call-target`) plus 12 more this
  Quantum's full pass found. 48 PASS.
- No new internal-implementation-vocabulary token needed a `DENYLIST` append
  in the final state — every FIXED rewrite reused DSL-surface or plain-English
  vocabulary already present in the codebase's other passing messages
  (`entity`, `line`, `suppression entry`, `cycle`). (D-LEG-12's check binding:
  "any new internal-identifier-shaped token this audit surfaces is added to
  D-LEG-10(b)'s lint denylist in the same change" — none needed adding.) The
  lint DID catch a real leak mid-authoring, proving it load-bearing exactly as
  D-LEG-10(b) intends: a first-draft `consumedby-unknown-function`/
  `consumedby-non-function` suggestion used the camelCase field name
  `consumedBy` (`checker/consumedby-non-function`/`-unknown-function`'s
  suggestion text) — `pnpm run check:diagnostic-jargon` failed red on both,
  naming the file, line, and token. Reworded to the natural-language "a
  Function entity that consumes '...'" (matching the sibling
  `consumedby-disagreement`'s already-PASSing "the consumes list" phrasing)
  and the lint went green. No allowlist entry was warranted — `consumedBy` is
  a derived AST/LinkIndex field name with no DSL-surface spelling (the
  grammar's declarable sigil is `consumes_list` / `$< [...]`, per
  `pipeline/attachment-rules.ts`), i.e. genuine implementation vocabulary the
  lint correctly flagged.
- `imports/duplicate-name`, `semantics/dependency-direct-consumption`, and
  `semantics/extra-input-dto` graded PASS despite no `suggestion` field
  populated (`imports/duplicate-name`/`dependency-direct-consumption`) or set
  at all (no such field exists on `Diagnostic`) because each message's own
  prose already states the action per the style guide's stated exception ("a
  finding with no `suggestion` set is missing clause 3 unless the `message`
  itself states the action").
- Eight of the fourteen FIXED rows (`checker/meta-suppression-rejected`,
  `checker/stale-suppression`, `imports/circular`, `imports/read-failure`,
  `semantics/illegal-continuation`, `semantics/orphan-continuation`,
  `syntax/error`, `syntax/missing`) are `Diagnostic`-shaped, not
  `CheckerFinding`-shaped (see the `Shape` column). `ast/diagnostic.ts`
  carries no `suggestion` field (TM-3's message-only design, per
  `finding.ts`'s header comment) — this audit did not reopen that frozen
  surface to add one. Clause 3 folds into `message` for these codes,
  extending the `imports/duplicate-name` precedent that already existed
  before this Quantum.
- `checker/reference-unknown-type` is a defensive branch, confirmed
  unreachable in production through the closed `ReferenceKind` union
  (`check-reference-legality.ts`'s own comment, "Unreachable with the closed
  table; ported for structure"). Its FIXED suggestion points at filing a bug
  rather than at a DSL-author fix, since no DSL document can trigger it.
