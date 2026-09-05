// RFC-TM-4 §1 / Diamond DAG Q1 (rfc-tm-4-diamond.md) — the S-CORE-1 validator
// port. AstValidator consumes ParseOutcome + LinkIndex and runs the ported
// 22-call catalog (validator.ts:117-145) in the legacy orchestration order:
//   - populateReferencedBy's population half is replaced by the LinkIndex; its
//     validation half is the reference-legality check (F1 disposition);
//   - processNamingConflicts + checkNamingConflicts collapse into the
//     originated duplicate-name check (which also folds in the index.ts:118
//     facade conflict error);
//   - every other check ports 1:1, messages and suggestions verbatim, spans
//     from the real AST spans (I-6).
// The result exposes both wire shapes (§1): `toValidationErrors(findings)`
// for the legacy facade view and `toDiagnostics(findings)` for the new
// surface. This module is consumed only by its tests and the shadow-verdict
// harness until the Q3 flip — index.ts and consumers are untouched in Q1.

import type { LinkIndex } from '../pipeline/link-index.ts';
import type { ParseOutcome } from '../pipeline/parse-outcome.ts';
import { checkAssetProgramRelationships } from './check-assets.ts';
import { CheckContext } from './check-context.ts';
import { checkCircularDeps, checkCircularUiContainment, checkInheritanceChains } from './check-cycles.ts';
import { checkDtoFieldTypes } from './check-dto-fields.ts';
import { checkDuplicateNames } from './check-duplicate-names.ts';
import { checkEntryPoint } from './check-entry-point.ts';
import { checkClassAndFunctionExports, checkDuplicateExports, checkUndefinedExports } from './check-exports.ts';
import { checkFunctionConsumption, checkFunctionDependencies, checkFunctionDtos } from './check-function-graph.ts';
import { checkGenericDeclarations } from './check-generic-declarations.ts';
import { checkImports } from './check-imports.ts';
import { checkMethodCalls } from './check-method-calls.ts';
import { checkOrphans } from './check-orphans.ts';
import { checkReferenceLegality } from './check-reference-legality.ts';
import { checkRunParameterConsumedBy } from './check-run-parameters.ts';
import { checkFunctionUiComponentAffects, checkUiComponentContainment, checkUiComponentRelationships } from './check-ui-components.ts';
import { checkUniquePaths } from './check-unique-paths.ts';
import type { CheckerFinding } from './finding.ts';

export interface AstValidatorOptions {
  readonly skipOrphanCheck?: boolean;
}

export interface AstValidationResult {
  readonly valid: boolean;
  readonly findings: readonly CheckerFinding[];
}

export class AstValidator {
  readonly #options: AstValidatorOptions;

  constructor(options: AstValidatorOptions = {}) {
    this.#options = options;
  }

  validate(outcome: ParseOutcome, links: LinkIndex): AstValidationResult {
    const context = new CheckContext({
      entities: outcome.entities,
      links,
      parseDiagnostics: outcome.diagnostics,
    });

    for (const entity of context.byName.values()) {
      if (entity.name.includes('.')) context.resolveName(entity.name, entity.span);
    }

    // Legacy orchestration order (validator.ts:117-145).
    checkReferenceLegality(context);
    checkDuplicateNames(context);
    if (this.#options.skipOrphanCheck !== true) {
      checkOrphans(context);
    }
    checkImports(context);
    checkCircularDeps(context);
    checkCircularUiContainment(context);
    checkInheritanceChains(context);
    checkEntryPoint(context);
    checkUniquePaths(context);
    checkClassAndFunctionExports(context);
    checkDuplicateExports(context);
    checkMethodCalls(context);
    checkUndefinedExports(context);
    checkFunctionDtos(context);
    checkFunctionDependencies(context);
    checkDtoFieldTypes(context);
    checkGenericDeclarations(context);
    checkUiComponentRelationships(context);
    checkFunctionUiComponentAffects(context);
    checkAssetProgramRelationships(context);
    checkUiComponentContainment(context);
    checkFunctionConsumption(context);
    checkRunParameterConsumedBy(context);

    return {
      valid: context.findings.every((finding) => finding.severity !== 'error'),
      findings: context.findings,
    };
  }
}
