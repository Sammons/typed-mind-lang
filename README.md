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
node lib/typed-mind-cli/dist/cli.js --check examples/example.tmd

# Render a DSL file interactively
node lib/typed-mind-cli/dist/cli.js --render examples/example.tmd

# Generate static HTML output
node lib/typed-mind-cli/dist/cli.js --render examples/example.tmd --output output.html

# Custom port and disable auto-browser
node lib/typed-mind-cli/dist/cli.js --render examples/dto-example.tmd --port 8080 --no-browser
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

### Paired-bump procedure: tree-sitter CLI, wasi-sdk, web-tree-sitter

The tree-sitter CLI, wasi-sdk, and (from RFC-TM-3) `web-tree-sitter` bump only together, in a
**single PR**. `mise.toml` is the single version source of truth for the first two; splitting
the bump across multiple PRs leaves the CLI and wasi-sdk versions out of sync, which breaks the
wasm build silently (a mismatched SDK produces wrong codegen, not an error).

The wasi-sdk version pinned in `mise.toml` MUST equal the value in the tree-sitter CLI's own
`crates/loader/wasi-sdk-version` file at the CLI's pinned release tag — this is the
`wasi-sdk-version` coupling that makes the two tools compatible.

Steps, in order, all in one PR:

1. Bump the `tree-sitter` version in `mise.toml`.
2. Read `crates/loader/wasi-sdk-version` at that CLI's release tag (in the upstream
   [tree-sitter](https://github.com/tree-sitter/tree-sitter) repo) and copy its value into the
   `http:wasi-sdk` `version` in `mise.toml`.
3. Update each platform's URL in `mise.toml` to the new wasi-sdk release tag and compute a fresh
   sha256 for each downloaded tarball.
4. Cross-check every new checksum against the GitHub Releases API digest for the same asset
   (`gh api repos/WebAssembly/wasi-sdk/releases/tags/wasi-sdk-<major>` → `.assets[].digest`). A
   mismatch blocks the bump — this is a live independent check, not trust-on-first-use.
5. Bump `web-tree-sitter`'s exact pin in `package.json`.
6. Regenerate the generated artifacts: `parser.c`, `grammar.json`, `node-types.json`, and the
   `S-AST-2` `<Kind>Base` skeletons.
7. Run the wasm load smoke test: `pnpm run check:toolchain` must pass, proving the regenerated
   grammar builds and loads under the newly-pinned toolchain.

This bump PR is the only sanctioned way the `check:generated` baseline changes. See
`rfc-tm-1-diamond.md` (RFC-TM-1) for the full design and rationale.

## License

MIT