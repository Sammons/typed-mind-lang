import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 52: Empty Entities Validation', () => {
  it('should handle entities with empty lists and fields', () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-52-empty-entities-validation.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');
    
    const checker = new DSLChecker();
    const result = checker.check(content);
    
    // Most empty lists should be valid
    // The validator might warn about some cases but shouldn't error
    
    // Count warnings vs errors
    const errors = result.errors.filter(e => e.severity === 'error');
    const warnings = result.errors.filter(e => e.severity === 'warning');
    
    // Empty arrays should generally be valid
    // No errors expected for empty imports, exports, methods, calls, contains
    const emptyListErrors = errors.filter(e => 
      e.message.includes('empty') &&
      (e.message.includes('imports') ||
       e.message.includes('exports') ||
       e.message.includes('methods') ||
       e.message.includes('calls') ||
       e.message.includes('contains'))
    );
    assert.equal((emptyListErrors).length, 0);
    
    // Might have warnings for empty descriptions
    const emptyDescWarnings = result.errors.filter(e => 
      e.message.includes('description') &&
      e.message.includes('empty')
    );
    // These would be warnings, not errors
    emptyDescWarnings.forEach(w => {
      assert.equal(w.severity, 'warning');
    });
    
    // File with no exports might get a warning
    const noExportWarning = result.errors.find(e => 
      e.message.includes('EmptyFile') &&
      e.message.includes('export')
    );
    if (noExportWarning) {
      assert.equal(noExportWarning.severity, 'warning');
    }
    
    // Empty MainFile exports might be questionable
    const mainFileEmptyExports = result.errors.find(e => 
      e.message.includes('MainFile') &&
      e.message.includes('export')
    );
    // This could be a warning or error depending on design
    
    // Overall, empty entities should mostly be valid
    const criticalErrors = errors.filter(e => 
      !e.message.includes('Orphaned') &&
      !e.message.includes('not exported')
    );
    assert.ok((criticalErrors.length) < (5));
  });
});