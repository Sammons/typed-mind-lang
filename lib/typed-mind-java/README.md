# @sammons/typed-mind-java

Java architecture analyzer for TypedMind DSL — extract architecture from Java codebases using tree-sitter syntax analysis.

## Features

- **Export Command**: Convert Java projects to TypedMind DSL format
- **Assert Command**: Compare Java projects against expected TypedMind files
- **Check Command**: Validate Java project architecture using TypedMind rules
- **Classes and interfaces**: Public/abstract/final classes, nested classes, default interface methods
- **Records**: Java 16+ records mapped to DTO entities
- **Enums**: Enum declarations with constant extraction
- **Generics**: Type parameter extraction as literal text
- **Annotations**: `@Override`, `@Deprecated`, Spring/Jakarta annotations
- **Imports**: Package and import declaration tracking
- **Maven dependencies**: `pom.xml` `<dependency>` extraction

## Installation

```bash
npm install -g @sammons/typed-mind-java
```

## CLI Usage

### Export Java to TypedMind

```bash
typed-mind-java export --project . --entrypoint src/main/java/App.java --output architecture.tmd
typed-mind-java export --project src/main/java --entrypoint App.java
```

### Assert Java Matches Expected Architecture

```bash
typed-mind-java assert --project . --entrypoint src/main/java/App.java --input expected.tmd
```

### Check Java Architecture

```bash
typed-mind-java check --project src/main/java --entrypoint App.java --verbose
```

## Java to TypedMind Mapping

| Java Construct | TypedMind Entity | Notes |
|---|---|---|
| Class (with methods) | Class or ClassFile | ClassFile when one public class per file |
| Interface | Class | With method signatures |
| Record | DTO | Components become fields |
| Enum | TypeDef | Constants as members |
| Method | Class method | Signature extracted as text |
| Import | File import | Package dependency tracking |
| `pom.xml` dependency | Dependency | Maven coordinate extraction |

## Limitations

- **Syntax-only**: Uses tree-sitter for parsing, not the Java compiler. No type resolution, no classpath analysis, no semantic type checking.
- **Type annotations as text**: Generic types, qualified names, and annotations are extracted as literal strings.
- **No Gradle**: Only Maven `pom.xml` is parsed for dependencies. Gradle `build.gradle` / `build.gradle.kts` support is deferred.
- **No inner class cross-referencing**: Nested classes are extracted but not linked to their enclosing type.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
