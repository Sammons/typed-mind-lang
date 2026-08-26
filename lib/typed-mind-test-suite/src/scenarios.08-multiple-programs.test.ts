import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-08-multiple-programs', () => {
  const scenarioFile = 'scenario-08-multiple-programs.tmd';

  it('should validate multiple programs when both reference valid File entities', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // RFC-TM-4 §4 A2: the empty exports list `-> []` (L7, L10) is now diagnosed
    // as a syntax/error ("unparsable text") instead of parsing silently, so the
    // scenario is no longer clean-valid on the new surface.
    assert.equal(result.valid, false); // was true
    assert.equal(result.diagnostics.length, 2); // was 0

    assert.ok(result.diagnostics.every((diagnostic) => diagnostic.message === 'unparsable text: `-> []`'));
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.span.start.line === 7));
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.span.start.line === 10));

    // Verify the specific content being tested
    assert.ok(content.includes('TestApp -> MainFile v1.0.0'));
    assert.ok(content.includes('AnotherApp -> OtherFile v2.0.0'));
    assert.ok(content.includes('MainFile @ src/main.ts:'));
    assert.ok(content.includes('OtherFile @ src/other.ts:'));
  });

  it('should parse both Program and File entities correctly', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const parseOutput = typedMind.parse(content);
    const entities = parseOutput.entities;

    // Should have exactly 4 entities: 2 Programs + 2 Files
    assert.equal(entities.length, 4);

    // Check that both programs exist
    assert.equal(
      entities.some((entity) => entity.name === 'TestApp'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'AnotherApp'),
      true,
    );

    // Check that both files exist
    assert.equal(
      entities.some((entity) => entity.name === 'MainFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'OtherFile'),
      true,
    );

    // Verify program entities point to correct entry files
    const testApp = entities.find((entity) => entity.name === 'TestApp');
    const anotherApp = entities.find((entity) => entity.name === 'AnotherApp');

    assert.equal(testApp?.kind, 'Program');
    assert.equal((testApp as { entry?: string })?.entry, 'MainFile');
    assert.equal((testApp as { version?: string })?.version, '1.0.0');

    assert.equal(anotherApp?.kind, 'Program');
    assert.equal((anotherApp as { entry?: string })?.entry, 'OtherFile');
    assert.equal((anotherApp as { version?: string })?.version, '2.0.0');

    // Verify file entities have correct paths
    const mainFile = entities.find((entity) => entity.name === 'MainFile');
    const otherFile = entities.find((entity) => entity.name === 'OtherFile');

    assert.equal(mainFile?.kind, 'File');
    assert.equal((mainFile as { path?: string })?.path, 'src/main.ts');

    assert.equal(otherFile?.kind, 'File');
    assert.equal((otherFile as { path?: string })?.path, 'src/other.ts');
  });

  it('should demonstrate that TypedMind DSL allows multiple independent programs', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // This test validates a key architectural decision: multiple programs are allowed
    // This enables scenarios like:
    // - Microservices architectures with multiple entry points
    // - Client/server applications with separate programs
    // - Multi-target builds (web, desktop, mobile)
    //
    // RFC-TM-4 §4 A2: the empty exports list `-> []` on both File entities is now
    // a syntax/error, so this scenario is no longer clean-valid on the new surface,
    // but the property under test here (no circular dependency, no entry point
    // validation errors between the two programs) still holds.
    assert.equal(result.valid, false); // was true
    assert.equal(result.diagnostics.length, 2); // was 0

    // Verify no circular dependency errors between programs
    const circularDepDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.message.includes('Circular dependency'));
    assert.equal(circularDepDiagnostics.length, 0);

    // Verify no entry point validation errors
    const entryPointDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.message.includes('entry point'));
    assert.equal(entryPointDiagnostics.length, 0);
  });
});
