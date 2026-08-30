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
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import type { CheckContext } from './check-context.ts';

const importsOf = (entity: EntityNode): readonly string[] | undefined => {
  if (entity instanceof FileNode || entity instanceof ClassFileNode) {
    return entity.imports;
  }
  return undefined;
};

// RFC-TM-10 §8 (rfc-tm-10-diamond.md, D-LEG-8) — a referenced-name collector
// over the COMPLETE TypeExprNode shape, structurally mirroring (but
// independent of — this file collects, check-dto-fields.ts's walkTypeExpr
// validates; neither calls the other) check-dto-fields.ts's per-kind walk.
// Every non-terminal kind recurses; `literal` and `opaque` are terminal
// leaves that carry no reference (matching walkTypeExpr's own no-op/no-finding
// treatment of those two kinds).
const collectTypeExprReferences = (node: TypeExprNode, referenced: Set<string>): void => {
  switch (node.kind) {
    case 'named':
      referenced.add(node.name);
      return;
    case 'generic':
      referenced.add(node.base.name);
      for (const arg of node.args) {
        collectTypeExprReferences(arg, referenced);
      }
      return;
    case 'union':
    case 'intersection':
      for (const member of node.members) {
        collectTypeExprReferences(member, referenced);
      }
      return;
    case 'array':
      collectTypeExprReferences(node.element, referenced);
      return;
    case 'literal':
      return; // terminal, no reference
    case 'opaque':
      return; // unvalidated leaf, no structured reference (RFC-TM-8 §4)
  }
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
    if (entity instanceof DtoNode) {
      for (const field of entity.fields) {
        collectTypeExprReferences(field.typeExpr, referenced);
      }
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

// RFC-TM-11 §RX-3 (rfc-tm-11-diamond.md) — issue #109 (RC-G): a File whose
// EVERY export is a re-export has an empty `file.exports` array by design
// (`convertExports` excludes re-exports from it, RX-4), so the loop above
// alone can never prove consumption for a pure re-export barrel. A
// re-exported name satisfies consumption the same way a declared export
// does — `isEntityImported` already walks every entity's `imports` list
// looking for the name; a re-exported name is, by construction, a name
// real importers reference by its own identifier (they import
// `getClientIp`, not the barrel File's own name). This closes RC-G
// without touching `collectReferencedNames`'s general orphan walk,
// `checkOrphans`'s entity-kind dispatch, or `checkDuplicateExports` (RX-3's
// Deferrals RX-A/RX-B name the accepted blind spots this design leaves,
// per the Diamond Doc).
const isFileConsumed = (context: CheckContext, file: FileNode): boolean => {
  for (const exportName of file.exports) {
    if (isEntityImported(context, exportName)) {
      return true;
    }
  }
  for (const reExportName of file.reExports) {
    if (isEntityImported(context, reExportName)) {
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
