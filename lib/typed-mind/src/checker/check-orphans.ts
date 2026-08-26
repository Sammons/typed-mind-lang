// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — the orphan check ported verbatim from
// DSLValidator.checkOrphans/isFileConsumed/isEntityImported
// (validator.ts:245-367). The referenced set is built from exactly the legacy
// field walks — imports (non-wildcard), calls (RAW call string, dotted names
// included as written), methods, Program entry + exports, consumes, Function
// input/output, UIComponent contains, Asset containsProgram — and from nothing
// else (affects/extends/implements/schema never counted legacy-side). Exports
// are NOT referenced (the legacy comment at :257-259 is the rule). Program and
// Dependency entities are exempt candidates; Files get the
// any-export-imported consumption escape.

import { AssetNode } from '../ast/asset-node.ts';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import type { CheckContext } from './check-context.ts';

const importsOf = (entity: EntityNode): readonly string[] | undefined => {
  if (entity instanceof FileNode || entity instanceof ClassFileNode) {
    return entity.imports;
  }
  return undefined;
};

const collectReferencedNames = (context: CheckContext): Set<string> => {
  const referenced = new Set<string>();
  for (const entity of context.byName.values()) {
    for (const imported of importsOf(entity) ?? []) {
      if (!imported.includes('*')) {
        referenced.add(imported);
      }
    }
    if (entity instanceof FunctionNode) {
      for (const call of entity.calls) {
        referenced.add(call); // the RAW call string, dotted included (validator.ts:262)
      }
      if (entity.input !== undefined) {
        referenced.add(entity.input);
      }
      if (entity.output !== undefined) {
        referenced.add(entity.output);
      }
      for (const consumed of entity.consumes ?? []) {
        referenced.add(consumed);
      }
    }
    if (entity instanceof ClassNode || entity instanceof ClassFileNode) {
      for (const method of entity.methods) {
        referenced.add(method);
      }
    }
    if (entity instanceof ProgramNode) {
      referenced.add(entity.entry);
      for (const exported of entity.exports ?? []) {
        referenced.add(exported); // program exports are public API (validator.ts:272-278)
      }
    }
    if (entity instanceof UiComponentNode) {
      for (const child of entity.contains ?? []) {
        referenced.add(child);
      }
    }
    if (entity instanceof AssetNode && entity.containsProgram !== undefined) {
      referenced.add(entity.containsProgram);
    }
  }
  return referenced;
};

const isEntityImported = (context: CheckContext, entityName: string): boolean => {
  for (const entity of context.byName.values()) {
    for (const imported of importsOf(entity) ?? []) {
      if (imported === entityName) {
        return true;
      }
      if (imported.includes('*')) {
        const base = imported.split('*')[0] ?? '';
        if (entityName.startsWith(base)) {
          return true;
        }
      }
    }
  }
  return false;
};

const isFileConsumed = (context: CheckContext, file: FileNode): boolean => {
  for (const exportName of file.exports) {
    if (isEntityImported(context, exportName)) {
      return true;
    }
  }
  return false;
};

export const checkOrphans = (context: CheckContext): void => {
  const referenced = collectReferencedNames(context);
  for (const [name, entity] of context.byName) {
    if (referenced.has(name) || entity.kind === 'Program' || entity.kind === 'Dependency') {
      continue;
    }
    if (entity instanceof FileNode) {
      if (!isFileConsumed(context, entity)) {
        context.addFinding({
          code: 'checker/orphaned-file',
          severity: 'error',
          span: entity.span,
          message: `Orphaned file '${name}' - none of its exports are imported`,
          suggestion: 'Remove this file or import its exports somewhere',
        });
      }
      continue;
    }
    context.addFinding({
      code: 'checker/orphaned-entity',
      severity: 'error',
      span: entity.span,
      message: `Orphaned entity '${name}'`,
      suggestion: 'Remove or reference this entity',
    });
  }
};
