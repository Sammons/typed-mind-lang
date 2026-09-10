import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { PythonAnalyzer } from './python-analyzer.ts';

const FIXTURES_DIR = resolve(import.meta.dirname ?? '.', '..', 'tests', 'fixtures');

describe('PythonAnalyzer', () => {
  let analyzer: PythonAnalyzer;

  before(() => {
    analyzer = new PythonAnalyzer(FIXTURES_DIR);
  });

  describe('analyzeFromEntrypointAsync', () => {
    it('parses models.py and extracts classes, enums, and constants', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('models.py');
      assert.ok(analysis.modules.length > 0, 'should find at least one module');

      const modelsModule = analysis.modules.find((m) => m.filePath === 'models.py');
      assert.ok(modelsModule, 'should find models.py module');

      // Imports
      assert.ok(modelsModule.imports.length >= 3, 'should have at least 3 imports');
      const dataclassImport = modelsModule.imports.find((i) => i.specifier === 'dataclasses');
      assert.ok(dataclassImport, 'should import from dataclasses');
      assert.deepEqual(dataclassImport.namedImports, ['dataclass']);

      const enumImport = modelsModule.imports.find((i) => i.specifier === 'enum');
      assert.ok(enumImport, 'should import from enum');
      assert.deepEqual(enumImport.namedImports, ['Enum']);

      // Classes (User is a decorated class)
      assert.ok(modelsModule.classes.length >= 1, 'should have at least one class');
      const userClass = modelsModule.classes.find((c) => c.name === 'User');
      assert.ok(userClass, 'should find User class');
      assert.ok(userClass.decorators.includes('dataclass'), 'User should have @dataclass decorator');
      assert.ok(userClass.properties.length >= 3, 'User should have at least 3 properties');

      const nameProp = userClass.properties.find((p) => p.name === 'name');
      assert.ok(nameProp, 'should have name property');
      assert.equal(nameProp.type, 'str');

      // Enums
      assert.equal(modelsModule.enums.length, 1, 'should have one enum');
      const userRole = modelsModule.enums[0];
      assert.ok(userRole, 'should have at least one enum');
      assert.equal(userRole.name, 'UserRole');
      assert.deepEqual(userRole.members, ['ADMIN', 'USER', 'GUEST']);

      // Constants
      assert.ok(modelsModule.constants.length >= 2, 'should have at least 2 constants');
      const maxUsers = modelsModule.constants.find((c) => c.name === 'MAX_USERS');
      assert.ok(maxUsers, 'should find MAX_USERS constant');
      assert.equal(maxUsers.type, 'int');
      assert.equal(maxUsers.value, '1000');

      const apiVersion = modelsModule.constants.find((c) => c.name === 'API_VERSION');
      assert.ok(apiVersion, 'should find API_VERSION constant');
      assert.equal(apiVersion.type, 'str');
    });

    it('parses services.py and extracts classes and protocols', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('services.py');
      const servicesModule = analysis.modules.find((m) => m.filePath === 'services.py');
      assert.ok(servicesModule, 'should find services.py module');

      // Protocol (interface)
      assert.equal(servicesModule.interfaces.length, 1, 'should have one interface (Protocol)');
      const repository = servicesModule.interfaces[0];
      assert.ok(repository, 'should have at least one interface');
      assert.equal(repository.name, 'Repository');
      assert.ok(repository.methods.length >= 2, 'Repository should have at least 2 methods');

      const findById = repository.methods.find((m) => m.name === 'find_by_id');
      assert.ok(findById, 'should have find_by_id method');
      // self should be stripped
      assert.ok(
        findById.parameters.every((p) => p.name !== 'self'),
        'self should be stripped from parameters',
      );

      // Regular class
      assert.ok(servicesModule.classes.length >= 1, 'should have at least one class');
      const userService = servicesModule.classes.find((c) => c.name === 'UserService');
      assert.ok(userService, 'should find UserService class');

      // Methods
      const methods = userService.methods;
      assert.ok(methods.length >= 3, 'UserService should have at least 3 methods');

      const init = methods.find((m) => m.name === '__init__');
      assert.ok(init, 'should have __init__ method');

      const asyncMethod = methods.find((m) => m.name === 'find_by_id');
      assert.ok(asyncMethod, 'should have find_by_id method');
      assert.ok(asyncMethod.isAsync, 'find_by_id should be async');

      const staticMethod = methods.find((m) => m.name === 'create_default');
      assert.ok(staticMethod, 'should have create_default method');
      assert.ok(staticMethod.isStatic, 'create_default should be static');

      // Imports
      const relativeImport = servicesModule.imports.find((i) => i.specifier === '.models');
      assert.ok(relativeImport, 'should have relative import from .models');
      assert.ok(relativeImport.namedImports.includes('User'));
      assert.ok(relativeImport.namedImports.includes('UserRole'));
    });

    it('parses __init__.py and extracts __all__ exports', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('__init__.py');
      const initModule = analysis.modules.find((m) => m.filePath === '__init__.py');
      assert.ok(initModule, 'should find __init__.py module');

      // __all__ exports
      assert.ok(initModule.exports.length >= 3, 'should have at least 3 exports from __all__');
      const exportNames = initModule.exports.map((e) => e.name);
      assert.ok(exportNames.includes('User'), 'should export User');
      assert.ok(exportNames.includes('UserRole'), 'should export UserRole');
      assert.ok(exportNames.includes('UserService'), 'should export UserService');
    });

    it('reports entrypoint in the result', async () => {
      const analysis = await analyzer.analyzeFromEntrypointAsync('models.py');
      assert.ok(analysis.entryPoints.includes('models.py'));
      assert.equal(analysis.projectRoot, FIXTURES_DIR);
    });
  });
});
