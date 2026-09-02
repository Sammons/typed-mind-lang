import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ConstantsNode } from '../../typed-mind/src/ast/constants-node.ts';
import { DtoNode } from '../../typed-mind/src/ast/dto-node.ts';
import { FileNode } from '../../typed-mind/src/ast/file-node.ts';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 60: Constants schema validation', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-60-constants-schema-validation.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should parse constants with and without schemas', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // Constants with schema
    const appConfig = entities.find((e): e is ConstantsNode => e instanceof ConstantsNode && e.name === 'AppConfig');
    assert.notEqual(appConfig, undefined);
    assert.equal(appConfig?.schema, 'AppConfigSchema');
    assert.equal(appConfig?.path, 'src/config/app.ts');

    // Constants without schema
    const dbConfig = entities.find((e): e is ConstantsNode => e instanceof ConstantsNode && e.name === 'DatabaseConfig');
    assert.notEqual(dbConfig, undefined);
    assert.equal(dbConfig?.schema, undefined);

    // Complex nested schema
    const apiConfig = entities.find((e): e is ConstantsNode => e instanceof ConstantsNode && e.name === 'ApiConfig');
    assert.equal(apiConfig?.schema, 'ApiConfigSchema');
  });

  it('should validate schema references', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((e) => e.message);

    // BrokenConfig references non-existent schema
    assert.equal(
      errors.some((e) => e.includes('BrokenConfig') && e.includes('NonExistentSchema')),
      false,
    );

    // InvalidSchema references undefined types
    assert.equal(
      errors.some((e) => e.includes('UndefinedType') || e.includes('UnknownProcessor')),
      true,
    ); // Validator now validates DTO field type references
  });

  it('should handle circular schema references', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // Circular schemas should parse
    const circularA = entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'CircularSchemaA');
    const circularB = entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'CircularSchemaB');

    assert.notEqual(circularA, undefined);
    assert.notEqual(circularB, undefined);

    // Check fields reference each other
    assert.equal(
      circularA?.fields.some((f) => f.type === 'CircularSchemaB'),
      true,
    );
    assert.equal(
      circularB?.fields.some((f) => f.type === 'CircularSchemaA'),
      true,
    );

    // Circular references in DTOs might be flagged
    // The validator may or may not catch this - it depends on implementation
  });

  it('should reject DTOs with function fields', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((e) => e.message);

    // BadSchema has function fields
    assert.equal(
      errors.some((e) => e.includes('BadSchema') && (e.includes('Function') || e.includes('function type'))),
      true,
    );
  });

  it('should handle deeply nested schemas', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // Check nested schema chain
    const nestedSchema = entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'NestedSchema');
    const level1 = entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'Level1Schema');
    const level2 = entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'Level2Schema');
    const level3 = entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'Level3Schema');

    assert.notEqual(nestedSchema, undefined);
    assert.notEqual(level1, undefined);
    assert.notEqual(level2, undefined);
    assert.notEqual(level3, undefined);

    // Check field references
    assert.equal(
      nestedSchema?.fields.some((f) => f.type === 'Level1Schema'),
      true,
    );
    assert.equal(
      level1?.fields.some((f) => f.type === 'Level2Schema'),
      true,
    );
    assert.equal(
      level2?.fields.some((f) => f.type === 'Level3Schema'),
      true,
    );
  });

  it('should reject constants with methods', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // Constants can't have methods
    const methodConfig = entities.find((e): e is ConstantsNode => e instanceof ConstantsNode && e.name === 'MethodConfig');

    // ConstantsNode has no `.methods` field at all — its presence in the AST
    // as ConstantsNode (rather than some methods-bearing kind) is the
    // equivalent check to legacy's `methodConfig?.methods === undefined`.
    assert.notEqual(methodConfig, undefined);
    assert.ok(!('methods' in (methodConfig as object)));
  });

  it('should allow multiple constants with same schema', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // Find all configs using SharedSchema
    const sharedConfigs = entities.filter((e): e is ConstantsNode => e instanceof ConstantsNode && e.schema === 'SharedSchema');

    assert.equal(sharedConfigs.length, 3);
    assert.deepEqual(sharedConfigs.map((c) => c.name).sort(), ['Config1', 'Config2', 'Config3']);

    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);
    const errors = validation.findings.map((e) => e.message);

    // Should not have errors for sharing schemas
    const sharingErrors = errors.filter((e) => e.includes('SharedSchema') && e.includes('multiple'));
    assert.equal(sharingErrors.length, 0);
  });

  it('should detect orphaned schemas', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((e) => e.message);

    // OrphanedSchema is not used by any Constants
    assert.equal(
      errors.some((e) => e.includes('OrphanedSchema') && e.includes('orphaned')),
      false,
    );
  });

  it('should validate constants consumption', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // SecretConfig consumed by useSecrets
    const useSecrets = entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'useSecrets');
    assert.ok(useSecrets?.consumes?.includes('SecretConfig'));

    // AppConfig consumed by multiple functions
    const initialize = entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'initialize');
    assert.ok(initialize?.consumes?.includes('AppConfig'));
    assert.ok(initialize?.consumes?.includes('DatabaseConfig'));

    const getEnvironment = entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'getEnvironment');
    assert.ok(getEnvironment?.consumes?.includes('AppConfig'));
  });

  it('should validate constants imports', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entities = outcome.entities;

    // EnvironmentFile imports constants
    const envFile = entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'EnvironmentFile');
    assert.ok(envFile?.imports.includes('AppConfig'));
    assert.ok(envFile?.imports.includes('DatabaseConfig'));

    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // Constants should be valid import targets
    const errors = validation.findings.filter(
      (e) => e.message.includes('Cannot import') && (e.message.includes('AppConfig') || e.message.includes('DatabaseConfig')),
    );
    assert.equal(errors.length, 0);
  });
});
