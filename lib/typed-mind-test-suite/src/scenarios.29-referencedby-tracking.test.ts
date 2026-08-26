import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLParser } from '@sammons/typed-mind';
import { DSLValidator } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-29-referencedby-tracking', () => {
  const scenarioFile = 'scenario-29-referencedby-tracking.tmd';

  it('should track ReferencedBy relationships', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    
    const parser = new DSLParser();
    const validator = new DSLValidator();
    
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities);
    
    if (!validationResult.valid) {
      console.log('Validation errors:', validationResult.errors);
    }

    // Validation fails due to orphaned entities, but we can still test referencedBy tracking
    assert.equal(validationResult.valid, false);
    assert.equal((validationResult.errors).length, 7);
    
    // Test File references
    const userService = parseResult.entities.get('UserService');
    assert.notEqual(userService, undefined);
    assert.equal(userService?.referencedBy?.some(ref => ref.from === 'MainFile' && ref.type === 'imports'), true);
    
    // Test Function references
    const createUser = parseResult.entities.get('createUser');
    assert.notEqual(createUser, undefined);
    assert.equal(createUser?.referencedBy?.some(ref => ref.from === 'UserService' && ref.type === 'exports'), true);
    
    // Test DTO references
    const userDTO = parseResult.entities.get('UserDTO');
    assert.notEqual(userDTO, undefined);
    assert.equal(userDTO?.referencedBy?.some(ref => ref.from === 'MainFile' && ref.type === 'imports'), true);
    assert.equal(userDTO?.referencedBy?.some(ref => ref.from === 'createUser' && ref.type === 'input'), true);
    
    const user = parseResult.entities.get('User');
    assert.notEqual(user, undefined);
    assert.equal(user?.referencedBy?.some(ref => ref.from === 'createUser' && ref.type === 'output'), true);
    assert.equal(user?.referencedBy?.some(ref => ref.from === 'getUser' && ref.type === 'output'), true);
    
    // Test Class references
    const database = parseResult.entities.get('Database');
    assert.notEqual(database, undefined);
    assert.equal(database?.referencedBy?.some(ref => ref.from === 'UserService' && ref.type === 'imports'), true);
    assert.equal(database?.referencedBy?.some(ref => ref.from === 'createUser' && ref.type === 'calls'), true);
    assert.equal(database?.referencedBy?.some(ref => ref.from === 'getUser' && ref.type === 'calls'), true);
    
    // Test Constants references
    const databaseConfig = parseResult.entities.get('DatabaseConfig');
    assert.notEqual(databaseConfig, undefined);
    assert.equal(databaseConfig?.referencedBy?.some(ref => ref.from === 'MainFile' && ref.type === 'imports'), true);
    
    // Test Program entry references
    const mainFile = parseResult.entities.get('MainFile');
    assert.notEqual(mainFile, undefined);
    assert.equal(mainFile?.referencedBy?.some(ref => ref.from === 'TestApp' && ref.type === 'entry'), true);
    
    // Test UIComponent references
    const userList = parseResult.entities.get('UserList');
    assert.notEqual(userList, undefined);
    assert.equal(userList?.referencedBy?.some(ref => ref.from === 'AppUI' && ref.type === 'contains'), true);
    
    const appUI = parseResult.entities.get('AppUI');
    assert.notEqual(appUI, undefined);
    assert.equal(appUI?.referencedBy?.some(ref => ref.from === 'UserList' && ref.type === 'containedBy'), true);
    assert.equal(appUI?.referencedBy?.some(ref => ref.from === 'UserForm' && ref.type === 'containedBy'), true);
    
    // Test RunParameter references
    const databaseUrl = parseResult.entities.get('DATABASE_URL');
    assert.notEqual(databaseUrl, undefined);
    assert.equal(databaseUrl?.referencedBy?.some(ref => ref.from === 'handler' && ref.type === 'consumes'), true);
    
    // Test Asset program references
    const clientProgram = parseResult.entities.get('ClientProgram');
    assert.notEqual(clientProgram, undefined);
    assert.equal(clientProgram?.referencedBy?.some(ref => ref.from === 'HTMLAsset' && ref.type === 'containsProgram'), true);
    
    // Additional verification of referencedBy tracking
    // Note: There are validation errors due to orphaned entities, but referencedBy tracking still works
    
    // Verify all expected entities exist
    assert.equal(parseResult.entities.has('UserService'), true);
    assert.equal(parseResult.entities.has('createUser'), true);
    assert.equal(parseResult.entities.has('UserDTO'), true);
    assert.equal(parseResult.entities.has('User'), true);
    assert.equal(parseResult.entities.has('Database'), true);
    assert.equal(parseResult.entities.has('DatabaseConfig'), true);
    assert.equal(parseResult.entities.has('MainFile'), true);
    assert.equal(parseResult.entities.has('UserList'), true);
    assert.equal(parseResult.entities.has('AppUI'), true);
    assert.equal(parseResult.entities.has('DATABASE_URL'), true);
    assert.equal(parseResult.entities.has('ClientProgram'), true);
    
    // Verify reference counts for key entities
    assert.equal(userService?.referencedBy?.length, 1);
    assert.equal(userDTO?.referencedBy?.length, 2);
    assert.equal(database?.referencedBy?.length, 4);
    assert.equal(userList?.referencedBy?.length, 1);
    assert.equal(databaseUrl?.referencedBy?.length, 1);
    assert.equal(clientProgram?.referencedBy?.length, 1);
  });
});