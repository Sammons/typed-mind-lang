import { describe, it, expect } from 'vitest';
import { DSLParser } from './parser.ts';

describe('DSLParser', () => {
  const parser = new DSLParser();

  it('should parse program declarations', () => {
    const input = 'TodoApp -> AppEntry v2.0';
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    expect(entities.size).toBe(1);
    const program = entities.get('TodoApp');
    expect(program).toBeDefined();
    expect(program?.type).toBe('Program');
    if (program?.type === 'Program') {
      expect(program.entry).toBe('AppEntry');
      expect(program.version).toBe('2.0');
    }
  });

  it('should parse file declarations with imports and exports', () => {
    const input = `
AppEntry @ src/index.ts:
  <- [ExpressSetup, Routes, Database]
  -> [startServer]
    `;
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    expect(entities.size).toBe(1);
    const file = entities.get('AppEntry');
    expect(file).toBeDefined();
    expect(file?.type).toBe('File');
    if (file?.type === 'File') {
      expect(file.path).toBe('src/index.ts');
      expect(file.imports).toEqual(['ExpressSetup', 'Routes', 'Database']);
      expect(file.exports).toEqual(['startServer']);
    }
  });

  it('should parse function declarations with calls', () => {
    const input = `
createUser :: (data: UserInput) => Promise<User>
  "Creates a new user in the database"
  ~> [validateInput, Database.insert]
    `;
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    expect(entities.size).toBe(1);
    const func = entities.get('createUser');
    expect(func).toBeDefined();
    expect(func?.type).toBe('Function');
    if (func?.type === 'Function') {
      expect(func.signature).toBe('(data: UserInput) => Promise<User>');
      expect(func.description).toBe('Creates a new user in the database');
      expect(func.calls).toEqual(['validateInput', 'Database.insert']);
    }
  });

  it('should parse class declarations with methods', () => {
    const input = `
TodoController <: BaseController, IController
  => [create, read, update, delete]
    `;
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    expect(entities.size).toBe(1);
    const cls = entities.get('TodoController');
    expect(cls).toBeDefined();
    expect(cls?.type).toBe('Class');
    if (cls?.type === 'Class') {
      expect(cls.extends).toBe('BaseController');
      expect(cls.implements).toEqual(['IController']);
      expect(cls.methods).toEqual(['create', 'read', 'update', 'delete']);
    }
  });

  it('should parse constants declarations', () => {
    const input = 'Config ! src/config.ts : EnvSchema';
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    expect(entities.size).toBe(1);
    const constants = entities.get('Config');
    expect(constants).toBeDefined();
    expect(constants?.type).toBe('Constants');
    if (constants?.type === 'Constants') {
      expect(constants.path).toBe('src/config.ts');
      expect(constants.schema).toBe('EnvSchema');
    }
  });

  it('should handle comments and empty lines', () => {
    const input = `
# This is a comment
TodoApp -> AppEntry

# Another comment

UserService @ src/services/user.ts:
  <- [Database]
    `;
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    expect(entities.size).toBe(2);
    expect(entities.has('TodoApp')).toBe(true);
    expect(entities.has('UserService')).toBe(true);
  });

  it('should parse complete example', () => {
    const input = `
TodoApp -> AppEntry v2.0

AppEntry @ src/index.ts:
  <- [ExpressSetup, Routes, Database]
  -> [startServer]

Routes @ src/routes/index.ts:
  <- [TodoRoutes, UserRoutes]
  -> [router]

TodoController <: BaseController
  => [create, read, update, delete]

create :: (req, res) => Promise<void>
  "Creates new todo item"
  ~> [validateTodo, TodoModel.create]

Config ! src/config.ts : EnvSchema
    `;
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    expect(entities.size).toBe(6);
    expect(entities.has('TodoApp')).toBe(true);
    expect(entities.has('AppEntry')).toBe(true);
    expect(entities.has('Routes')).toBe(true);
    expect(entities.has('TodoController')).toBe(true);
    expect(entities.has('create')).toBe(true);
    expect(entities.has('Config')).toBe(true);
  });
});
