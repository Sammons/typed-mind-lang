# @sammons/typed-mind-tree-sitter-common

Shared infrastructure for TypedMind's tree-sitter-based language analyzers (C#, Java, Rust, Python). Provides the async parser, converter base utilities, CLI factory, and assertion engine that each language package consumes.

## What this package provides

- **TreeSitterParser**: Async factory wrapping `web-tree-sitter` — loads WASM grammars via `Language.load()`
- **BaseConverter utilities**: `SYNTHETIC_SPAN`, `sortIntoLegacySectionOrder`, `collapseDescription`, `emitTmd`
- **EmittedNameAllocator**: Deduplicates emitted entity names across a conversion pass
- **CLI factory (`runCli`)**: Produces `export`, `assert`, and `check` commands from a `LanguageCliConfig`
- **AssertionEngine**: Language-agnostic architecture assertion — compares extracted entities against expected `.tmd` files
- **Shared types**: `ParsedModule`, `ParsedClass`, `ParsedFunction`, `ConversionResult`, `AssertionResult`, `Deviation`

## Installation

```bash
npm install @sammons/typed-mind-tree-sitter-common
```

This package is a dependency of each language analyzer. Install it directly only when building a new language analyzer.

## Building a new language analyzer

Each language analyzer implements two interfaces:

1. **Analyzer**: Parses source files using a language-specific tree-sitter grammar and produces `ParsedModule[]`
2. **Converter**: Transforms `ParsedModule[]` into TypedMind entity nodes and emits `.tmd` output

Then wire them into a CLI via `runCli()`:

```typescript
import { runCli } from '@sammons/typed-mind-tree-sitter-common';

runCli({
  languageName: 'MyLang',
  binaryName: 'typed-mind-ml',
  createAnalyzer: async (projectPath) => MyAnalyzer.create(projectPath),
  createConverter: () => new MyConverter(),
  resolveProjectPath: (raw) => resolveMyProject(raw),
  resolveEntrypoint: (projectPath, entrypoint) => resolveMyEntry(projectPath, entrypoint),
});
```

## Limitations

This package targets syntax-only analysis via tree-sitter. It does not resolve types, evaluate generics, or perform semantic analysis. Type annotations are extracted as literal text strings.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
