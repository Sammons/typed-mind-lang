// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — the three export checks ported verbatim:
//   - checkClassAndFunctionExports (validator.ts:804-845): Classes must be
//     exported somewhere; Functions must be exported or be a class method.
//     ClassFile entities are exempt (they self-export) — lookahead-converted
//     ClassFiles are therefore exempt too, where legacy (which stored them as
//     Class) checked them: an A4-class verdict move, scenario-58 attested;
//   - checkDuplicateExports (validator.ts:847-880): an entity exported by
//     multiple files, reported once at the first exporter;
//   - checkUndefinedExports (validator.ts:923-940): every exported name must
//     exist; Dependencies are exempt exporters.
// Exporters in the new AST: File, ClassFile, Program (when declared),
// Dependency (when declared) — the same set the legacy `'exports' in entity`
// guard produced.

import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { DependencyNode } from '../ast/dependency-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import type { CheckContext } from './check-context.ts';

const exportsOf = (entity: EntityNode): readonly string[] | undefined => {
  if (entity instanceof FileNode || entity instanceof ClassFileNode) {
    return entity.exports;
  }
  if (entity instanceof ProgramNode || entity instanceof DependencyNode) {
    return entity.exports;
  }
  return undefined;
};

const methodsOf = (entity: EntityNode): readonly string[] | undefined => {
  if (entity instanceof ClassNode || entity instanceof ClassFileNode) {
    return entity.methods;
  }
  return undefined;
};

export const checkClassAndFunctionExports = (context: CheckContext): void => {
  const exportedEntities = new Set<string>();
  const classMethods = new Set<string>();

  for (const entity of context.byName.values()) {
    for (const exported of exportsOf(entity) ?? []) {
      exportedEntities.add(exported);
    }
    for (const method of methodsOf(entity) ?? []) {
      classMethods.add(method);
    }
  }

  for (const [name, entity] of context.byName) {
    if (entity instanceof ClassNode && !exportedEntities.has(name)) {
      context.addFinding({
        code: 'checker/class-not-exported',
        severity: 'error',
        span: entity.span,
        message: `Class '${name}' is not exported by any file`,
        suggestion: `Add '${name}' to the exports of a file entity or convert to ClassFile with #: operator`,
      });
    } else if (entity instanceof FunctionNode && !exportedEntities.has(name) && !classMethods.has(name)) {
      context.addFinding({
        code: 'checker/function-not-exported',
        severity: 'error',
        span: entity.span,
        message: `Function '${name}' is not exported by any file and is not a class method`,
        suggestion: `Either add '${name}' to the exports of a file entity or define it as a method of a class`,
      });
    }
  }
};

export const checkDuplicateExports = (context: CheckContext): void => {
  const exportMap = new Map<string, EntityNode[]>();

  for (const entity of context.byName.values()) {
    for (const exported of exportsOf(entity) ?? []) {
      const exporters = exportMap.get(exported) ?? [];
      exporters.push(entity);
      exportMap.set(exported, exporters);
    }
  }

  for (const [exportName, exporters] of exportMap) {
    if (exporters.length > 1) {
      const isEntity = context.byName.has(exportName);
      const first = exporters[0];
      if (isEntity && first !== undefined) {
        context.addFinding({
          code: 'checker/multi-exported',
          severity: 'error',
          span: first.span,
          message: `Entity '${exportName}' is exported by multiple files: ${exporters.map((exporter) => exporter.name).join(', ')}`,
          suggestion: 'Each entity should be exported by exactly one file. Remove the duplicate exports.',
        });
      }
    }
  }
};

export const checkUndefinedExports = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (entity.kind === 'Dependency') {
      continue; // Dependencies export external types (validator.ts:926)
    }
    for (const exported of exportsOf(entity) ?? []) {
      if (!context.byName.has(exported)) {
        context.addFinding({
          code: 'checker/undefined-export',
          severity: 'error',
          span: entity.span,
          message: `Export '${exported}' is not defined anywhere in the codebase`,
          suggestion: `Define '${exported}' as a Function, Class, Constants, Asset, or UIComponent entity`,
        });
      }
    }
  }
};
