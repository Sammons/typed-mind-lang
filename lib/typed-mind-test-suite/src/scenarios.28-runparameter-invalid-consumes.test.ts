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

describe('scenario-28-runparameter-invalid-consumes', () => {
  const scenarioFile = 'scenario-28-runparameter-invalid-consumes.tmd';

  it('should detect invalid RunParameter consumption', async () => {
    const typedMind = await TypedMind.create();
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');
    const result = typedMind.check(content, filePath);

    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 3);

    // Check for orphaned entities
    const orphanedBadFunction = result.diagnostics.find((diagnostic) => diagnostic.message === "Orphaned entity 'badFunction'");
    assert.notEqual(orphanedBadFunction, undefined);

    const orphanedAnotherBadFunction = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Orphaned entity 'anotherBadFunction'",
    );
    assert.notEqual(orphanedAnotherBadFunction, undefined);

    // Should detect consuming unknown parameter
    const unknownParamDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Function 'badFunction' consumes unknown entity 'NON_EXISTENT_PARAM'",
    );
    assert.notEqual(unknownParamDiagnostic, undefined);
    assert.equal(unknownParamDiagnostic?.span.start.line, 12);
    assert.equal(unknownParamDiagnostic?.severity, 'error');

    // Get parsed entities using the source-graph parser directly, so the
    // concrete AST node classes used for narrowing below come from the same
    // module instance as the entities themselves — `@sammons/typed-mind`'s
    // TypedMind facade resolves through the compiled `dist/` build, a
    // distinct module graph from `src/ast/*-node.ts`.
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const parseResult = parser.parse(content);
    const entities = parseResult.entities;
    assert.equal(
      entities.some((entity) => entity.name === 'DATABASE_URL'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'APP_CONFIG'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'badFunction'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'anotherBadFunction'),
      true,
    );

    // Verify types
    const databaseUrl = entities.find((entity) => entity.name === 'DATABASE_URL' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(databaseUrl?.kind, 'RunParameter');
    assert.equal(databaseUrl?.paramType, 'env');

    const appConfig = entities.find((entity) => entity.name === 'APP_CONFIG');
    assert.equal(appConfig?.kind, 'Constants');
  });
});
