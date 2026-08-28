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

// RFC-TM-10 §7 (rfc-tm-10-diamond.md, D-LEG-7) — the ONE sound, narrow
// exclusion: a pair (A, B) in a name's exporter set is excluded ONLY when one
// of the pair is a ProgramNode whose `entry` field names the OTHER member of
// the pair BY ENTITY. This is a direct field comparison, no import-provenance
// reasoning at all — two prior drafts of a general "an exporter that imports
// the name is excluded" signal were both falsified by the committed,
// currently-passing `ast-validator.test.ts:366-380` test (an import-then-export
// exporter must still flag against an independent declarer). The
// File/ClassFile barrel-re-export shape (e.g. DetectFormatFile/SyntaxEmitter)
// has no sound signal without new AST surface (a per-import provenance
// field) and is NOT excluded here — it stays a live, honestly-disposed
// residual (doc §7, §14).
const isProgramEntryPair = (left: EntityNode, right: EntityNode): boolean => {
  if (left instanceof ProgramNode && left.entry === right.name) {
    return true;
  }
  if (right instanceof ProgramNode && right.entry === left.name) {
    return true;
  }
  return false;
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
    // The Program/entry-File exclusion: when exactly two exporters claim this
    // name and one is the Program whose `entry` names the other, this is a
    // converter-emission redundancy (the Program's exports list re-derives
    // from its own entry's export registry), not two independent
    // declarations — no finding. Any additional exporter beyond the pair, or
    // an exporter pair with no Program/entry relationship, still flags in
    // full per the unmodified general rule below.
    if (exporters.length === 2) {
      const [a, b] = exporters as [EntityNode, EntityNode];
      if (isProgramEntryPair(a, b)) {
        continue;
      }
    }
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
