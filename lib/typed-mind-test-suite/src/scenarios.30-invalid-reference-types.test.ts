import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLParser, DSLValidator } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-30-invalid-reference-types', () => {
  const scenarioFile = 'scenario-30-invalid-reference-types.tmd';

  it('should validate reference types', () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');

    const parser = new DSLParser();
    const validator = new DSLValidator();

    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities);

    assert.equal(validationResult.valid, false);
    assert.equal(validationResult.errors.length, 3);

    // Should have validation errors
    assert.equal(validationResult.errors.length, 3);
    assert.equal(
      validationResult.errors.every((err) => err.severity === 'error'),
      true,
    );

    // Verify entities are parsed correctly
    const entities = parseResult.entities;
    assert.equal(entities.has('MainFile'), true);
    assert.equal(entities.has('EntryFile'), true);
    assert.equal(entities.has('UserService'), true);
    assert.equal(entities.has('createUser'), true);
    assert.equal(entities.has('UserDTO'), true);
    assert.equal(entities.has('startApp'), true);

    // Verify entity types
    const mainFile = entities.get('MainFile');
    assert.equal(mainFile?.type, 'File');

    const entryFile = entities.get('EntryFile');
    assert.equal(entryFile?.type, 'File');

    const userService = entities.get('UserService');
    assert.equal(userService?.type, 'File');

    const createUser = entities.get('createUser');
    assert.equal(createUser?.type, 'Function');

    const userDTO = entities.get('UserDTO');
    assert.equal(userDTO?.type, 'DTO');

    const startApp = entities.get('startApp');
    assert.equal(startApp?.type, 'Function');
  });
});
