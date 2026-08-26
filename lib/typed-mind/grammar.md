# TypedMind DSL Grammar Reference

This document is generated from the tree-sitter grammar (`grammar/src/grammar.json`) by `grammar/codegen/generate-grammar-docs.mjs`. Do not edit it by hand — regenerate it instead. Example `tmd` blocks are hand-authored under `grammar/codegen/grammar-doc-examples/` and validated by the real parser in `validate-docs.test.ts`; they are never synthesized from grammar rules.

## Note from Author

TypedMind is meant to be a DSL to represent a variety of programs and
force AI to create a cohesive program architecture with a relatively token efficient syntax.

Entities link bidirectionally, so for example it is not enough to declare a function,
the file must also be declared. The function must be exported by a file. And the function must be
consumed by another entity to avoid dead code. The TypedMind checker will validate these scenarios.

## Table of Contents

1. [Shortform Declarations](#shortform-declarations)
2. [Continuation Operators](#continuation-operators)
3. [Longform Block Declarations](#longform-block-declarations)
4. [DTO Field Syntax](#dto-field-syntax)
5. [Quick Reference Example](#quick-reference-example)
6. [Longform Example](#longform-example)

## Shortform Declarations

One entity per line. `<symbol>` names a grammar production; `[...]` marks an optional member.

| Entity Kind | Shortform Declaration |
|---|---|
| Program | `<entity_name> -> <entity_name> [<string>] [<version>]` |
| File | `<entity_name> @ <path> :` |
| Function | `<entity_name> :: <signature>` |
| Class | `<entity_name> <: [<inherit_list>]` |
| ClassFile | `<entity_name> #: <path> [<: <inherit_list>]` |
| Constants | `<entity_name> ! <path> [: <entity_name>]` |
| DTO | `<entity_name> % [<string>]` |
| Asset | `<entity_name> ~ <string>` |
| UIComponent | `<entity_name> &!|& <string>` |
| RunParameter | `<entity_name> <param_type> <string> [<param_marker>]` |
| Dependency | `<entity_name>|<dependency_name> ^ <string> [<version>]` |

## Continuation Operators

Indented lines that attach properties to the most recently declared entity.

| Continuation | Syntax |
|---|---|
| Imports | `<- [...]` |
| Exports | `-> [...]` |
| Calls | `~> [...]` |
| Function input | `<- Name` |
| Function output | `-> Name` |
| Methods | `=> [...]` |
| Affects | `~ [...]` |
| Contains | `> [...]` |
| Contained by | `< [...]` |
| Contains program | `>> Name` |
| Default value | `= "..."` |
| Consumes | `$< [...]` |
| Comment | `# ...` |

```tmd
TodoApp -> main v1.0.0
main @ src/index.ts:
  <- [App, Logo, DATABASE_URL, startApp]
  -> [startApp, UserDTO]

App &! "Root component"
  > [Header]

Header & "Header component"
  < [App]

Logo ~ "Company logo"
DATABASE_URL $env "DB connection" (required)
  = "postgres://localhost/dev"

startApp :: () => void
  <- UserDTO
  ~ [App]
  $< [DATABASE_URL, Logo]

UserDTO %
  - name: string "User name"
```

Asset-to-Program containment uses its own operator, illustrated separately:

```tmd
Installer ~ "Install script"
  >> TodoApp
```

## Longform Block Declarations

Longform wraps the same entity kinds in a brace-delimited block: `keyword Name { ... }`. Properties inside the block are `key: value` pairs (string, list, identifier, boolean, nested block, or free-text, per the grammar's property forms).

| Keyword | Header Form |
|---|---|
| program | `program Name {` |
| file | `file Name {` |
| function | `function Name {` |
| class | `class Name {` |
| dto | `dto Name {` |
| component | `component Name {` |
| asset | `asset Name {` |
| constants | `constants Name {` |
| parameter | `parameter Name {` |
| classfile | `classfile Name {` |
| dependency | `dependency Name {` or `dependency "quoted-name" {` |

## DTO Field Syntax

Shortform DTO fields: `- name[?]: type ["description"] [(optional)]`.

```tmd
UserDTO %
  - name: string "User name"
  - email?: string "Email"
  - nickname: string "Display name" (optional)
```

## Quick Reference Example

```tmd
TodoApp -> main v1.0.0
main @ src/index.ts:
  <- [UserService, Config, App, Logger, createLogger]
  -> [startApp]

UserService #: src/services/user.ts
  <- [UserDTO, startApp]
  => [createUser, findUser]

startApp :: () => void
  ~> [createUser]
  ~ [App]
  $< [DATABASE_URL, Logo]

createUser :: (data: UserDTO) => UserDTO
  <- UserDTO
  -> UserDTO
  ~> [createLogger, Logger.info]

UserDTO %
  - name: string "User name"
  - email: string "Email"

App &! "Root component"
DATABASE_URL $env "DB connection" (required)
Config ! src/config.ts
Logo ~ "Company logo"
winston ^ "Logging library" v3.0.0
  -> [Logger, createLogger]

Logger <:
  => [info]

createLogger :: (options?: object) => Logger
```

## Longform Example

```tmd
program TodoApp {
  entry: main
}

file main {
  path: src/index.ts
  imports: [UserService, BaseService]
}

UserService #: src/services/user.ts {
  extends: BaseService
  methods: [createUser, findUser]
}

file base {
  path: src/services/base.ts
  exports: [BaseService]
}

class BaseService {
  methods: [init]
}

function createUser {
  signature: (data: UserDTO) => UserDTO
  input: UserDTO
  output: UserDTO
  calls: [init]
}

function findUser {
  signature: (id: string) => UserDTO
  output: UserDTO
}

dto UserDTO {
  fields: {
    name: { type: "string", description: "User name" }
    email: { type: "string", description: "Email" }
  }
}
```

