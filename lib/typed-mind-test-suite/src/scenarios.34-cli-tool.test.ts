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

describe('scenario-34-cli-tool', () => {
  const scenarioFile = 'scenario-34-cli-tool.tmd';

  it('should validate CLI tool architecture', async () => {
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
      entities.some((entity) => entity.name === 'TaskMaster'),
      true,
    );
    const app = entities.find((entity) => entity.name === 'TaskMaster' && entity instanceof ProgramNode) as ProgramNode | undefined;
    assert.equal(app?.kind, 'Program');
    assert.equal(app?.entry, 'MainFile');
    assert.equal(app?.version, '1.5.0');

    // Should have core files
    assert.equal(
      entities.some((entity) => entity.name === 'MainFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'CLIFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'CommandsFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TaskRunnerFile'),
      true,
    );

    // Should have task management files
    assert.equal(
      entities.some((entity) => entity.name === 'TaskRegistryFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TaskSchedulerFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'DependencyResolverFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'WorkerPoolFile'),
      true,
    );

    // Should have configuration files
    assert.equal(
      entities.some((entity) => entity.name === 'ConfigLoaderFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'SchemaValidatorFile'),
      true,
    );

    // Should have utility files
    assert.equal(
      entities.some((entity) => entity.name === 'UtilsFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Logger'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'FileUtils'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ProcessUtils'),
      true,
    );

    // Should have environment variables
    assert.equal(
      entities.some((entity) => entity.name === 'NODE_ENV'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TASKMASTER_HOME'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PARALLEL_JOBS'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'LOG_LEVEL'),
      true,
    );

    // Check environment variable types
    const nodeEnv = entities.find((entity) => entity.name === 'NODE_ENV' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(nodeEnv?.kind, 'RunParameter');
    assert.equal(nodeEnv?.paramType, 'env');
    assert.equal(nodeEnv?.defaultValue, 'development');

    const parallelJobs = entities.find((entity) => entity.name === 'PARALLEL_JOBS' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(parallelJobs?.kind, 'RunParameter');
    assert.equal(parallelJobs?.paramType, 'env');
    assert.equal(parallelJobs?.defaultValue, '4');

    // Should have service classes
    assert.equal(
      entities.some((entity) => entity.name === 'cli'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'taskRunner'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'taskRegistry'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'configLoader'),
      true,
    );

    // Should have task types
    assert.equal(
      entities.some((entity) => entity.name === 'ShellTask'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'FileTask'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'HttpTask'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'DockerTask'),
      true,
    );

    // Should have key functions
    assert.equal(
      entities.some((entity) => entity.name === 'main'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'runCommand'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'buildCommand'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'runTask'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'loadConfig'),
      true,
    );

    // Should have DTOs
    assert.equal(
      entities.some((entity) => entity.name === 'CLIArgs'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'RunOptions'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TaskDefinition'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TaskResult'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Config'),
      true,
    );

    // Check that key functions consume environment variables
    const runCommandFunc = entities.find((entity) => entity.name === 'runCommand' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(runCommandFunc?.kind, 'Function');
    assert.ok(runCommandFunc?.consumes?.includes('PARALLEL_JOBS'));
    assert.ok(runCommandFunc?.consumes?.includes('NODE_VERSION'));

    const loadConfigFunc = entities.find((entity) => entity.name === 'loadConfig' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(loadConfigFunc?.kind, 'Function');
    assert.ok(loadConfigFunc?.consumes?.includes('CONFIG_FILE'));
    assert.ok(loadConfigFunc?.consumes?.includes('TASKMASTER_HOME'));

    // Should have external dependencies. The legacy `ParseResult.dependencies`
    // Map (DSLChecker-internal call/import graph) keyed every entity by name
    // regardless of kind (index.ts buildDependencyGraph), so `.has(name)` was
    // equivalent to entity presence — checked directly here on the new
    // entity list.
    assert.equal(
      entities.some((entity) => entity.name === 'commander'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'chalk'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ora'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'yaml'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'winston'),
      true,
    );

    // Verify entity count is reasonable for a CLI tool
    assert.ok(entities.length > 70);
  });
});
