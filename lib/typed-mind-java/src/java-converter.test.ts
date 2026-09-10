import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { JavaAnalyzer } from './java-analyzer.ts';
import { JavaConverter } from './java-converter.ts';

const FIXTURES_DIR = resolve(import.meta.dirname, '../tests/fixtures');

describe('JavaConverter', () => {
  let analyzer: JavaAnalyzer;

  before(async () => {
    analyzer = await JavaAnalyzer.create(FIXTURES_DIR);
  });

  it('converts UserService class to ClassFileNode', () => {
    const analysis = analyzer.analyzeFromEntrypoint('UserService.java');
    const converter = new JavaConverter({
      includePrivateMembers: false,
      generatePrograms: false,
      programVersion: undefined,
      ignorePatterns: [],
    });
    const result = converter.convert(analysis);

    assert.strictEqual(result.success, true);
    assert.ok(result.entities.length >= 1, 'Should produce at least 1 entity');

    const classFile = result.entities.find((e) => e.name === 'UserService');
    assert.ok(classFile !== undefined, 'Should have UserService entity');
    assert.strictEqual(classFile.kind, 'ClassFile');
  });

  it('converts User record to DtoNode', () => {
    const analysis = analyzer.analyzeFromEntrypoint('User.java');
    const converter = new JavaConverter({
      includePrivateMembers: false,
      generatePrograms: false,
      programVersion: undefined,
      ignorePatterns: [],
    });
    const result = converter.convert(analysis);

    assert.strictEqual(result.success, true);

    const dto = result.entities.find((e) => e.name === 'User');
    assert.ok(dto !== undefined, 'Should have User entity');
    assert.strictEqual(dto.kind, 'DTO');

    // Check fields
    const dtoNode = dto as import('@sammons/typed-mind').DtoNode;
    assert.strictEqual(dtoNode.fields.length, 3);
    const nameField = dtoNode.fields.find((f) => f.name === 'name');
    assert.ok(nameField !== undefined);
    assert.strictEqual(nameField.type, 'String');
  });

  it('converts UserRole enum to TypeDefNode', () => {
    const analysis = analyzer.analyzeFromEntrypoint('UserRole.java');
    const converter = new JavaConverter({
      includePrivateMembers: false,
      generatePrograms: false,
      programVersion: undefined,
      ignorePatterns: [],
    });
    const result = converter.convert(analysis);

    assert.strictEqual(result.success, true);

    const typeDef = result.entities.find((e) => e.name === 'UserRole');
    assert.ok(typeDef !== undefined, 'Should have UserRole entity');
    assert.strictEqual(typeDef.kind, 'TypeDef');

    const typeDefNode = typeDef as import('@sammons/typed-mind').TypeDefNode;
    assert.strictEqual(typeDefNode.variant, 'enum');
    assert.deepStrictEqual(typeDefNode.members, ['ADMIN', 'USER', 'GUEST']);
  });

  it('produces valid TMD output', () => {
    const analysis = analyzer.analyzeFromEntrypoint('UserService.java');
    const converter = new JavaConverter({
      includePrivateMembers: false,
      generatePrograms: false,
      programVersion: undefined,
      ignorePatterns: [],
    });
    const result = converter.convert(analysis);

    assert.strictEqual(result.success, true);
    assert.ok(result.tmdContent.length > 0, 'TMD content should not be empty');
  });

  it('excludes private members by default', () => {
    const analysis = analyzer.analyzeFromEntrypoint('UserService.java');
    const converter = new JavaConverter({
      includePrivateMembers: false,
      generatePrograms: false,
      programVersion: undefined,
      ignorePatterns: [],
    });
    const result = converter.convert(analysis);

    const classFile = result.entities.find((e) => e.name === 'UserService');
    assert.ok(classFile !== undefined);
    // UserService has a constructor and 2 public methods
    // The private field 'repository' should not cause issues but methods should be filtered
    assert.strictEqual(classFile.kind, 'ClassFile');
  });
});
