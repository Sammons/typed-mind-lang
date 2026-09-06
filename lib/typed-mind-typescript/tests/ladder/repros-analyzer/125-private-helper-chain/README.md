# 125 — transitive construct edge through a private function (D-16)

RFC-TM-14 (`rfc-tm-14-diamond.md`) Deferral **D-16**, closed by transitive
body-reference propagation in `foldBodyReferences`.

## Shape

`src/source.ts`: `class Source {}` (not exported, fused as the file's ClassFile
— the live `ParameterSource` shape, `live-02:455`), `const parse = () => new
Source()` (private function), `export const parseText = () => parse()`. Entry
`src/main.ts` imports `parseText`.

## Verdict (post D-16)

`parseText ~> [Source.constructor]` — the transitive propagation step in
`foldBodyReferences` walks through private function `parse` and credits
`Source` via the construct edge. `Source` is no longer orphaned.

Live instances closed: `ParameterSource` in the self and core captures
(`core/pipeline/parse-type-parameters.ts:81-83`).
