# @sammons/typed-mind-cli

Command-line interface for TypedMind DSL - a declarative language for building software architectures.

## Installation

```bash
npm install -g @sammons/typed-mind-cli
```

## Usage

```bash
# Parse and validate a TypedMind file
typed-mind --check program.tmd

# Render a TypedMind program to HTML
typed-mind --render program.tmd --output output.html

# Show help
typed-mind --help
```

## What is TypedMind?

TypedMind is a Domain Specific Language (DSL) for declaratively describing software architectures, including:

- Data Transfer Objects (DTOs)
- Service classes and their dependencies
- UI components and their relationships
- Asset management and routing
- Cross-cutting concerns and validation rules

## Module Usage

```js
// ESM
import { TypedMind } from '@sammons/typed-mind-cli';
// CJS
const { TypedMind } = require('@sammons/typed-mind-cli');
```

## Requirements

- Node.js >= 22.0.0

## Related Packages

- [@sammons/typed-mind](https://www.npmjs.com/package/@sammons/typed-mind) - Core parser and validator
- [@sammons/typed-mind-renderer](https://www.npmjs.com/package/@sammons/typed-mind-renderer) - HTML/D3.js renderer
- [@sammons/typed-mind-lsp](https://www.npmjs.com/package/@sammons/typed-mind-lsp) - Language Server Protocol implementation

## License

MIT