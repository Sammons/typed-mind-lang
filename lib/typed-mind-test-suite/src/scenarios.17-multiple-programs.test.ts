import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-17-multiple-programs', () => {
  const scenarioFile = 'scenario-17-multiple-programs.tmd';

  it('should validate 17 multiple programs', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to validation errors
    assert.equal(result.valid, false);

    // RFC-TM-4 §4 A10 (illegal-continuation general class, TM-3 FAQ Q7/§3.3
    // F3): `-> [IndexHTML]` (line 10) is an exports-list continuation on an
    // Asset entity, which the new checker flags as illegal-continuation. This
    // is the ONLY classified delta for this scenario (shadow-verdict-full.log
    // AUTHORIZED[A10], line 10). "Orphaned entity 'TypedMindRenderer'" is NOT
    // a delta — legacy already reports it (verified directly against
    // DSLChecker: legacy count is 13, including that orphan). New count is
    // legacy's 13 plus the one A10 warning = 14.
    assert.equal(result.diagnostics.length, 14);
    const illegalContinuationDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.code === 'semantics/illegal-continuation');
    assert.equal(illegalContinuationDiagnostics.length, 1);
    // RFC-TM-10 §12 (D-LEG-12, Q7): `semantics/illegal-continuation`'s message
    // was rewritten — the leading "illegal continuation:" log-tag phrasing
    // read as internal terminology, not prose a `.tmd` author would parse as a
    // sentence — and gained a trailing suggestion clause (folded into
    // `message`, since the pipeline-level `Diagnostic` type carries no
    // `suggestion` field).
    assert.equal(
      illegalContinuationDiagnostics.at(0)?.message,
      'This exports list (`-> [...]`) cannot attach to a Asset entity — move it under an entity kind that accepts it, or remove it',
    );

    // Check for entry point validation errors
    const entryPointDiagnostics = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.message.includes("Cannot use 'entry' to reference Asset 'IndexHTML'") ||
        diagnostic.message.includes("Program 'UIProgram' entry point 'IndexHTML' must be a File entity"),
    );
    assert.equal(entryPointDiagnostics.length, 2);

    // Check for orphaned UIComponent entities
    const orphanedUIDiagnostics = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.message.includes('Orphaned entity') &&
        (diagnostic.message.includes('AppContainer') ||
          diagnostic.message.includes('Sidebar') ||
          diagnostic.message.includes('GraphCanvas') ||
          diagnostic.message.includes('DetailsPanel') ||
          diagnostic.message.includes('ErrorPanel')),
    );
    assert.equal(orphanedUIDiagnostics.length, 5);

    // Check for UIComponent containment errors
    const uiContainmentDiagnostics = result.diagnostics.filter((diagnostic) =>
      diagnostic.message.includes('is not contained by any other UIComponent'),
    );
    assert.equal(uiContainmentDiagnostics.length, 5);

    // Verify specific error messages exist
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Cannot use 'entry' to reference Asset 'IndexHTML'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("Program 'UIProgram' entry point 'IndexHTML' must be a File entity"),
      ),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'AppContainer'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'Sidebar'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'GraphCanvas'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'DetailsPanel'")),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes("Orphaned entity 'ErrorPanel'")),
      true,
    );

    // Verify UIComponent containment errors for each component
    assert.equal(
      result.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("UIComponent 'AppContainer' is not contained by any other UIComponent"),
      ),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("UIComponent 'Sidebar' is not contained by any other UIComponent"),
      ),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("UIComponent 'GraphCanvas' is not contained by any other UIComponent"),
      ),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("UIComponent 'DetailsPanel' is not contained by any other UIComponent"),
      ),
      true,
    );
    assert.equal(
      result.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("UIComponent 'ErrorPanel' is not contained by any other UIComponent"),
      ),
      true,
    );
  });
});
