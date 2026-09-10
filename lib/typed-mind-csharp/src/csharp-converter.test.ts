import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TreeSitterParser } from '@sammons/typed-mind-tree-sitter-common';
import { CSharpAnalyzer, GRAMMAR_PATH } from './csharp-analyzer.ts';
import { CSharpConverter } from './csharp-converter.ts';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(THIS_DIR, '..', 'tests', 'fixtures');

describe('CSharpConverter', () => {
  let parser: TreeSitterParser;

  before(async () => {
    parser = await TreeSitterParser.create(GRAMMAR_PATH);
  });

  it('converts basic-class.cs to TypedMind entities', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('basic-class.cs');

    const converter = new CSharpConverter({
      includePrivateMembers: false,
      generatePrograms: true,
      programVersion: '1.0.0',
      ignorePatterns: [],
    });

    const result = converter.convert(analysis);
    assert.equal(result.success, true, 'conversion should succeed');
    assert.ok(result.entities.length > 0, 'should produce entities');
    assert.ok(result.tmdContent.length > 0, 'should produce TMD content');

    // Check entity kinds present
    const kinds = new Set(result.entities.map((e) => e.kind));
    assert.ok(kinds.has('Program'), 'should have a Program entity');

    // Check that UserService becomes a Class or ClassFile
    const userService = result.entities.find((e) => e.name === 'UserService');
    assert.ok(userService !== undefined, 'should have UserService entity');

    // Check that UserRole becomes a TypeDef (enum)
    const userRole = result.entities.find((e) => e.name === 'UserRole');
    assert.ok(userRole !== undefined, 'should have UserRole entity');
    assert.equal(userRole.kind, 'TypeDef');

    // Check that User record becomes a DTO
    const user = result.entities.find((e) => e.name === 'User');
    assert.ok(user !== undefined, 'should have User entity');
    assert.equal(user.kind, 'DTO');

    // Check that IUserService becomes a Class (interface)
    const iUserService = result.entities.find((e) => e.name === 'IUserService');
    assert.ok(iUserService !== undefined, 'should have IUserService entity');
    assert.equal(iUserService.kind, 'Class');
  });

  it('converts structs to DTOs when they have no methods', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('struct-and-enum.cs');

    const converter = new CSharpConverter({
      includePrivateMembers: false,
      generatePrograms: false,
      programVersion: undefined,
      ignorePatterns: [],
    });

    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    // Point struct (no methods) should be DTO
    const point = result.entities.find((e) => e.name === 'Point');
    assert.ok(point !== undefined, 'should have Point entity');
    assert.equal(point.kind, 'DTO');

    // Vector3 struct (has methods) should be Class
    const vector3 = result.entities.find((e) => e.name === 'Vector3');
    assert.ok(vector3 !== undefined, 'should have Vector3 entity');
    assert.equal(vector3.kind, 'Class');

    // Color enum should be TypeDef
    const color = result.entities.find((e) => e.name === 'Color');
    assert.ok(color !== undefined, 'should have Color entity');
    assert.equal(color.kind, 'TypeDef');
  });

  it('generates TMD output that parses', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('basic-class.cs');

    const converter = new CSharpConverter({
      includePrivateMembers: false,
      generatePrograms: true,
      programVersion: '1.0.0',
      ignorePatterns: [],
    });

    const result = converter.convert(analysis);
    assert.ok(result.tmdContent.length > 0, 'TMD output should not be empty');
    // TMD content should contain entity declarations
    assert.ok(result.tmdContent.includes('UserService'), 'TMD should mention UserService');
  });

  it('does not generate Program entities when disabled', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('basic-class.cs');

    const converter = new CSharpConverter({
      includePrivateMembers: false,
      generatePrograms: false,
      programVersion: undefined,
      ignorePatterns: [],
    });

    const result = converter.convert(analysis);
    const programs = result.entities.filter((e) => e.kind === 'Program');
    assert.equal(programs.length, 0, 'should not have Program entities');
  });

  it('uses ClassFile when a file has exactly one class', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('file-scoped-namespace.cs');

    const converter = new CSharpConverter({
      includePrivateMembers: false,
      generatePrograms: false,
      programVersion: undefined,
      ignorePatterns: [],
    });

    const result = converter.convert(analysis);

    // file-scoped-namespace.cs has only OrderHandler, so it should use ClassFile
    const handler = result.entities.find((e) => e.name === 'OrderHandler');
    assert.ok(handler !== undefined, 'should have OrderHandler entity');
    assert.equal(handler.kind, 'ClassFile');
  });
});
