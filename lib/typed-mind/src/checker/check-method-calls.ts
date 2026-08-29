// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — DSLValidator.checkMethodCalls ported
// verbatim (validator.ts:882-921), including the `split('.', 2)` quirk: for a
// call 'A.B.C' the checked method name is 'B'. Only dotted calls are examined;
// bare calls belong to the reference-legality arm.

import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import type { CheckContext } from './check-context.ts';

export const checkMethodCalls = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof FunctionNode)) {
      continue;
    }
    for (const call of entity.calls) {
      if (!call.includes('.')) {
        continue;
      }
      const [objectName = '', methodName = ''] = call.split('.', 2);
      const targetEntity = context.byName.get(objectName);

      if (targetEntity === undefined) {
        context.addFinding({
          code: 'checker/unknown-call-target',
          severity: 'error',
          span: entity.span,
          message: `Call to '${call}' references unknown entity '${objectName}'`,
          suggestion: `Define '${objectName}' before calling '${call}' on it, or fix the typo`,
        });
      } else if (!(targetEntity instanceof ClassNode || targetEntity instanceof ClassFileNode)) {
        context.addFinding({
          code: 'checker/method-call-on-non-class',
          severity: 'error',
          span: entity.span,
          message: `Cannot call method '${methodName}' on ${targetEntity.kind} '${objectName}'. Only Classes and ClassFiles can have methods`,
          suggestion: `Either define '${objectName}' as a Class/ClassFile or use a different call syntax`,
        });
      } else if (!targetEntity.methods.includes(methodName)) {
        context.addFinding({
          code: 'checker/unknown-method',
          severity: 'error',
          span: entity.span,
          message: `Method '${methodName}' not found on ${targetEntity.kind.toLowerCase()} '${objectName}'`,
          suggestion: `Available methods: ${targetEntity.methods.join(', ')}`,
        });
      }
    }
  }
};
