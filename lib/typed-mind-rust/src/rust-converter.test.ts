import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { TreeSitterParser } from '@sammons/typed-mind-tree-sitter-common';
import { RustAnalyzer } from './rust-analyzer.ts';
import { RustConverter } from './rust-converter.ts';

const FIXTURES_DIR = resolve(import.meta.dirname, '../tests/fixtures');
const WASM_PATH = resolve(import.meta.dirname, '../grammar/tree-sitter-rust.wasm');

describe('RustConverter', () => {
  let analyzer: RustAnalyzer;
  let parser: TreeSitterParser;

  before(async () => {
    if (!existsSync(WASM_PATH)) {
      throw new Error(`WASM grammar not found at ${WASM_PATH} — run 'pnpm run build:wasm' first`);
    }
    parser = await TreeSitterParser.create(WASM_PATH);
    analyzer = new RustAnalyzer(FIXTURES_DIR, parser);
  });

  it('converts fixture project to TMD without errors', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: true,
        programVersion: '0.1.0',
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    assert.equal(result.success, true, `Conversion failed: ${result.errors.map((e) => e.message).join(', ')}`);
    assert.ok(result.entities.length > 0, 'Expected at least one entity');
    assert.ok(result.tmdContent.length > 0, 'Expected non-empty TMD content');
  });

  it('generates a Program entity from Cargo.toml', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: true,
        programVersion: '0.1.0',
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const programs = result.entities.filter((e) => e.kind === 'Program');
    assert.ok(programs.length >= 1, 'Expected at least one Program entity');
    assert.equal(programs[0]?.name, 'test-fixture');
  });

  it('generates Dependency entities from Cargo.toml', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: true,
        programVersion: '0.1.0',
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const deps = result.entities.filter((e) => e.kind === 'Dependency');
    assert.ok(deps.length >= 2, `Expected at least 2 Dependency entities, got ${deps.length}`);

    const serde = deps.find((d) => d.name === 'serde');
    assert.ok(serde !== undefined, 'serde dependency not found');
  });

  it('generates File entities for each .rs file', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: false,
        programVersion: undefined,
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const files = result.entities.filter((e) => e.kind === 'File');
    assert.ok(files.length >= 3, `Expected at least 3 File entities, got ${files.length}`);
  });

  it('converts struct with methods to Class', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: false,
        programVersion: undefined,
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const classes = result.entities.filter((e) => e.kind === 'Class');

    const userService = classes.find((c) => c.name === 'UserService');
    assert.ok(userService !== undefined, 'UserService Class not found');
  });

  it('converts struct without methods to DTO', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: false,
        programVersion: undefined,
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const dtos = result.entities.filter((e) => e.kind === 'DTO');

    const user = dtos.find((d) => d.name === 'User');
    assert.ok(user !== undefined, 'User DTO not found');
  });

  it('converts enum to TypeDef with enum variant', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: false,
        programVersion: undefined,
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const typeDefs = result.entities.filter((e) => e.kind === 'TypeDef');

    const userRole = typeDefs.find((t) => t.name === 'UserRole');
    assert.ok(userRole !== undefined, 'UserRole TypeDef not found');
  });

  it('converts trait to Class (abstract-like)', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: false,
        programVersion: undefined,
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const classes = result.entities.filter((e) => e.kind === 'Class');

    const repository = classes.find((c) => c.name === 'Repository');
    assert.ok(repository !== undefined, 'Repository Class (from trait) not found');
  });

  it('converts type alias to TypeDef with alias variant', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: false,
        programVersion: undefined,
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const typeDefs = result.entities.filter((e) => e.kind === 'TypeDef');

    const userId = typeDefs.find((t) => t.name === 'UserId');
    assert.ok(userId !== undefined, 'UserId TypeDef not found');
  });

  it('converts constants to Constants entity', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: false,
        programVersion: undefined,
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const constants = result.entities.filter((e) => e.kind === 'Constants');
    assert.ok(constants.length >= 1, `Expected at least 1 Constants entity, got ${constants.length}`);
  });

  it('converts module-level functions to Function entities', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: false,
        programVersion: undefined,
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    const functions = result.entities.filter((e) => e.kind === 'Function');

    const runFn = functions.find((f) => f.name === 'run');
    assert.ok(runFn !== undefined, 'run Function not found');
  });

  it('produces valid TMD that can be parsed', () => {
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const converter = new RustConverter(
      {
        includePrivateMembers: false,
        generatePrograms: true,
        programVersion: '0.1.0',
        ignorePatterns: [],
      },
      analyzer,
    );

    const result = converter.convert(analysis);
    assert.ok(result.success);
    // Verify TMD content has expected structure markers.
    assert.ok(result.tmdContent.includes('test-fixture'), 'TMD should mention program name');
  });
});
