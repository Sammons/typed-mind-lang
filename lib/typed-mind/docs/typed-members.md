# Typed class members

Class and ClassFile declarations accept repeated quoted `method` and
`constructor` properties in longform. Declaration order and overload entries
are retained within each member family.

```tmd
class Store<T> {
  method: "allocate(value: T) => Lease | AllocationFailure"
  method: "list() => readonly Lease[]"
  constructor: "(config: StoreConfig, leases?: Lease[])"
}
```

Methods have an owner-local name, parameter types and a return type. Constructors
use an anonymous parameter list without an explicit return, `async` marker or
local type parameters. Rest and optional parameters are preserved. Method type
parameters may carry constraints and defaults; their bindings shadow class
parameters, and nested callback bindings shadow both.

Typed signatures automatically promote a requested shortform emission to
longform. Existing shortform `=> [methodName]` and longform `methods` lists keep
their legacy meaning: references to separately declared Function entities. A
typed method name belongs to its class and does not consume a same-named global
Function. A checked `Store.allocate` call resolves to the owning class; a
constructor is not a callable method named `constructor`.

The shared signature parser requires complete consumption. Unsupported payloads
retain their text and produce `checker/unsupported-member-signature`; parsed
payloads with an invalid method name or constructor shape produce
`checker/invalid-member-signature`. Neither contributes guessed references.
Unquoted properties and properties on other entity kinds produce
`semantics/invalid-member-property`.

The checker follows parameter, return, constraint and default types, including
structured generic arguments and recognized nested callbacks. Qualified names
use the same owner/member validation as other type references. LSP definitions,
references, semantic tokens and hover use these parsed facts; quoted escape
positions are mapped back to their original source columns.

## Source extraction

The TypeScript converter retains method and constructor declarations, including
source overload entries, class-like interface methods, arrow members and
accessors. A getter and setter remain separate entries. The existing
`includePrivateMembers` option controls private visibility; protected members
remain included. Static member signatures are retained without introducing a
separate static-dispatch model. Method bodies are not a new call-graph surface.

Constructor parameter properties retain their parameter types. Default
initializers contribute optionality, while initializer expression text remains
outside the extracted signature. Destructuring follows the existing analyzer's
binding-name policy. The supported local method-name spelling is
`[A-Za-z_]\w*`; unsupported computed, private `#`, dollar-sign or other names
retain their full signature payload and explicit diagnostics rather than inventing reference targets. With `includePrivateMembers: true`, a `#private` method therefore remains in `members.methods`, but has no guessed name in the derived `.methods` callable-name view. Emission and reparsing preserve that distinction; the default visibility filter still excludes it.
Single-line string encoding follows the shared quoted-string codec. Literal
values containing physical newlines retain the existing emission limitations.

## Representation

`ClassNode` and `ClassFileNode` accept either legacy `methods` or canonical
`members: ClassMembers`. Canonical members contain ordered method and constructor
entries with a `SignatureParseResult`. The enumerable legacy `.methods` view is
derived from named method entries; constructors never enter that list.
`methodSignature` and `constructorSignature` expose only valid parsed entries.
`walkClassMemberTypeReferences` shares lexical binding rules with the checker.

Optional `TypeOpaqueNode.textOffsets` records decoded-character to source-column
offsets for quoted payloads that require a deferred callback parse. It is source
provenance, excluded from semantic round-trip projection with spans, and absent
for ordinary unquoted type text. Consumers must not infer a map when it is absent.
