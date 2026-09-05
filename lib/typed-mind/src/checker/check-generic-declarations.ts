import { ClassFileNode } from '../ast/class-file-node.ts';
import { parametersOf } from '../ast/declared-type-parameters.ts';
import { DependencyNode } from '../ast/dependency-node.ts';
import { DtoNode } from '../ast/dto-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { resolvedNameTarget } from '../ast/qualified-name-resolver.ts';
import type { TypeParameterNode } from '../ast/type-parameter-node.ts';
import { parseSignatureText } from '../pipeline/parse-signature-text.ts';
import { walkEntityTypeReferences } from '../pipeline/type-reference-walk.ts';
import type { CheckContext } from './check-context.ts';
import { checkSingleReference } from './check-reference-legality.ts';
import { isImplicitPlatformDataType, isPrimitiveType } from './type-builtins.ts';

const semanticParameters = (parameters: readonly TypeParameterNode[]): string =>
  JSON.stringify(parameters, (key, value: unknown) => (key === 'span' || key === 'raw' || key === 'textOffsets' ? undefined : value));

export const checkGenericDeclarations = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    const declared = parametersOf(entity);
    if (entity instanceof FunctionNode && declared !== undefined) {
      const parsed = parseSignatureText(entity.signature);
      if (
        parsed.kind === 'parsed' &&
        parsed.signature.typeParameterText !== undefined &&
        semanticParameters(declared) !== semanticParameters(parsed.signature.typeParameters ?? [])
      ) {
        context.addFinding({
          code: 'checker/conflicting-signature-type-parameters',
          severity: 'error',
          span: entity.span,
          message: `Function '${entity.name}' signature type parameters disagree with its declaration`,
          suggestion: 'Use the same names, modifiers, constraints and defaults in both representations',
        });
      }
    }
    walkEntityTypeReferences(entity, {
      parameters: (parameters) => {
        const seen = new Set<string>();
        for (const parameter of parameters) {
          if (seen.has(parameter.name))
            context.addFinding({
              code: 'checker/duplicate-type-parameter',
              severity: 'error',
              span: parameter.span,
              message: `Duplicate type parameter '${parameter.name}' in '${entity.name}'`,
              suggestion: 'Give each parameter in this scope a distinct name',
            });
          seen.add(parameter.name);
          if (
            new Set(parameter.modifiers).size !== parameter.modifiers.length ||
            (parameter.modifiers.includes('const') && parameter.modifiers.length > 1)
          )
            context.addFinding({
              code: 'checker/invalid-type-parameter-modifiers',
              severity: 'error',
              span: parameter.span,
              message: `Invalid modifier combination on type parameter '${parameter.name}'`,
              suggestion: 'Use const, in, out, or in out without repetitions',
            });
        }
      },
      reference: (node, args, position) => {
        const result = context.names.resolve(node.name);
        const target = resolvedNameTarget(result);
        const targetParameters = target === undefined ? undefined : parametersOf(target);
        if (targetParameters !== undefined) {
          const missingRequired = targetParameters.slice(args.length).some((parameter) => parameter.defaultType === undefined);
          if (args.length > targetParameters.length || missingRequired)
            context.addFinding({
              code: 'checker/generic-arity',
              severity: 'error',
              span: node.span,
              message: `Type '${node.name}' received ${args.length} arguments for ${targetParameters.length} declared parameters`,
              suggestion: 'Provide every required parameter and omit only parameters with defaults',
            });
        }
        // Existing field/base checks retain their established codes. Additional
        // reference validation belongs to the newly represented generic slots.
        if (
          position === 'field' ||
          position === 'heritage-base' ||
          ((position === 'signature' || position === 'alias') && declared === undefined)
        )
          return;
        if ((isPrimitiveType(node.name) || isImplicitPlatformDataType(node.name)) && target === undefined) return;
        if (result.kind === 'external') return;
        if (target === undefined) {
          if (
            [...context.byName.values()].some((candidate) => candidate instanceof DependencyNode && candidate.exports?.includes(node.name))
          )
            return;
          if (node.name.includes('.')) {
            context.resolveName(node.name, node.span);
            return;
          }
          context.addFinding({
            code: 'checker/generic-unknown-type',
            severity: 'error',
            span: node.span,
            message: `Generic declaration '${entity.name}' references undefined type '${node.name}'`,
            suggestion: 'Declare or import this type',
          });
        } else if (!['DTO', 'Class', 'ClassFile', 'TypeDef', 'Dependency'].includes(target.kind)) {
          context.addFinding({
            code: 'checker/generic-non-data-type',
            severity: 'error',
            span: node.span,
            message: `Generic declaration '${entity.name}' references ${target.kind} '${node.name}' as a type`,
            suggestion: 'Reference a data type declaration',
          });
        }
      },
      opaque: (node, position) => {
        if (position !== 'constraint' && position !== 'default') return;
        context.addFinding({
          code: 'checker/unsupported-generic-type',
          severity: 'warning',
          span: node.span,
          message: `Generic ${position} in '${entity.name}' is retained as opaque type text`,
          suggestion: 'References inside this expression are not checked',
        });
      },
      heritage: (reference, role, binders) => {
        if (reference.kind === 'opaque') {
          context.addFinding({
            code: 'checker/unsupported-heritage',
            severity: 'warning',
            span: reference.span,
            message: `Heritage in '${entity.name}' is retained as opaque type text`,
            suggestion: 'Use a named base with optional type arguments for reference checking',
          });
          return;
        }
        if (binders.has(reference.base.name)) {
          context.addFinding({
            code: 'checker/type-parameter-heritage-base',
            severity: 'error',
            span: reference.base.span,
            message: `'${entity.name}' cannot ${role} type parameter '${reference.base.name}'`,
            suggestion: 'Use a declared base and pass local parameters as its arguments',
          });
          return;
        }
        // DTO inheritance is new. Genuine ClassFile generic heritage also
        // receives the legality gate its legacy bare-name lane never had.
        if (
          entity instanceof DtoNode ||
          (entity instanceof ClassFileNode && entity.raw.includes('#:') && (declared !== undefined || reference.args.length > 0))
        )
          checkSingleReference(context, entity, role, reference.base.name);
      },
    });
  }
};
