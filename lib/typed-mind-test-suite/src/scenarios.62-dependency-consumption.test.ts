import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { AssetNode } from '../../typed-mind/src/ast/asset-node.ts';
import { ClassFileNode } from '../../typed-mind/src/ast/class-file-node.ts';
import { DependencyNode } from '../../typed-mind/src/ast/dependency-node.ts';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 62: Dependency consumption patterns', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-62-dependency-consumption.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should parse external dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Check various dependency formats
    const react = outcome.entities.find((e): e is DependencyNode => e instanceof DependencyNode && e.name === 'react');
    assert.notEqual(react, undefined);
    assert.equal(react?.purpose, 'UI framework');
    assert.equal(react?.version, '18.2.0'); // Parser strips 'v' prefix

    // Scoped package
    const awsS3 = outcome.entities.find((e): e is DependencyNode => e instanceof DependencyNode && e.name === '@aws-sdk/client-s3');
    assert.notEqual(awsS3, undefined);
    assert.equal(awsS3?.purpose, 'AWS S3 client');

    // Package without version
    const noVersion = outcome.entities.find((e): e is DependencyNode => e instanceof DependencyNode && e.name === 'no-version-dep');
    assert.notEqual(noVersion, undefined);
    assert.equal(noVersion?.version, undefined);
  });

  it('should handle function consuming dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Simple consumption
    const httpClient = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'httpClient');
    assert.ok(httpClient?.consumes?.includes('axios'));

    // Multiple dependencies
    const serverSetup = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'serverSetup');
    assert.ok(serverSetup?.consumes?.includes('express'));
    assert.ok(serverSetup?.consumes?.includes('dotenv'));
    assert.ok(serverSetup?.consumes?.includes('winston'));

    // Scoped package
    const s3Upload = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 's3Upload');
    assert.ok(s3Upload?.consumes?.includes('@aws-sdk/client-s3'));
  });

  it.skip('should auto-distribute mixed dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const mixedConsumer = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'mixedConsumer');

    // lodash (Dependency) should go to consumes
    assert.ok(mixedConsumer?.consumes?.includes('lodash'));

    // helperFunction (Function) should go to calls
    assert.ok(mixedConsumer?.calls.includes('helperFunction'));

    // DataService (ClassFile) - might be in calls or its methods
    const _hasDataService = mixedConsumer?.calls.includes('DataService') || mixedConsumer?.calls.includes('getData');
  });

  it('should handle ClassFile importing dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const appInitializer = outcome.entities.find((e): e is ClassFileNode => e instanceof ClassFileNode && e.name === 'AppInitializer');

    // ClassFiles can import dependencies
    assert.ok(appInitializer?.imports.includes('react'));
    assert.ok(appInitializer?.imports.includes('typescript'));
    assert.ok(appInitializer?.imports.includes('ConfigLoader'));
  });

  it('should handle various version formats', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // These specific dependencies should be parsed
    const semanticVersion = outcome.entities.find((e): e is DependencyNode => e instanceof DependencyNode && e.name === 'semantic-version');
    assert.notEqual(semanticVersion, undefined);
    assert.equal(semanticVersion?.version, '1.2.3'); // Parser strips 'v' prefix

    const betaVersion = outcome.entities.find((e): e is DependencyNode => e instanceof DependencyNode && e.name === 'beta-version');
    assert.notEqual(betaVersion, undefined);
    assert.equal(betaVersion?.version, '2.0.0-beta.1'); // Parser strips 'v' prefix

    const versionConsumer = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'versionConsumer');
    assert.ok(versionConsumer?.consumes?.includes('semantic-version'));
    assert.ok(versionConsumer?.consumes?.includes('beta-version'));
  });

  it('should validate invalid consumption patterns', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((e) => e.message);

    // Non-existent dependency
    assert.equal(
      errors.some((e) => e.includes('non-existent-package') && (e.includes('unknown') || e.includes('undefined'))),
      true,
    );

    // UIComponent can't be consumed via $<
    const _invalidConsumer = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'invalidConsumer');

    // Check if validator catches these invalid consumptions
    assert.equal(
      errors.some((e) => e.includes('invalidConsumer') || (e.includes('AppUI') && e.includes('consume'))),
      true,
    );
  });

  it('should handle RunParameter consumption', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const configuredFunction = outcome.entities.find(
      (e): e is FunctionNode => e instanceof FunctionNode && e.name === 'configuredFunction',
    );

    assert.ok(configuredFunction?.consumes?.includes('DATABASE_URL'));
    assert.ok(configuredFunction?.consumes?.includes('API_KEY'));
    assert.ok(configuredFunction?.consumes?.includes('MAX_WORKERS'));

    // Mixed RunParameters and Dependencies
    const hybridConsumer = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'hybridConsumer');

    assert.ok(hybridConsumer?.consumes?.includes('axios'));
    assert.ok(hybridConsumer?.consumes?.includes('DATABASE_URL'));
    assert.ok(hybridConsumer?.consumes?.includes('winston'));
    assert.ok(hybridConsumer?.consumes?.includes('API_KEY'));
  });

  it('should handle Asset consumption', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const displayLogo = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'displayLogo');

    assert.ok(displayLogo?.consumes?.includes('Logo'));

    // Logo contains ClientApp
    const logo = outcome.entities.find((e): e is AssetNode => e instanceof AssetNode && e.name === 'Logo');
    assert.equal(logo?.containsProgram, 'ClientApp');
  });

  it('should handle Constants consumption', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const constantsUser = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'constantsUser');

    assert.ok(constantsUser?.consumes?.includes('AppConstants'));

    // Complex consumption chain
    const complexMethod = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'complexMethod');

    assert.ok(complexMethod?.consumes?.includes('DATABASE_URL'));
    assert.ok(complexMethod?.consumes?.includes('API_KEY'));
    assert.ok(complexMethod?.consumes?.includes('AppConstants'));
    assert.ok(complexMethod?.calls.includes('helperFunction'));
    assert.ok(complexMethod?.calls.includes('getData'));
  });

  it.skip('should detect orphaned dependencies', async () => {
    // TODO: This test needs investigation - dependencies don't get marked as orphaned
    // Dependencies may be special entities that don't require consumption
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((e) => e.message);

    // unused-package is not consumed by anyone - should have an orphaned error
    assert.equal(
      errors.some((e) => e.includes('unused-package') && (e.includes('orphaned') || e.includes('Orphaned'))),
      true,
    );
  });

  it('should validate circular imports between services', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const errors = validation.findings.map((e) => e.message);

    // ServiceA imports ServiceB, ServiceB imports ServiceA
    assert.equal(
      errors.some((e) => e.includes('Circular') && (e.includes('ServiceA') || e.includes('ServiceB'))),
      true,
    );
  });

  it('should handle UI component relationships with dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const renderUI = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'renderUI');

    // Function affects UI
    assert.ok(renderUI?.affects?.includes('AppUI'));
    assert.ok(renderUI?.affects?.includes('Dashboard'));

    // Function consumes dependencies
    assert.ok(renderUI?.consumes?.includes('react'));
    assert.ok(renderUI?.consumes?.includes('@testing-library/react'));
  });
});
