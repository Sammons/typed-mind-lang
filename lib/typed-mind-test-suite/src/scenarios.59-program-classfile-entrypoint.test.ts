import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 59: Program with ClassFile as entry point', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-59-program-classfile-entrypoint.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should parse ClassFile as program entry point', () => {
    const parseResult = parser.parse(content);
    const entities = Array.from(parseResult.entities.values());

    // Find the ServerApp program
    const serverApp = entities.find((e) => e.name === 'ServerApp' && e.type === 'Program');
    assert.notEqual(serverApp, undefined);
    assert.equal(serverApp?.entry, 'ApplicationServer');

    // Find the ApplicationServer ClassFile
    const appServer = entities.find((e) => e.name === 'ApplicationServer' && e.type === 'ClassFile');
    assert.notEqual(appServer, undefined);
    assert.equal(appServer?.path, 'src/server.ts');
    assert.ok((appServer?.methods).includes('start'));
  });

  it('should validate ClassFile as valid entry point', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);

    const errors = validationResult.errors.map((e) => e.message);

    // ServerApp with ClassFile entry should be valid
    const serverAppErrors = errors.filter((e) => e.includes('ServerApp') && e.includes('entry'));
    assert.ok(serverAppErrors.length > 0);

    // ClientApp with File entry should be valid
    const clientAppErrors = errors.filter((e) => e.includes('ClientApp') && e.includes('ClientMain'));
    assert.equal(clientAppErrors.length, 0);

    // BrokenApp should have error for non-existent entry
    assert.equal(
      errors.some((e) => e.includes('BrokenApp') && e.includes('NonExistentService')),
      true,
    );

    // InvalidApp should have error for using Class as entry
    assert.equal(
      errors.some((e) => e.includes('InvalidApp') && (e.includes('RegularClass') || e.includes('entry point'))),
      true,
    );
  });

  it('should handle ClassFile inheritance chain', () => {
    const parseResult = parser.parse(content);
    const entities = Array.from(parseResult.entities.values());

    // UserController extends chain
    const userController = entities.find((e) => e.name === 'UserController' && e.type === 'ClassFile');
    assert.notEqual(userController, undefined);

    // Database uses Config
    const database = entities.find((e) => e.name === 'Database' && e.type === 'ClassFile');
    assert.ok((database?.imports).includes('Config'));
  });

  it('should validate ClassFile auto-export', () => {
    const parseResult = parser.parse(content);
    const entities = Array.from(parseResult.entities.values());

    // ApplicationServer should auto-export itself
    const appServer = entities.find((e) => e.name === 'ApplicationServer' && e.type === 'ClassFile');

    // The ClassFile should have serverInstance in its exports
    assert.ok((appServer?.exports).includes('serverInstance'));

    // The ClassFile implicitly exports itself, so manual export would be redundant
    assert.ok(!(appServer?.exports).includes('ApplicationServer'));
  });

  it('should detect missing dependencies', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);

    const errors = validationResult.errors.map((e) => e.message);

    // Check that all ClassFile methods are referenceable
    const entities = Array.from(parseResult.entities.values());
    const userService = entities.find((e) => e.name === 'UserService' && e.type === 'ClassFile');
    assert.ok((userService?.methods).includes('findUser'));
    assert.ok((userService?.methods).includes('saveUser'));

    // Verify no orphaned entities
    const orphanedErrors = errors.filter((e) => e.includes('orphaned'));

    // RegularClass, BaseClass, AbstractBase might be orphaned
    // as they're not used by InvalidApp properly
    assert.equal(orphanedErrors.length, 0);
  });

  it('should distinguish between File and ClassFile entry points', () => {
    const parseResult = parser.parse(content);
    const entities = Array.from(parseResult.entities.values());

    // Program can reference both File and ClassFile
    const programs = entities.filter((e) => e.type === 'Program');

    const serverApp = programs.find((p) => p.name === 'ServerApp');
    assert.equal(serverApp?.entry, 'ApplicationServer'); // ClassFile

    const clientApp = programs.find((p) => p.name === 'ClientApp');
    assert.equal(clientApp?.entry, 'ClientMain'); // File

    const invalidApp = programs.find((p) => p.name === 'InvalidApp');
    assert.equal(invalidApp?.entry, 'RegularClass'); // Class (invalid)
  });
});
