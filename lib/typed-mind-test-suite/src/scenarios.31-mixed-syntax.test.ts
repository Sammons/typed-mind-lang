import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-31-mixed-syntax', () => {
  it('should parse mixed longform and shortform syntax correctly', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-31-mixed-syntax.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');
    
    const checker = new DSLChecker();
    const parsed = checker.parse(content, scenarioPath);
    
    // Should have both programs
    assert.equal(parsed.entities.has('TodoApp'), true);
    assert.equal(parsed.entities.has('APIServer'), true);
    
    // Check shortform program (TodoApp -> AppEntry v1.0.0)
    const todoApp = parsed.entities.get('TodoApp');
    assert.equal(todoApp?.type, 'Program');
    if (todoApp?.type === 'Program') {
      assert.equal(todoApp.entry, 'AppEntry');
      assert.equal(todoApp.version, '1.0.0');
    }
    
    // Check longform program
    const apiServer = parsed.entities.get('APIServer');
    assert.equal(apiServer?.type, 'Program');
    if (apiServer?.type === 'Program') {
      assert.equal(apiServer.entry, 'ApiMain');
      assert.equal(apiServer.version, '2.0.0');
    }
    
    // Check shortform file (AppEntry @ src/app.ts)
    const appEntry = parsed.entities.get('AppEntry');
    assert.equal(appEntry?.type, 'File');
    if (appEntry?.type === 'File') {
      assert.equal(appEntry.path, 'src/app.ts');
      assert.deepEqual(appEntry.imports, ['Express']);
      assert.deepEqual(appEntry.exports, ['startApp']);
    }
    
    // Check longform file
    const apiMain = parsed.entities.get('ApiMain');
    assert.equal(apiMain?.type, 'File');
    if (apiMain?.type === 'File') {
      assert.equal(apiMain.path, 'src/api.ts');
      assert.deepEqual(apiMain.imports, ['Fastify', 'Database']);
      assert.deepEqual(apiMain.exports, ['startApi']);
    }
    
    // Check shortform function (createTodo :: (data: TodoDTO) => Todo)
    const createTodo = parsed.entities.get('createTodo');
    assert.equal(createTodo?.type, 'Function');
    if (createTodo?.type === 'Function') {
      assert.equal(createTodo.signature, '(data: TodoDTO) => Todo');
      assert.deepEqual(createTodo.calls, ['validate', 'save']);
    }
    
    // Check longform function
    const deleteTodo = parsed.entities.get('deleteTodo');
    assert.equal(deleteTodo?.type, 'Function');
    if (deleteTodo?.type === 'Function') {
      assert.equal(deleteTodo.signature, '(id: string) => void');
      assert.deepEqual(deleteTodo.calls, ['Database.delete']);
    }
    
    // Check shortform DTO (TodoDTO % "Todo input data")
    const todoDTO = parsed.entities.get('TodoDTO');
    assert.equal(todoDTO?.type, 'DTO');
    if (todoDTO?.type === 'DTO') {
      assert.equal(todoDTO.purpose, 'Todo input data');
      assert.equal((todoDTO.fields).length, 2);
      assert.deepEqual(todoDTO.fields[0], {
        name: 'title',
        type: 'string',
        description: undefined,
        optional: false
      });
      assert.deepEqual(todoDTO.fields[1], {
        name: 'done',
        type: 'boolean',
        description: undefined,
        optional: false
      });
    }
    
    // Check longform DTO
    const userDTO = parsed.entities.get('UserDTO');
    assert.equal(userDTO?.type, 'DTO');
    if (userDTO?.type === 'DTO') {
      assert.equal(userDTO.purpose, 'User data');
      assert.equal((userDTO.fields).length, 2);
      assert.deepEqual(userDTO.fields[0], {
        name: 'name',
        type: 'any',
        optional: false
      });
      assert.deepEqual(userDTO.fields[1], {
        name: 'email',
        type: 'any',
        optional: false
      });
    }
    
    // Check shortform UIComponent (Button & "Reusable button")
    const button = parsed.entities.get('Button');
    assert.equal(button?.type, 'UIComponent');
    if (button?.type === 'UIComponent') {
      assert.equal(button.purpose, 'Reusable button');
    }
    
    // Check longform UIComponent
    const userProfile = parsed.entities.get('UserProfile');
    assert.equal(userProfile?.type, 'UIComponent');
    if (userProfile?.type === 'UIComponent') {
      assert.equal(userProfile.purpose, 'User profile display');
      assert.deepEqual(userProfile.contains, ['Button']);
      assert.deepEqual(userProfile.affectedBy, ['updateProfile']);
    }
    
    // Check shortform RunParameter (DATABASE_URL $env "Database connection")
    const dbUrl = parsed.entities.get('DATABASE_URL');
    assert.equal(dbUrl?.type, 'RunParameter');
    if (dbUrl?.type === 'RunParameter') {
      assert.equal(dbUrl.paramType, 'env');
      assert.equal(dbUrl.description, 'Database connection');
    }
    
    // Check longform RunParameter
    const apiKey = parsed.entities.get('API_KEY');
    assert.equal(apiKey?.type, 'RunParameter');
    if (apiKey?.type === 'RunParameter') {
      assert.equal(apiKey.paramType, 'env');
      assert.equal(apiKey.description, 'API key');
      assert.equal(apiKey.defaultValue, 'dev-key');
    }
    
    // Check function that consumes parameters
    const updateProfile = parsed.entities.get('updateProfile');
    assert.equal(updateProfile?.type, 'Function');
    if (updateProfile?.type === 'Function') {
      assert.equal(updateProfile.signature, '(data: UserDTO) => void');
      assert.deepEqual(updateProfile.consumes, ['DATABASE_URL', 'API_KEY']);
      assert.deepEqual(updateProfile.affects, ['UserProfile']);
    }
    
    // Check that all expected entities were parsed
    assert.equal(parsed.entities.size, 20); // Specific count based on the scenario
    
    // Verify supporting entities
    assert.equal(parsed.entities.get('Express')?.type, 'Constants');
    assert.equal(parsed.entities.get('Fastify')?.type, 'Constants');
    assert.equal(parsed.entities.get('Database')?.type, 'Class');
    assert.equal(parsed.entities.get('validate')?.type, 'Function');
    assert.equal(parsed.entities.get('save')?.type, 'Function');
    assert.equal(parsed.entities.get('startApp')?.type, 'Function');
    assert.equal(parsed.entities.get('startApi')?.type, 'Function');
  });

  it('should fail validation due to orphaned entities', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-31-mixed-syntax.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');
    
    const checker = new DSLChecker();
    const result = checker.check(content, scenarioPath);
    
    // Should fail validation due to orphaned entities
    assert.equal(result.valid, false);
    assert.equal((result.errors).length, 15);

    // Check for orphaned entity errors
    const orphanedErrors = result.errors.filter(err => err.message.startsWith('Orphaned entity'));
    assert.equal((orphanedErrors).length, 8);

    const orphanedEntities = ['createTodo', 'deleteTodo', 'TodoDTO', 'UserDTO', 'UserProfile', 'updateProfile', 'startApp', 'startApi'];
    orphanedEntities.forEach(entityName => {
      const error = orphanedErrors.find(err => err.message === `Orphaned entity '${entityName}'`);
      assert.notEqual(error, undefined);
      assert.equal(error?.severity, 'error');
      assert.equal(error?.suggestion, 'Remove or reference this entity');
    });
    
    // Check for function not exported errors
    const functionNotExportedErrors = result.errors.filter(err => 
      err.message.includes('is not exported by any file and is not a class method')
    );
    assert.equal((functionNotExportedErrors).length, 5);
    
    const unexportedFunctions = ['createTodo', 'deleteTodo', 'updateProfile', 'validate', 'save'];
    unexportedFunctions.forEach(funcName => {
      const error = functionNotExportedErrors.find(err => err.message.includes(`Function '${funcName}'`));
      assert.notEqual(error, undefined);
      assert.equal(error?.severity, 'error');
      assert.equal(error?.suggestion, `Either add '${funcName}' to the exports of a file entity or define it as a method of a class`);
    });
    
    // Check for class not exported error
    const classNotExportedError = result.errors.find(err => 
      err.message === "Class 'Database' is not exported by any file"
    );
    assert.notEqual(classNotExportedError, undefined);
    assert.equal(classNotExportedError?.severity, 'error');
    assert.equal(classNotExportedError?.suggestion, "Add 'Database' to the exports of a file entity or convert to ClassFile with #: operator");
    assert.equal(classNotExportedError?.position.line, 74);
    
    // Check for UIComponent not contained error
    const uiComponentError = result.errors.find(err => 
      err.message === "UIComponent 'UserProfile' is not contained by any other UIComponent"
    );
    assert.notEqual(uiComponentError, undefined);
    assert.equal(uiComponentError?.severity, 'error');
    assert.equal(uiComponentError?.suggestion, "Either add 'UserProfile' to another UIComponent's contains list, or mark it as a root component with &!");
    assert.equal(uiComponentError?.position.line, 49);
  });
});