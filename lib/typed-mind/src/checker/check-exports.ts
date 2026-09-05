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
import { resolvedNameTarget } from '../ast/qualified-name-resolver.ts';
import type { CheckContext } from './check-context.ts';

const importsOf = (entity: EntityNode): readonly string[] | undefined => {
  if (entity instanceof FileNode || entity instanceof ClassFileNode) {
    return entity.imports;
  }
  return undefined;
};

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
      const resolved = resolvedNameTarget(context.names.resolveExport(entity.name, exported));
      if (resolved !== undefined) exportedEntities.add(resolved.name);
    }
    for (const method of methodsOf(entity) ?? []) {
      classMethods.add(method);
    }
  }

  for (const [name, entity] of context.byName) {
    // An explicitly owned declaration may be private to its real file.
    if (name.includes('.') && context.names.resolve(name).kind === 'entity') continue;
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
// exclusion, WIDENED by a lead-authorized amendment (tm10-inc3a, SST-
// referenced-module orphan flags) from a same-entity-pair comparison to a
// Program-scoped entry-reachability rule: a pair (A, B) in a name's
// exporter set is excluded when one of the pair is a ProgramNode P and the
// OTHER member of the pair is a File/ClassFile entity reachable from
// `P.entry` via transitive File-import edges (`FileNode.imports`/
// `ClassFileNode.imports`). D-LEG-7's original same-file case (P.entry
// names the other member DIRECTLY) is the zero-hop instance of this same
// reachability walk — a Program's own entry file is trivially "reachable
// from itself" — so this is a strict widening, not a replacement rule.
//
// This is STILL not general import-provenance reasoning: two prior drafts
// of a general "an exporter that imports the name is excluded" signal were
// both falsified by the committed, currently-passing
// `ast-validator.test.ts:366-380` test (an import-then-export exporter must
// still flag against an independent declarer) — confirmed to keep passing
// unmodified by this widening (that test's `Other` File is never listed in
// `Main`'s `imports`, so it is not reachable from `Main` regardless of this
// rule; neither exporter in that test is even a ProgramNode, so the rule
// never applies to that pair). The widened rule is bounded to PROGRAM-scoped
// exposure specifically: a Program whose entry transitively imports a File
// is a re-export chain (the deployed program's public surface — e.g. an SST
// handler-string reference recorded by the converter, tm10-inc3a's own
// motivating case), not two independent hand-authored declarations. The
// File/ClassFile barrel-re-export shape (e.g. DetectFormatFile/SyntaxEmitter,
// no Program involved at all) has no sound signal without new AST surface
// (a per-import provenance field) and is NOT excluded here — it stays a
// live, honestly-disposed residual (doc §7, §14).
const filesReachableFromEntry = (context: CheckContext, entryName: string): ReadonlySet<string> => {
  const reachable = new Set<string>();
  const queue = [context.names.target(entryName)?.name ?? entryName];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || reachable.has(current)) {
      continue;
    }
    reachable.add(current);
    const entity = context.byName.get(current);
    if (entity === undefined) {
      continue;
    }
    for (const imported of importsOf(entity) ?? []) {
      if (imported.includes('*') || reachable.has(imported)) {
        continue;
      }
      const importedEntity = context.names.target(imported);
      // Only follow the edge onward when the imported name resolves to
      // another File-like entity — an individual function/class/DTO name
      // in `imports` is a leaf for this walk, not a File to recurse into.
      if (importedEntity instanceof FileNode || importedEntity instanceof ClassFileNode) {
        queue.push(importedEntity.name);
      }
    }
  }
  return reachable;
};

const isProgramScopedExposure = (context: CheckContext, left: EntityNode, right: EntityNode): boolean => {
  const [program, other] =
    left instanceof ProgramNode ? [left, right] : right instanceof ProgramNode ? [right, left] : [undefined, undefined];
  if (program === undefined || other === undefined) {
    return false;
  }
  if (!(other instanceof FileNode || other instanceof ClassFileNode)) {
    return false;
  }
  return filesReachableFromEntry(context, program.entry).has(other.name);
};

export const checkDuplicateExports = (context: CheckContext): void => {
  const exportMap = new Map<string, EntityNode[]>();

  for (const entity of context.byName.values()) {
    for (const exported of exportsOf(entity) ?? []) {
      const canonicalName = resolvedNameTarget(context.names.resolveExport(entity.name, exported))?.name ?? exported;
      const exporters = exportMap.get(canonicalName) ?? [];
      if (!exporters.includes(entity)) exporters.push(entity);
      exportMap.set(canonicalName, exporters);
    }
  }

  for (const [exportName, exporters] of exportMap) {
    // The Program-scoped exposure exclusion (widened D-LEG-7, see
    // `isProgramScopedExposure`'s own doc comment above): when exactly two
    // exporters claim this name and one is a Program whose entry
    // transitively reaches the other exporter's File, this is a re-export
    // chain (the deployed program's public surface), not two independent
    // declarations — no finding. Any additional exporter beyond the pair,
    // or an exporter pair with no such Program-scoped relationship, still
    // flags in full per the unmodified general rule below.
    if (exporters.length === 2) {
      const [a, b] = exporters as [EntityNode, EntityNode];
      if (isProgramScopedExposure(context, a, b)) {
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
      if (exported.includes('.')) {
        context.resolveExport(entity.name, exported, entity.span);
        continue;
      }
      if (context.names.resolveExport(entity.name, exported).kind === 'unresolved') {
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
