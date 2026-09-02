// RFC-TM-4 §4 (rfc-tm-4-diamond.md) — S-TEST-1 helper, not a test file (the
// package's `node --test 'src/*.test.ts'` glob does not pick this up).
//
// `TypedMind.check()`/`.parse()` (typed-mind.ts) do not wire cross-file
// `@import` resolution — the facade accepts `filePath` but leaves it unused
// by design (typed-mind.ts:29-36, "a separate, unbound concern with no check
// binding" in this Quantum). The scenarios that exercise `@import`
// (scenario-20 through scenario-25) still need it to reach parity with the
// legacy DSLChecker behavior those tests assert. `ImportResolver` and
// `computeLinks`/`AstValidator` are already ported (TM-3 S-PARSE-5, TM-4 §1)
// but not exported from the package's public surface (`index.ts`) — this
// helper composes them exactly as the shadow-verdict harness does
// (lib/typed-mind/scripts/shadow-verdict-harness.mjs `runNew`), via relative
// imports into `lib/typed-mind/src/pipeline` and `src/checker`, the same
// precedented pattern the 16 direct-import test files already use for
// `DSLParser`/`DSLValidator`. No lib/typed-mind source changes.

import { dirname } from 'node:path';
import type { Diagnostic } from '../../typed-mind/src/ast/diagnostic.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { toDiagnostics } from '../../typed-mind/src/checker/finding.ts';
import { ImportResolver } from '../../typed-mind/src/pipeline/import-resolver.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import type { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';

export interface CheckWithImportsResult {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

// One parser instance per call — the legacy-equivalent fresh-checker-per-call
// discipline the shadow harness documents (a resolver's per-instance path
// cache stores alias-prefixed clones; reusing an instance across calls with
// aliased imports cross-contaminates aliases).
export const checkWithImports = async (parser: TypedMindParser, content: string, filePath: string): Promise<CheckWithImportsResult> => {
  const outcome = parser.parse(content);
  const entities = [...outcome.entities];
  const diagnostics = [...outcome.diagnostics];
  if (outcome.imports.length > 0) {
    const resolver = new ImportResolver(parser);
    const resolved = resolver.resolveImports(outcome.imports, dirname(filePath));
    entities.push(...resolved.resolvedEntities.values());
    diagnostics.push(...resolved.diagnostics);
  }
  const links = computeLinks(entities);
  const validation = new AstValidator().validate(
    { entities, imports: outcome.imports, suppressions: outcome.suppressions, diagnostics },
    links,
  );
  const allDiagnostics = [...diagnostics, ...toDiagnostics(validation.findings)];
  const valid = allDiagnostics.every((diagnostic) => diagnostic.severity !== 'error');
  return { valid, diagnostics: allDiagnostics };
};
