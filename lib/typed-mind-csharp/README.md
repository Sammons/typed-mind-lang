# @sammons/typed-mind-csharp

C# architecture analyzer for TypedMind DSL — extract architecture from C# codebases using tree-sitter syntax analysis.

## Features

- **Export Command**: Convert C# projects to TypedMind DSL format
- **Assert Command**: Compare C# projects against expected TypedMind files
- **Check Command**: Validate C# project architecture using TypedMind rules
- **Classes**: Abstract, sealed, static, partial, and record classes
- **Interfaces**: Interface declarations with method signatures
- **Structs**: Struct declarations mapped to DTO entities
- **Enums**: Enum declarations with member extraction
- **Properties**: Get/set accessors, auto-properties
- **Methods**: Instance and static methods with signature extraction
- **Constructors**: Constructor parameter extraction
- **Attributes**: `[Serializable]`, `[HttpGet]`, etc. as decorators
- **Generics**: Type parameter extraction as literal text
- **File-scoped namespaces**: C# 10+ `namespace Foo;` syntax
- **Using directives**: Import tracking including `using static`
- **`.csproj` dependencies**: `<PackageReference>` extraction

## Installation

```bash
npm install -g @sammons/typed-mind-csharp
```

## CLI Usage

### Export C# to TypedMind

```bash
typed-mind-cs export --project . --entrypoint Program.cs --output architecture.tmd
typed-mind-cs export --project src/MyApp --entrypoint Startup.cs
```

### Assert C# Matches Expected Architecture

```bash
typed-mind-cs assert --project . --entrypoint Program.cs --input expected.tmd
```

### Check C# Architecture

```bash
typed-mind-cs check --project src/MyApp --entrypoint Startup.cs --verbose
```

## C# to TypedMind Mapping

| C# Construct | TypedMind Entity | Notes |
|---|---|---|
| Class (with methods) | Class or ClassFile | ClassFile when one class per file |
| Interface | Class | With method signatures |
| Record | DTO | Properties become fields |
| Struct | DTO | Fields and properties extracted |
| Enum | TypeDef | Members as constants |
| Property | Class field | Get/set tracked |
| Method | Class method | Signature as text |
| Attribute | Decorator | Name and arguments |
| Using directive | File import | Including `using static` |
| `<PackageReference>` | Dependency | NuGet package and version |

## Limitations

- **Syntax-only**: Uses tree-sitter for parsing, not Roslyn. No type resolution, no overload resolution, no semantic analysis.
- **Type annotations as text**: Generic types, nullable references, and qualified names are extracted as literal strings.
- **No `.sln` parsing**: Project discovery starts from a `.csproj` file or directory. Solution-level analysis is not supported.
- **No partial class merging**: Partial classes are extracted per-file without merging declarations across files.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
