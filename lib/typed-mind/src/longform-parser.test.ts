import { describe, it, expect } from 'vitest';
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

      expect(program).toBeDefined();
      expect(program?.type).toBe('Program');
      if (program?.type === 'Program') {
        expect(program.entry).toBe('AppEntry');
        expect(program.version).toBe('1.0.0');
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

      expect(result.entities.size).toBe(2);
      expect(result.entities.has('WebApp')).toBe(true);
      expect(result.entities.has('APIServer')).toBe(true);
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

      expect(file).toBeDefined();
      expect(file?.type).toBe('File');
      if (file?.type === 'File') {
        expect(file.path).toBe('src/index.ts');
        expect(file.imports).toEqual(['Express', 'Database', 'Config']);
        expect(file.exports).toEqual(['startServer', 'app']);
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

      expect(func).toBeDefined();
      expect(func?.type).toBe('Function');
      if (func?.type === 'Function') {
        expect(func.signature).toBe('(data: UserDTO) => Promise<User>');
        expect(func.description).toBe('Creates a new user in the database');
        expect(func.input).toBe('UserDTO');
        expect(func.output).toBe('User');
        expect(func.calls).toEqual(['validateUser', 'Database.save', 'sendEmail']);
        expect(func.affects).toEqual(['UserList', 'UserCount']);
        expect(func.consumes).toEqual(['DATABASE_URL', 'SMTP_CONFIG']);
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

      expect(cls).toBeDefined();
      expect(cls?.type).toBe('Class');
      if (cls?.type === 'Class') {
        expect(cls.extends).toBe('BaseService');
        expect(cls.implements).toEqual(['IUserService', 'ICacheable']);
        expect(cls.methods).toEqual(['create', 'read', 'update', 'delete', 'findByEmail']);
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

      expect(dto).toBeDefined();
      expect(dto?.type).toBe('DTO');
      if (dto?.type === 'DTO') {
        expect(dto.purpose).toBe('User data transfer object');
        expect(dto.fields).toHaveLength(4);
        expect(dto.fields[0]).toEqual({
          name: 'id',
          type: 'string',
          description: 'Unique identifier',
          optional: false,
        });
        expect(dto.fields[3]).toEqual({
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

      expect(component).toBeDefined();
      expect(component?.type).toBe('UIComponent');
      if (component?.type === 'UIComponent') {
        expect(component.purpose).toBe('User profile display component');
        expect(component.containedBy).toEqual(['Dashboard', 'UserPage']);
        expect(component.contains).toEqual(['Avatar', 'UserInfo', 'UserStats']);
        expect(component.affectedBy).toEqual(['updateProfile', 'refreshUser']);
        expect(component.root).toBe(false);
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

      expect(component).toBeDefined();
      if (component?.type === 'UIComponent') {
        expect(component.root).toBe(true);
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
      expect(logo?.type).toBe('Asset');
      if (logo?.type === 'Asset') {
        expect(logo.description).toBe('Company logo SVG file');
        expect(logo.containsProgram).toBeUndefined();
      }

      const html = result.entities.get('IndexHTML');
      if (html?.type === 'Asset') {
        expect(html.containsProgram).toBe('ClientApp');
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

      expect(constants).toBeDefined();
      expect(constants?.type).toBe('Constants');
      if (constants?.type === 'Constants') {
        expect(constants.path).toBe('src/config.ts');
        expect(constants.schema).toBe('ConfigSchema');
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

      expect(result.entities.size).toBe(5);

      const dbUrl = result.entities.get('DATABASE_URL');
      if (dbUrl?.type === 'RunParameter') {
        expect(dbUrl.paramType).toBe('env');
        expect(dbUrl.required).toBe(true);
        expect(dbUrl.defaultValue).toBeUndefined();
      }

      const apiKey = result.entities.get('API_KEY');
      if (apiKey?.type === 'RunParameter') {
        expect(apiKey.defaultValue).toBe('dev-key');
        expect(apiKey.required).toBe(false);
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
      expect(result.imports).toHaveLength(3);
      expect(result.imports[0]).toEqual({
        path: './shared/auth.tmd',
        alias: 'Auth',
        position: { line: 2, column: 1 },
      });
      expect(result.imports[1]).toEqual({
        path: './utils/helpers.tmd',
        alias: undefined,
        position: { line: 3, column: 1 },
      });
      expect(result.imports[2]).toEqual({
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
      expect(result.entities.size).toBe(8);

      // Check shortform entities
      expect(result.entities.get('TodoApp')?.type).toBe('Program');
      expect(result.entities.get('AppEntry')?.type).toBe('File');
      expect(result.entities.get('createTodo')?.type).toBe('Function');
      expect(result.entities.get('TodoDTO')?.type).toBe('DTO');

      // Check longform entities
      expect(result.entities.get('APIServer')?.type).toBe('Program');
      expect(result.entities.get('ApiMain')?.type).toBe('File');
      expect(result.entities.get('deleteTodo')?.type).toBe('Function');
      expect(result.entities.get('UserDTO')?.type).toBe('DTO');
    });
  });
});
