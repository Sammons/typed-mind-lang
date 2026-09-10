import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { JavaAnalyzer } from './java-analyzer.ts';

const FIXTURES_DIR = resolve(import.meta.dirname, '../tests/fixtures');

describe('JavaAnalyzer', () => {
  let analyzer: JavaAnalyzer;

  before(async () => {
    analyzer = await JavaAnalyzer.create(FIXTURES_DIR);
  });

  it('parses UserService.java class with methods and implements', () => {
    const result = analyzer.analyzeFromEntrypoint('UserService.java');

    const userServiceModule = result.modules.find((m) => m.filePath === 'UserService.java');
    assert.ok(userServiceModule !== undefined, 'UserService module should be found');

    // Imports
    assert.ok(userServiceModule.imports.length >= 2, 'Should have at least 2 imports');
    const listImport = userServiceModule.imports.find((i) => i.specifier === 'java.util.List');
    assert.ok(listImport !== undefined, 'Should import java.util.List');
    assert.deepStrictEqual(listImport.namedImports, ['List']);

    const optionalImport = userServiceModule.imports.find((i) => i.specifier === 'java.util.Optional');
    assert.ok(optionalImport !== undefined, 'Should import java.util.Optional');

    // Class
    assert.strictEqual(userServiceModule.classes.length, 1, 'Should have 1 class');
    const cls = userServiceModule.classes[0];
    assert.ok(cls !== undefined);
    assert.strictEqual(cls.name, 'UserService');
    assert.deepStrictEqual(cls.implements, ['IUserService']);

    // Methods (public + constructor, excluding private by default)
    const methodNames = cls.methods.map((m) => m.name);
    assert.ok(methodNames.includes('UserService'), 'Should have constructor');
    assert.ok(methodNames.includes('findById'), 'Should have findById method');
    assert.ok(methodNames.includes('findAll'), 'Should have findAll method');

    // Properties
    assert.strictEqual(cls.properties.length, 1, 'Should have 1 field');
    const field = cls.properties[0];
    assert.ok(field !== undefined);
    assert.strictEqual(field.name, 'repository');
    assert.strictEqual(field.type, 'UserRepository');
    assert.strictEqual(field.isReadonly, true); // final
    assert.strictEqual(field.isPrivate, true);
  });

  it('parses User.java record', () => {
    const result = analyzer.analyzeFromEntrypoint('User.java');

    const userModule = result.modules.find((m) => m.filePath === 'User.java');
    assert.ok(userModule !== undefined, 'User module should be found');

    assert.strictEqual(userModule.classes.length, 1, 'Should have 1 class (from record)');
    const cls = userModule.classes[0];
    assert.ok(cls !== undefined);
    assert.strictEqual(cls.name, 'User');

    // Record components become readonly properties
    assert.strictEqual(cls.properties.length, 4);
    const nameField = cls.properties.find((p) => p.name === 'name');
    assert.ok(nameField !== undefined);
    assert.strictEqual(nameField.type, 'String');
    assert.strictEqual(nameField.isReadonly, true);

    const emailField = cls.properties.find((p) => p.name === 'email');
    assert.ok(emailField !== undefined);
    assert.strictEqual(emailField.type, 'String');

    const idField = cls.properties.find((p) => p.name === 'id');
    assert.ok(idField !== undefined);
    assert.strictEqual(idField.type, 'long');
  });

  it('parses UserRole.java enum', () => {
    const result = analyzer.analyzeFromEntrypoint('UserRole.java');

    const roleModule = result.modules.find((m) => m.filePath === 'UserRole.java');
    assert.ok(roleModule !== undefined, 'UserRole module should be found');

    assert.strictEqual(roleModule.enums.length, 1, 'Should have 1 enum');
    const enumDecl = roleModule.enums[0];
    assert.ok(enumDecl !== undefined);
    assert.strictEqual(enumDecl.name, 'UserRole');
    assert.deepStrictEqual(enumDecl.members, ['ADMIN', 'USER', 'GUEST']);
  });

  it('reports exports for public declarations', () => {
    const result = analyzer.analyzeFromEntrypoint('UserService.java');

    const mod = result.modules.find((m) => m.filePath === 'UserService.java');
    assert.ok(mod !== undefined);
    assert.ok(mod.exports.length >= 1);
    assert.ok(mod.exports.some((e) => e.name === 'UserService'));
    assert.ok(mod.exports.some((e) => e.type === 'class'));
  });

  it('reports no analyzer diagnostics for valid fixtures', () => {
    const result = analyzer.analyzeFromEntrypoint('UserService.java');
    assert.strictEqual(result.diagnostics.length, 0, 'No diagnostics for valid files');
  });
});
