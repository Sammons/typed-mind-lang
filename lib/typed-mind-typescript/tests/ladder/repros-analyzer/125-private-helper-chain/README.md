# 125 — a class constructed only inside a private function stays orphaned (D-16 pin)

RFC-TM-14 (`rfc-tm-14-diamond.md`) Deferral **D-16**, leaf **R16-pin**, Quantum U1.
The doc assigns this fixture number 125.

## Shape

`src/source.ts`: `class Source {}` (not exported, fused as the file's ClassFile
— the live `ParameterSource` shape, `live-02:455`), `const parse = () => new
Source()` (private function), `export const parseText = () => parse()`. Entry
`src/main.ts` imports `parseText`.

## Pinned verdict

`Source` is reported as `checker/orphaned-entity`. This is the deferred R16
mechanism: a non-exported function never becomes an entity (P8,
`converter.ts` `isFunctionExported`), so the `new Source()` inside `parse` has no
carrier. The truthful carrier is a qualified private Function entity
(`SourceFile.parse`), a document-shape decision D-16 defers to the typedmind
lead. The transitive alternative (`parseText ~> [Source.constructor]`) would
state a construction that does not occur in `parseText` and is a rejected
alternative in the doc.

Live instances pinned: `ParameterSource` in the self and core captures
(`core/pipeline/parse-type-parameters.ts:81-83`).
