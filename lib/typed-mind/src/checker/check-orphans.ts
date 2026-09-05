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
// RFC-TM-13 B1 additionally collects structured function-signature type uses;
// opaque text, local generic binders and builtin wrappers add no false edges.

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
import { parseSignatureText } from '../pipeline/parse-signature-text.ts';
import type { CheckContext } from './check-context.ts';
import { collectSignatureReferences } from './collect-signature-references.ts';

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
      const signature = parseSignatureText(entity.signature);
      if (signature.kind === 'parsed') {
        collectSignatureReferences(signature.signature, referenced);
      }
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
// does when it resolves to a local entity real importers reference by its
// own identifier (a same-package sibling file) — `isEntityImported`
// already walks every entity's `imports` list looking for the name. This
// branch closes RC-G for that shape without touching
// `collectReferencedNames`'s general orphan walk, `checkOrphans`'s
// entity-kind dispatch, or `checkDuplicateExports` (RX-3's Deferrals
// RX-A/RX-B name the accepted blind spots this design leaves, per the
// Diamond Doc).
//
// RFC-TM-11 Amendment 1, §RX-6 (rfc-tm-11-diamond.md) — a re-export
// target that resolves to NO local entity (an external or
// workspace-package specifier, e.g. `@webhookstorage/core/client-ip`)
// never reaches the branch above: `resolveImportToEntity`
// (typescript-to-typedmind-converter.ts) returns `undefined` for every
// caller trying to import that name, so the re-exported name (e.g.
// `getClientIp`) never appears in ANY entity's `imports` list — not this
// File's own, not a real importer's. The third branch below is the
// genuinely new check this shape needs: `convertImports`'s RX-6 fold
// (typescript-to-typedmind-converter.ts) adds THIS FILE's own entity
// name into a real importer's `imports` list whenever that importer
// names one of this File's `reExports`, so checking whether THIS FILE's
// own name is imported anywhere is what proves consumption for a
// cross-package re-export barrel. Scoped narrowly to `file.name` — the
// same File whose consumption is being evaluated — so it does not change
// the verdict for any File that is not itself an RX-6 fold target: no
// existing grammar or converter mechanism puts a File's own entity name
// into another entity's `imports` list except through this fold (import
// lists reference what an entity produces or declares, never the File
// that contains it).
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
  if (isEntityImported(context, file.name)) {
    return true;
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
