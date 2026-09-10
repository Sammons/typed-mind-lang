# @sammons/typed-mind-python

Python architecture analyzer for TypedMind DSL — extract architecture from Python codebases using tree-sitter syntax analysis.

## Features

- **Export Command**: Convert Python projects to TypedMind DSL format
- **Assert Command**: Compare Python projects against expected TypedMind files
- **Check Command**: Validate Python project architecture using TypedMind rules
- **Classes**: Regular classes with method extraction
- **Dataclasses**: `@dataclass` and Pydantic `BaseModel` mapped to DTO entities
- **TypedDict**: `TypedDict` declarations mapped to DTO entities
- **Protocols**: `Protocol` subclasses mapped to interface-like Class entities
- **Enums**: `Enum` subclasses mapped to TypeDef entities
- **Functions**: Module-level function extraction
- **Decorators**: `@staticmethod`, `@classmethod`, `@abstractmethod`, custom decorators
- **Type hints**: PEP 484/526 annotations extracted as literal text
- **Async**: `async def` functions and methods
- **Imports**: `import` and `from ... import` tracking, including relative imports
- **`__init__.py`**: Package boundary detection
- **`__all__`**: Explicit export list extraction
- **Module-level constants**: `UPPERCASE` constants mapped to Constants entities
- **`pyproject.toml` / `requirements.txt`**: Dependency extraction

## Installation

```bash
npm install -g @sammons/typed-mind-python
```

## CLI Usage

### Export Python to TypedMind

```bash
typed-mind-py export --project . --entrypoint src/app.py --output architecture.tmd
typed-mind-py export --project src --entrypoint main.py
```

### Assert Python Matches Expected Architecture

```bash
typed-mind-py assert --project . --entrypoint src/app.py --input expected.tmd
```

### Check Python Architecture

```bash
typed-mind-py check --project src --entrypoint main.py --verbose
```

## Python to TypedMind Mapping

| Python Construct | TypedMind Entity | Notes |
|---|---|---|
| Class (with methods) | Class or ClassFile | ClassFile when one class per file |
| `@dataclass` / `BaseModel` | DTO | Fields become DTO fields |
| `TypedDict` | DTO | Keys become fields |
| `Protocol` | Class (abstract) | Method signatures extracted |
| `Enum` subclass | TypeDef | Members as constants |
| `def` (module-level) | Function | Signature as text |
| `UPPERCASE` constant | Constants | Module-level constants |
| `import` / `from import` | File import | Including relative imports |
| `pyproject.toml` dependency | Dependency | Package name and version |

## Limitations

- **Syntax-only**: Uses tree-sitter for parsing, not `mypy` or `pyright`. No type inference, no import resolution, no runtime introspection.
- **Type annotations as text**: Generic types (`List[int]`, `Dict[str, Any]`), union types (`str | None`), and complex annotations are extracted as literal strings.
- **No dynamic analysis**: Dynamically generated classes, metaclass patterns, and runtime `__init_subclass__` hooks are not detected.
- **No cross-module resolution**: Import statements are tracked but not resolved to their target definitions.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
