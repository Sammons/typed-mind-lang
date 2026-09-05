import { ClassFileNode } from '../ast/class-file-node.ts';
import { constructorSignature, methodSignature } from '../ast/class-members.ts';
import { ClassNode } from '../ast/class-node.ts';
import type { CheckContext } from './check-context.ts';

export const checkClassMembers = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof ClassNode || entity instanceof ClassFileNode) || entity.members === undefined) continue;
    const members = [
      ...entity.members.methods.flatMap((member) =>
        member.signature === undefined
          ? []
          : [{ result: member.signature, valid: methodSignature(member) !== undefined, span: member.span }],
      ),
      ...entity.members.constructors.map((member) => ({
        result: member.signature,
        valid: constructorSignature(member) !== undefined,
        span: member.span,
      })),
    ];
    for (const member of members) {
      if (member.result.kind === 'opaque')
        context.addFinding({
          code: 'checker/unsupported-member-signature',
          severity: 'warning',
          span: member.span,
          message: `Member signature in '${entity.name}' is retained but its references cannot be checked`,
          suggestion: 'Use a named method with parameter and return types, or an anonymous constructor parameter list',
        });
      else if (!member.valid)
        context.addFinding({
          code: 'checker/invalid-member-signature',
          severity: 'error',
          span: member.span,
          message: `Member signature in '${entity.name}' has an invalid method name or constructor shape`,
          suggestion: 'Use a local method name; constructor signatures must omit a name, return type and local type parameters',
        });
    }
  }
};
