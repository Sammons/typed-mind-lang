import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-34-cli-tool', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-34-cli-tool.tmd';

  it('should validate CLI tool architecture', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    const parsed = checker.parse(content);

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);

    // Should have the main program
    assert.equal(parsed.entities.has('TaskMaster'), true);
    const app = parsed.entities.get('TaskMaster');
    assert.equal(app?.type, 'Program');
    if (app?.type === 'Program') {
      assert.equal(app.entry, 'MainFile');
      assert.equal(app.version, '1.5.0');
    }

    // Should have core files
    assert.equal(parsed.entities.has('MainFile'), true);
    assert.equal(parsed.entities.has('CLIFile'), true);
    assert.equal(parsed.entities.has('CommandsFile'), true);
    assert.equal(parsed.entities.has('TaskRunnerFile'), true);

    // Should have task management files
    assert.equal(parsed.entities.has('TaskRegistryFile'), true);
    assert.equal(parsed.entities.has('TaskSchedulerFile'), true);
    assert.equal(parsed.entities.has('DependencyResolverFile'), true);
    assert.equal(parsed.entities.has('WorkerPoolFile'), true);

    // Should have configuration files
    assert.equal(parsed.entities.has('ConfigLoaderFile'), true);
    assert.equal(parsed.entities.has('SchemaValidatorFile'), true);

    // Should have utility files
    assert.equal(parsed.entities.has('UtilsFile'), true);
    assert.equal(parsed.entities.has('Logger'), true);
    assert.equal(parsed.entities.has('FileUtils'), true);
    assert.equal(parsed.entities.has('ProcessUtils'), true);

    // Should have environment variables
    assert.equal(parsed.entities.has('NODE_ENV'), true);
    assert.equal(parsed.entities.has('TASKMASTER_HOME'), true);
    assert.equal(parsed.entities.has('PARALLEL_JOBS'), true);
    assert.equal(parsed.entities.has('LOG_LEVEL'), true);

    // Check environment variable types
    const nodeEnv = parsed.entities.get('NODE_ENV');
    assert.equal(nodeEnv?.type, 'RunParameter');
    if (nodeEnv?.type === 'RunParameter') {
      assert.equal(nodeEnv.paramType, 'env');
      assert.equal(nodeEnv.defaultValue, 'development');
    }

    const parallelJobs = parsed.entities.get('PARALLEL_JOBS');
    assert.equal(parallelJobs?.type, 'RunParameter');
    if (parallelJobs?.type === 'RunParameter') {
      assert.equal(parallelJobs.paramType, 'env');
      assert.equal(parallelJobs.defaultValue, '4');
    }

    // Should have service classes
    assert.equal(parsed.entities.has('cli'), true);
    assert.equal(parsed.entities.has('taskRunner'), true);
    assert.equal(parsed.entities.has('taskRegistry'), true);
    assert.equal(parsed.entities.has('configLoader'), true);

    // Should have task types
    assert.equal(parsed.entities.has('ShellTask'), true);
    assert.equal(parsed.entities.has('FileTask'), true);
    assert.equal(parsed.entities.has('HttpTask'), true);
    assert.equal(parsed.entities.has('DockerTask'), true);

    // Should have key functions
    assert.equal(parsed.entities.has('main'), true);
    assert.equal(parsed.entities.has('runCommand'), true);
    assert.equal(parsed.entities.has('buildCommand'), true);
    assert.equal(parsed.entities.has('runTask'), true);
    assert.equal(parsed.entities.has('loadConfig'), true);

    // Should have DTOs
    assert.equal(parsed.entities.has('CLIArgs'), true);
    assert.equal(parsed.entities.has('RunOptions'), true);
    assert.equal(parsed.entities.has('TaskDefinition'), true);
    assert.equal(parsed.entities.has('TaskResult'), true);
    assert.equal(parsed.entities.has('Config'), true);

    // Check that key functions consume environment variables
    const runCommandFunc = parsed.entities.get('runCommand');
    assert.equal(runCommandFunc?.type, 'Function');
    if (runCommandFunc?.type === 'Function') {
      assert.ok(runCommandFunc.consumes.includes('PARALLEL_JOBS'));
      assert.ok(runCommandFunc.consumes.includes('NODE_VERSION'));
    }

    const loadConfigFunc = parsed.entities.get('loadConfig');
    assert.equal(loadConfigFunc?.type, 'Function');
    if (loadConfigFunc?.type === 'Function') {
      assert.ok(loadConfigFunc.consumes.includes('CONFIG_FILE'));
      assert.ok(loadConfigFunc.consumes.includes('TASKMASTER_HOME'));
    }

    // Should have external dependencies
    assert.equal(parsed.dependencies.has('commander'), true);
    assert.equal(parsed.dependencies.has('chalk'), true);
    assert.equal(parsed.dependencies.has('ora'), true);
    assert.equal(parsed.dependencies.has('yaml'), true);
    assert.equal(parsed.dependencies.has('winston'), true);

    // Verify entity count is reasonable for a CLI tool
    assert.ok(parsed.entities.size > 70);
  });
});
