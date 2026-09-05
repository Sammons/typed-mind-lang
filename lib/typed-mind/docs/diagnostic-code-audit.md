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
`check-codes.test.ts` uses for the registry's own stability test). 63 rows,
100% of the registry, verified by that script — wired into `pnpm run ci`.

RFC-TM-10 Q8 addendum (D-LEG-11, Diamond DAG Q8): the "Message text" column
below was added so `check-fixture-audit-gating.mjs` has a byte-exact ground
truth to cross-validate D-LEG-11's exact-text fixtures against — the
PASS/FIXED disposition columns alone never carried one (a PASS row cited
only a file:line; a FIXED row's "Fixed to" column is free-form
change-description prose, not a stable literal). Every cell uses
representative example values (`'MyEntity'`, `'myField'`) in place of a
message template's `${...}` interpolation slots; a fixture's own concrete
DSL-derived values differ from these examples by design — only the
surrounding prose must match.

## Audit table

| Code | File:line | Message text | Shape | Disposition | Fixed to |
|---|---|---|---|---|---|
| `checker/asset-contains-non-program` | check-assets.ts:22 | `Asset 'MyAsset' cannot contain 'MyProgram' (it's a Class)` | CheckerFinding | PASS | — |
| `checker/asset-program-unknown` | check-assets.ts:14 | `Asset 'MyAsset' references unknown program 'MyProgram'` | CheckerFinding | PASS | — |
| `checker/circular-containment` | check-cycles.ts:133 | `UIComponent 'RootView' has circular containment: RootView -> ChildView -> RootView` | CheckerFinding | PASS | — |
| `checker/circular-import` | check-cycles.ts:95 | `Circular import detected: FileA -> FileB -> FileA` | CheckerFinding | PASS | — |
| `checker/circular-inheritance` | check-cycles.ts:203 | `Class 'MyClass' has circular inheritance: MyClass -> BaseClass -> MyClass` | CheckerFinding | PASS | — |
| `checker/self-containment` | check-cycles.ts:121 | `UIComponent 'RootView' contains itself` | CheckerFinding | PASS | — |
| `checker/self-inheritance` | check-cycles.ts:156 | `Class 'MyClass' inherits from itself` | CheckerFinding | PASS | — |
| `checker/unknown-base-class` | check-cycles.ts:166 | `Class 'MyClass' extends 'BaseClass' which does not exist` | CheckerFinding | PASS | — |
| `checker/unknown-interface` | check-cycles.ts:183 | `Class 'MyClass' implements 'MyInterface' which does not exist` | CheckerFinding | PASS | — |
| `checker/dto-field-function-type` | check-dto-fields.ts:189 | `DTO 'MyDto' field 'myField' cannot have Function type` | CheckerFinding | PASS | — |
| `checker/dto-field-non-data-type` | check-dto-fields.ts:85 | `DTO 'MyDto' field 'myField' references 'MyProgram' which is a Program, not a DTO or Class` | CheckerFinding | PASS | — |
| `checker/dto-field-unknown-type` | check-dto-fields.ts:75 | `DTO 'MyDto' field 'myField' references undefined type 'UnknownType'` | CheckerFinding | PASS | — |
| `checker/enum-literal-outside-members` | check-dto-fields.ts:167 | `DTO 'MyDto' field 'myField' union literal 'bogus' is not a member of enum 'MyEnum'` | CheckerFinding | PASS | — |
| `checker/duplicate-name` | check-duplicate-names.ts:45,58 | `Duplicate entity name 'MyEntity' found in multiple DTO, Class entities` (plain multi-entity case, check-duplicate-names.ts:58; the fusion-hint site at :45 instead emits `Entity name 'MyEntity' is used by both a File and a Class. Consider using the #: operator for class-file fusion.` when the colliding pair is exactly one File and one Class) | CheckerFinding | PASS | — |
| `checker/entry-not-file` | check-entry-point.ts:47 | `Program 'MyApp' entry point 'MyEntry' must be a File entity, but found Class` | CheckerFinding | PASS | — |
| `checker/entry-not-found` | check-entry-point.ts:39 | `Program 'MyApp' references undefined entry point 'MyEntry'` | CheckerFinding | PASS | — |
| `checker/no-entry-point` | check-entry-point.ts:27 | `No program entry point defined` | CheckerFinding | PASS | — |
| `checker/class-not-exported` | check-exports.ts:56 | `Class 'MyClass' is not exported by any file` | CheckerFinding | PASS | — |
| `checker/function-not-exported` | check-exports.ts:64 | `Function 'myFunction' is not exported by any file and is not a class method` | CheckerFinding | PASS | — |
| `checker/multi-exported` | check-exports.ts:91 | `Entity 'MyEntity' is exported by multiple files: FileA, FileB` | CheckerFinding | PASS | — |
| `checker/undefined-export` | check-exports.ts:110 | `Export 'MyEntity' is not defined anywhere in the codebase` | CheckerFinding | PASS | — |
| `checker/consumes-invalid-kind` | check-function-graph.ts:116 | `Function 'myFunction' cannot consume 'MyEntity' (it's a Class)` | CheckerFinding | PASS | — |
| `checker/consumes-unknown` | check-function-graph.ts:108 | `Function 'myFunction' consumes unknown entity 'MyEntity'` | CheckerFinding | PASS | — |
| `checker/dependency-direct-consumption` | check-function-graph.ts:86 | `Cannot directly consume dependency 'MyDependency' in function 'myFunction'` | CheckerFinding | PASS | — |
| `checker/dependency-not-found` | check-function-graph.ts:75 | `Function dependency 'MyDependency' not found` | CheckerFinding | PASS | — |
| `checker/input-dto-not-found` / `checker/output-dto-not-found` | check-function-graph.ts:34 (slot template) | `Function [input/output] DTO 'MyDto' not found` (slot renders as literally "input" or "output") | CheckerFinding | PASS | — |
| `checker/input-not-dto` / `checker/output-not-dto` | check-function-graph.ts:43 (slot template) | `Function [input/output] 'MyDto' is not a DTO (it's a Class)` (slot renders as literally "input" or "output") | CheckerFinding | PASS | — |
| `checker/import-not-found` | check-imports.ts:47 | `Import 'MyEntity' not found` | CheckerFinding | PASS | — |
| `checker/import-pattern-unmatched` | check-imports.ts:34 | `No entities match import pattern 'MyModule.*'` | CheckerFinding | **FIXED** (pre-seeded, RFC-TM-10 §12) | added `suggestion`: "Check the pattern's glob syntax or the target module's actual export names" |
| `checker/method-call-on-non-class` | check-method-calls.ts:31 | `Cannot call method 'myMethod' on DTO 'MyEntity'. Only Classes and ClassFiles can have methods` | CheckerFinding | PASS | — |
| `checker/unknown-call-target` | check-method-calls.ts:24 | `Call to 'MyEntity.myMethod' references unknown entity 'MyEntity'` | CheckerFinding | **FIXED** (pre-seeded, RFC-TM-10 §12) | added `suggestion`: "Define '${objectName}' before calling '${call}' on it, or fix the typo" |
| `checker/unknown-method` | check-method-calls.ts:39 | `Method 'myMethod' not found on class 'MyClass'` | CheckerFinding | PASS | — |
| `checker/orphaned-entity` | check-orphans.ts:118 | `Orphaned entity 'MyEntity'` | CheckerFinding | PASS | — |
| `checker/orphaned-file` | check-orphans.ts:108 | `Orphaned file 'MyFile' - none of its exports are imported` | CheckerFinding | PASS | — |
| `checker/reference-from-illegal` | check-reference-legality.ts:63 | `DTO 'MyEntity' cannot have 'calls' references` | CheckerFinding | PASS | — |
| `checker/reference-to-illegal` | check-reference-legality.ts:74 | `Cannot use 'calls' to reference DTO 'MyEntity'` | CheckerFinding | PASS | — |
| `checker/reference-unknown-type` | check-reference-legality.ts:53 | `Unknown reference type 'bogusRef' on 'MyEntity'` | CheckerFinding | **FIXED** | message gained the referencer's name (WHERE): "Unknown reference type '${referenceKind}' on '${from.name}'"; added `suggestion`: "File a bug report — this reference kind should never reach the checker" (defensive branch, unreachable through the closed `ReferenceKind` union in production) |
| `checker/consumedby-disagreement` | check-run-parameters.ts:40 | `RunParameter 'MyParam' claims to be consumed by 'myFunction', but that function doesn't consume it` | CheckerFinding | PASS | — |
| `checker/consumedby-non-function` | check-run-parameters.ts:33 | `RunParameter 'MyParam' claims to be consumed by 'MyEntity' which is not a Function` | CheckerFinding | **FIXED** | added `suggestion`: "Change '${funcName}' to a Function entity that consumes '${entity.name}'" |
| `checker/consumedby-unknown-function` | check-run-parameters.ts:26 | `RunParameter 'MyParam' claims to be consumed by unknown function 'myFunction'` | CheckerFinding | **FIXED** | added `suggestion`: "Define '${funcName}' as a Function entity that consumes '${entity.name}'" |
| `checker/affectedby-disagreement` | check-ui-components.ts:110 | `UIComponent 'MyView' claims to be affected by 'myFunction', but that function doesn't affect it` | CheckerFinding | PASS | — |
| `checker/affects-non-uicomponent` | check-ui-components.ts:86 | `Function 'myFunction' cannot affect 'MyEntity' (it's a Class)` | CheckerFinding | PASS | — |
| `checker/affects-unknown` | check-ui-components.ts:78 | `Function 'myFunction' affects unknown component 'MyView'` | CheckerFinding | PASS | — |
| `checker/containedby-non-uicomponent` | check-ui-components.ts:57 | `UIComponent 'MyView' cannot be contained by 'MyEntity' (it's a Class)` | CheckerFinding | PASS | — |
| `checker/containedby-unknown-parent` | check-ui-components.ts:50 | `UIComponent 'MyView' references unknown parent 'ParentView'` | CheckerFinding | PASS | — |
| `checker/contains-non-uicomponent` | check-ui-components.ts:38 | `UIComponent 'MyView' cannot contain 'MyEntity' (it's a Class)` | CheckerFinding | PASS | — |
| `checker/contains-unknown` | check-ui-components.ts:30 | `UIComponent 'MyView' contains unknown component 'ChildView'` | CheckerFinding | PASS | — |
| `checker/uncontained-uicomponent` | check-ui-components.ts:131 | `UIComponent 'MyView' is not contained by any other UIComponent` | CheckerFinding | PASS | — |
| `checker/duplicate-path` | check-unique-paths.ts:44 | `Path 'src/my-file.ts' already used by File 'MyFile'` | CheckerFinding | PASS | — |
| `checker/meta-suppression-rejected` | apply-suppressions.ts:123 | `Suppression of 'checker/stale-suppression' is rejected: suppression-machinery codes are not suppressible — remove this suppression entry` | Diagnostic | **FIXED** | message gained WHAT-TO-DO clause (folded — no `suggestion` field on `Diagnostic`): "...suppression-machinery codes are not suppressible — remove this suppression entry" |
| `checker/stale-suppression` | apply-suppressions.ts:133 | `Stale suppression: 'checker/orphaned-entity' on 'MyEntity' matches no finding this run — remove this suppression entry` | Diagnostic | **FIXED** | message gained WHAT-TO-DO clause (folded): "...matches no finding this run — remove this suppression entry" |
| `imports/circular` | pipeline/import-resolver.ts:96 | `Circular import detected: /abs/path/FileA.tmd -> /abs/path/FileB.tmd -> /abs/path/FileA.tmd — break the cycle by removing one of these imports` | Diagnostic | **FIXED** | message gained WHAT-TO-DO clause (folded): "...— break the cycle by removing one of these imports" |
| `imports/duplicate-name` | pipeline/import-resolver.ts:118 | `Duplicate entity name 'MyEntity' from import; use an alias to avoid naming conflicts` | Diagnostic | PASS | — (WHAT-TO-DO already folded into message: "use an alias to avoid naming conflicts") |
| `imports/read-failure` | pipeline/import-resolver.ts:161 | `Failed to import 'my-module.tmd': Error: ENOENT: no such file or directory — check the path exists and is readable` | Diagnostic | **FIXED** | message gained WHAT-TO-DO clause (folded): "...— check the path exists and is readable" |
| `semantics/dependency-direct-consumption` | pipeline/forward-semantics.ts:46 | `Function 'myFunction' lists Dependency 'MyDependency' in its \`<- [...]\` dependency list; Dependencies cannot be consumed directly — a File must import 'MyDependency' first` | Diagnostic | PASS | — (WHAT-TO-DO already folded into message: "a File must import '${dependencyName}' first") |
| `semantics/extra-input-dto` | pipeline/forward-semantics.ts:55 | `Function 'myFunction' lists extra input DTO 'ExtraDto' beyond the first ('MyDto') in its \`<- [...]\` dependency list; it is ignored — a Function takes one input DTO (\`<- Name\`)` | Diagnostic | PASS | — (explains the rule inline; the extra DTO is silently ignored, not something the author must act on) |
| `semantics/illegal-continuation` | pipeline/attachment-rules.ts:277 | `This methods list (\`=> [...]\`) cannot attach to a DTO entity — move it under an entity kind that accepts it, or remove it` | Diagnostic | **FIXED** | full message rewrite — the "illegal continuation:" leading log-tag phrasing read as internal terminology rather than prose; new: "This ${label} cannot attach to a ${kind} entity — move it under an entity kind that accepts it, or remove it" |
| `semantics/orphan-continuation` | pipeline/attachment-rules.ts:268 | `This methods list (\`=> [...]\`) has no preceding entity declaration to attach to — move it directly under an entity declaration, or remove it` | Diagnostic | **FIXED** | full message rewrite, same rationale as `illegal-continuation`; new: "This ${label} has no preceding entity declaration to attach to — move it directly under an entity declaration, or remove it" |
| `syntax/error` | pipeline/syntax-diagnostics.ts:25 | `Unparsable text: \`~garbled input~\` — check this line against the grammar and fix or remove it` | Diagnostic | **FIXED** | message capitalized + gained WHAT-TO-DO clause (folded): "Unparsable text: \`...\` — check this line against the grammar and fix or remove it" |
| `syntax/missing` | pipeline/syntax-diagnostics.ts:34 | `Missing \`entity_name\` — add the required token at this position` | Diagnostic | **FIXED** | message capitalized, backticked the grammar-production-name token, gained WHAT-TO-DO clause (folded): "Missing \`${syntaxNode.type}\` — add the required token at this position" |

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

| `checker/qualified-name-unresolved` | check-context.ts:79 | `Qualified name 'Missing.Type' has no declared owner 'Missing'` (other variants identify an invalid owner, missing member, or private member not exported for this reference) | CheckerFinding | PASS | Suggests declaring owner/member and exporting before a cross-file reference. |
| `semantics/conflicting-type-parameters` | generic-declaration-syntax.ts | `Declare type parameters in either the header or properties.` | Diagnostic | PASS | Span locates the declaration; message states the corrective syntax choice. |
| `semantics/invalid-type-parameter` | generic-declaration-syntax.ts / longform-builder.ts | `Invalid type parameter in 'Pair': close every bracket and quote.` | Diagnostic | PASS | Names the declaration and gives a specific correction, including explicit single-line literal limits. |
| `semantics/multiple-class-bases` | longform-builder.ts | `A class may extend one base; use implements for additional contracts.` | Diagnostic | PASS | Span locates the declaration; message distinguishes base and contract roles and suggests correction. |
| `semantics/unsupported-generic-declaration` | generic-declaration-syntax.ts / cst-to-ast.ts | `Enum 'Choice' does not accept type parameters; remove them or use an alias declaration.` | Diagnostic | PASS | Names the unsupported declaration and gives an applicable alternative. |

Emission-only diagnostic `emitter/unsupported-multiline-type-parameter` (generic-declaration-emission.ts) is outside the suppressible checker registry. Grade: PASS. It names the parameter and declaration, identifies the unsupported multiline value, and asks for a single-line literal before emission.

| `checker/conflicting-signature-type-parameters` | check-generic-declarations.ts | Function signature type parameters disagree with its declaration. | CheckerFinding | PASS | Aligns full binding facts. |
| `checker/duplicate-type-parameter` | check-generic-declarations.ts | Duplicate type parameter T. | CheckerFinding | PASS | Names the repeated binding and requests a distinct name. |
| `checker/invalid-type-parameter-modifiers` | check-generic-declarations.ts | Invalid modifier combination on a type parameter. | CheckerFinding | PASS | Lists supported combinations. |
| `checker/generic-arity` | check-generic-declarations.ts | Type Pair received 0 arguments for 2 declared parameters. | CheckerFinding | PASS | Requests required arguments and permits defaulted omissions. |
| `checker/generic-unknown-type` | check-generic-declarations.ts | Generic declaration references undefined type Missing. | CheckerFinding | PASS | Requests declaration or import. |
| `checker/generic-non-data-type` | check-generic-declarations.ts | Generic declaration references Function work as a type. | CheckerFinding | PASS | Requests a data type. |
| `checker/unsupported-generic-type` | check-generic-declarations.ts | Generic constraint is retained as opaque type text. | CheckerFinding | PASS | States the reference-checking limitation. |
| `checker/unsupported-heritage` | check-generic-declarations.ts | Heritage is retained as opaque type text. | CheckerFinding | PASS | Requests a named base for reference checking. |
| `checker/type-parameter-heritage-base` | check-generic-declarations.ts | Declaration cannot extend local type parameter T. | CheckerFinding | PASS | Requests a declared base with parameters as arguments. |

| `checker/invalid-member-signature` | check-class-members.ts | `Member signature in 'MyEntity' has an invalid method name or constructor shape` | CheckerFinding | PASS | — |
| `checker/unsupported-member-signature` | check-class-members.ts | `Member signature in 'MyEntity' is retained but its references cannot be checked` | CheckerFinding | PASS | — |
| `semantics/invalid-member-property` | longform-builder.ts | `Invalid member property in 'MyEntity'; use a quoted method or constructor property on a Class or ClassFile.` | Diagnostic | PASS | — |
