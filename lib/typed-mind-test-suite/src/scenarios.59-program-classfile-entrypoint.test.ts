import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassFileNode } from '../../typed-mind/src/ast/class-file-node.ts';
import { ProgramNode } from '../../typed-mind/src/ast/program-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 59: Program with ClassFile as entry point', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-59-program-classfile-entrypoint.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should parse ClassFile as program entry point', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // Find the ServerApp program
    const serverApp = entities.find((e) => e.name === 'ServerApp' && e instanceof ProgramNode);
    assert.notEqual(serverApp, undefined);
    assert.equal((serverApp as ProgramNode)?.entry, 'ApplicationServer');

    // Find the ApplicationServer ClassFile
    const appServer = entities.find((e) => e.name === 'ApplicationServer' && e instanceof ClassFileNode);
    assert.notEqual(appServer, undefined);
    assert.equal((appServer as ClassFileNode)?.path, 'src/server.ts');
    assert.ok((appServer as ClassFileNode)?.methods.includes('start'));
  });

  it('should validate ClassFile as valid entry point', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((f) => f.message);

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

  it('should handle ClassFile inheritance chain', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // UserController extends chain
    const userController = entities.find((e) => e.name === 'UserController' && e instanceof ClassFileNode);
    assert.notEqual(userController, undefined);

    // Database uses Config
    const database = entities.find((e) => e.name === 'Database' && e instanceof ClassFileNode);
    assert.ok((database as ClassFileNode)?.imports.includes('Config'));
  });

  it('should validate ClassFile auto-export', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // ApplicationServer should auto-export itself
    const appServer = entities.find((e) => e.name === 'ApplicationServer' && e instanceof ClassFileNode);
    const exports = (appServer as ClassFileNode)?.exports;

    // The ClassFile should have serverInstance in its exports
    assert.ok(exports?.includes('serverInstance'));

    // RFC-TM-4 §4 A12 (authorized 2026-08-26, claude-home #1356): ClassFile
    // auto-self-export applies unconditionally in the new AST
    // (class-file-node.ts:36) — legacy seeds `exports: [name]` at
    // construction (parser.ts:287,693) but a declared `-> [...]`
    // continuation OVERWRITES that seed (parser.ts:487-491), so legacy
    // reports exports without the self-name once an explicit continuation
    // exists. RFC-TM-3 §2.2 cited only the seed, not the overwrite; the new
    // node implements the citation as written, so the self-name now
    // survives alongside a declared continuation. Attested census: this
    // file (ApplicationServer ×1) is one of the 6 records / 3 files A12
    // covers (scenario-34 ×4, scenario-58 ×1, scenario-59 ×1). Zero verdict
    // movement in check() (existence/exporter-count checks are unaffected).
    assert.ok(exports?.includes('ApplicationServer'));
  });

  it('should detect missing dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((f) => f.message);

    // Check that all ClassFile methods are referenceable
    const entities = outcome.entities;
    const userService = entities.find((e) => e.name === 'UserService' && e instanceof ClassFileNode);
    const methods = (userService as ClassFileNode)?.methods;
    assert.ok(methods?.includes('findUser'));
    assert.ok(methods?.includes('saveUser'));

    // Verify no orphaned entities
    const orphanedErrors = errors.filter((e) => e.includes('orphaned'));

    // RegularClass, BaseClass, AbstractBase might be orphaned
    // as they're not used by InvalidApp properly
    assert.equal(orphanedErrors.length, 0);
  });

  it('should distinguish between File and ClassFile entry points', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // Program can reference both File and ClassFile
    const programs = entities.filter((e): e is ProgramNode => e instanceof ProgramNode);

    const serverApp = programs.find((p) => p.name === 'ServerApp');
    assert.equal(serverApp?.entry, 'ApplicationServer'); // ClassFile

    const clientApp = programs.find((p) => p.name === 'ClientApp');
    assert.equal(clientApp?.entry, 'ClientMain'); // File

    const invalidApp = programs.find((p) => p.name === 'InvalidApp');
    assert.equal(invalidApp?.entry, 'RegularClass'); // Class (invalid)
  });
});
