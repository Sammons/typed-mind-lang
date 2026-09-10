import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TreeSitterParser } from '@sammons/typed-mind-tree-sitter-common';
import { CSharpAnalyzer, GRAMMAR_PATH } from './csharp-analyzer.ts';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(THIS_DIR, '..', 'tests', 'fixtures');

describe('CSharpAnalyzer', () => {
  let parser: TreeSitterParser;

  before(async () => {
    parser = await TreeSitterParser.create(GRAMMAR_PATH);
  });

  it('parses basic-class.cs and extracts classes, interfaces, records, and enums', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('basic-class.cs');

    // Should find the fixture files
    assert.ok(analysis.modules.length > 0, 'should find at least one module');

    // Find the module for basic-class.cs
    const basicModule = analysis.modules.find((m) => m.filePath.includes('basic-class'));
    assert.ok(basicModule !== undefined, 'should find basic-class.cs module');

    // Check classes
    const userService = basicModule.classes.find((c) => c.name === 'UserService');
    assert.ok(userService !== undefined, 'should find UserService class');
    assert.ok(userService.methods.length >= 2, 'UserService should have methods');
    assert.ok(userService.implements.includes('IUserService'), 'UserService should implement IUserService');

    // Check interfaces
    const iUserService = basicModule.interfaces.find((i) => i.name === 'IUserService');
    assert.ok(iUserService !== undefined, 'should find IUserService interface');
    assert.ok(iUserService.methods.length >= 2, 'IUserService should have methods');

    // Check records (treated as classes)
    const user = basicModule.classes.find((c) => c.name === 'User');
    assert.ok(user !== undefined, 'should find User record');
    assert.ok(user.properties.length >= 2, 'User record should have properties');

    // Check enums
    const userRole = basicModule.enums.find((e) => e.name === 'UserRole');
    assert.ok(userRole !== undefined, 'should find UserRole enum');
    assert.deepEqual(userRole.members, ['Admin', 'User', 'Guest']);
  });

  it('parses struct-and-enum.cs and extracts structs and abstract classes', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('struct-and-enum.cs');

    const structModule = analysis.modules.find((m) => m.filePath.includes('struct-and-enum'));
    assert.ok(structModule !== undefined, 'should find struct-and-enum.cs module');

    // Check structs
    const point = structModule.classes.find((c) => c.name === 'Point');
    assert.ok(point !== undefined, 'should find Point struct');
    assert.equal(point.description, 'struct');
    assert.ok(point.properties.length >= 2, 'Point should have X and Y fields');

    const vector3 = structModule.classes.find((c) => c.name === 'Vector3');
    assert.ok(vector3 !== undefined, 'should find Vector3 struct');
    assert.ok(vector3.methods.length >= 1, 'Vector3 should have Magnitude method');

    // Check enums
    const color = structModule.enums.find((e) => e.name === 'Color');
    assert.ok(color !== undefined, 'should find Color enum');
    assert.deepEqual(color.members, ['Red', 'Green', 'Blue', 'Alpha']);

    // Check abstract class
    const shape = structModule.classes.find((c) => c.name === 'Shape');
    assert.ok(shape !== undefined, 'should find Shape abstract class');
    assert.equal(shape.isAbstract, true);

    // Check sealed class extending Shape
    const circle = structModule.classes.find((c) => c.name === 'Circle');
    assert.ok(circle !== undefined, 'should find Circle class');
    assert.ok(circle.extends.includes('Shape'), 'Circle should extend Shape');
  });

  it('parses generics-and-attributes.cs and extracts generic types', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('generics-and-attributes.cs');

    const genModule = analysis.modules.find((m) => m.filePath.includes('generics-and-attributes'));
    assert.ok(genModule !== undefined, 'should find generics-and-attributes.cs module');

    // Check generic class with attributes
    const repo = genModule.classes.find((c) => c.name.startsWith('Repository'));
    assert.ok(repo !== undefined, 'should find Repository<T> class');
    assert.ok(repo.name.includes('<'), 'Repository should have type parameters');
    assert.ok(repo.decorators.includes('Serializable'), 'Repository should have Serializable attribute');

    // Check generic interface
    const iRepo = genModule.interfaces.find((i) => i.name.startsWith('IRepository'));
    assert.ok(iRepo !== undefined, 'should find IRepository<T> interface');
  });

  it('parses file-scoped-namespace.cs', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('file-scoped-namespace.cs');

    const nsModule = analysis.modules.find((m) => m.filePath.includes('file-scoped-namespace'));
    assert.ok(nsModule !== undefined, 'should find file-scoped-namespace.cs module');

    const handler = nsModule.classes.find((c) => c.name === 'OrderHandler');
    assert.ok(handler !== undefined, 'should find OrderHandler class');
    assert.ok(handler.methods.length >= 2, 'OrderHandler should have methods');

    // Check that static method is flagged
    const createMethod = handler.methods.find((m) => m.name === 'Create');
    assert.ok(createMethod !== undefined, 'should find Create method');
    assert.equal(createMethod.isStatic, true);
  });

  it('extracts using directives as imports', () => {
    const analyzer = new CSharpAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('basic-class.cs');

    const basicModule = analysis.modules.find((m) => m.filePath.includes('basic-class'));
    assert.ok(basicModule !== undefined);
    assert.ok(basicModule.imports.length >= 2, 'should have at least two using directives');

    const systemImport = basicModule.imports.find((i) => i.specifier === 'System');
    assert.ok(systemImport !== undefined, 'should have System using');
  });
});
