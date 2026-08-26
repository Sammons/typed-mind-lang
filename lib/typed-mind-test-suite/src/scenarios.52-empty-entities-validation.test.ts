import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 52: Empty Entities Validation', () => {
  it('should handle entities with empty lists and fields', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-52-empty-entities-validation.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content);

    // Most empty lists should be valid
    // The validator might warn about some cases but shouldn't error

    // Count warnings vs errors
    const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    const _warnings = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning');

    // Empty arrays should generally be valid
    // No errors expected for empty imports, exports, methods, calls, contains
    const emptyListErrors = errors.filter(
      (diagnostic) =>
        diagnostic.message.includes('empty') &&
        (diagnostic.message.includes('imports') ||
          diagnostic.message.includes('exports') ||
          diagnostic.message.includes('methods') ||
          diagnostic.message.includes('calls') ||
          diagnostic.message.includes('contains')),
    );
    assert.equal(emptyListErrors.length, 0);

    // Might have warnings for empty descriptions
    const emptyDescWarnings = result.diagnostics.filter(
      (diagnostic) => diagnostic.message.includes('description') && diagnostic.message.includes('empty'),
    );
    // These would be warnings, not errors
    emptyDescWarnings.forEach((w) => {
      assert.equal(w.severity, 'warning');
    });

    // File with no exports might get a warning
    const noExportWarning = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('EmptyFile') && diagnostic.message.includes('export'),
    );
    if (noExportWarning) {
      assert.equal(noExportWarning.severity, 'warning');
    }

    // Empty MainFile exports might be questionable
    const _mainFileEmptyExports = result.diagnostics.find(
      (diagnostic) => diagnostic.message.includes('MainFile') && diagnostic.message.includes('export'),
    );
    // This could be a warning or error depending on design

    // Overall, empty entities should mostly be valid
    // RFC-TM-4 §4 A2: `-> []` / `<- []` / `=> []` / `~> []` / `> []` (lines 5,
    // 6, 10, 11, 15, 19, 20, 30, 34) are now diagnosed as syntax errors
    // ("unparsable text: ...") instead of being silently accepted as valid
    // empty lists. That raises the non-Orphaned/non-not-exported error count
    // from the legacy 1 (only the multi-exported-entity error) to the actual
    // new count of 10 (9 new syntax diagnostics + the pre-existing
    // multi-exported error).
    const criticalErrors = errors.filter(
      (diagnostic) => !diagnostic.message.includes('Orphaned') && !diagnostic.message.includes('not exported'),
    );
    assert.equal(criticalErrors.length, 10);
  });
});
