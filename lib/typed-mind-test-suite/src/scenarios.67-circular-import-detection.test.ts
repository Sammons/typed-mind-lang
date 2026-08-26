import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 67: Circular import detection', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-67-circular-import-detection.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should detect direct circular imports between two files', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // Should have errors about ModuleA <-> ModuleB circular import
    const circularErrors = validation.findings.filter(
      (e) => e.message.toLowerCase().includes('circular') && (e.message.includes('ModuleA') || e.message.includes('ModuleB')),
    );

    assert.ok(circularErrors.length > 0);
    assert.equal(validation.valid, false);
  });

  it('should detect indirect circular imports through chain', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // Should detect ServiceA -> ServiceB -> ServiceC -> ServiceA cycle
    const circularErrors = validation.findings.filter(
      (e) =>
        e.message.toLowerCase().includes('circular') &&
        (e.message.includes('ServiceA') || e.message.includes('ServiceB') || e.message.includes('ServiceC')),
    );

    assert.ok(circularErrors.length > 0);
  });

  it('should detect self-imports as circular', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // Should detect SelfImporter importing itself
    const selfImportErrors = validation.findings.filter(
      (e) => e.message.toLowerCase().includes('circular') && e.message.includes('SelfImporter'),
    );

    assert.ok(selfImportErrors.length > 0);
  });

  it('should not flag valid non-circular imports', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // ValidModule, HelperA, HelperB should not have circular import errors
    const validModuleErrors = validation.findings.filter(
      (e) =>
        e.message.toLowerCase().includes('circular') &&
        (e.message.includes('ValidModule') || e.message.includes('HelperA') || e.message.includes('HelperB')),
    );

    assert.equal(validModuleErrors.length, 0);
  });

  it('should report specific files involved in circular dependency', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // Error messages should be informative
    const circularErrors = validation.findings.filter((e) => e.message.toLowerCase().includes('circular'));

    // Should mention the specific files involved
    const hasSpecificFileInfo = circularErrors.some(
      (e) =>
        (e.message.includes('ModuleA') && e.message.includes('ModuleB')) ||
        (e.message.includes('ServiceA') && e.message.includes('ServiceC')) ||
        e.message.includes('SelfImporter'),
    );

    assert.equal(hasSpecificFileInfo, true);
  });

  it('should mark validation as invalid when circular imports exist', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    assert.equal(validation.valid, false);

    const circularErrors = validation.findings.filter((e) => e.message.toLowerCase().includes('circular'));

    assert.ok(circularErrors.length > 0);
  });

  it('should handle circular imports in Files not ClassFiles', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // All test entities should be Files, not ClassFiles
    const moduleA = outcome.entities.find((e) => e.name === 'ModuleA');
    const moduleB = outcome.entities.find((e) => e.name === 'ModuleB');

    assert.equal(moduleA?.kind, 'File');
    assert.equal(moduleB?.kind, 'File');
  });

  it('should provide severity level for circular import errors', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    const circularErrors = validation.findings.filter((e) => e.message.toLowerCase().includes('circular'));

    // Circular imports should be errors, not warnings
    circularErrors.forEach((error) => {
      assert.equal(error.severity, 'error');
    });
  });
});
