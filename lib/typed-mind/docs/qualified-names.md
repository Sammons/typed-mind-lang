# Qualified entity names

A declaration such as `ModelsFile.User %` belongs to the declared File or
ClassFile `ModelsFile`. Ownership does not make the entity public. Other
references in the document can use its full identity; a cross-file import or
export also needs the owning file to expose it.

```tmd
ModelsFile @ models.ts:
  -> [ModelsFile.User]
ModelsFile.User %
  - name: string
ConsumerFile @ consumer.ts:
  <- [ModelsFile.User]
```

The owning export list may spell `User` instead of `ModelsFile.User`. An actual
owned declaration takes precedence over a bare global entity with the same
suffix. A file can also expose a bare global declaration, in which case
`ModelsFile.User` refers to that exported `User` declaration.

Qualified names work in shortform and longform declarations, references,
suppression targets, and structured types, including `ModelsFile.Box<string>`
and `readonly ModelsFile.User[]`. Lowercase suffixes are valid, including
`HandlersFile.handle` and `HandlersFile.default`. This change accepts those
identities; source-extractor naming migration is a separate change.

The owner must exist and support the member. A matching full declaration name
cannot bypass owner validation. A missing owner, missing member, invalid owner
kind, or private cross-file reference reports `checker/qualified-name-unresolved`.
Normal reference-kind checks still apply: a declared function is not a data type.

Method references use the longest declared entity prefix. For example,
`HandlersFile.Service.run` first validates the ownership of
`HandlersFile.Service`, then checks its `run` method. ClassFile methods are
callable when the method exists; a bare ClassFile call retains its existing
legality rule. An explicitly declared qualified entity wins over a same-spelling
ClassFile method. Constants members require an existing field on their schema
DTO, and only when the schema is a bare named type — a generic, array, union or
opaque schema (`Rule[]`, `Record<string, Rule>`) has no member surface, so
`LIST.ok` reports `missing-member`; a field's existence alone does not make it
callable.

External namespace references require a Dependency with an explicit export:

```tmd
TypeScript ^ "typescript"
  -> [CompilerOptions]
Settings %
  - options: TypeScript.CompilerOptions
```

Previously a type such as `ts.CompilerOptions` was opaque and escaped reference
validation. It is now a structured named type. Declare its real Dependency owner
and exported member, or use the correct declared name. Unknown namespaces are
not implicitly accepted.

The checker, reverse links, and language-server navigation share the same
resolution rules. Export occurrences retain file context so a short exported
suffix navigates to its qualified declaration. When the model has no file
context for an ordinary referring entity, it does not infer additional source
visibility restrictions.

## Integration diagnostic conservation

Compared the CP+B1 baseline `eb6915a` with Q. The 30-document examples inventory retains every verdict; seven documents change findings. The table counts full diagnostic records (including repeated occurrences), not just messages. All unlisted diagnostic records are identical.

| Document | Removed | Added | Cause |
|---|---:|---:|---|
| `method-calls-example.tmd` | 1 | 0 | Verified ClassFile method calls |
| `naming-edge-cases-example.tmd` | 14 | 0 | Verified ClassFile method calls |
| `examples/example-fixed.tmd` | 4 | 0 | Canonical method-owner references remove false orphan findings |
| `examples/example-with-methods.tmd` | 15 | 3 | File export aliases resolve actual Functions; three absent members gain checked qualified-name findings |
| `examples/example.tmd` | 6 | 0 | Canonical method-owner references remove false orphan findings |
| `examples/imports/shared/auth.tmd` | 1 | 0 | Canonical method-owner references remove false orphan findings |
| `examples/imports/shared/database.tmd` | 1 | 0 | Canonical method-owner references remove false orphan findings |

Scenario controls 38/39/41/42/44/46/53/57/58 retain their unrelated diagnostics and adjust only checked method targets, canonical orphan references, or the more specific missing-member/private-import finding. Scenario 21 gains real `UI` and `DB` import namespace File carriers; `DB.Connection` is consequently exported, while the existing unprefixed internal-reference defects remain visible. The examples/imports/main.tmd diagnostic multiset stays identical after the missing alias-owner correction.

Import aliases now contribute explicit File carriers with the imported document path and cloned member names. Duplicate aliases reject the later namespace; removing the carrier fails owner validation. Bare ClassFile calls remain illegal, missing methods remain errors, unexported method imports remain rejected, and external export or Constants schema membership does not establish a callable kind.

The renderer's immutable-baseline gate separately records 60 removed orphan diagnostics (7 CLI and 13 game method owners across three renderers), 9 removed alias/export-call diagnostics, 16 new explicit alias export links, and 6 alias carrier entities. `qualified-name-corpus-deltas.test.ts` removes the real method references and restores exactly the 20 underlying orphan messages; every other orphan finding stays identical. The graph gate rejects unlisted extra entities and count drift.
