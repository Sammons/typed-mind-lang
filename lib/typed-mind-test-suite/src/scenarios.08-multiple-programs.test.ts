import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-08-multiple-programs', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-08-multiple-programs.tmd';

  it('should validate multiple programs when both reference valid File entities', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // Multiple programs should be valid when each references an existing File entity
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);

    // Verify the specific content being tested
    assert.ok(content.includes('TestApp -> MainFile v1.0.0'));
    assert.ok(content.includes('AnotherApp -> OtherFile v2.0.0'));
    assert.ok(content.includes('MainFile @ src/main.ts:'));
    assert.ok(content.includes('OtherFile @ src/other.ts:'));
  });

  it('should parse both Program and File entities correctly', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const programGraph = checker.parse(content);
    const entities = programGraph.entities;

    // Should have exactly 4 entities: 2 Programs + 2 Files
    assert.equal(entities.size, 4);

    // Check that both programs exist
    assert.equal(entities.has('TestApp'), true);
    assert.equal(entities.has('AnotherApp'), true);

    // Check that both files exist
    assert.equal(entities.has('MainFile'), true);
    assert.equal(entities.has('OtherFile'), true);

    // Verify program entities point to correct entry files
    const testApp = entities.get('TestApp');
    const anotherApp = entities.get('AnotherApp');

    assert.equal(testApp?.type, 'Program');
    assert.equal(testApp?.entry, 'MainFile');
    assert.equal(testApp?.version, '1.0.0');

    assert.equal(anotherApp?.type, 'Program');
    assert.equal(anotherApp?.entry, 'OtherFile');
    assert.equal(anotherApp?.version, '2.0.0');

    // Verify file entities have correct paths
    const mainFile = entities.get('MainFile');
    const otherFile = entities.get('OtherFile');

    assert.equal(mainFile?.type, 'File');
    assert.equal(mainFile?.path, 'src/main.ts');

    assert.equal(otherFile?.type, 'File');
    assert.equal(otherFile?.path, 'src/other.ts');
  });

  it('should demonstrate that TypedMind DSL allows multiple independent programs', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);

    // This test validates a key architectural decision: multiple programs are allowed
    // This enables scenarios like:
    // - Microservices architectures with multiple entry points
    // - Client/server applications with separate programs
    // - Multi-target builds (web, desktop, mobile)
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);

    // Verify no circular dependency errors between programs
    const circularDepErrors = result.errors.filter((err) => err.message.includes('Circular dependency'));
    assert.equal(circularDepErrors.length, 0);

    // Verify no entry point validation errors
    const entryPointErrors = result.errors.filter((err) => err.message.includes('entry point'));
    assert.equal(entryPointErrors.length, 0);
  });
});
