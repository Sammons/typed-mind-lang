import { CONTINUATION_PATTERNS, ENTITY_PATTERNS, ENTITY_TYPE_NAMES, GENERAL_PATTERNS, PATTERN_DESCRIPTIONS } from './parser-patterns.ts';

const explanation = `
## Note from Author
TypedMind is meant to be a DSL to represent a variety of programs and
force AI to create a cohesive program architecture with a relatively token efficient syntax.

Entities link bidirectionally, so for example it is not enough to declare a function,
the file must also be declared. The function must be exported by a file. And the function must be 
consumed by another entity to avoid dead code. The TypeMind checker will validate these scenarios.
`;

export class GrammarDocGenerator {
  generateMarkdown(): string {
    const sections: string[] = [];

    // Header
    sections.push('# TypedMind DSL Grammar Reference');
    sections.push('');
    sections.push('This document is auto-generated from the parser patterns.');
    sections.push('');

    // Add the explanation
    sections.push(explanation.trim());
    sections.push('');

    // Table of Contents
    sections.push('## Table of Contents');
    sections.push('');
    sections.push('1. [Entity Types](#entity-types)');
    sections.push('2. [Entity Patterns](#entity-patterns)');
    sections.push('3. [Continuation Patterns](#continuation-patterns)');
    sections.push('4. [General Patterns](#general-patterns)');
    sections.push('5. [Quick Reference Example](#quick-reference-example)');
    sections.push('6. [Comprehensive Examples](#comprehensive-examples)');
    sections.push('7. [Key Features](#key-features)');
    sections.push('8. [DTO Field Syntax](#dto-field-syntax)');
    sections.push('9. [Method Call Syntax](#method-call-syntax)');
    sections.push('10. [Function Auto-Distribution Details](#function-auto-distribution-details)');
    sections.push('11. [Entity Naming Rules](#entity-naming-rules)');
    sections.push('12. [Validation Rules](#validation-rules)');
    sections.push('13. [Best Practices](#best-practices)');
    sections.push('');

    // Entity Types
    sections.push('## Entity Types');
    sections.push('');
    sections.push('TypedMind supports the following entity types:');
    sections.push('');
    sections.push('| Entity Type | Description |');
    sections.push('|------------|-------------|');

    const entityDescriptions: Record<string, string> = {
      Program: 'Defines an application entry point',
      File: 'Defines a source code file',
      Function: 'Defines a function with its type signature',
      Class: 'Defines a class with inheritance',
      ClassFile: 'Combines class and file definitions in one entity - perfect for services, controllers, and modules',
      Constants: 'Defines a constants/configuration file',
      DTO: 'Defines a Data Transfer Object for data structures (config, parameters, serialization) - NO function fields allowed',
      Asset: 'Defines a static asset',
      UIComponent: 'Defines a UI component (&! for root)',
      RunParameter: 'Defines a runtime parameter',
      Dependency: 'Defines an external dependency',
    };

    for (const typeName of ENTITY_TYPE_NAMES) {
      const desc = entityDescriptions[typeName];
      if (desc) {
        sections.push(`| ${typeName} | ${desc} |`);
      }
    }
    sections.push('');

    // Entity Patterns
    sections.push('## Entity Patterns');
    sections.push('');
    sections.push('### Shortform Syntax Patterns');
    sections.push('');

    // Compact entity patterns table
    sections.push('| Entity | Pattern | Example | Regex |');
    sections.push('|--------|---------|---------|-------|');
    for (const [name, pattern] of Object.entries(ENTITY_PATTERNS)) {
      const desc = PATTERN_DESCRIPTIONS[name as keyof typeof PATTERN_DESCRIPTIONS];
      if (desc) {
        const entityName = this.formatPatternName(name);
        sections.push(`| **${entityName}** | \`${desc.pattern}\` | \`${desc.example}\` | \`${pattern.source}\` |`);
      }
    }
    sections.push('');
    sections.push(
      "**Note:** Version format - The parser strips the 'v' prefix from versions. Both `v1.0.0` and `1.0.0` are stored as `1.0.0`.",
    );
    sections.push('');

    // Continuation Patterns
    sections.push('## Continuation Patterns');
    sections.push('');
    sections.push('These patterns match continuation lines that add properties to entities:');
    sections.push('');
    sections.push('| Pattern | Description | Example |');
    sections.push('|---------|-------------|---------|');

    const continuationInfo: Record<string, { desc: string; example: string }> = {
      IMPORTS: { desc: 'Entity imports', example: '<- [Database, UserModel]' },
      EXPORTS: { desc: 'Entity exports', example: '-> [createUser, getUser]' },
      CALLS: { desc: 'Function calls', example: '~> [validate, save]' },
      INPUT: { desc: 'Function input DTO', example: '<- UserCreateDTO' },
      OUTPUT: { desc: 'Function output DTO', example: '-> UserDTO' },
      METHODS: { desc: 'Class methods', example: '=> [create, read, update]' },
      AFFECTS: { desc: 'Function affects UI', example: '~ [UserList, UserForm]' },
      CONTAINS: { desc: 'UI component contains', example: '> [Header, Footer]' },
      CONTAINED_BY: { desc: 'UI component parent', example: '< [Dashboard]' },
      CONTAINS_PROGRAM: { desc: 'Asset contains program', example: '>> ClientApp' },
      DTO_FIELD: { desc: 'DTO field definition', example: '- name: string "User name"' },
      COMMENT: { desc: 'Comment line', example: '# This is a comment' },
      DESCRIPTION: { desc: 'Entity description', example: '"Creates a new user"' },
      DEFAULT_VALUE: { desc: 'Parameter default', example: '= "default-value"' },
      CONSUMES: { desc: 'Function consumes params', example: '$< [DATABASE_URL, API_KEY]' },
    };

    for (const [name] of Object.entries(CONTINUATION_PATTERNS)) {
      const info = continuationInfo[name];
      if (info) {
        sections.push(`| ${this.formatPatternName(name)} | ${info.desc} | \`${info.example}\` |`);
      }
    }
    sections.push('');

    // General Patterns
    sections.push('## General Patterns');
    sections.push('');
    sections.push('These patterns are used for general parsing tasks:');
    sections.push('');

    const generalInfo: Record<string, string> = {
      ENTITY_DECLARATION: 'Detects any entity declaration line',
      LONGFORM_DECLARATION: 'Detects longform syntax declarations',
      CONTINUATION: 'Detects continuation lines for entity properties',
      IMPORT_STATEMENT: 'Matches import statements (@import or import)',
      INLINE_COMMENT: 'Extracts inline comments from lines',
    };

    for (const [name, pattern] of Object.entries(GENERAL_PATTERNS)) {
      const desc = generalInfo[name];
      if (desc) {
        sections.push(`### ${this.formatPatternName(name)}`);
        sections.push('');
        sections.push(`**Description:** ${desc}`);
        sections.push('');
        sections.push(`**Regex:** \`${pattern.source}\``);
        sections.push('');
      }
    }

    // Compact example showing all entity types
    sections.push('## Quick Reference Example');
    sections.push('');
    sections.push('```tmd');
    sections.push('TodoApp -> main v1.0.0                      # Program');
    sections.push('main @ src/index.ts:                        # File');
    sections.push('  <- [UserService]');
    sections.push('  -> [startApp]');
    sections.push('');
    sections.push('UserService #: src/services/user.ts         # ClassFile (fusion)');
    sections.push('  <- [UserDTO]');
    sections.push('  => [createUser, findUser]');
    sections.push('');
    sections.push('startApp :: () => void                      # Function');
    sections.push('  ~> [createUser]');
    sections.push('');
    sections.push('createUser :: (data: UserDTO) => UserDTO    # Function');
    sections.push('  <- UserDTO                                # Input DTO');
    sections.push('  -> UserDTO                                # Output DTO');
    sections.push('');
    sections.push('UserDTO %                                    # DTO');
    sections.push('  - name: string "User name"');
    sections.push('  - email: string "Email"');
    sections.push('');
    sections.push('# Example showing other entity types:');
    sections.push('App &! "Root component"                     # UIComponent (root)');
    sections.push('DATABASE_URL $env "DB connection" (required) # RunParameter');
    sections.push('Config ! src/config.ts                      # Constants');
    sections.push('Logo ~ "Company logo"                       # Asset');
    sections.push('react ^ "UI library" v18.0.0                # Dependency');
    sections.push('```');
    sections.push('');

    // Comprehensive Examples Section
    sections.push('## Comprehensive Examples');
    sections.push('');
    sections.push('### Complete Application Example');
    sections.push('```tmd');
    sections.push('# Program definition');
    sections.push('TodoApp -> main "Todo application" v1.0.0');
    sections.push('');
    sections.push('# Entry file');
    sections.push('main @ src/index.ts:');
    sections.push('  <- [TodoService, AuthService]');
    sections.push('  -> [startApp]');
    sections.push('');
    sections.push('# Start function with auto-distribution');
    sections.push('startApp :: () => Promise<void>');
    sections.push('  "Starts the application with all dependencies"');
    sections.push('  <- [ConfigDTO, initializeDatabase, AuthService, TodoApp, DATABASE_URL]');
    sections.push('  # Auto-distributed to:');
    sections.push('  # input: ConfigDTO');
    sections.push('  # calls: [initializeDatabase, AuthService]');
    sections.push('  # affects: [TodoApp]');
    sections.push('  # consumes: [DATABASE_URL]');
    sections.push('');
    sections.push('# ClassFile fusion - combines class and file');
    sections.push('TodoService #: src/services/todo.ts <: BaseService');
    sections.push('  <- [TodoDTO, CreateTodoDTO, Database, Logger]');
    sections.push('  => [createTodo, getTodos, updateTodo, deleteTodo]');
    sections.push('  -> [todoHelper]  # Additional export');
    sections.push('');
    sections.push('# Function with method calls');
    sections.push('createTodo :: (data: CreateTodoDTO) => Promise<TodoDTO>');
    sections.push('  <- CreateTodoDTO  # Input DTO');
    sections.push('  -> TodoDTO        # Output DTO');
    sections.push('  ~> [validateTodo, Database.insert, Logger.info]  # Method calls');
    sections.push('  ~ [TodoList]      # Affects UI');
    sections.push('');
    sections.push('# DTOs with comprehensive field syntax');
    sections.push('CreateTodoDTO % "Data for creating a todo"');
    sections.push('  - title: string "Todo title"');
    sections.push('  - description?: string "Optional description"');
    sections.push('  - dueDate: Date "Due date" (optional)');
    sections.push('  - priority: number "Priority level (1-5)"');
    sections.push('  - tags: string[] "Associated tags"');
    sections.push('  - metadata: object "Additional metadata"');
    sections.push('');
    sections.push('TodoDTO % "Complete todo object"');
    sections.push('  - id: string "Unique identifier"');
    sections.push('  - title: string "Todo title"');
    sections.push('  - description: string "Description" (optional)');
    sections.push('  - completed: boolean "Completion status"');
    sections.push('  - dueDate: Date "Due date" (optional)');
    sections.push('  - createdAt: Date "Creation timestamp"');
    sections.push('  - updatedAt: Date "Last update timestamp"');
    sections.push('');
    sections.push('# UI Components with containment');
    sections.push('TodoApp &! "Root todo application"');
    sections.push('  > [Header, TodoList, CreateForm, Footer]');
    sections.push('');
    sections.push('TodoList & "List of todos"');
    sections.push('  < [TodoApp]');
    sections.push('  > [TodoItem]');
    sections.push('');
    sections.push('# Runtime parameters');
    sections.push('DATABASE_URL $env "PostgreSQL connection string" (required)');
    sections.push('API_KEY $env "External API key"');
    sections.push('  = "default-dev-key"');
    sections.push('');
    sections.push('# External dependencies');
    sections.push('react ^ "React framework" v18.0.0');
    sections.push('express ^ "Web framework" v4.18.0');
    sections.push('```');
    sections.push('');

    // ClassFile Fusion Section (more concise)
    sections.push('## Key Features');
    sections.push('');
    sections.push('### ClassFile Fusion (`#:`)');
    sections.push('Combines Class and File into one entity - perfect for services/controllers:');
    sections.push('```tmd');
    sections.push('UserService #: src/services/user.ts <: BaseService');
    sections.push('  <- [Database, Logger]       # File imports');
    sections.push('  => [create, update, delete] # Class methods');
    sections.push('  -> [userHelper]             # Additional exports');
    sections.push('```');
    sections.push('');

    // Function Dependency Intelligence (more concise)
    sections.push('### Function Auto-Distribution');
    sections.push('The `<- [...]` syntax intelligently categorizes mixed dependencies:');
    sections.push('```tmd');
    sections.push('processOrder :: (order: OrderDTO) => void');
    sections.push('  <- [OrderDTO, validateOrder, Database, OrderUI, API_KEY]');
    sections.push('  # Auto-distributed: input (DTO), calls (Functions/Classes),');
    sections.push('  # affects (UI), consumes (RunParams/Assets/Constants)');
    sections.push('```');
    sections.push('');
    sections.push('#### Distribution Rules');
    sections.push('');
    sections.push('| Entity Type | Distributed To | Description |');
    sections.push('|-------------|----------------|-------------|');
    sections.push('| Function | `calls` | Function calls another function |');
    sections.push('| Class/ClassFile | `calls` | Function calls class methods |');
    sections.push('| UIComponent | `affects` | Function modifies UI state |');
    sections.push('| RunParameter | `consumes` | Function uses runtime parameter |');
    sections.push('| Asset | `consumes` | Function uses static asset |');
    sections.push('| Constants | `consumes` | Function uses configuration |');
    sections.push('| Dependency | `consumes` | Function uses external library |');
    sections.push('| DTO (single) | `input` | Function takes DTO as parameter |');
    sections.push('| DTO (multiple) | ignored | Use explicit `<- DTOName` for input |');
    sections.push('');
    sections.push('#### Auto-Distribution Examples');
    sections.push('```tmd');
    sections.push('# Mixed dependencies before auto-distribution');
    sections.push('processPayment :: (payment: PaymentDTO) => Receipt');
    sections.push('  <- [PaymentDTO, validateCard, PaymentGateway, PaymentUI, STRIPE_KEY, stripe]');
    sections.push('');
    sections.push('# After auto-distribution:');
    sections.push('# input: PaymentDTO');
    sections.push('# calls: [validateCard, PaymentGateway]');
    sections.push('# affects: [PaymentUI]');
    sections.push('# consumes: [STRIPE_KEY, stripe]');
    sections.push('```');
    sections.push('');

    // Method Call Syntax
    sections.push('### Method Call Syntax');
    sections.push('');
    sections.push('Functions can call other functions and class methods using the `~>` operator:');
    sections.push('');
    sections.push('#### Basic Function Calls');
    sections.push('```tmd');
    sections.push('processData :: () => void');
    sections.push('  ~> [validateInput, transform, saveResult]');
    sections.push('```');
    sections.push('');
    sections.push('#### Class Method Calls');
    sections.push('```tmd');
    sections.push('# Calling methods on Classes/ClassFiles');
    sections.push('createUser :: (data: UserDTO) => void');
    sections.push('  ~> [UserService.create, Logger.info]');
    sections.push('');
    sections.push('# Recursive/self-referencing calls are allowed');
    sections.push('fibonacci :: (n: number) => number');
    sections.push('  ~> [fibonacci]  # Recursive call to itself');
    sections.push('```');
    sections.push('');
    sections.push('#### Method Call Rules');
    sections.push('- Direct function names: `functionName`');
    sections.push('- Class methods: `ClassName.methodName`');
    sections.push('- ClassFile methods: `ClassFileName.methodName`');
    sections.push("- Called methods must be defined in the entity's `=> [...]` list");
    sections.push('- Circular function calls are detected and reported as errors');
    sections.push('- Self-referencing (recursive) calls are allowed');
    sections.push('');

    // Validation Rules Section
    sections.push('## Validation Rules');
    sections.push('');
    sections.push('### Bidirectional Consistency');
    sections.push('TypedMind automatically maintains bidirectional relationships:');
    sections.push('- Function affects UIComponent → UIComponent.affectedBy includes Function');
    sections.push('- Function consumes RunParameter → RunParameter.consumedBy includes Function');
    sections.push('- UIComponent contains child → child.containedBy includes parent');
    sections.push('- Asset contains Program → Program must exist');
    sections.push('');
    sections.push('### Entity Naming Rules');
    sections.push('');
    sections.push('#### Valid Entity Names');
    sections.push('- Must start with letter (a-z, A-Z) or underscore (_)');
    sections.push('- Can contain letters, numbers, underscores');
    sections.push('- Case-sensitive (UserService ≠ userService)');
    sections.push('- Unicode letters supported (e.g., 名前)');
    sections.push('');
    sections.push('#### Invalid Entity Names');
    sections.push('- Cannot start with numbers: `123Name` ❌');
    sections.push('- Cannot contain spaces: `User Service` ❌');
    sections.push('- Cannot use kebab-case: `user-service` ❌');
    sections.push('- Cannot be reserved keywords (varies by implementation)');
    sections.push('');
    sections.push('#### Naming Examples');
    sections.push('```tmd');
    sections.push('# Valid names');
    sections.push('UserService      # PascalCase');
    sections.push('userService      # camelCase');
    sections.push('user_service     # snake_case');
    sections.push('_privateService  # underscore prefix');
    sections.push('Service2         # numbers allowed (not first)');
    sections.push('名前Service      # Unicode letters');
    sections.push('');
    sections.push('# Invalid names');
    sections.push('123Service       # starts with number');
    sections.push('"User Service"   # contains spaces');
    sections.push('user-service     # kebab-case');
    sections.push('```');
    sections.push('');
    sections.push('#### Uniqueness Rules');
    sections.push('- Names must be unique across ALL entity types');
    sections.push('- Exception: ClassFile can replace separate Class + File with same name');
    sections.push('- The validator will suggest using ClassFile fusion when detecting Class/File name conflicts');
    sections.push('');
    sections.push('### Reference Type Validation');
    sections.push('Each reference type has specific allowed source and target entity types:');
    sections.push('');
    sections.push('| Reference | From Entities | To Entities |');
    sections.push('|-----------|---------------|-------------|');
    sections.push('| imports | File, Class, ClassFile | Function, Class, Constants, DTO, etc. |');
    sections.push('| exports | File, ClassFile | Function, Class, Constants, DTO, etc. |');
    sections.push('| calls | Function | Function, Class (for methods) |');
    sections.push('| extends | Class, ClassFile | Class, ClassFile |');
    sections.push('| affects | Function | UIComponent |');
    sections.push('| consumes | Function | RunParameter, Asset, Constants |');
    sections.push('');

    // Parser Intelligence Section
    sections.push('## Parser Intelligence');
    sections.push('');
    sections.push('### Context-Aware Parsing');
    sections.push('The parser uses look-ahead to determine entity types:');
    sections.push('- `Name @ path:` followed by `=> [methods]` → Class entity');
    sections.push('- `Name @ path:` without methods → File entity');
    sections.push('- Inline comments (`# comment`) are extracted and stored separately');
    sections.push('- Mixed shortform/longform syntax is supported in the same file');
    sections.push('');
    sections.push('### Import Resolution');
    sections.push('- Circular imports are detected and reported as errors');
    sections.push('- Aliased imports prefix all imported entities: `@import "./auth.tmd" as Auth`');
    sections.push('- Nested imports are resolved recursively');
    sections.push('- Import paths can be relative or absolute');
    sections.push('');

    // Compact operator reference
    sections.push('## Operator Quick Reference');
    sections.push('');
    sections.push('```');
    sections.push('->  Entry point (Program) or Exports (File/Function)');
    sections.push('<-  Imports or Dependencies');
    sections.push('@   File path location');
    sections.push('#:  ClassFile fusion (class + file)');
    sections.push('::  Function signature');
    sections.push('<:  Class inheritance');
    sections.push('!   Constants marker');
    sections.push('%   DTO marker');
    sections.push('~   Asset description or Function affects UI');
    sections.push('&   UIComponent (&! for root)');
    sections.push('$   RunParameter ($env, $iam, etc.)');
    sections.push('^   External dependency');
    sections.push('~>  Function calls');
    sections.push('=>  Class methods');
    sections.push('>>  Asset contains program');
    sections.push('>   UIComponent contains');
    sections.push('<   UIComponent contained by');
    sections.push('$<  Function consumes parameters');
    sections.push(':   Constants schema');
    sections.push('=   Parameter default value');
    sections.push('```');
    sections.push('');

    // Concise DTOs vs Classes
    sections.push('### DTOs vs Classes');
    sections.push('**DTOs**: Pure data structures (NO functions allowed)');
    sections.push('**Classes**: Behavior and business logic (have methods)');
    sections.push('```tmd');
    sections.push('UserDTO %                            # DTO: data only');
    sections.push('  - name: string "User name"');
    sections.push('  - email: string');
    sections.push('');
    sections.push('UserService #: src/services/user.ts # Class: behavior');
    sections.push('  => [createUser, findUser]         # Has methods');
    sections.push('```');
    sections.push('');

    // Comprehensive DTO Field Syntax
    sections.push('### DTO Field Syntax');
    sections.push('');
    sections.push('DTOs support rich type definitions for fields:');
    sections.push('');
    sections.push('#### Basic Field Syntax');
    sections.push('```tmd');
    sections.push('UserDTO %');
    sections.push('  - name: string "User full name"           # Required field');
    sections.push('  - email: string                           # No description');
    sections.push('  - age?: number "Optional age"             # Optional field with ?');
    sections.push('  - nickname: string "Nickname" (optional)  # Optional with annotation');
    sections.push('```');
    sections.push('');
    sections.push('#### Supported Field Types');
    sections.push('- **Primitives**: `string`, `number`, `boolean`, `any`, `void`, `null`, `undefined`');
    sections.push('- **Arrays**: `string[]`, `number[]`, `UserDTO[]`, `any[][]` (multi-dimensional)');
    sections.push('- **Objects**: `object`, `{ key: string, value: number }` (inline objects)');
    sections.push('- **Unions**: `string | number`, `"active" | "inactive" | "pending"`');
    sections.push('- **Tuples**: `[string, number]`, `[boolean, string, number]`');
    sections.push('- **DTO References**: `UserDTO`, `AddressDTO` (must be defined entities)');
    sections.push('- **Complex Types**: `Record<string, any>`, `Map<string, number>`, `Date`');
    sections.push('');
    sections.push('#### Complex Field Examples');
    sections.push('```tmd');
    sections.push('ComplexDTO % "Advanced field types"');
    sections.push('  - id: string "Unique identifier"');
    sections.push('  - metadata?: object "Optional metadata"');
    sections.push('  - tags: string[] "Array of tags"');
    sections.push('  - status: "draft" | "published" | "archived" "Union type"');
    sections.push('  - coordinates: [number, number] "Tuple for lat/lng"');
    sections.push('  - config: { apiUrl: string, timeout: number } "Inline object"');
    sections.push('  - matrix: number[][] "2D array"');
    sections.push('  - user: UserDTO "Reference to another DTO"');
    sections.push('  - children?: ComplexDTO[] "Self-referencing array"');
    sections.push('```');
    sections.push('');
    sections.push('#### Field Validation Rules');
    sections.push('- Field names must be valid identifiers (no spaces, start with letter/underscore)');
    sections.push('- Field types cannot be `Function` or contain function types');
    sections.push('- Optional fields can use either `?` suffix or `(optional)` annotation');
    sections.push('- Referenced DTOs must exist in the same scope');
    sections.push('');

    // Advanced Patterns via Purpose Fields
    sections.push('## Advanced Patterns via Purpose Fields');
    sections.push('');
    sections.push('The purpose field can capture advanced programming patterns that TypedMind structure alone cannot represent:');
    sections.push('');
    sections.push('### Pattern Examples');
    sections.push('```tmd');
    sections.push('# Example patterns - showing syntax only (not complete programs)');
    sections.push('# Async/Concurrent');
    sections.push('processWorker :: (jobs: Channel<Job>) => void "ASYNC: Goroutine worker"');
    sections.push('DataChannel % "CHANNEL: MPSC unbounded"');
    sections.push('');
    sections.push('# Generics/Templates');
    sections.push('Container<T> <: Base "GENERIC<T: Display>: Type-parameterized"');
    sections.push('');
    sections.push('# Dependency Injection');
    sections.push('UserService #: src/service.ts "@Injectable @Scope(singleton)"');
    sections.push('');
    sections.push('# Event-Driven');
    sections.push('Button & "Component" "EVENTS: onClick, onHover, onFocus"');
    sections.push('DataEmitter <: EventEmitter "EMITS: data, error, close"');
    sections.push('');
    sections.push('# Resource Management');
    sections.push('FileReader :: (path: string) => string "RAII: auto-closes handle"');
    sections.push('Connection % "Context manager: auto-commit on scope exit"');
    sections.push('');
    sections.push('# Build Configuration');
    sections.push('DebugLogger ! src/debug.ts "BUILD: #ifdef DEBUG only"');
    sections.push('');
    sections.push('# Pattern Matching');
    sections.push('handleOption :: (val: Option<T>) => string "MATCH: Some(x) | None"');
    sections.push('');
    sections.push('# Middleware/Pipeline');
    sections.push('AuthMiddleware :: (req, res, next) => void "MIDDLEWARE: JWT validation"');
    sections.push('Pipeline @ src/pipeline.ts: "PIPELINE: cors -> auth -> router"');
    sections.push('```');
    sections.push('');
    sections.push('### Semantic Conventions');
    sections.push('Establish project-specific conventions in purpose fields:');
    sections.push('- **ASYNC/AWAIT**: Async functions and promises');
    sections.push('- **GENERIC<T>**: Generic type parameters');
    sections.push('- **@Decorator**: Decorators and annotations');
    sections.push('- **EVENTS**: Event emitters and handlers');
    sections.push('- **CHANNEL**: Concurrent communication');
    sections.push('- **RAII/Context**: Resource management');
    sections.push('- **BUILD**: Conditional compilation');
    sections.push('- **PIPELINE**: Middleware chains');
    sections.push('');

    // Entity Capability Matrix
    sections.push('## Entity Capability Matrix');
    sections.push('');
    sections.push('| Entity | Can Import | Can Export | Has Methods | Can Extend | Has Path |');
    sections.push('|--------|------------|------------|-------------|------------|----------|');
    sections.push('| File | ✅ | ✅ | ❌ | ❌ | ✅ |');
    sections.push('| Class | ❌ | ❌ | ✅ | ✅ | ❌ |');
    sections.push('| ClassFile | ✅ | ✅ | ✅ | ✅ | ✅ |');
    sections.push('| Function | ❌ | ❌ | ❌ | ❌ | ❌ |');
    sections.push('| DTO | ❌ | ❌ | ❌ | ❌ | ❌ |');
    sections.push('| Constants | ❌ | ❌ | ❌ | ❌ | ✅ |');
    sections.push('| Asset | ❌ | ❌ | ❌ | ❌ | ❌ |');
    sections.push('| UIComponent | ❌ | ❌ | ❌ | ❌ | ❌ |');
    sections.push('| RunParameter | ❌ | ❌ | ❌ | ❌ | ❌ |');
    sections.push('| Dependency | ❌ | ❌ | ❌ | ❌ | ❌ |');
    sections.push('');

    // Valid RunParameter Types
    sections.push('## Valid RunParameter Types');
    sections.push('');
    sections.push('RunParameters use `$type` syntax with these valid types:');
    sections.push('- **$env**: Environment variable');
    sections.push('- **$iam**: IAM role or permission');
    sections.push('- **$runtime**: Runtime configuration');
    sections.push('- **$config**: Configuration parameter');
    sections.push('');
    sections.push('Example: `DATABASE_URL $env "Connection string" (required)`');
    sections.push('');

    // What Can Be Exported
    sections.push('## Export Rules');
    sections.push('');
    sections.push('### What Files and ClassFiles Can Export');
    sections.push('✅ **Can Export:**');
    sections.push('- Functions');
    sections.push('- Classes');
    sections.push('- Constants');
    sections.push('- DTOs');
    sections.push('');
    sections.push('❌ **Cannot Export:**');
    sections.push('- Assets (static files, not code)');
    sections.push('- UIComponents (UI structure, not modules)');
    sections.push('- RunParameters (runtime config, not code)');
    sections.push('- Dependencies (external packages)');
    sections.push('');
    sections.push('### ClassFile Auto-Export');
    sections.push('ClassFiles automatically export themselves. Manual export creates duplication:');
    sections.push('```tmd');
    sections.push('UserService #: src/user.ts');
    sections.push('  -> [helper]  # ✅ Exports helper');
    sections.push('  # -> [UserService]  # ❌ Redundant - auto-exported');
    sections.push('```');
    sections.push('');

    // Common Pitfalls
    sections.push('## Common Pitfalls');
    sections.push('');
    sections.push("### ❌ Don't Import Class Methods Directly");
    sections.push('```tmd');
    sections.push('# Wrong');
    sections.push('File @ src/app.ts:');
    sections.push("  <- [UserService.createUser]  # Can't import methods");
    sections.push('');
    sections.push('# Right');
    sections.push('File @ src/app.ts:');
    sections.push('  <- [UserService]  # Import the ClassFile');
    sections.push('  # Now createUser method is available');
    sections.push('```');
    sections.push('');
    sections.push("### ❌ Don't Call ClassFiles Directly");
    sections.push('```tmd');
    sections.push('# Wrong');
    sections.push('processData :: () => void');
    sections.push("  ~> [DataProcessor]  # Can't call ClassFile");
    sections.push('');
    sections.push('# Right');
    sections.push('processData :: () => void');
    sections.push('  ~> [process]  # Call the method, not the ClassFile');
    sections.push('```');
    sections.push('');
    sections.push("### ❌ Don't Give Classes Import/Export");
    sections.push('```tmd');
    sections.push("# Wrong - Classes can't import");
    sections.push('MyClass <: Base');
    sections.push("  <- [Logger]  # Classes don't support imports!");
    sections.push('');
    sections.push('# Right - Use ClassFile for import capability');
    sections.push('MyClass #: src/my-class.ts <: Base');
    sections.push('  <- [Logger]  # ClassFiles can import');
    sections.push('```');
    sections.push('');
    sections.push("### ❌ Don't Confuse Entity Capabilities");
    sections.push('```tmd');
    sections.push('# Wrong - Mixed capabilities');
    sections.push('DataFile @ src/data.ts:');
    sections.push("  => [processData]  # Files can't have methods!");
    sections.push('');
    sections.push('DataClass <: Base');
    sections.push("  @ src/data.ts:  # Classes can't have paths!");
    sections.push('```');
    sections.push('');

    // Detailed DTO Field Syntax Section
    sections.push('## DTO Field Syntax');
    sections.push('');
    sections.push('DTOs support comprehensive field definitions with types, descriptions, and optionality:');
    sections.push('');
    sections.push('### Field Patterns');
    sections.push('');
    sections.push('```tmd');
    sections.push('UserDTO %');
    sections.push('  - name: string "User full name"           # Required field');
    sections.push('  - email?: string "Email address"            # Optional field (? syntax)');
    sections.push('  - age: number "User age" (optional)        # Optional field (parentheses)');
    sections.push('  - tags: string[] "User tags"                # Array type');
    sections.push('  - metadata: object "Additional data"        # Generic object type');
    sections.push('  - createdAt: Date "Account creation"        # Built-in types');
    sections.push('  - profile: ProfileDTO "User profile"       # Reference to other DTO');
    sections.push('```');
    sections.push('');
    sections.push('### Supported Types');
    sections.push('- **Primitives**: `string`, `number`, `boolean`, `Date`');
    sections.push('- **Collections**: `string[]`, `number[]`, `Type[]`');
    sections.push('- **Generic**: `object`, `any`');
    sections.push('- **DTO References**: `OtherDTO` (must be defined elsewhere)');
    sections.push('- **Complex Types**: `Promise<Type>`, `Optional<Type>`, custom types');
    sections.push('');
    sections.push('### Field Rules');
    sections.push('- Field names must be valid identifiers (alphanumeric + underscore)');
    sections.push('- Types cannot be `Function` or reference function names');
    sections.push('- Descriptions are optional but recommended for clarity');
    sections.push('- Optional fields can use `?` suffix or `(optional)` annotation');
    sections.push('');

    // Method Call Syntax Section
    sections.push('## Method Call Syntax');
    sections.push('');
    sections.push('Functions can call other functions, class methods, or static methods using the `~>` operator:');
    sections.push('');
    sections.push('### Call Patterns');
    sections.push('');
    sections.push('```tmd');
    sections.push('# Function calls');
    sections.push('processUser :: (data: UserDTO) => void');
    sections.push('  ~> [validateInput, createUser, sendNotification]');
    sections.push('');
    sections.push('# Class method calls (ClassName.methodName)');
    sections.push('handleRequest :: (req: Request) => Response');
    sections.push('  ~> [UserService.findById, OrderService.create]');
    sections.push('');
    sections.push('# Mixed calls');
    sections.push('complexProcess :: () => void');
    sections.push('  ~> [validateAuth, Database.connect, UserService.update, logEvent]');
    sections.push('```');
    sections.push('');
    sections.push('### Method Call Rules');
    sections.push('- Function names: Direct references to other Function entities');
    sections.push('- Class methods: `ClassName.methodName` where ClassName exists and has method');
    sections.push('- Static calls: `ModuleName.staticMethod` for utility functions');
    sections.push('- All called entities must be defined in the program');
    sections.push('- Circular function calls are detected and reported as warnings');
    sections.push('');

    // Function Auto-Distribution Details
    sections.push('## Function Auto-Distribution Details');
    sections.push('');
    sections.push('The `<- [...]` syntax intelligently categorizes mixed dependencies based on entity types:');
    sections.push('');
    sections.push('### Distribution Rules');
    sections.push('');
    sections.push('| Entity Type | Distributed To | Description |');
    sections.push('|-------------|----------------|-------------|');
    sections.push('| Function, Class, ClassFile | `calls` (`~>`) | Function calls another function or class method |');
    sections.push('| UIComponent | `affects` (`~`) | Function modifies UI component state |');
    sections.push('| RunParameter, Asset, Constants, Dependency | `consumes` (`$<`) | Function uses external resources |');
    sections.push('| DTO (single) | `input` (`<-`) | Function takes DTO as input parameter |');
    sections.push('| DTO (multiple) | Error | Functions can only have one input DTO |');
    sections.push('');
    sections.push('### Distribution Examples');
    sections.push('');
    sections.push('```tmd');
    sections.push('# Mixed dependency list');
    sections.push('processOrder :: (order: OrderDTO) => Promise<Receipt>');
    sections.push('  <- [OrderDTO, validateOrder, PaymentService, OrderUI, STRIPE_KEY, Database]');
    sections.push('');
    sections.push('# Automatically distributed to:');
    sections.push('# input: OrderDTO');
    sections.push('# calls: [validateOrder, PaymentService, Database]');
    sections.push('# affects: [OrderUI]');
    sections.push('# consumes: [STRIPE_KEY]');
    sections.push('```');
    sections.push('');
    sections.push('### Auto-Distribution Benefits');
    sections.push('- **Concise syntax**: Single list instead of multiple continuation lines');
    sections.push('- **Type safety**: Parser validates entity types and relationships');
    sections.push('- **Bidirectional links**: All relationships are automatically maintained');
    sections.push('- **Error detection**: Invalid entity types or missing entities are caught');
    sections.push('');

    // Enhanced Entity Naming Rules
    sections.push('## Entity Naming Rules');
    sections.push('');
    sections.push('### Naming Requirements');
    sections.push('- **Global uniqueness**: Entity names must be unique across ALL entity types');
    sections.push('- **Valid identifiers**: Must start with letter, can contain letters, numbers, underscores');
    sections.push('- **Case sensitive**: `UserService` and `userservice` are different entities');
    sections.push('- **Reserved names**: Cannot use TypedMind keywords or operators as names');
    sections.push('');
    sections.push('### ClassFile Fusion Exception');
    sections.push('ClassFile entities can replace separate Class + File pairs:');
    sections.push('');
    sections.push('```tmd');
    sections.push('# ❌ Naming conflict: separate Class and File');
    sections.push('UserService <: BaseService');
    sections.push('  => [createUser, findUser]');
    sections.push('');
    sections.push('UserService @ src/services/user.ts:  # ERROR: Name conflict!');
    sections.push('  -> [UserService]');
    sections.push('');
    sections.push('# ✅ Solution: Use ClassFile fusion');
    sections.push('UserService #: src/services/user.ts <: BaseService');
    sections.push('  => [createUser, findUser]                 # Class methods');
    sections.push('  <- [Database, Logger]                     # File imports');
    sections.push('  # UserService is auto-exported from file');
    sections.push('```');
    sections.push('');
    sections.push('### Name Validation Errors');
    sections.push('Common naming validation errors:');
    sections.push('- **Duplicate names**: Two entities with the same name');
    sections.push('- **Invalid characters**: Names with spaces, hyphens, or special characters');
    sections.push('- **Reserved keywords**: Using TypedMind operators as entity names');
    sections.push('- **Empty names**: Missing or empty entity names');
    sections.push('');

    // Compact best practices
    sections.push('## Best Practices');
    sections.push('');
    sections.push('- **Use ClassFile (`#:`)** for services, controllers, repositories');
    sections.push('- **Group by feature**: Keep related entities together');
    sections.push('- **Mix dependencies freely**: Parser auto-categorizes them');
    sections.push('- **DTOs for data, Classes for behavior**: Keep them separate');
    sections.push('- **Leverage purpose fields**: Document async, generics, DI, events, etc.');
    sections.push('- **Establish conventions**: Create project-specific semantic patterns');
    sections.push('- **Bidirectional links**: Automatically maintained by the parser');
    sections.push('- **Check capability matrix**: Ensure entities have the right capabilities');
    sections.push('- **Name entities clearly**: Use descriptive, unique names across all types');
    sections.push('- **Document field types**: Include descriptions for all DTO fields');
    sections.push('- **Use method calls correctly**: Reference methods as `ClassName.methodName`');

    return sections.join('\n');
  }

  generateJSON(): string {
    const grammar = {
      entityTypes: ENTITY_TYPE_NAMES,
      patterns: {
        entity: this.patternsToJSON(ENTITY_PATTERNS),
        continuation: this.patternsToJSON(CONTINUATION_PATTERNS),
        general: this.patternsToJSON(GENERAL_PATTERNS),
      },
      descriptions: PATTERN_DESCRIPTIONS,
    };

    return JSON.stringify(grammar, null, 2);
  }

  generateEBNF(): string {
    const lines: string[] = [];

    lines.push('(* TypedMind DSL Grammar in EBNF notation *)');
    lines.push('');
    lines.push('(* Document Structure *)');
    lines.push('document = (import_statement | entity | comment | empty_line)*;');
    lines.push('');
    lines.push('(* Import Statements *)');
    lines.push('import_statement = ("@import" | "import") string_literal ["as" identifier];');
    lines.push('');
    lines.push('(* Entity Declarations *)');
    lines.push('entity = program | file | function | class | classfile | dto | asset | component | parameter | dependency | constants;');
    lines.push('');
    lines.push('(* Program Entity *)');
    lines.push('program = identifier "->" identifier [string_literal] ["v" version];');
    lines.push('version = digit+ "." digit+ "." digit+;');
    lines.push('');
    lines.push('(* File Entity *)');
    lines.push('file = identifier "@" path ":" [file_body];');
    lines.push('file_body = (imports | exports | description)*;');
    lines.push('imports = "<-" "[" identifier_list "]";');
    lines.push('exports = "->" "[" identifier_list "]";');
    lines.push('');
    lines.push('(* Function Entity *)');
    lines.push('function = identifier "::" signature [function_body];');
    lines.push('function_body = (description | input | output | calls | affects | consumes)*;');
    lines.push('input = "<-" identifier;');
    lines.push('output = "->" identifier;');
    lines.push('calls = "~>" "[" identifier_list "]";');
    lines.push('affects = "~" "[" identifier_list "]";');
    lines.push('consumes = "$<" "[" identifier_list "]";');
    lines.push('');
    lines.push('(* Class Entity *)');
    lines.push('class = identifier "<:" [identifier] ["," identifier_list] [class_body];');
    lines.push('class_body = (methods | description)*;');
    lines.push('methods = "=>" "[" identifier_list "]";');
    lines.push('');
    lines.push('(* ClassFile Entity *)');
    lines.push('classfile = identifier "#:" path ["<:" [identifier] ["," identifier_list]] [classfile_body];');
    lines.push('classfile_body = (imports | exports | methods | description)*;');
    lines.push('');
    lines.push('(* DTO Entity *)');
    lines.push('dto = identifier "%" [string_literal] [dto_body];');
    lines.push('dto_body = field_definition*;');
    lines.push('field_definition = "-" identifier ["?"] ":" type [string_literal] ["(" "optional" ")"];');
    lines.push('');
    lines.push('(* Asset Entity *)');
    lines.push('asset = identifier "~" string_literal [asset_body];');
    lines.push('asset_body = (contains_program)*;');
    lines.push('contains_program = ">>" identifier;');
    lines.push('');
    lines.push('(* UIComponent Entity *)');
    lines.push('component = identifier ("&" | "&!") string_literal [component_body];');
    lines.push('component_body = (contains | contained_by)*;');
    lines.push('contains = ">" "[" identifier_list "]";');
    lines.push('contained_by = "<" "[" identifier_list "]";');
    lines.push('');
    lines.push('(* RunParameter Entity *)');
    lines.push('parameter = identifier "$" param_type string_literal ["(" "required" ")"] [default_value];');
    lines.push('param_type = "env" | "iam" | "runtime" | "config";');
    lines.push('default_value = "=" string_literal;');
    lines.push('');
    lines.push('(* Dependency Entity *)');
    lines.push('dependency = identifier "^" string_literal ["v" version_spec];');
    lines.push('');
    lines.push('(* Constants Entity *)');
    lines.push('constants = identifier "!" path [":" identifier];');
    lines.push('');
    lines.push('(* Common Elements *)');
    lines.push('identifier = letter (letter | digit | "_")*;');
    lines.push('identifier_list = identifier ("," identifier)*;');
    lines.push("string_literal = '\"' character* '\"';");
    lines.push('path = string_literal;');
    lines.push('type = identifier;');
    lines.push('signature = "(" [parameters] ")" "=>" return_type;');
    lines.push('description = string_literal;');
    lines.push('comment = "#" character*;');
    lines.push('empty_line = whitespace*;');

    return lines.join('\n');
  }

  private formatPatternName(name: string): string {
    return name
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  private patternsToJSON(patterns: Record<string, RegExp>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [name, pattern] of Object.entries(patterns)) {
      result[name] = pattern.source;
    }
    return result;
  }
}
