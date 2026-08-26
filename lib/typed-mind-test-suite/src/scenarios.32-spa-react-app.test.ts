import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { ProgramNode } from '../../typed-mind/src/ast/program-node.ts';
import { RunParameterNode } from '../../typed-mind/src/ast/run-parameter-node.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-32-spa-react-app', () => {
  const scenarioFile = 'scenario-32-spa-react-app.tmd';

  it('should validate SPA React application architecture', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Get parsed entities using the source-graph parser directly, so the
    // concrete AST node classes used for narrowing below come from the same
    // module instance as the entities themselves — `@sammons/typed-mind`'s
    // TypedMind facade resolves through the compiled `dist/` build, a
    // distinct module graph from `src/ast/*-node.ts`.
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const parsed = parser.parse(content);
    const entities = parsed.entities;

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // Should have the main program
    assert.equal(
      entities.some((entity) => entity.name === 'EcommerceApp'),
      true,
    );
    const app = entities.find((entity) => entity.name === 'EcommerceApp' && entity instanceof ProgramNode) as ProgramNode | undefined;
    assert.equal(app?.kind, 'Program');
    assert.equal(app?.entry, 'MainFile');
    assert.equal(app?.version, '2.1.0');

    // Should have core files
    assert.equal(
      entities.some((entity) => entity.name === 'MainFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'AppFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'RouterFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'StoreFile'),
      true,
    );

    // Should have Redux slices
    assert.equal(
      entities.some((entity) => entity.name === 'AuthSliceFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'CartSliceFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ProductSliceFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'OrderSliceFile'),
      true,
    );

    // Should have UI components
    assert.equal(
      entities.some((entity) => entity.name === 'App'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Header'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Footer'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Router'),
      true,
    );

    // Should have page components
    assert.equal(
      entities.some((entity) => entity.name === 'HomePage'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ProductListPage'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ProductDetailPage'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'CartPage'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'CheckoutPage'),
      true,
    );

    // Should have environment variables
    assert.equal(
      entities.some((entity) => entity.name === 'API_URL'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'STRIPE_PUBLIC_KEY'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'NODE_ENV'),
      true,
    );

    // Check environment variable types
    const apiUrl = entities.find((entity) => entity.name === 'API_URL' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(apiUrl?.kind, 'RunParameter');
    assert.equal(apiUrl?.paramType, 'env');
    assert.equal(apiUrl?.required, true);

    const nodeEnv = entities.find((entity) => entity.name === 'NODE_ENV' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(nodeEnv?.kind, 'RunParameter');
    assert.equal(nodeEnv?.paramType, 'env');
    assert.equal(nodeEnv?.defaultValue, 'development');

    // Should have service functions
    assert.equal(
      entities.some((entity) => entity.name === 'login'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'addToCart'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'fetchProducts'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'createOrder'),
      true,
    );

    // Should have DTOs
    assert.equal(
      entities.some((entity) => entity.name === 'LoginDTO'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ProductDTO'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'OrderDTO'),
      true,
    );

    // Check that key functions consume environment variables
    const loginFunc = entities.find((entity) => entity.name === 'login' && entity instanceof FunctionNode) as FunctionNode | undefined;
    assert.equal(loginFunc?.kind, 'Function');
    assert.ok(loginFunc?.consumes?.includes('API_URL'));
    assert.ok(loginFunc?.consumes?.includes('NODE_ENV'));

    const createOrderFunc = entities.find((entity) => entity.name === 'createOrder' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(createOrderFunc?.kind, 'Function');
    assert.ok(createOrderFunc?.consumes?.includes('API_URL'));
    assert.ok(createOrderFunc?.consumes?.includes('STRIPE_PUBLIC_KEY'));

    // Should have external dependencies. The legacy `ParseResult.dependencies`
    // Map (DSLChecker-internal call/import graph) keyed every entity by name
    // regardless of kind (index.ts buildDependencyGraph), so `.has(name)` was
    // equivalent to entity presence — checked directly here on the new
    // entity list.
    assert.equal(
      entities.some((entity) => entity.name === 'react'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'react-dom'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === '@reduxjs/toolkit'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'axios'),
      true,
    );

    // Verify entity count is reasonable for a full SPA
    assert.ok(entities.length > 80);
  });
});
