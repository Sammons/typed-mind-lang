import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DSLParser } from './parser.ts';

describe('Longform Syntax', () => {
  const parser = new DSLParser();

  describe('Program Declaration', () => {
    it('should parse longform program declaration', () => {
      const input = `
program TodoApp {
  entry: AppEntry
  version: "1.0.0"
}`;
      const result = parser.parse(input);
      const program = result.entities.get('TodoApp');

      assert.notEqual(program, undefined);
      assert.equal(program?.type, 'Program');
      if (program?.type === 'Program') {
        assert.equal(program.entry, 'AppEntry');
        assert.equal(program.version, '1.0.0');
      }
    });

    it('should parse both shortform and longform in same file', () => {
      const input = `
# Shortform program
WebApp -> Main v2.0

# Longform program
program APIServer {
  entry: ApiEntry
  version: "1.0.0"
}`;
      const result = parser.parse(input);

      assert.equal(result.entities.size, 2);
      assert.equal(result.entities.has('WebApp'), true);
      assert.equal(result.entities.has('APIServer'), true);
    });
  });

  describe('File Declaration', () => {
    it('should parse longform file declaration', () => {
      const input = `
file AppEntry {
  path: "src/index.ts"
  imports: [Express, Database, Config]
  exports: [startServer, app]
}`;
      const result = parser.parse(input);
      const file = result.entities.get('AppEntry');

      assert.notEqual(file, undefined);
      assert.equal(file?.type, 'File');
      if (file?.type === 'File') {
        assert.equal(file.path, 'src/index.ts');
        assert.deepEqual(file.imports, ['Express', 'Database', 'Config']);
        assert.deepEqual(file.exports, ['startServer', 'app']);
      }
    });
  });

  describe('Function Declaration', () => {
    it('should parse longform function declaration', () => {
      const input = `
function createUser {
  signature: "(data: UserDTO) => Promise<User>"
  description: "Creates a new user in the database"
  input: UserDTO
  output: User
  calls: [validateUser, Database.save, sendEmail]
  affects: [UserList, UserCount]
  consumes: [DATABASE_URL, SMTP_CONFIG]
}`;
      const result = parser.parse(input);
      const func = result.entities.get('createUser');

      assert.notEqual(func, undefined);
      assert.equal(func?.type, 'Function');
      if (func?.type === 'Function') {
        assert.equal(func.signature, '(data: UserDTO) => Promise<User>');
        assert.equal(func.description, 'Creates a new user in the database');
        assert.equal(func.input, 'UserDTO');
        assert.equal(func.output, 'User');
        assert.deepEqual(func.calls, ['validateUser', 'Database.save', 'sendEmail']);
        assert.deepEqual(func.affects, ['UserList', 'UserCount']);
        assert.deepEqual(func.consumes, ['DATABASE_URL', 'SMTP_CONFIG']);
      }
    });
  });

  describe('Class Declaration', () => {
    it('should parse longform class declaration', () => {
      const input = `
class UserService {
  extends: BaseService
  implements: [IUserService, ICacheable]
  methods: [create, read, update, delete, findByEmail]
}`;
      const result = parser.parse(input);
      const cls = result.entities.get('UserService');

      assert.notEqual(cls, undefined);
      assert.equal(cls?.type, 'Class');
      if (cls?.type === 'Class') {
        assert.equal(cls.extends, 'BaseService');
        assert.deepEqual(cls.implements, ['IUserService', 'ICacheable']);
        assert.deepEqual(cls.methods, ['create', 'read', 'update', 'delete', 'findByEmail']);
      }
    });
  });

  describe('DTO Declaration', () => {
    it('should parse longform DTO declaration', () => {
      const input = `
dto UserDTO {
  description: "User data transfer object"
  fields: {
    id: {
      type: "string"
      description: "Unique identifier"
    }
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
}`;
      const result = parser.parse(input);
      const dto = result.entities.get('UserDTO');

      assert.notEqual(dto, undefined);
      assert.equal(dto?.type, 'DTO');
      if (dto?.type === 'DTO') {
        assert.equal(dto.purpose, 'User data transfer object');
        assert.equal(dto.fields.length, 4);
        assert.deepEqual(dto.fields[0], {
          name: 'id',
          type: 'string',
          description: 'Unique identifier',
          optional: false,
        });
        assert.deepEqual(dto.fields[3], {
          name: 'age',
          type: 'number',
          description: 'Age in years',
          optional: true,
        });
      }
    });
  });

  describe('UIComponent Declaration', () => {
    it('should parse longform component declaration', () => {
      const input = `
component UserProfile {
  description: "User profile display component"
  containedBy: [Dashboard, UserPage]
  contains: [Avatar, UserInfo, UserStats]
  affectedBy: [updateProfile, refreshUser]
}`;
      const result = parser.parse(input);
      const component = result.entities.get('UserProfile');

      assert.notEqual(component, undefined);
      assert.equal(component?.type, 'UIComponent');
      if (component?.type === 'UIComponent') {
        assert.equal(component.purpose, 'User profile display component');
        assert.deepEqual(component.containedBy, ['Dashboard', 'UserPage']);
        assert.deepEqual(component.contains, ['Avatar', 'UserInfo', 'UserStats']);
        assert.deepEqual(component.affectedBy, ['updateProfile', 'refreshUser']);
        assert.equal(component.root, false);
      }
    });

    it('should parse root component', () => {
      const input = `
component App {
  description: "Root application component"
  root: true
  contains: [Header, MainContent, Footer]
}`;
      const result = parser.parse(input);
      const component = result.entities.get('App');

      assert.notEqual(component, undefined);
      if (component?.type === 'UIComponent') {
        assert.equal(component.root, true);
      }
    });
  });

  describe('Asset Declaration', () => {
    it('should parse longform asset declaration', () => {
      const input = `
asset Logo {
  description: "Company logo SVG file"
}

asset IndexHTML {
  description: "Main HTML entry point"
  containsProgram: ClientApp
}`;
      const result = parser.parse(input);

      const logo = result.entities.get('Logo');
      assert.equal(logo?.type, 'Asset');
      if (logo?.type === 'Asset') {
        assert.equal(logo.description, 'Company logo SVG file');
        assert.equal(logo.containsProgram, undefined);
      }

      const html = result.entities.get('IndexHTML');
      if (html?.type === 'Asset') {
        assert.equal(html.containsProgram, 'ClientApp');
      }
    });
  });

  describe('Constants Declaration', () => {
    it('should parse longform constants declaration', () => {
      const input = `
constants Config {
  path: "src/config.ts"
  schema: ConfigSchema
}`;
      const result = parser.parse(input);
      const constants = result.entities.get('Config');

      assert.notEqual(constants, undefined);
      assert.equal(constants?.type, 'Constants');
      if (constants?.type === 'Constants') {
        assert.equal(constants.path, 'src/config.ts');
        assert.equal(constants.schema, 'ConfigSchema');
      }
    });
  });

  describe('RunParameter Declaration', () => {
    it('should parse longform parameter declarations', () => {
      const input = `
parameter DATABASE_URL {
  type: "env"
  description: "PostgreSQL connection string"
  required: true
}

parameter API_KEY {
  type: "env"
  description: "External API key"
  default: "dev-key"
}

parameter LAMBDA_ROLE {
  type: "iam"
  description: "Lambda execution role"
}

parameter NODE_VERSION {
  type: "runtime"
  description: "Node.js runtime version"
  default: "20.x"
}

parameter MAX_CONNECTIONS {
  type: "config"
  description: "Maximum DB connections"
  default: "100"
}`;
      const result = parser.parse(input);

      assert.equal(result.entities.size, 5);

      const dbUrl = result.entities.get('DATABASE_URL');
      if (dbUrl?.type === 'RunParameter') {
        assert.equal(dbUrl.paramType, 'env');
        assert.equal(dbUrl.required, true);
        assert.equal(dbUrl.defaultValue, undefined);
      }

      const apiKey = result.entities.get('API_KEY');
      if (apiKey?.type === 'RunParameter') {
        assert.equal(apiKey.defaultValue, 'dev-key');
        assert.equal(apiKey.required, false);
      }
    });
  });

  describe('Import Declaration', () => {
    it('should parse longform import syntax', () => {
      const input = `
import "./shared/auth.tmd" as Auth
import "./utils/helpers.tmd"
@import "./legacy.tmd" as Legacy`;

      const result = parser.parse(input);
      assert.equal(result.imports.length, 3);
      assert.deepEqual(result.imports[0], {
        path: './shared/auth.tmd',
        alias: 'Auth',
        position: { line: 2, column: 1 },
      });
      assert.deepEqual(result.imports[1], {
        path: './utils/helpers.tmd',
        alias: undefined,
        position: { line: 3, column: 1 },
      });
      assert.deepEqual(result.imports[2], {
        path: './legacy.tmd',
        alias: 'Legacy',
        position: { line: 4, column: 1 },
      });
    });
  });

  describe('Mixed Syntax', () => {
    it('should parse mixed shortform and longform in same file', () => {
      const input = `
# Programs
TodoApp -> AppEntry v1.0.0

program APIServer {
  entry: ApiMain
  version: "2.0.0"
}

# Files
AppEntry @ src/app.ts:
  <- [Express]
  -> [app]

file ApiMain {
  path: "src/api.ts"
  imports: [Fastify, Database]
  exports: [server]
}

# Functions
createTodo :: (data: TodoDTO) => Todo
  ~> [validate, save]

function deleteTodo {
  signature: "(id: string) => void"
  calls: [Database.delete]
}

# DTOs
TodoDTO % "Todo input data"
  - title: string
  - done: boolean

dto UserDTO {
  description: "User data"
  fields: {
    name: { type: "string" }
    email: { type: "string" }
  }
}`;

      const result = parser.parse(input);
      assert.equal(result.entities.size, 8);

      // Check shortform entities
      assert.equal(result.entities.get('TodoApp')?.type, 'Program');
      assert.equal(result.entities.get('AppEntry')?.type, 'File');
      assert.equal(result.entities.get('createTodo')?.type, 'Function');
      assert.equal(result.entities.get('TodoDTO')?.type, 'DTO');

      // Check longform entities
      assert.equal(result.entities.get('APIServer')?.type, 'Program');
      assert.equal(result.entities.get('ApiMain')?.type, 'File');
      assert.equal(result.entities.get('deleteTodo')?.type, 'Function');
      assert.equal(result.entities.get('UserDTO')?.type, 'DTO');
    });
  });
});
