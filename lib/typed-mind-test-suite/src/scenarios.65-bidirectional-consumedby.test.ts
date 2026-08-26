import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { RunParameterNode } from '../../typed-mind/src/ast/run-parameter-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Note (S-TEST-1, scenario-65): legacy exposed `RunParameter.consumedBy` as a
// per-entity array of Function names. `RunParameterNode` carries no derived
// reverse field on the new surface — the relationship now lives on
// `LinkIndex.consumedBy(name)`, which returns `readonly string[]` (plain
// names, no verb/kind dimension — same as scenario-64's affectedBy, no
// precision loss versus legacy). All assertions below use
// `links.consumedBy(name)` in place of `entity.consumedBy`.

describe('Scenario 65: Bidirectional consumedBy for RunParameters', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-65-bidirectional-consumedby.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should automatically populate RunParameter.consumedBy when Function consumes it', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Check DATABASE_URL.consumedBy
    const databaseUrl = outcome.entities.find((e): e is RunParameterNode => e instanceof RunParameterNode && e.name === 'DATABASE_URL');

    assert.notEqual(databaseUrl, undefined);
    const databaseUrlConsumedBy = links.consumedBy('DATABASE_URL');
    assert.notEqual(databaseUrlConsumedBy, undefined);
    assert.ok(databaseUrlConsumedBy.includes('connectDB'));
    assert.ok(databaseUrlConsumedBy.includes('startServer'));
    assert.equal(databaseUrlConsumedBy.length, 2);
  });

  it('should handle multiple functions consuming the same RunParameter', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // DATABASE_URL is consumed by both connectDB and startServer
    const databaseUrlConsumedBy = links.consumedBy('DATABASE_URL');

    for (const expected of ['connectDB', 'startServer']) {
      assert.ok(databaseUrlConsumedBy.includes(expected));
    }
  });

  it('should handle single function consuming RunParameter', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // API_KEY is only consumed by processData
    const apiKey = outcome.entities.find((e): e is RunParameterNode => e instanceof RunParameterNode && e.name === 'API_KEY');

    assert.notEqual(apiKey, undefined);
    assert.deepEqual(links.consumedBy('API_KEY'), ['processData']);
  });

  it('should handle RunParameter with no consuming functions', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // UNUSED_PARAM has no functions consuming it
    const unusedParam = outcome.entities.find((e): e is RunParameterNode => e instanceof RunParameterNode && e.name === 'UNUSED_PARAM');

    assert.notEqual(unusedParam, undefined);
    assert.deepEqual(links.consumedBy('UNUSED_PARAM'), []);
  });

  it('should maintain consistency between Function.consumes and RunParameter.consumedBy', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Check that relationships are bidirectional
    const connectDB = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'connectDB');

    assert.ok(connectDB?.consumes?.includes('DATABASE_URL'));
    assert.ok(links.consumedBy('DATABASE_URL').includes('connectDB'));
  });

  it('should handle different RunParameter types', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Check different parameter types
    const port = outcome.entities.find((e): e is RunParameterNode => e instanceof RunParameterNode && e.name === 'PORT');
    const dbTimeout = outcome.entities.find((e): e is RunParameterNode => e instanceof RunParameterNode && e.name === 'DB_TIMEOUT');
    const maxRetries = outcome.entities.find((e): e is RunParameterNode => e instanceof RunParameterNode && e.name === 'MAX_RETRIES');

    assert.equal(port?.paramType, 'config');
    assert.deepEqual(links.consumedBy('PORT'), ['startServer']);

    assert.equal(dbTimeout?.paramType, 'runtime');
    assert.deepEqual(links.consumedBy('DB_TIMEOUT'), ['connectDB']);

    assert.equal(maxRetries?.paramType, 'config');
    assert.deepEqual(links.consumedBy('MAX_RETRIES'), ['processData']);
  });

  it('should validate without errors when bidirectional relationships are correct', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // Should not have any validation errors about missing consumedBy
    const consumedByErrors = validation.findings.filter((e) => e.message.includes('consumedBy'));

    assert.deepEqual(consumedByErrors, []);
  });

  it('should handle required and optional RunParameters with consumedBy', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // DATABASE_URL is required
    const databaseUrl = outcome.entities.find((e): e is RunParameterNode => e instanceof RunParameterNode && e.name === 'DATABASE_URL');

    // PORT has default value (optional)
    const port = outcome.entities.find((e): e is RunParameterNode => e instanceof RunParameterNode && e.name === 'PORT');

    assert.equal(databaseUrl?.required, true);
    assert.ok(links.consumedBy('DATABASE_URL').length > 0);

    assert.equal(port?.defaultValue, '3000');
    assert.deepEqual(links.consumedBy('PORT'), ['startServer']);
  });
});
