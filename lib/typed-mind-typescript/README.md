# @sammons/typed-mind-typescript

TypeScript analysis and bridge to TypedMind DSL - extract architecture from TypeScript codebases using the TypeScript Compiler API.

## Features

- **Export Command**: Convert TypeScript projects to TypedMind DSL format
- **Assert Command**: Compare TypeScript projects against expected TypedMind files
- **Check Command**: Validate TypeScript project architecture using TypedMind rules
- **ClassFile Fusion**: Automatically detect service/controller patterns and use ClassFile entities
- **Comprehensive Analysis**: Functions, classes, interfaces, types, imports, exports
- **Matt Pocok-style TypeScript**: Branded types, type predicates, const assertions

## Generic declarations and heritage

Extraction preserves declared parameters on functions, classes, interfaces and
aliases, including constraints, defaults and `const`/`in`/`out` modifiers.
Instantiated `extends` and `implements` references retain their arguments.
References inside these types use the analyzer's declaration identities, while
local parameters remain scoped bindings instead of global entities.

Names-only parameters can emit in shortform. Full parameter metadata uses
repeated quoted `typeParameter` properties in longform; the formatter promotes
an entity when shortform cannot preserve its facts. Inline DTOs synthesized
inside a generic declaration retain the enclosing bindings. Method-local
parameters shadow class parameters and share the same representation.

The checker validates referenced names, declaration kinds and declared generic
arity. It does not evaluate TypeScript constraint assignability or instantiate
generic types. Unsupported type expressions remain opaque and receive explicit
limitation diagnostics where structural checking is required. Physical newlines
inside literal values produce conversion errors while retaining the source
facts in the result; callers must inspect conversion success and diagnostics.

## Typed methods and constructors

Class and ClassFile extraction retains typed method overloads and constructor
parameters. These emit as repeated quoted longform properties, including when
shortform was requested. Signature references use exact declaration identities
and lexical generic bindings. See [typed class members](../typed-mind/docs/typed-members.md)
for syntax, ownership, visibility and unsupported-shape behavior.

## Installation

```bash
npm install -g @sammons/typed-mind-typescript
```

## CLI Usage

**New Command Signatures (v2.0):** All commands now use explicit named parameters for better clarity and consistency.

### Command Format

```bash
typed-mind-ts <command> --project <dir|tsconfig.json> --entrypoint <file> [options]
```

**Key Changes:**
- `--project` replaces positional directory argument
- `--input` replaces positional TypedMind file argument in assert command  
- `--output` is now optional for export (defaults to stdout)
- `--project` can accept either a directory or direct tsconfig.json path

### Export TypeScript to TypedMind

```bash
# Export project starting from main entry point
typed-mind-ts export --project . --entrypoint src/index.ts --output architecture.tmd

# Export with custom options
typed-mind-ts export --project src/ --entrypoint main.ts --include-private --no-programs --output output.tmd

# Use tsconfig.json directly
typed-mind-ts export --project ./tsconfig.build.json --entrypoint src/app.ts --output build.tmd
```

### Assert TypeScript Matches Expected Architecture

```bash
# Check if TypeScript matches expected architecture
typed-mind-ts assert --project src/ --entrypoint index.ts --input expected.tmd

# With verbose output
typed-mind-ts assert --project . --entrypoint src/main.ts --input architecture.tmd --verbose
```

### Check TypeScript Architecture

```bash
# Validate extracted architecture with TypedMind rules
typed-mind-ts check --project src/ --entrypoint index.ts --verbose

# Check with custom options
typed-mind-ts check --project . --entrypoint src/app.ts --include-private --prefer-class-file
```

## CLI Options

| Option | Commands | Description | Default |
|--------|----------|-------------|---------|
| `--project` | all | Project directory or tsconfig.json path | **required** |
| `--entrypoint` | all | Entry point file relative to project directory | **required** |
| `--input` | assert | Input TypedMind file to compare against | **required for assert** |
| `--output` | export | Output file path (optional, defaults to stdout) | stdout |
| `--config` | all | Path to tsconfig.json (deprecated, use --project) | auto-detect |
| `--prefer-class-file` | all | Use ClassFile fusion for services/controllers | true |
| `--include-private` | all | Include private members in analysis | false |
| `--no-programs` | all | Do not generate Program entities | false |
| `--version` | all | Version for generated Program entities | "1.0.0" |
| `--verbose, -v` | all | Verbose output | false |

## Programmatic API

```typescript
import { 
  TypeScriptAnalyzer, 
  TypeScriptToTypedMindConverter,
  AssertionEngine 
} from '@sammons/typed-mind-typescript';

// Analyze TypeScript project from entrypoint
const analyzer = new TypeScriptAnalyzer('./src');
const analysis = analyzer.analyzeFromEntrypoint('index.ts');

// Or analyze all files (deprecated - use analyzeFromEntrypoint)
const fullAnalysis = analyzer.analyze();

// Convert to TypedMind
const converter = new TypeScriptToTypedMindConverter({
  preferClassFile: true,
  includePrivateMembers: false,
  generatePrograms: true,
});

const result = converter.convert(analysis);

if (result.success) {
  console.log(result.tmdContent);
} else {
  console.error('Conversion failed:', result.errors);
}

// Assert against expected
const engine = new AssertionEngine();
const assertion = engine.assert(result, 'expected.tmd', expectedContent);

if (!assertion.success) {
  console.error('Deviations found:', assertion.deviations);
}
```

## TypeScript to TypedMind Mapping

| TypeScript Construct | TypedMind Entity | Notes |
|---------------------|------------------|--------|
| Function | Function | With signature and call analysis |
| Class | Class or ClassFile | ClassFile for services/controllers |
| Interface | DTO | Pure data structures |
| Type alias | DTO | Object-like types only |
| Module/File | File or ClassFile | Based on patterns |
| Import/Export | File imports/exports | Dependency tracking |
| Const/Enum | Constants | Configuration data |

For collision handling, qualified ownership, and generated names, see [Emitted identities](NAMING.md).

## ClassFile Fusion

When `preferClassFile` is true (default), the converter detects service/controller patterns:

```typescript
// TypeScript
export class UserService extends BaseService {
  async createUser(data: CreateUserDTO): Promise<UserDTO> {
    // implementation
  }
}
```

```tmd
# TypedMind ClassFile (combines class + file)
classfile UserService {
  path: src/services/user-service.ts
  extends: BaseService
  imports: [CreateUserDTO, UserDTO]
  method: "async createUser(data: CreateUserDTO) => Promise<UserDTO>"
}
```

Instead of separate File and Class entities, you get one ClassFile with both capabilities.

## Architecture Patterns

### Service Layer Pattern
```typescript
// user-service.ts
export class UserService extends BaseService implements IUserService {
  constructor(private db: Database) {}
  
  async createUser(data: CreateUserDTO): Promise<UserDTO> {
    return this.db.users.create(data);
  }
}
```

Becomes:
```tmd
UserService #: src/services/user-service.ts <: BaseService, IUserService
  <- [Database, CreateUserDTO, UserDTO]
  => [createUser]
```

### DTO Pattern
```typescript
export interface UserDTO {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
}
```

Becomes:
```tmd
UserDTO %
  - id: string "User identifier"
  - name: string "Full name"
  - email?: string "Email address"  
  - createdAt: Date "Creation timestamp"
```

### Function Pattern
```typescript
export async function processUser(data: UserDTO): Promise<ProcessResult> {
  // implementation
}
```

Becomes:
```tmd
processUser :: async processUser(data: UserDTO) => Promise<ProcessResult>
  <- UserDTO
  -> ProcessResult
```

## Validation Rules

The tool follows TypedMind's bidirectional validation:

- Functions must be exported by files
- Classes must have defined methods
- DTOs must be referenced by functions
- Imports must resolve to exported entities
- Programs must have valid entry points

## Error Handling

The tool uses Result types (never throws for expected scenarios):

```typescript
type ConversionResult = {
  success: boolean;
  entities: AnyEntity[];
  tmdContent: string;
  errors: ConversionError[];
  warnings: ConversionWarning[];
};
```

## Examples

See the [test files](./src/*.test.ts) for comprehensive examples of:

- Complex class hierarchies
- Service layer patterns  
- DTO conversions
- Function analysis
- Import/export tracking
- Error scenarios

## Development

```bash
# Install dependencies
pnpm install

# Build package
pnpm build

# Run tests
pnpm test

# Watch tests
pnpm test:watch

# Lint code
pnpm lint
```

## License

MIT
Named source reexports such as `export { encodeQuotedString as quoteStringLiteral }`
retain the public alias and exact canonical declaration identity. When that identity
selects one emitted import-legal target, the barrel records a dependency on the
canonical entity; consumers retain their import of the barrel. This preserves the
consumer → barrel → declaration path without inventing an alias entity or another
local export. Unresolved/external targets and TypeDef import restrictions retain
their existing behavior. Cross-file `Function.calls` expansion remains outside this
change; the established call extractor records same-file call edges.
