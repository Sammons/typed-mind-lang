# Emitted identities

RFC-TM-13 E uses one reservation registry for source declarations, File/ClassFile owners, Programs, Dependencies, ambient namespace/builtin stubs, and synthesized DTOs. Reservations precede emission. An entity claiming its own reservation is not a duplicate.

The priority is: source bare-name winners; actual File/ClassFile owners; qualified source losers; Programs; sorted dependency specifiers; sorted ambient/namespace stub keys; synthesized DTOs. The source winner is selected by byte ordering of the project-relative module path. Later declarations use their actual owner's name, for example `LifecycleFile.PublishState` or `ProvisionTenantFile.handler`. Authored case and underscores remain intact.

Generated File names use a PascalCase basename, directory prefixes when needed, and collision-checked numeric suffixes beginning at 2. Programs use `<Base>App` with the same collision check. Generated identities use no double-underscore convention. Dependencies and stub names participate in the same registry, so a source `React`, `Error`, or `HandlerInput` cannot be silently replaced by generated output.

A noncolliding primary class can still fuse with its file. A primary class requiring qualification becomes a separate Class with a real File owner. A pure-types module gains an owner only when a qualified declaration needs it. Private declarations do not acquire fabricated exports. Real references to owned declarations consume their owning File; declaration or export-list membership alone does not.

Source metadata is checked by all four `DeclarationIdentity` fields: file path, name, start, and end. `getAssignedDeclarationName` refuses missing or ambiguous identity metadata. Distinct lexical declarations sharing a file/name allocation key produce an explicit conversion error; this change does not invent lexical scope syntax. Canonical overload identities remain one identity. Consumers requiring an emitted entity must additionally verify one final entity instance of the intended kind.

Raw source type-text rewriting remains A2's responsibility. E preserves collision-reference warnings and does not claim to close gaps 77 or 96. Default identities follow the D rules below; `.default` is reserved only for an actual supported default exposure.

## Validation and golden conservation

`emitted-name-allocation.test.ts` covers adversarial source/generated collisions, repeated conversion reset, reversed module/import order, lowercase qualified functions, private ownership, ClassFile separation, pure-types carriers, numeric/lossy paths, namespace stub identity, lexical ambiguity, and canonical overload controls. The existing collision, inline DTO, SST-handler, and 77/96 residual tests retain their diagnostic expectations with the new names.

The 39 ladder checker verdicts remain unchanged. All 41 changed tracked snapshots (39 ladder plus two converter live snapshots) replace Program `__App` with `App`. After that identity normalization:

- Ten ladder documents change only entity order: 01, 07, 07b, 10, 16, 17, 47, 71, 78, and 84. Only the existing regular/pure-types emission phases are sorted; registration, classification, and default entry selection retain their prior semantics.
- Fixtures 09 and 09b additionally import the actual `MathUtils` namespace stub, matching the shared reservation rather than retrying its raw name as an ordinary export.
- Every other semantic field in these snapshots is identical. Immutable legacy baselines remain unchanged. The converter golden gate now checks the exact Program header name during longform promotion.

## Default exports

A retained local function, arrow function, class or constant with default exposure is emitted once as `ActualFile.default`. Named declarations, `export default local`, and `export { local as default }` preserve the same source declaration identity. Additional local public aliases, such as `export { local as renamed }`, resolve to that same entity through named and default imports and through File/Program exports; repeated exposure does not duplicate the entity or reference.

An export alias carries its exact local declaration identity. Its public spelling cannot expose an unrelated private declaration with the same name. A default class uses a separate File owner and Class instead of ClassFile fusion.

Anonymous default function/class declarations, arbitrary default expressions, imported identifier default assignments and imported bindings in local default clauses currently produce `unsupported-default-export`. They do not synthesize a local body, `<anonymous>` entity or foreign-owner default identity. Enum defaults are likewise outside this retained declaration lane. These warnings disclose unsupported extraction; they do not establish a complete export model for those forms.
