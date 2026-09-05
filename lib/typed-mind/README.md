# @sammons/typed-mind

Core language parser and validator for TypedMind DSL - a declarative language for building software architectures.

## Installation

```bash
npm install @sammons/typed-mind
```

## Usage

```typescript
import { TypedMindParser, TypedMindValidator } from '@sammons/typed-mind';

// Parse TypedMind source code
const parser = new TypedMindParser();
const program = parser.parse(source);

// Validate the parsed program
const validator = new TypedMindValidator();
const validationResult = validator.validate(program);

if (validationResult.isValid) {
  console.log('Program is valid!');
} else {
  console.log('Validation errors:', validationResult.errors);
}
```

## What is TypedMind?

TypedMind is a Domain Specific Language (DSL) for declaratively describing software architectures, including:

- **Data Transfer Objects (DTOs)** - Pure data structures for configuration, serialization, and parameters (no functions allowed)
- **Service classes** - Business logic with methods and dependencies
- **ClassFile entities** - Fusion entities that combine class and file definitions - perfect for services and controllers
- **UI components** - User interface elements and their relationships
- **Asset management** - Static assets and routing configuration
- **Cross-cutting concerns** - Validation, security, and other system-wide concerns

## Features

- **Declarative syntax** - Focus on what your system does, not how it's implemented
- **Strong validation** - Catch architectural issues before they become problems
- **Dependency tracking** - Understand relationships between components
- **Import system** - Modular architecture with file-based organization
- **Type safety** - Comprehensive validation of all language constructs

## Example

```typedmind
program "User Management System"

dto UserDto {
  id: string
  email: string
  name: string
  createdAt: date
}

service UserService {
  method createUser(email: string, name: string): UserDto
  method getUserById(id: string): UserDto
  depends on DatabaseService
}

ui UserListComponent {
  displays UserDto[]
  triggers UserService.createUser
}
```

## Grammar

The complete TypedMind grammar is documented in [grammar.md](./grammar.md) and available in EBNF format in [grammar.ebnf](./grammar.ebnf).

## Contributing a checker rule or extractor warning

Every diagnostic message follows [docs/diagnostic-style-guide.md](./docs/diagnostic-style-guide.md)'s
three-clause rule (what, where, what to do), backtick-quotes every named
entity, and avoids internal implementation vocabulary. A standing lint
(`pnpm run check:diagnostic-jargon`) enforces the no-jargon half of that rule
in CI. [docs/diagnostic-code-audit.md](./docs/diagnostic-code-audit.md) grades
every registered code's current message against the guide (100% of the
registry, checked for completeness via `pnpm run check:diagnostic-code-audit`)
— grade a new code there when adding one.

## Generic declarations

DTO, alias, Function, Class and ClassFile heads accept names-only parameters,
including qualified names: `Owner.Pair<T, U> %`, `Owner.Alias<T> = T`, and
`Owner.Child<T> <: Owner.Base<T>`. Constraints, defaults and `const`/`in`/`out`
modifiers use repeated quoted longform properties:

```tmd
dto Owner.Pair {
  typeParameter: "out T extends Constraint = Default"
  typeParameter: "U = Map<T, Other>"
  extends: "Owner.Base<T>"
}
```

Class longform accepts a quoted `extends` and repeated quoted `implements`
properties; DTO inheritance uses repeated `extends`. Formatting promotes to
longform whenever shortform cannot retain parameters or inheritance roles.
Inline constrained/defaulted declaration heads are unsupported. Local parameters
are declaration metadata, never separate global entities.

The shared parameter parser retains raw source for inspection and canonicalizes
whitespace/comments outside literals for emission. Physical newlines inside
literal values are unsupported and produce an explicit parse diagnostic.
`emitWithDiagnostics` also reports invalid programmatically constructed generic
metadata. The string-only `emit` API keeps its existing behavior; callers using
it must validate unsupported metadata before emission.

## Requirements

- Node.js >= 22.0.0

## Related Packages

- [@sammons/typed-mind-cli](https://www.npmjs.com/package/@sammons/typed-mind-cli) - Command-line interface
- [@sammons/typed-mind-lsp](https://www.npmjs.com/package/@sammons/typed-mind-lsp) - Language Server Protocol implementation
- [@sammons/typed-mind-renderer](https://www.npmjs.com/package/@sammons/typed-mind-renderer) - HTML/D3.js renderer

## License

MIT