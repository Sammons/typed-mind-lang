import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { TreeSitterParser } from '@sammons/typed-mind-tree-sitter-common';
import { RustAnalyzer } from './rust-analyzer.ts';

const FIXTURES_DIR = resolve(import.meta.dirname, '../tests/fixtures');
const WASM_PATH = resolve(import.meta.dirname, '../grammar/tree-sitter-rust.wasm');

describe('RustAnalyzer', () => {
  let parser: TreeSitterParser;

  before(async () => {
    if (!existsSync(WASM_PATH)) {
      throw new Error(`WASM grammar not found at ${WASM_PATH} — run 'pnpm run build:wasm' first`);
    }
    parser = await TreeSitterParser.create(WASM_PATH);
  });

  it('creates an analyzer from a project with Cargo.toml', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    assert.ok(analyzer);
    assert.equal(analyzer.cargoProject.name, 'test-fixture');
    assert.equal(analyzer.cargoProject.version, '0.1.0');
  });

  it('parses Cargo.toml dependencies', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const deps = analyzer.cargoProject.dependencies;
    assert.ok(deps.length >= 2);

    const serde = deps.find((d) => d.name === 'serde');
    assert.ok(serde !== undefined);
    assert.equal(serde.version, '1.0');

    const tokio = deps.find((d) => d.name === 'tokio');
    assert.ok(tokio !== undefined);
    assert.equal(tokio.version, '1.0');
  });

  it('analyzes fixture files from entrypoint', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    // Should find all three .rs files.
    assert.ok(analysis.modules.length >= 3);
    assert.equal(analysis.projectRoot, FIXTURES_DIR);
  });

  it('parses struct declarations from models.rs', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const modelsModule = analysis.modules.find((m) => m.filePath.endsWith('models.rs'));
    assert.ok(modelsModule !== undefined, 'models.rs module not found');

    // User struct.
    const userClass = modelsModule.classes.find((c) => c.name === 'User');
    assert.ok(userClass !== undefined, 'User struct not found');
    assert.ok(userClass.properties.length >= 3, `Expected >=3 fields, got ${userClass.properties.length}`);

    const nameField = userClass.properties.find((p) => p.name === 'name');
    assert.ok(nameField !== undefined, 'name field not found');
    assert.equal(nameField.type, 'String');
  });

  it('parses enum declarations from models.rs', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const modelsModule = analysis.modules.find((m) => m.filePath.endsWith('models.rs'));
    assert.ok(modelsModule !== undefined);

    const userRole = modelsModule.enums.find((e) => e.name === 'UserRole');
    assert.ok(userRole !== undefined, 'UserRole enum not found');
    assert.deepEqual(userRole.members, ['Admin', 'User', 'Guest']);
  });

  it('parses type alias from models.rs', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const modelsModule = analysis.modules.find((m) => m.filePath.endsWith('models.rs'));
    assert.ok(modelsModule !== undefined);

    const userId = modelsModule.types.find((t) => t.name === 'UserId');
    assert.ok(userId !== undefined, 'UserId type alias not found');
    assert.equal(userId.type, 'u64');
  });

  it('parses const from models.rs', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const modelsModule = analysis.modules.find((m) => m.filePath.endsWith('models.rs'));
    assert.ok(modelsModule !== undefined);

    const maxUsers = modelsModule.constants.find((c) => c.name === 'MAX_USERS');
    assert.ok(maxUsers !== undefined, 'MAX_USERS const not found');
    assert.equal(maxUsers.type, 'usize');
  });

  it('parses trait from services.rs', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const servicesModule = analysis.modules.find((m) => m.filePath.endsWith('services.rs'));
    assert.ok(servicesModule !== undefined, 'services.rs module not found');

    const repository = servicesModule.interfaces.find((i) => i.name === 'Repository');
    assert.ok(repository !== undefined, 'Repository trait not found');
    assert.ok(repository.methods.length >= 2, `Expected >=2 methods, got ${repository.methods.length}`);

    const findById = repository.methods.find((m) => m.name === 'find_by_id');
    assert.ok(findById !== undefined, 'find_by_id method not found');
  });

  it('merges impl blocks into structs', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const servicesModule = analysis.modules.find((m) => m.filePath.endsWith('services.rs'));
    assert.ok(servicesModule !== undefined);

    const userService = servicesModule.classes.find((c) => c.name === 'UserService');
    assert.ok(userService !== undefined, 'UserService struct not found');

    // Should have methods from both `impl UserService` and `impl Repository for UserService`.
    assert.ok(userService.methods.length >= 2, `Expected >=2 methods, got ${userService.methods.length}`);

    // Should implement Repository.
    assert.ok(
      userService.implements.includes('Repository'),
      `Expected implements to contain Repository, got ${JSON.stringify(userService.implements)}`,
    );
  });

  it('parses use declarations from services.rs', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const servicesModule = analysis.modules.find((m) => m.filePath.endsWith('services.rs'));
    assert.ok(servicesModule !== undefined);

    assert.ok(servicesModule.imports.length >= 1, 'Expected at least one import');
    const crateImport = servicesModule.imports.find((i) => i.namedImports.includes('User'));
    assert.ok(crateImport !== undefined, 'Import of User not found');
  });

  it('parses pub functions from lib.rs', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const libModule = analysis.modules.find((m) => m.filePath.endsWith('lib.rs'));
    assert.ok(libModule !== undefined, 'lib.rs module not found');

    const runFn = libModule.functions.find((f) => f.name === 'run');
    assert.ok(runFn !== undefined, 'run function not found');
  });

  it('extracts derive attributes as decorators', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const modelsModule = analysis.modules.find((m) => m.filePath.endsWith('models.rs'));
    assert.ok(modelsModule !== undefined);

    const userClass = modelsModule.classes.find((c) => c.name === 'User');
    assert.ok(userClass !== undefined);
    assert.ok(userClass.decorators.length >= 1, `Expected >=1 decorator, got ${userClass.decorators.length}`);
    assert.ok(
      userClass.decorators.some((d) => d.includes('derive')),
      `Expected derive decorator, got ${JSON.stringify(userClass.decorators)}`,
    );
  });

  it('detects public exports', () => {
    const analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');

    const modelsModule = analysis.modules.find((m) => m.filePath.endsWith('models.rs'));
    assert.ok(modelsModule !== undefined);

    const userExport = modelsModule.exports.find((e) => e.name === 'User');
    assert.ok(userExport !== undefined, 'User should be exported (pub)');

    const maxUsersExport = modelsModule.exports.find((e) => e.name === 'MAX_USERS');
    assert.ok(maxUsersExport !== undefined, 'MAX_USERS should be exported (pub)');
  });
});
