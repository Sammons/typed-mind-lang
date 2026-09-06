# 116 — class property types reach no emitted slot (RFC-TM-14 §S4, leaf R3a)

Fixture number 116 is the Diamond Doc's proposed number (`rfc-tm-14-diamond.md`,
"Leaf specifications": R3a), free at `origin/main` d8acf75. Quantum U4a
(`feat/tm14-class-properties`); check file `tests/ladder/class-members.test.ts`
(`TM14 U4: typed class properties round-trip and reference their types`).

## Symptom (before)

`src/node.ts` declares `readonly slots: Slots = {}` and `marker?: Marker` on the exported
class `Node`. The converted document carried `method: "run() => void"` only; `Slots` and
`Marker` reached no emitted slot, so the checker reported both as orphans. Live instances:
core `AccumulatorSlots` (`entity-accumulator.ts:98`), `OptionalityMarker`
(`dto-field-node.ts:22`), `RunParameterType` (`run-parameter-node.ts:11`).

## Root cause

`ClassMembers` carried methods and constructors only; `convertMembers` never read
`ParsedClass.properties`, and the language had no property member.

## Fix

- Core: `ClassMembers.properties` (`PropertyDeclarationNode { name, optionality, readonly,
  typeExpr, span }`), longform key `property: "[readonly] name[?]: Type"` parsed by
  `parseQuotedTypeExpr` (spans map through the quoted payload), walked at
  `member-signature`, projected by `honestFieldsOf`, checked by `check-class-members`
  (a wholly opaque non-callable type warns `unsupported-member-signature`), printed by the
  longform emitter and the LSP hover. Shortform has no property slot, so the entity
  promotes to longform.
- Converter: `convertMembers` passes class properties under the same `includePrivateMembers`
  filter as methods (`hidden` is omitted by default). A property with no declared type
  (`name = 'noop'`) is omitted: the analyzer reports `any` for it, which is not what the
  source says.

## Not covered here

Class-lane interfaces (a method-bearing `interface` converted to `Class`) keep their
property-loss warning; routing their properties through the same slot is a follow-up.
