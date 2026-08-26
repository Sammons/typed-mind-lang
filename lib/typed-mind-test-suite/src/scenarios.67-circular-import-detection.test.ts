import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 67: Circular import detection', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-67-circular-import-detection.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should detect direct circular imports between two files', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);

    // Should have errors about ModuleA <-> ModuleB circular import
    const circularErrors = validationResult.errors.filter(
      (e) => e.message.toLowerCase().includes('circular') && (e.message.includes('ModuleA') || e.message.includes('ModuleB')),
    );

    assert.ok(circularErrors.length > 0);
    assert.equal(validationResult.valid, false);
  });

  it('should detect indirect circular imports through chain', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);

    // Should detect ServiceA -> ServiceB -> ServiceC -> ServiceA cycle
    const circularErrors = validationResult.errors.filter(
      (e) =>
        e.message.toLowerCase().includes('circular') &&
        (e.message.includes('ServiceA') || e.message.includes('ServiceB') || e.message.includes('ServiceC')),
    );

    assert.ok(circularErrors.length > 0);
  });

  it('should detect self-imports as circular', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);

    // Should detect SelfImporter importing itself
    const selfImportErrors = validationResult.errors.filter(
      (e) => e.message.toLowerCase().includes('circular') && e.message.includes('SelfImporter'),
    );

    assert.ok(selfImportErrors.length > 0);
  });

  it('should not flag valid non-circular imports', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);

    // ValidModule, HelperA, HelperB should not have circular import errors
    const validModuleErrors = validationResult.errors.filter(
      (e) =>
        e.message.toLowerCase().includes('circular') &&
        (e.message.includes('ValidModule') || e.message.includes('HelperA') || e.message.includes('HelperB')),
    );

    assert.equal(validModuleErrors.length, 0);
  });

  it('should report specific files involved in circular dependency', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);

    // Error messages should be informative
    const circularErrors = validationResult.errors.filter((e) => e.message.toLowerCase().includes('circular'));

    // Should mention the specific files involved
    const hasSpecificFileInfo = circularErrors.some(
      (e) =>
        (e.message.includes('ModuleA') && e.message.includes('ModuleB')) ||
        (e.message.includes('ServiceA') && e.message.includes('ServiceC')) ||
        e.message.includes('SelfImporter'),
    );

    assert.equal(hasSpecificFileInfo, true);
  });

  it('should mark validation as invalid when circular imports exist', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);

    assert.equal(validationResult.valid, false);

    const circularErrors = validationResult.errors.filter((e) => e.message.toLowerCase().includes('circular'));

    assert.ok(circularErrors.length > 0);
  });

  it('should handle circular imports in Files not ClassFiles', () => {
    const parseResult = parser.parse(content);

    // All test entities should be Files, not ClassFiles
    const moduleA = Array.from(parseResult.entities.values()).find((e) => e.name === 'ModuleA');
    const moduleB = Array.from(parseResult.entities.values()).find((e) => e.name === 'ModuleB');

    assert.equal(moduleA?.type, 'File');
    assert.equal(moduleB?.type, 'File');
  });

  it('should provide severity level for circular import errors', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);

    const circularErrors = validationResult.errors.filter((e) => e.message.toLowerCase().includes('circular'));

    // Circular imports should be errors, not warnings
    circularErrors.forEach((error) => {
      assert.equal(error.severity, 'error');
    });
  });
});
