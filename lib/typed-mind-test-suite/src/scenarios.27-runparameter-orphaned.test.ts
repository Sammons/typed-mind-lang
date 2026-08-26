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

describe('scenario-27-runparameter-orphaned', () => {
  const scenarioFile = 'scenario-27-runparameter-orphaned.tmd';

  it('should detect orphaned RunParameters', async () => {
    const typedMind = await TypedMind.create();
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = typedMind.check(content, filePath);

    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 3);

    // Should detect orphaned UNUSED_PARAM
    const unusedParamDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'UNUSED_PARAM'");
    assert.notEqual(unusedParamDiagnostic, undefined);
    assert.equal(unusedParamDiagnostic?.span.start.line, 12);
    assert.equal(unusedParamDiagnostic?.severity, 'error');

    // Should detect orphaned SECRET_KEY
    const secretKeyDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'SECRET_KEY'");
    assert.notEqual(secretKeyDiagnostic, undefined);
    assert.equal(secretKeyDiagnostic?.span.start.line, 13);
    assert.equal(secretKeyDiagnostic?.severity, 'error');

    // Should detect orphaned processData function
    const processDataDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'processData'");
    assert.notEqual(processDataDiagnostic, undefined);
    assert.equal(processDataDiagnostic?.span.start.line, 16);
    assert.equal(processDataDiagnostic?.severity, 'error');

    // Get parsed entities using the source-graph parser directly, so the
    // concrete AST node classes used for narrowing below come from the same
    // module instance as the entities themselves — `@sammons/typed-mind`'s
    // TypedMind facade resolves through the compiled `dist/` build, a
    // distinct module graph from `src/ast/*-node.ts`.
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const parseResult = parser.parse(content);
    const entities = parseResult.entities;
    assert.equal(
      entities.some((entity) => entity.name === 'UNUSED_PARAM'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'SECRET_KEY'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'API_KEY'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'DATABASE_URL'),
      true,
    );

    // Verify types
    const unusedParam = entities.find((entity) => entity.name === 'UNUSED_PARAM' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(unusedParam?.kind, 'RunParameter');
    assert.equal(unusedParam?.paramType, 'env');

    const secretKey = entities.find((entity) => entity.name === 'SECRET_KEY' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(secretKey?.kind, 'RunParameter');
    assert.equal(secretKey?.paramType, 'config');
    assert.equal(secretKey?.defaultValue, 'secret123');
  });
});
