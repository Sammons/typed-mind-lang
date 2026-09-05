// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — the three Function-side checks:
//   - checkFunctionDTOs (validator.ts:942-995): input/output existence (with
//     the exported-by-a-Dependency rescue) and DTO-kind checks, verbatim;
//   - checkFunctionDependencies (validator.ts:1441-1471) over
//     pendingDependencies (the F5 carrier): the not-found arm is unchanged;
//     the Cannot-directly-consume arm applies the F4 double-report resolution
//     (§1) — parse time wins: a name whose function span already carries a
//     semantics/dependency-direct-consumption parse diagnostic is skipped
//     (match on code + the continuation's span, never message text). A
//     Dependency that becomes resolvable only through the import merge has no
//     parse diagnostic (distribution ran pre-merge, the pinned ordering
//     quirk), so the legacy error still fires for it;
//   - checkFunctionConsumption's forward arm (validator.ts:1174-1204):
//     consumes existence/kind, verbatim. (The reverse consumedBy arm lives in
//     check-run-parameters.ts.)

import { DependencyNode } from '../ast/dependency-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { resolvedNameTarget } from '../ast/qualified-name-resolver.ts';
import type { CheckContext } from './check-context.ts';

const isDtoExportedByDependency = (context: CheckContext, dtoName: string): boolean => {
  for (const entity of context.byName.values()) {
    if (entity instanceof DependencyNode && entity.exports !== undefined && entity.exports.includes(dtoName)) {
      return true;
    }
  }
  return false;
};

const checkDtoSlot = (context: CheckContext, fn: FunctionNode, slot: 'input' | 'output', dtoName: string): void => {
  const resolution = context.resolveName(dtoName, fn.span);
  if (dtoName.includes('.') && (resolution.kind === 'unresolved' || resolution.kind === 'external')) return;
  const target = resolvedNameTarget(resolution);
  if (target === undefined) {
    if (!isDtoExportedByDependency(context, dtoName)) {
      context.addFinding({
        code: `checker/${slot}-dto-not-found`,
        severity: 'error',
        span: fn.span,
        message: `Function ${slot} DTO '${dtoName}' not found`,
        suggestion: `Define '${dtoName}' as a DTO entity or import it from a dependency`,
      });
    }
  } else if (target.kind !== 'DTO') {
    context.addFinding({
      code: `checker/${slot}-not-dto`,
      severity: 'error',
      span: fn.span,
      message: `Function ${slot} '${dtoName}' is not a DTO (it's a ${target.kind})`,
      suggestion: `Change '${dtoName}' to a DTO or use a different ${slot} type`,
    });
  }
};

export const checkFunctionDtos = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof FunctionNode)) {
      continue;
    }
    if (entity.input !== undefined) {
      checkDtoSlot(context, entity, 'input', entity.input);
    }
    if (entity.output !== undefined) {
      checkDtoSlot(context, entity, 'output', entity.output);
    }
  }
};

export const checkFunctionDependencies = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof FunctionNode)) {
      continue;
    }
    for (const dependencyName of entity.pendingDependencies) {
      const resolution = context.resolveName(dependencyName, entity.span);
      if (resolution.kind === 'external') continue;
      const target = resolvedNameTarget(resolution);
      if (target === undefined) {
        context.addFinding({
          code: 'checker/dependency-not-found',
          severity: 'error',
          span: entity.span,
          message: `Function dependency '${dependencyName}' not found`,
          suggestion: `Define '${dependencyName}' as an entity or remove it from the dependency list`,
        });
      } else if (target.kind === 'Dependency') {
        if (context.hasParseDiagnostic('semantics/dependency-direct-consumption', entity.span)) {
          continue; // F4: one report per defect — the parse-time warning wins (§1)
        }
        context.addFinding({
          code: 'checker/dependency-direct-consumption',
          severity: 'error',
          span: entity.span,
          message: `Cannot directly consume dependency '${dependencyName}' in function '${entity.name}'`,
          suggestion: `Import specific entities from '${dependencyName}' instead. If '${dependencyName}' exports entities, add them with '-> [EntityName]' and import those entities in your files.`,
        });
      }
    }
  }
};

const VALID_CONSUME_KINDS = ['RunParameter', 'Asset', 'Dependency', 'Constants'];

export const checkFunctionConsumption = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof FunctionNode)) {
      continue;
    }
    for (const consumeName of entity.consumes ?? []) {
      const target = context.names.target(consumeName);
      if (target === undefined) {
        context.addFinding({
          code: 'checker/consumes-unknown',
          severity: 'error',
          span: entity.span,
          message: `Function '${entity.name}' consumes unknown entity '${consumeName}'`,
          suggestion: `Define '${consumeName}' as one of: ${VALID_CONSUME_KINDS.join(', ')}`,
        });
      } else if (!VALID_CONSUME_KINDS.includes(target.kind)) {
        context.addFinding({
          code: 'checker/consumes-invalid-kind',
          severity: 'error',
          span: entity.span,
          message: `Function '${entity.name}' cannot consume '${consumeName}' (it's a ${target.kind})`,
          suggestion: `Functions can only consume: ${VALID_CONSUME_KINDS.join(', ')}`,
        });
      }
    }
  }
};
