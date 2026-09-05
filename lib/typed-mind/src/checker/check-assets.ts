// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — DSLValidator.checkAssetProgramRelationships
// ported verbatim (validator.ts:1108-1134): containsProgram existence + kind.

import { AssetNode } from '../ast/asset-node.ts';
import type { CheckContext } from './check-context.ts';

export const checkAssetProgramRelationships = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof AssetNode) || entity.containsProgram === undefined) {
      continue;
    }
    const program = context.names.target(entity.containsProgram);
    if (program === undefined) {
      context.addFinding({
        code: 'checker/asset-program-unknown',
        severity: 'error',
        span: entity.span,
        message: `Asset '${entity.name}' references unknown program '${entity.containsProgram}'`,
        suggestion: `Define '${entity.containsProgram}' as a Program entity`,
      });
    } else if (program.kind !== 'Program') {
      context.addFinding({
        code: 'checker/asset-contains-non-program',
        severity: 'error',
        span: entity.span,
        message: `Asset '${entity.name}' cannot contain '${entity.containsProgram}' (it's a ${program.kind})`,
        suggestion: 'Assets can only contain Program entities',
      });
    }
  }
};
