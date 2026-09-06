import { ClassFileNode } from '../ast/class-file-node.ts';
import { constructorSignature, methodSignature } from '../ast/class-members.ts';
import { ClassNode } from '../ast/class-node.ts';
import { parseSignatureText } from '../pipeline/parse-signature-text.ts';
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
    // RFC-TM-14 §S4 R3a: a property whose whole type is an opaque leaf that
    // is not a callable signature is retained like an opaque signature — the
    // same warning, one member kind over (the walker's own callable rule).
    for (const member of entity.members.properties) {
      if (member.typeExpr.kind !== 'opaque' || parseSignatureText(member.typeExpr.text).kind === 'parsed') continue;
      context.addFinding({
        code: 'checker/unsupported-member-signature',
        severity: 'warning',
        span: member.span,
        message: `Property '${member.name}' in '${entity.name}' is retained as opaque type text`,
        suggestion: 'Use a named, generic, array, union or literal type so its references can be checked',
      });
    }
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
