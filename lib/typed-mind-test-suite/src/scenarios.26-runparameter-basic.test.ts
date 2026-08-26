import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { RunParameterNode } from '../../typed-mind/src/ast/run-parameter-node.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-26-runparameter-basic', () => {
  const scenarioFile = 'scenario-26-runparameter-basic.tmd';

  it('should validate basic RunParameter functionality', async () => {
    const typedMind = await TypedMind.create();
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = typedMind.check(content, filePath);

    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // Get parsed entities using the source-graph parser directly, so the
    // concrete AST node classes (RunParameterNode etc.) used for narrowing
    // below come from the same module instance as the entities themselves —
    // `@sammons/typed-mind`'s TypedMind facade resolves through the compiled
    // `dist/` build, a distinct module graph from `src/ast/*-node.ts`.
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const parseResult = parser.parse(content);
    const entities = parseResult.entities;

    // Environment variables
    assert.equal(
      entities.some((entity) => entity.name === 'DATABASE_URL'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'API_KEY'),
      true,
    );

    // IAM roles
    assert.equal(
      entities.some((entity) => entity.name === 'LAMBDA_ROLE'),
      true,
    );

    // Runtime configuration
    assert.equal(
      entities.some((entity) => entity.name === 'NODE_VERSION'),
      true,
    );

    // Configuration parameters
    assert.equal(
      entities.some((entity) => entity.name === 'MEMORY_SIZE'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TIMEOUT'),
      true,
    );

    // Functions that consume parameters
    assert.equal(
      entities.some((entity) => entity.name === 'handler'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'init'),
      true,
    );

    // Verify RunParameter types
    const databaseUrl = entities.find((entity) => entity.name === 'DATABASE_URL' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(databaseUrl?.kind, 'RunParameter');
    assert.equal(databaseUrl?.paramType, 'env');

    const apiKey = entities.find((entity) => entity.name === 'API_KEY' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(apiKey?.kind, 'RunParameter');
    assert.equal(apiKey?.paramType, 'env');
    assert.equal(apiKey?.defaultValue, 'dev-key-12345');

    const lambdaRole = entities.find((entity) => entity.name === 'LAMBDA_ROLE' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(lambdaRole?.kind, 'RunParameter');
    assert.equal(lambdaRole?.paramType, 'iam');

    const nodeVersion = entities.find((entity) => entity.name === 'NODE_VERSION' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(nodeVersion?.kind, 'RunParameter');
    assert.equal(nodeVersion?.paramType, 'runtime');
    assert.equal(nodeVersion?.defaultValue, '20.x');

    const memorySize = entities.find((entity) => entity.name === 'MEMORY_SIZE' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(memorySize?.kind, 'RunParameter');
    assert.equal(memorySize?.paramType, 'config');
    assert.equal(memorySize?.defaultValue, '512');
  });
});
