<div align="center">
  <img src="typedmind_transparent.png" alt="TypedMind Logo" width="200" height="200">
  
  <h1>TypedMind</h1>
  
  <p>A domain-specific language (DSL) for describing and visualizing program architecture.</p>
  
  <h3>
    <a href="https://typedmind.sammons.io/">🌐 Try TypedMind Online</a> • 
    <a href="https://typedmind.sammons.io/#getting-started">📚 Getting Started</a> • 
    <a href="https://typedmind.sammons.io/#examples">🎯 Examples</a>
  </h3>
</div>

## Packages

This monorepo contains five packages:

- **@sammons/typed-mind** - Core language parser and validator
- **@sammons/typed-mind-renderer** - Interactive HTML/D3.js visualization renderer  
- **@sammons/typed-mind-cli** - Command-line interface
- **@sammons/typed-mind-lsp** - Language Server Protocol implementation
- **@sammons/typed-mind-vscode-extension** - VS Code extension with syntax highlighting

## Quick Start

Visit [TypedMind Online](https://typedmind.sammons.io/) to try TypedMind in your browser, or install the CLI:

```bash
pnpm add -g @sammons/typed-mind-cli
```

## Installation (Development)

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Usage

### CLI

```bash
# Check a DSL file for errors
node lib/typed-mind-cli/dist/cli.cjs --check examples/example.tmd

# Render a DSL file interactively
node lib/typed-mind-cli/dist/cli.cjs --render examples/example.tmd

# Generate static HTML output
node lib/typed-mind-cli/dist/cli.cjs --render examples/example.tmd --output output.html

# Custom port and disable auto-browser
node lib/typed-mind-cli/dist/cli.cjs --render examples/dto-example.tmd --port 8080 --no-browser
```

## Examples

See the [`examples/`](./examples/) directory for comprehensive examples demonstrating:

- **Complete Architecture**: Full todo application with composition patterns
- **DTO Usage**: Data transfer objects with validation workflows
- **Comments**: Inline and continuation comment syntax
- **All Entity Types**: Programs, Files, Functions, Classes, Constants, DTOs

### Programmatic API

```typescript
import { DSLChecker } from '@sammons/typed-mind';
import { TypedMindRenderer } from '@sammons/typed-mind-renderer';

// Parse and validate DSL
const checker = new DSLChecker();
const result = checker.check(dslContent);

if (result.valid) {
  // Render visualization
  const graph = checker.parse(dslContent);
  const renderer = new TypedMindRenderer();
  renderer.setProgramGraph(graph);
  await renderer.serve();
}
```

## DSL Syntax

> **Note**: For comprehensive grammar documentation and examples, see the [TypedMind Grammar Documentation](https://github.com/Sammons/typed-mind-lang/blob/main/lib/typed-mind/generated-grammar.md). This is especially useful for LLMs learning to write TypedMind syntax.

### Short Form Example

```yaml
TodoApp -> AppEntry v2.0

AppEntry @ src/index.ts:
  <- [ExpressSetup, Routes, Database]
  -> [startServer]

Routes @ src/routes/index.ts:
  <- [TodoRoutes, UserRoutes]
  -> [router]

TodoController <: BaseController
  => [create, read, update, delete]

create :: (req, res) => Promise<void>
  "Creates new todo item"
  ~> [validateTodo, TodoModel.create]

Config ! src/config.ts : EnvSchema
```

### Entity Types

- **Program**: `AppName -> EntryFile v1.0.0`
- **File**: `FileName @ path/to/file.ts:`
- **Function**: `funcName :: (args) => ReturnType`
- **Class**: `ClassName <: BaseClass, Interface`
- **Constants**: `ConfigName ! path/to/config.ts : Schema`

### Operators

- `->` : Entry point / Exports to
- `<-` : Imports from
- `@` : Located at
- `::` : Has signature
- `~>` : Calls/uses
- `<:` : Extends/implements
- `!` : Constants marker
- `=>` : Contains methods

## Development

```bash
# Run in development mode
pnpm dev

# Lint code
pnpm lint

# Clean build artifacts
pnpm clean
```

## License

MIT