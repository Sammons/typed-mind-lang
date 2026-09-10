# @sammons/typed-mind-rust

Rust architecture analyzer for TypedMind DSL — extract architecture from Rust codebases using tree-sitter syntax analysis.

## Features

- **Export Command**: Convert Rust projects to TypedMind DSL format
- **Assert Command**: Compare Rust projects against expected TypedMind files
- **Check Command**: Validate Rust project architecture using TypedMind rules
- **Structs**: Data structs as DTOs, structs with `impl` blocks as Classes
- **Enums**: Variant extraction with named/tuple/unit variants
- **Traits**: Trait declarations mapped to abstract Class entities
- **Impl blocks**: Methods attached to owning struct/enum, including `impl Trait for Type`
- **Functions**: Module-level function extraction
- **Type aliases**: `type Foo = Bar` mapped to TypeDef
- **Constants**: `const` and `static` items
- **Use declarations**: Import tracking with glob and alias support
- **Derive macros**: `#[derive(...)]` extracted as decorators
- **Doc comments**: `///` and `//!` extracted as descriptions
- **Cargo.toml**: Dependency extraction from `[dependencies]`

## Installation

```bash
npm install -g @sammons/typed-mind-rust
```

## CLI Usage

### Export Rust to TypedMind

```bash
typed-mind-rs export --project . --entrypoint src/lib.rs --output architecture.tmd
typed-mind-rs export --project src --entrypoint main.rs
```

### Assert Rust Matches Expected Architecture

```bash
typed-mind-rs assert --project . --entrypoint src/lib.rs --input expected.tmd
```

### Check Rust Architecture

```bash
typed-mind-rs check --project src --entrypoint lib.rs --verbose
```

## Rust to TypedMind Mapping

| Rust Construct | TypedMind Entity | Notes |
|---|---|---|
| Struct (with `impl` methods) | Class | Methods from `impl` blocks attached |
| Struct (data-only) | DTO | Fields become DTO fields |
| Enum | TypeDef | Variants as members |
| Trait | Class (abstract) | Method signatures extracted |
| `impl Trait for Type` | `implements` relationship | Trait impl tracked |
| `fn` (module-level) | Function | Signature as text |
| `type` alias | TypeDef | Alias target preserved |
| `const` / `static` | Constants | Value and type extracted |
| `use` declaration | File import | Path and alias tracked |
| `Cargo.toml` dependency | Dependency | Crate name and version |

## Limitations

- **Syntax-only**: Uses tree-sitter for parsing, not `rustc` or `rust-analyzer`. No type inference, no borrow checker analysis, no trait resolution.
- **Type annotations as text**: Generic types, lifetime parameters, and trait bounds are extracted as literal strings.
- **No cross-module resolution**: `mod` declarations are followed for file discovery, but `use` paths are not resolved to their target definitions.
- **No macro expansion**: Procedural macros and `macro_rules!` are not expanded. Only `#[derive(...)]` is recognized.

## WASM Grammar

The Rust tree-sitter grammar is built from source at install time via WASI SDK (unlike Java/C#/Python which use pre-built WASMs). The `build:wasm` script handles this automatically.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
