import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DSLParser } from './parser.ts';

describe('DSLParser', () => {
  const parser = new DSLParser();

  it('should parse program declarations', () => {
    const input = 'TodoApp -> AppEntry v2.0';
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    assert.equal(entities.size, 1);
    const program = entities.get('TodoApp');
    assert.notEqual(program, undefined);
    assert.equal(program?.type, 'Program');
    if (program?.type === 'Program') {
      assert.equal(program.entry, 'AppEntry');
      assert.equal(program.version, '2.0');
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

    assert.equal(entities.size, 1);
    const file = entities.get('AppEntry');
    assert.notEqual(file, undefined);
    assert.equal(file?.type, 'File');
    if (file?.type === 'File') {
      assert.equal(file.path, 'src/index.ts');
      assert.deepEqual(file.imports, ['ExpressSetup', 'Routes', 'Database']);
      assert.deepEqual(file.exports, ['startServer']);
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

    assert.equal(entities.size, 1);
    const func = entities.get('createUser');
    assert.notEqual(func, undefined);
    assert.equal(func?.type, 'Function');
    if (func?.type === 'Function') {
      assert.equal(func.signature, '(data: UserInput) => Promise<User>');
      assert.equal(func.description, 'Creates a new user in the database');
      assert.deepEqual(func.calls, ['validateInput', 'Database.insert']);
    }
  });

  it('should parse class declarations with methods', () => {
    const input = `
TodoController <: BaseController, IController
  => [create, read, update, delete]
    `;
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    assert.equal(entities.size, 1);
    const cls = entities.get('TodoController');
    assert.notEqual(cls, undefined);
    assert.equal(cls?.type, 'Class');
    if (cls?.type === 'Class') {
      assert.equal(cls.extends, 'BaseController');
      assert.deepEqual(cls.implements, ['IController']);
      assert.deepEqual(cls.methods, ['create', 'read', 'update', 'delete']);
    }
  });

  it('should parse constants declarations', () => {
    const input = 'Config ! src/config.ts : EnvSchema';
    const parseResult = parser.parse(input);
    const entities = parseResult.entities;

    assert.equal(entities.size, 1);
    const constants = entities.get('Config');
    assert.notEqual(constants, undefined);
    assert.equal(constants?.type, 'Constants');
    if (constants?.type === 'Constants') {
      assert.equal(constants.path, 'src/config.ts');
      assert.equal(constants.schema, 'EnvSchema');
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

    assert.equal(entities.size, 2);
    assert.equal(entities.has('TodoApp'), true);
    assert.equal(entities.has('UserService'), true);
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

    assert.equal(entities.size, 6);
    assert.equal(entities.has('TodoApp'), true);
    assert.equal(entities.has('AppEntry'), true);
    assert.equal(entities.has('Routes'), true);
    assert.equal(entities.has('TodoController'), true);
    assert.equal(entities.has('create'), true);
    assert.equal(entities.has('Config'), true);
  });
});
