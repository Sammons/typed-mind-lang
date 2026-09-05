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
5. [Suppression](#suppression)
6. [Quick Reference Example](#quick-reference-example)
7. [Longform Example](#longform-example)
8. [Quoted Strings](#quoted-strings)

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
| TypeDef | `<entity_name> = <typedef_enum_variant>|<type_expr>` |

## Continuation Operators

Indented lines that attach properties to the most recently declared entity.

| Continuation | Syntax |
|---|---|
| Imports | `<- [...]` |
| Exports | `-> [...]` |
| Re-exports (File only) | `<-> [...]` |
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
  <- [App, Logo, DATABASE_URL, startApp, formatDate]
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

DateUtilsImplFile @ src/date-utils-impl.ts:
  -> [formatDate]

formatDate :: (date: Date) => string

DateUtilsFile @ src/date-utils.ts:
  <-> [formatDate]
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
| typedef | `typedef Name {` |
| dependency | `dependency Name {` or `dependency "quoted-name" {` |

## DTO Field Syntax

Shortform DTO fields: `- name[?]: type ["description"] [(optional)]`.

```tmd
UserDTO %
  - name: string "User name"
  - email?: string "Email"
  - nickname: string "Display name" (optional)
  - role: "admin" | "member" | "guest" "Account role, a string-literal union"
  - tags: string[] "Array of classification tags"
  - permissions: readonly string[] "Immutable permission list"
```

## Suppression

A suppression silences exactly one (check code, target entity) finding for the checker run — the finding stays visible in output, labeled with its reason, and is counted in a suppressed-summary line (not hidden). A suppression matching zero findings this run is itself flagged (`checker/stale-suppression`); the suppression-machinery codes are not suppressible. A reasonless suppression line is a parse error — the reason is mandatory.

| Form | Syntax |
|---|---|
| Shortform line | `suppress <target> <code> "<reason>"` |
| Longform block entry | `<target> <code> "<reason>"` (inside `suppress { ... }`) |

```tmd
App -> Main v1.0.0
Main @ src/main.ts:
  <- [helper]
  -> [helper]
helper :: () => void
LegacyHelperDTO % "kept for a downstream integration test, not referenced here"
OtherLegacyDTO % "same situation, demonstrating the longform block form"
suppress LegacyHelperDTO checker/orphaned-entity "consumed only by an external integration test suite"
suppress {
  OtherLegacyDTO checker/orphaned-entity "also covered by the external suite"
}
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

## Quoted Strings

Quoted values escape a double quote as `\"` and a backslash as `\\`. Other escape pairs, including `\n` and `\q`, retain their literal backslash. Physical newlines are not allowed inside quoted tokens. The same rule covers descriptions, reasons, literal types, import paths, and quoted dependency names.

Longform type values use an escaped outer string; parsing that wrapper restores the original type expression before its literal values are decoded. Older documents treated backslashes as ordinary characters. Existing doubled backslashes now decode to one backslash; an odd trailing run escapes the closing quote. Use an even trailing run to represent a value ending in a backslash.

