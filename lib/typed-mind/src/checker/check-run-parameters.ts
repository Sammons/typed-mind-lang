// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — the consumedBy half of
// DSLValidator.checkFunctionConsumption (validator.ts:1206-1241), ported with
// its embedded unknown-function and non-Function existence/kind arms. The
// declared side of consumedBy does not exist in the new AST (genuinely
// non-declarable — RunParameterNode drops it; longform hardcoded `[]`), so
// the ported comparison runs over the LinkIndex derivation exactly as legacy
// ran over the parser's derived reverse writes: every arm is structurally
// present and silent by construction — derived entries always name existing
// consuming Functions. The disagreement arm ("claims to be consumed by 'F',
// but that function doesn't consume it") is preserved verbatim per the §1
// disagreement clause.

import { FunctionNode } from '../ast/function-node.ts';
import { RunParameterNode } from '../ast/run-parameter-node.ts';
import type { CheckContext } from './check-context.ts';

export const checkRunParameterConsumedBy = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof RunParameterNode)) {
      continue;
    }
    const consumedBy = context.links.consumedBy(entity.name);
    for (const funcName of consumedBy) {
      const funcEntity = context.names.target(funcName);
      if (funcEntity === undefined) {
        context.addFinding({
          code: 'checker/consumedby-unknown-function',
          severity: 'error',
          span: entity.span,
          message: `RunParameter '${entity.name}' claims to be consumed by unknown function '${funcName}'`,
          suggestion: `Define '${funcName}' as a Function entity that consumes '${entity.name}'`,
        });
      } else if (!(funcEntity instanceof FunctionNode)) {
        context.addFinding({
          code: 'checker/consumedby-non-function',
          severity: 'error',
          span: entity.span,
          message: `RunParameter '${entity.name}' claims to be consumed by '${funcName}' which is not a Function`,
          suggestion: `Change '${funcName}' to a Function entity that consumes '${entity.name}'`,
        });
      } else if (!(funcEntity.consumes ?? []).some((name) => context.names.target(name)?.name === entity.name)) {
        context.addFinding({
          code: 'checker/consumedby-disagreement',
          severity: 'error',
          span: entity.span,
          message: `RunParameter '${entity.name}' claims to be consumed by '${funcName}', but that function doesn't consume it`,
          suggestion: `Add '${entity.name}' to the consumes list of function '${funcName}'`,
        });
      }
    }
  }
};
