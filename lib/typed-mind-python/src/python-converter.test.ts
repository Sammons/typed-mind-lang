import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { PythonAnalyzer } from './python-analyzer.ts';
import { PythonConverter } from './python-converter.ts';

const FIXTURES_DIR = resolve(import.meta.dirname ?? '.', '..', 'tests', 'fixtures');

describe('PythonConverter', () => {
  let analyzer: PythonAnalyzer;
  let converter: PythonConverter;

  before(() => {
    analyzer = new PythonAnalyzer(FIXTURES_DIR);
    converter = new PythonConverter({
      includePrivateMembers: false,
      generatePrograms: true,
      programVersion: '1.0.0',
      ignorePatterns: [],
    });
  });

  describe('convert models.py', () => {
    it('converts a dataclass to a DtoNode', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('models.py');
      const result = converter.convert(analysis);

      assert.ok(result.success, 'conversion should succeed');
      assert.ok(result.entities.length > 0, 'should produce entities');

      const dto = result.entities.find((e) => e.kind === 'DTO' && e.name === 'User');
      assert.ok(dto, 'should produce a DTO for User');
      assert.equal(dto.kind, 'DTO');

      // Check DTO fields
      const dtoNode = dto as import('@sammons/typed-mind').DtoNode;
      assert.ok(dtoNode.fields.length >= 3, 'User DTO should have at least 3 fields');

      const nameField = dtoNode.fields.find((f) => f.name === 'name');
      assert.ok(nameField, 'should have name field');
      assert.equal(nameField.type, 'string');

      const emailField = dtoNode.fields.find((f) => f.name === 'email');
      assert.ok(emailField, 'should have email field');
      assert.equal(emailField.type, 'string');

      const idField = dtoNode.fields.find((f) => f.name === 'id');
      assert.ok(idField, 'should have id field');
      assert.equal(idField.type, 'number');
    });

    it('converts an Enum to a TypeDefNode', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('models.py');
      const result = converter.convert(analysis);

      const typeDef = result.entities.find((e) => e.kind === 'TypeDef' && e.name === 'UserRole');
      assert.ok(typeDef, 'should produce a TypeDef for UserRole');

      const typeDefNode = typeDef as import('@sammons/typed-mind').TypeDefNode;
      assert.equal(typeDefNode.variant, 'enum');
      assert.deepEqual(typeDefNode.members, ['ADMIN', 'USER', 'GUEST']);
    });

    it('converts UPPERCASE constants to ConstantsNode', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('models.py');
      const result = converter.convert(analysis);

      const constants = result.entities.find((e) => e.kind === 'Constants');
      assert.ok(constants, 'should produce a Constants entity');
    });

    it('generates a Program entity when enabled', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('models.py');
      const result = converter.convert(analysis);

      const program = result.entities.find((e) => e.kind === 'Program');
      assert.ok(program, 'should produce a Program entity');
      const programNode = program as import('@sammons/typed-mind').ProgramNode;
      assert.equal(programNode.version, '1.0.0');
    });
  });

  describe('convert services.py', () => {
    it('converts a Protocol to an abstract ClassNode', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('services.py');
      const result = converter.convert(analysis);

      const repository = result.entities.find((e) => e.kind === 'Class' && e.name === 'Repository');
      assert.ok(repository, 'should produce a Class for Repository');

      const classNode = repository as import('@sammons/typed-mind').ClassNode;
      assert.ok(classNode.methods.includes('find_by_id'), 'should have find_by_id method');
      assert.ok(classNode.methods.includes('find_all'), 'should have find_all method');
    });

    it('converts a regular class to a ClassNode', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('services.py');
      const result = converter.convert(analysis);

      const userService = result.entities.find((e) => e.kind === 'Class' && e.name === 'UserService');
      assert.ok(userService, 'should produce a Class for UserService');

      const classNode = userService as import('@sammons/typed-mind').ClassNode;
      // __init__ is excluded from public methods, _role is private
      assert.ok(classNode.methods.includes('find_by_id'), 'should include find_by_id');
      assert.ok(classNode.methods.includes('find_all'), 'should include find_all');
      assert.ok(classNode.methods.includes('create_default'), 'should include create_default');
    });
  });

  describe('convert __init__.py', () => {
    it('creates a FileNode for __init__.py', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('__init__.py');
      const result = converter.convert(analysis);

      const fileNode = result.entities.find((e) => e.kind === 'File');
      assert.ok(fileNode, 'should produce a File entity for __init__.py');

      const file = fileNode as import('@sammons/typed-mind').FileNode;
      assert.equal(file.path, '__init__.py');
      assert.ok(file.exports.length >= 2, 'should export at least 2 names');
    });
  });

  describe('TMD output', () => {
    it('produces valid TMD content', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('models.py');
      const result = converter.convert(analysis);

      assert.ok(result.tmdContent.length > 0, 'should produce non-empty TMD');
      assert.ok(result.tmdContent.includes('User'), 'TMD should mention User');
      assert.ok(result.tmdContent.includes('UserRole'), 'TMD should mention UserRole');
    });
  });

  describe('no programs mode', () => {
    it('omits Program when generatePrograms is false', async () => {
      const noProgramConverter = new PythonConverter({
        includePrivateMembers: false,
        generatePrograms: false,
        programVersion: undefined,
        ignorePatterns: [],
      });
      const analysis = await analyzer.analyzeFromEntrypointAsync('models.py');
      const result = noProgramConverter.convert(analysis);

      const program = result.entities.find((e) => e.kind === 'Program');
      assert.equal(program, undefined, 'should not produce a Program entity');
    });
  });
});
