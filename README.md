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

`@sammons/typed-mind`'s primary surface is `TypedMind.create()` (async — it
awaits the wasm-backed grammar once):

```typescript
import { TypedMind } from '@sammons/typed-mind';

const typedMind = await TypedMind.create();

const { valid, diagnostics } = typedMind.check(dslContent);
const { entities, links } = typedMind.parse(dslContent);
const shortform = typedMind.emitShortform(dslContent);
const longform = typedMind.emitLongform(dslContent);
```

Rendering a visualization from a parsed document:

```typescript
import { TypedMind } from '@sammons/typed-mind';
import { TypedMindRenderer } from '@sammons/typed-mind-renderer';

const typedMind = await TypedMind.create();
const { valid, diagnostics } = typedMind.check(dslContent);

if (valid) {
  const parseOutput = typedMind.parse(dslContent);
  const renderer = new TypedMindRenderer();
  renderer.setGraph(parseOutput);
  renderer.setValidationResult(diagnostics);
  await renderer.serve();
}
```

## DSL Syntax

> **Note**: For comprehensive grammar documentation and examples, see the [TypedMind Grammar Documentation](https://github.com/Sammons/typed-mind-lang/blob/main/lib/typed-mind/grammar.md). This is especially useful for LLMs learning to write TypedMind syntax.

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

## Type System and Suppression

TypedMind holds every `.tmd` document — hand-authored or generated — to one
strict checker bar. There is no separate lenient mode for generated output.
Two mechanisms make that bar workable: structured DTO field types, which
catch more errors at finer grain, and suppressions, which let a document
carry a known, reasoned exception without failing `--check`.

### DTO field types

A DTO field's type is a real expression, not opaque text. The grammar parses
unions, intersections, generics, arrays, and string/number literals:

```tmd
UserDTO %
  - id: string
  - role: "admin" | "member" | "guest"
  - permissions: readonly string[]
  - config: Pick<S3Client, "send">
  - tags: (string | number)[]
```

The checker walks this structure part by part. A union with one bad variant
flags only that variant — not the whole field, not the whole entity:

```tmd
BadDTO %
  - status: "active" | UnknownType
```

`UnknownType` fails `checker/dto-field-unknown-type` at its own span; `"active"`
passes. This is the precision a flat opaque string cannot offer: the old
checker validated the field's raw text as one unit and could not point at the
one bad member of an otherwise-good union.

Shapes the six structured productions do not cover — object literals
(including index signatures), tuples, function types, conditional types —
fall through to an **opaque leaf**. The checker records no finding for an
opaque leaf; it is trusted the same way today's unrecognized text is trusted.
Narrowing the grammar to reject these shapes outright would break currently
valid hand-authored documents, which is the one-strict-bar rule working in
the other direction: the language must not retroactively break documents
that parse today.

Named types join the reference graph too. `typedef` declares an enum or a
type alias as a first-class entity:

```tmd
Role = enum [admin, member, guest]
UserSummary = Pick<UserDTO, "id" | "role">
```

A DTO field can reference either kind. Referencing an enum inside a
string-literal union checks the literals against the enum's declared
members — a literal absent from the set is flagged.

### MANDATORY ASYMMETRY: DTO fields vs. function signatures

**DTO field types get per-part structural checking. Function signatures stay
opaque strings, in this mission.** A function's `:: (args) => ReturnType`
signature is a quoted string the grammar accepts and the checker does not
walk part by part — unlike a DTO field's type, no union member, generic
argument, or array element inside a function signature gets its own
finding.

This is not an oversight. It is the same trust boundary as the opaque type
leaf, applied at a coarser grain: a function signature and an untyped chunk
of a DTO field type are both spans of text the checker declines to validate
structurally, because doing so is out of this mission's scope. A future
mission may extend structural checking to function signatures; until then,
treat a signature's internal shape as unchecked, the same way you would treat
an opaque-leaf DTO field.

### Suppression

A suppression silences exactly one `(check code, target entity)` finding for
one checker run. The finding stays in the output, labeled with its reason,
and is counted — suppression hides nothing from a reader of the report.

```tmd
LegacyHelperDTO % "kept for a downstream integration test, not referenced here"
suppress LegacyHelperDTO checker/orphaned-entity "consumed only by an external integration test suite"
```

The longform block form groups multiple entries:

```tmd
suppress {
  OtherLegacyDTO checker/orphaned-entity "also covered by the external suite"
  LegacyField checker/dto-field-unknown-type "tracked in TICKET-42"
}
```

A suppression that matches zero findings this run is itself an error
(`checker/stale-suppression`) — under one strict bar, an outlived suppression
is exactly the kind of rot the checker exists to catch. Fix the underlying
issue or delete the suppression; leaving it in place fails the document. The
suppression-machinery codes (`checker/stale-suppression`,
`checker/meta-suppression-rejected`) cannot themselves be suppressed — that
would let a document hide the very mechanism that keeps suppressions honest.

Checker codes are a frozen public surface (`lib/typed-mind/src/checker/check-codes.ts`).
Renaming one requires updating the registry and recording the rename in the
same diff; a suppression naming the old spelling keeps matching through a
recorded rename, so a rename does not silently turn every document that
suppresses the old code into a failure.

## Development

```bash
# Run in development mode
pnpm dev

# Lint code
pnpm lint

# Clean build artifacts
pnpm clean
```

### 2.0.0-ready structurally (RFC-TM-4 §3)

The five published packages (`@sammons/typed-mind`, `-cli`, `-lsp`,
`-renderer`, `-typescript`) are structurally ready for a 2.0.0 major release:
`engines.node` is `>=24.0.0` across all five, the new `TypedMind.create()`
surface is primary, and `grammar.wasm` ships in the core package's `files` set
at the dist-adjacent published-layout path. No version bump lands in this
change — the actual publish act and version bump are owned by D-5/S-CI-2 at
release time, not by this Quantum.

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
   `S-AST-2` `src/ast/gen/` wrappers (`node lib/typed-mind/grammar/codegen/generate-cst-nodes.mjs`).
7. Run the wasm load smoke test: `pnpm run check:toolchain` must pass, proving the regenerated
   grammar builds and loads under the newly-pinned toolchain.

This bump PR is the only sanctioned way the `check:generated` baseline changes. See
`rfc-tm-1-diamond.md` (RFC-TM-1) for the full design and rationale.

## License

MIT