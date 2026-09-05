# 114 — class member bodies yield body references

RFC-TM-14 (`rfc-tm-14-diamond.md`) §S1/§S3, leaves **R1c-analyzer** (Quantum U1),
**R1c-conv** and **R2b** (Quantum U3b). The doc assigns this fixture number 114.

## Shape

`src/store.ts` (fused ClassFile `Store`; entry `src/main.ts` imports it):
`helper` (exported function), `LIMIT` and `ErrorTable` (exported Constants),
`Cache` (private class), and `Store` with a private method constructing `Cache`,
a static method reading `ErrorTable.A.code`, a constructor calling `helper`, a
`size` accessor reading `LIMIT`, a property initializer reading `LIMIT`, and a
static block calling `helper`. Control `Self` constructs itself in a static
factory (S2-8).

## Expected (U1, analyzer)

`ParsedMethod.bodyReferences` on `hidden` (construct `Cache`), `code` (read
`ErrorTable`), `size` (read `LIMIT`); `ParsedConstructor.bodyReferences` (call
`helper`); `ParsedClass.initializerReferences` (read `LIMIT` from the property
initializer, call `helper` from the static block); `Self.make` yields a
construct of `Self` at the analyzer level (the converter drops the self target).

## Expected (U3b, converter)

`Store ~> [helper, Cache.constructor]`, `Store $< [ErrorTable, LIMIT]` under
default options (private members filtered from emission, edges present); zero
orphans for `helper`, `Cache`, `LIMIT`, `ErrorTable`; no `Self.constructor`
edge and `Self` stays orphaned.
