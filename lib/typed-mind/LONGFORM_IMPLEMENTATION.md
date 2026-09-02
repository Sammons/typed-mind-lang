# TypedMind Longform Syntax Implementation Guide

This document describes the implementation details for TypedMind's dual syntax support. For the complete grammar reference, see [grammar.md](./grammar.md).

TypedMind supports both shortform (for LLMs) and longform (for humans) syntax. Both compile to the same AST.

## Syntax Comparison

### Program Declaration
```tmd
# Shortform
TodoApp -> AppEntry v1.0.0

# Longform
program TodoApp {
  entry: AppEntry
  version: "1.0.0"
}
```

### File Declaration
```tmd
# Shortform
AppEntry @ src/index.ts:
  <- [Express, Database]
  -> [startServer]

# Longform
file AppEntry {
  path: "src/index.ts"
  imports: [Express, Database]
  exports: [startServer]
}
```

### Function Declaration
```tmd
# Shortform
createUser :: (data: UserDTO) => Promise<User>
  "Creates a new user"
  <- UserDTO
  -> User
  ~> [validate, Database.save]
  +> [UserList]
  $< [DATABASE_URL, API_KEY]

# Longform
function createUser {
  signature: "(data: UserDTO) => Promise<User>"
  description: "Creates a new user"
  input: UserDTO
  output: User
  calls: [validate, Database.save]
  affects: [UserList]
  consumes: [DATABASE_URL, API_KEY]
}
```

A shortform `<- [...]` import-list continuation can carry names the parser
cannot yet resolve into `calls`/`affects`/`consumes`/`input`; that unresolved
residue round-trips through a `dependencies: [...]` longform key:

```tmd
# Shortform
processData :: (input: InputData) => OutputData
  <- [DashboardUI, IconAsset, InputData, transformData, lodash, AppConfig]
  <- InputData
  -> OutputData

# Longform
function processData {
  signature: "(input: InputData) => OutputData"
  input: InputData
  output: OutputData
  dependencies: [DashboardUI, IconAsset, InputData, transformData, lodash, AppConfig]
}
```

### Class Declaration
```tmd
# Shortform
UserService <: BaseService, IService
  => [create, read, update, delete]

# Longform
class UserService {
  extends: BaseService
  implements: [IService]
  methods: [create, read, update, delete]
}
```

### DTO Declaration
```tmd
# Shortform
UserDTO % "User data transfer object"
  - name: string "User's full name"
  - email: string "Email address"
  - age: number "Age in years" (optional)

# Longform
dto UserDTO {
  description: "User data transfer object"
  fields: {
    name: {
      type: "string"
      description: "User's full name"
    }
    email: {
      type: "string"
      description: "Email address"
    }
    age: {
      type: "number"
      description: "Age in years"
      optional: true
    }
  }
}
```

### UI Component Declaration
```tmd
# Shortform
UserProfile & "User profile component"
  < [Dashboard]
  > [Avatar, UserInfo]
  <+ [updateProfile, refreshData]

# Longform
component UserProfile {
  description: "User profile component"
  containedBy: [Dashboard]
  contains: [Avatar, UserInfo]
  affectedBy: [updateProfile, refreshData]
}

# Root component shortform
App &! "Root application component"

# Root component longform
component App {
  description: "Root application component"
  root: true
}
```

### Asset Declaration
```tmd
# Shortform
Logo ~ "Company logo SVG"
IndexHTML ~ "Main HTML file"
  >> ClientApp

# Longform
asset Logo {
  description: "Company logo SVG"
}

asset IndexHTML {
  description: "Main HTML file"
  containsProgram: ClientApp
}
```

### Constants Declaration
```tmd
# Shortform
Config ! src/config.ts : ConfigSchema

# Longform
constants Config {
  path: "src/config.ts"
  schema: ConfigSchema
}
```

### RunParameter Declaration
```tmd
# Shortform
DATABASE_URL $env "PostgreSQL connection" (required)
API_KEY $env "API authentication key"
  = "dev-key-123"
LAMBDA_ROLE $iam "Execution role"
NODE_VERSION $runtime "Node.js version"
  = "20.x"
MAX_CONNECTIONS $config "Connection pool size"
  = "100"

# Longform
parameter DATABASE_URL {
  type: "env"
  description: "PostgreSQL connection"
  required: true
}

parameter API_KEY {
  type: "env"
  description: "API authentication key"
  default: "dev-key-123"
}

parameter LAMBDA_ROLE {
  type: "iam"
  description: "Execution role"
}

parameter NODE_VERSION {
  type: "runtime"
  description: "Node.js version"
  default: "20.x"
}

parameter MAX_CONNECTIONS {
  type: "config"
  description: "Connection pool size"
  default: "100"
}
```

### Import Declaration
```tmd
# Shortform
@import "./shared/auth.tmd" as Auth
@import "./utils.tmd"

# Longform
import "./shared/auth.tmd" as Auth
import "./utils.tmd"
```

## Implementation Notes

1. **Lexer Changes**: Add tokens for `program`, `file`, `function`, `class`, `dto`, `component`, `asset`, `constants`, `parameter`, `import`, curly braces `{` `}`, and colon `:`

2. **Parser Changes**: 
   - Check for longform keywords at the start of entity declarations
   - Parse block-style syntax with key-value pairs
   - Maintain backward compatibility with shortform

3. **AST**: No changes needed - both syntaxes produce the same AST

4. **Validation**: No changes needed - operates on the AST

5. **VS Code Extension**: Update syntax highlighting to support both forms

## Benefits

- **Human-readable**: Longform is self-documenting with clear property names
- **LLM-efficient**: Shortform remains terse for AI generation
- **Flexible**: Users can mix both syntaxes in the same file
- **Migration-friendly**: Existing shortform files continue to work