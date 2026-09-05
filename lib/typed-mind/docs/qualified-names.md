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
DTO; a field's existence alone does not make it callable.

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
