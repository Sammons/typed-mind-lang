import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassFileNode } from '../../typed-mind/src/ast/class-file-node.ts';
import { FileNode } from '../../typed-mind/src/ast/file-node.ts';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { ProgramNode } from '../../typed-mind/src/ast/program-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 63: File isolation patterns', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-63-file-isolation-patterns.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should handle selective exports from public API', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const publicAPI = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'PublicAPI');

    // Imports internal modules
    assert.ok(publicAPI?.imports.includes('InternalService'));
    assert.ok(publicAPI?.imports.includes('PrivateHelper'));
    assert.ok(publicAPI?.imports.includes('SharedUtils'));

    // Selectively exports only public methods
    assert.ok(publicAPI?.exports.includes('publicMethod'));
    assert.ok(publicAPI?.exports.includes('utilityFunction'));

    // Does not export internal helpers
    assert.ok(!publicAPI?.exports.includes('processInternal'));
    assert.ok(!publicAPI?.exports.includes('privateProcess'));
  });

  it('should enforce module boundaries', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Auth module exposes only public interface
    const authModule = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'AuthModule');

    assert.ok(authModule?.imports.includes('AuthService'));
    assert.ok(authModule?.imports.includes('AuthValidator'));
    assert.ok(authModule?.imports.includes('AuthConfig'));

    assert.ok(authModule?.exports.includes('authenticate'));
    assert.ok(authModule?.exports.includes('authorize'));

    // Internal auth components not exposed
    assert.ok(!authModule?.exports.includes('AuthService'));
    assert.ok(!authModule?.exports.includes('validateUser'));
  });

  it('should handle layered architecture', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Presentation depends on Business
    const presentation = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'PresentationLayer');
    assert.ok(presentation?.imports.includes('BusinessLayer'));
    assert.ok(!presentation?.imports.includes('DataLayer')); // No direct access

    // Business depends on Data
    const business = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'BusinessLayer');
    assert.ok(business?.imports.includes('DataLayer'));
    assert.ok(!business?.imports.includes('Database')); // No direct DB access

    // Data encapsulates Database
    const data = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'DataLayer');
    assert.ok(data?.imports.includes('Database'));
  });

  it('should detect circular dependencies between modules', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((e) => e.message);

    // ModuleA imports ModuleB, ModuleB imports ModuleA
    assert.equal(
      errors.some((e) => e.includes('Circular') && (e.includes('ModuleA') || e.includes('ModuleB'))),
      true,
    );
  });

  it('should detect orphaned functions', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((e) => e.message);

    // orphanedFunction is not exported from any file
    assert.equal(
      errors.some((e) => e.includes('orphanedFunction') && (e.includes('not exported') || e.includes('orphaned'))),
      true,
    );

    // Private implementation details are exported from their file
    const implDetail = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'ImplementationDetail');
    assert.ok(implDetail?.exports.includes('privateImpl'));
    assert.ok(implDetail?.exports.includes('secretAlgorithm'));
  });

  it('should handle re-export patterns', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const coreExports = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'CoreExports');

    // Re-exports imported entities
    assert.ok(coreExports?.imports.includes('CoreService'));
    assert.ok(coreExports?.imports.includes('CoreUtils'));
    assert.ok(coreExports?.imports.includes('CoreTypes'));

    assert.ok(coreExports?.exports.includes('CoreService'));
    assert.ok(coreExports?.exports.includes('coreUtil'));
    assert.ok(coreExports?.exports.includes('CoreConfig'));

    // Doesn't export everything (selective re-export)
    assert.ok(!coreExports?.exports.includes('coreHelper'));
    assert.ok(!coreExports?.exports.includes('CoreState'));
  });

  it('should handle files with no exports', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Side effects file
    const noExportFile = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'NoExportFile');

    assert.ok(noExportFile?.imports.includes('Logger'));
    assert.equal(noExportFile?.exports.length || 0, 0);

    // Import only file with explicit empty exports
    const importOnlyFile = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'ImportOnlyFile');

    assert.ok((importOnlyFile?.imports.length ?? 0) > 0);
    assert.equal(importOnlyFile?.exports.length || 0, 0);
  });

  it('should handle test file isolation', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const testFile = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'TestFile');

    // Test file imports public APIs
    assert.ok(testFile?.imports.includes('PublicAPI'));
    assert.ok(testFile?.imports.includes('CoreExports'));

    // Exports test suite
    assert.ok(testFile?.exports.includes('testSuite'));

    const testSuite = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'testSuite');

    // Test calls public methods
    assert.ok(testSuite?.calls.includes('publicMethod'));
    assert.ok(testSuite?.calls.includes('coreUtil'));
  });

  it('should handle environment-specific files', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Dev-specific file
    const devFile = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'DevFile');
    assert.ok(devFile?.path.includes('dev/'));

    // Prod-specific file
    const prodFile = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'ProdFile');
    assert.ok(prodFile?.path.includes('prod/'));

    // Different entry points
    const devEntry = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'DevEntry');
    const prodEntry = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'ProdEntry');

    assert.ok(devEntry?.imports.includes('DevFile'));
    assert.ok(prodEntry?.imports.includes('ProdFile'));
  });

  it('should handle multiple programs for different builds', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Multiple programs in same file
    const programs = outcome.entities.filter((e): e is ProgramNode => e instanceof ProgramNode);

    const isolationApp = programs.find((p) => p.name === 'IsolationApp');
    const devApp = programs.find((p) => p.name === 'DevApp');
    const prodApp = programs.find((p) => p.name === 'ProdApp');

    assert.equal(isolationApp?.entry, 'main');
    assert.equal(devApp?.entry, 'DevEntry');
    assert.equal(prodApp?.entry, 'ProdEntry');

    // Different versions; stripVersionPrefix (declaration-openers.ts:29-30,
    // :100) drops the `v` prefix, so Program.version carries the bare number.
    assert.equal(devApp?.version, '1.0.0-dev');
    assert.equal(prodApp?.version, '1.0.0');
  });

  it('should validate file isolation integrity', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    new AstValidator().validate(outcome, links);

    // Check that internal services are not orphaned
    const internalService = outcome.entities.find((e): e is ClassFileNode => e instanceof ClassFileNode && e.name === 'InternalService');

    // InternalService is imported by PublicAPI
    assert.notEqual(internalService, undefined);

    // Private functions should be traceable
    const privateHelper = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'PrivateHelper');

    // PrivateHelper is imported by PublicAPI and InternalService
    assert.notEqual(privateHelper, undefined);
  });

  it('should validate all layer dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((e) => e.message);

    // Check no layer violations
    const layerViolations = errors.filter((e) => e.includes('PresentationLayer') && e.includes('DataLayer'));
    assert.equal(layerViolations.length, 0);

    // All layer functions should be properly connected
    const handleRequest = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'handleRequest');
    assert.ok(handleRequest?.calls.includes('processBusinessLogic'));

    const processBusinessLogic = outcome.entities.find(
      (e): e is FunctionNode => e instanceof FunctionNode && e.name === 'processBusinessLogic',
    );
    assert.ok(processBusinessLogic?.calls.includes('queryData'));
    assert.ok(processBusinessLogic?.calls.includes('updateData'));
  });
});
