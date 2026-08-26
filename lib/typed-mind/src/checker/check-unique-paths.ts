// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — DSLValidator.checkUniquePaths ported
// verbatim (validator.ts:688-732): every pathed entity registers at its path;
// only File/ClassFile arrivals error against an earlier File/ClassFile at the
// same path; `#`-fragment virtual paths are exempt. Pathed nodes in the new
// AST: File, ClassFile (lookahead conversions included — legacy converted
// Classes carried a path and registered too), Constants.

import { ClassFileNode } from '../ast/class-file-node.ts';
import { ConstantsNode } from '../ast/constants-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import type { CheckContext } from './check-context.ts';

const pathOf = (entity: EntityNode): string | undefined => {
  if (entity instanceof FileNode || entity instanceof ClassFileNode || entity instanceof ConstantsNode) {
    return entity.path;
  }
  return undefined;
};

export const checkUniquePaths = (context: CheckContext): void => {
  const entityNamesByPath = new Map<string, string[]>();

  for (const entity of context.byName.values()) {
    const path = pathOf(entity);
    if (path === undefined || path === '') {
      continue;
    }
    if (path.includes('#')) {
      continue; // virtual paths with fragments may repeat (validator.ts:696)
    }

    const entitiesAtPath = entityNamesByPath.get(path) ?? [];
    entityNamesByPath.set(path, entitiesAtPath);

    if (entity.kind === 'File' || entity.kind === 'ClassFile') {
      const existingFileType = entitiesAtPath.find((name) => {
        const existing = context.byName.get(name);
        return existing !== undefined && (existing.kind === 'File' || existing.kind === 'ClassFile');
      });
      if (existingFileType !== undefined) {
        const existing = context.byName.get(existingFileType);
        if (existing !== undefined) {
          context.addFinding({
            code: 'checker/duplicate-path',
            severity: 'error',
            span: entity.span,
            message: `Path '${path}' already used by ${existing.kind} '${existing.name}'`,
            suggestion: 'Each File/ClassFile must have a unique path. Consider using ClassFile fusion with #:',
          });
        }
      }
    }

    entitiesAtPath.push(entity.name);
  }
};
