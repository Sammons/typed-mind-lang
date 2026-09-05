// RFC-TM-3 §3.5 (rfc-tm-3-diamond.md) — the computed-link phase (S-AST-4).
// computeLinks(entities) derives ALL reverse links in one pure pass over the
// thirteen forward fields (imports/exports/calls/extends/implements/contains/
// affects/consumes/input/output/entry/containsProgram/schema), mirroring the
// validator's reference table (validator.ts:1300+), and returns a LinkIndex of
// prebuilt per-name maps — replacing the reverse halves of the four duplicated
// legacy computations named in the doc's Problem section. Entities carry no
// derived reverse data; the declared reverse fields (UiComponentNode
// declaredContainedBy/declaredAffectedBy, §2.2 F1) are the author's claims and
// are NOT index inputs — TM-4's validator compares declared against derived
// (the disagreement error class). pendingDependencies are unresolved names and
// contribute no links.
//
// Derivation rules mirrored from the legacy table:
//   - only targets present in the entity set get a bucket (addReference's
//     missing-target early return, validator.ts:1252-1253); name resolution is
//     last-wins over the duplicate-preserving list (parser.ts:122);
//   - imports containing '*' are skipped; an import whose target is a
//     Dependency lands in importedBy INSTEAD of referencedBy (the legacy
//     routing at validator.ts:1305-1320 that fed DependencyEntity.importedBy);
//   - dotted call targets resolve to the base name before the first '.'
//     (validator.ts:1336).
// Reference = { from, fromType } is the pinned shape (LSP hover,
// server.ts:309-316); references dedupe per target by `from`.

import { AssetNode } from '../ast/asset-node.ts';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { ConstantsNode } from '../ast/constants-node.ts';
import { DependencyNode } from '../ast/dependency-node.ts';
import type { EntityKind } from '../ast/entity-kind.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';

export interface Reference {
  readonly from: string;
  readonly fromType: EntityKind;
}

const NO_REFERENCES: readonly Reference[] = [];
const NO_NAMES: readonly string[] = [];

export interface LinkIndexMaps {
  readonly referencedBy: ReadonlyMap<string, readonly Reference[]>;
  readonly containedBy: ReadonlyMap<string, readonly string[]>;
  readonly affectedBy: ReadonlyMap<string, readonly string[]>;
  readonly consumedBy: ReadonlyMap<string, readonly string[]>;
  readonly importedBy: ReadonlyMap<string, readonly string[]>;
}

export class LinkIndex {
  readonly #maps: LinkIndexMaps;

  constructor(maps: LinkIndexMaps) {
    this.#maps = maps;
  }

  referencedBy(name: string): readonly Reference[] {
    return this.#maps.referencedBy.get(name) ?? NO_REFERENCES;
  }

  containedBy(name: string): readonly string[] {
    return this.#maps.containedBy.get(name) ?? NO_NAMES;
  }

  affectedBy(name: string): readonly string[] {
    return this.#maps.affectedBy.get(name) ?? NO_NAMES;
  }

  consumedBy(name: string): readonly string[] {
    return this.#maps.consumedBy.get(name) ?? NO_NAMES;
  }

  importedBy(name: string): readonly string[] {
    return this.#maps.importedBy.get(name) ?? NO_NAMES;
  }
}

class LinkCollector {
  readonly #byName: ReadonlyMap<string, EntityNode>;
  readonly referencedBy = new Map<string, Reference[]>();
  readonly containedBy = new Map<string, string[]>();
  readonly affectedBy = new Map<string, string[]>();
  readonly consumedBy = new Map<string, string[]>();
  readonly importedBy = new Map<string, string[]>();

  constructor(byName: ReadonlyMap<string, EntityNode>) {
    this.#byName = byName;
  }

  addReference(targetName: string, from: EntityNode): void {
    if (!this.#byName.has(targetName)) {
      return;
    }
    const bucket = this.referencedBy.get(targetName) ?? [];
    if (!bucket.some((reference) => reference.from === from.name)) {
      bucket.push({ from: from.name, fromType: from.kind });
    }
    this.referencedBy.set(targetName, bucket);
  }

  addName(map: Map<string, string[]>, targetName: string, fromName: string): void {
    if (!this.#byName.has(targetName)) {
      return;
    }
    const bucket = map.get(targetName) ?? [];
    if (!bucket.includes(fromName)) {
      bucket.push(fromName);
    }
    map.set(targetName, bucket);
  }

  addImports(from: EntityNode, imports: readonly string[]): void {
    for (const imported of imports) {
      if (imported.includes('*')) {
        continue;
      }
      const target = this.#byName.get(imported);
      if (target === undefined) {
        continue;
      }
      if (target.kind === 'Dependency') {
        this.addName(this.importedBy, imported, from.name);
      } else {
        this.addReference(imported, from);
      }
    }
  }

  addAll(targetNames: readonly string[] | undefined, from: EntityNode): void {
    for (const targetName of targetNames ?? []) {
      this.addReference(targetName, from);
    }
  }
}

const collectFunctionLinks = (collector: LinkCollector, fn: FunctionNode): void => {
  for (const call of fn.calls) {
    const callTarget = call.includes('.') ? (call.split('.').at(0) ?? call) : call;
    collector.addReference(callTarget, fn);
  }
  if (fn.input !== undefined) {
    collector.addReference(fn.input, fn);
  }
  if (fn.output !== undefined) {
    collector.addReference(fn.output, fn);
  }
  for (const affected of fn.affects ?? []) {
    collector.addReference(affected, fn);
    collector.addName(collector.affectedBy, affected, fn.name);
  }
  for (const consumed of fn.consumes ?? []) {
    collector.addReference(consumed, fn);
    collector.addName(collector.consumedBy, consumed, fn.name);
  }
};

const collectEntityLinks = (collector: LinkCollector, entity: EntityNode): void => {
  if (entity instanceof ProgramNode) {
    if (entity.entry !== '') {
      collector.addReference(entity.entry, entity);
    }
    collector.addAll(entity.exports, entity);
  } else if (entity instanceof FileNode) {
    collector.addImports(entity, entity.imports);
    collector.addAll(entity.exports, entity);
  } else if (entity instanceof ClassFileNode) {
    collector.addImports(entity, entity.imports);
    collector.addAll(entity.exports, entity);
    collector.addAll(entity.implements, entity);
    if (entity.extends !== undefined) {
      collector.addReference(entity.extends, entity);
    }
  } else if (entity instanceof ClassNode) {
    collector.addAll(entity.implements, entity);
    if (entity.extends !== undefined) {
      collector.addReference(entity.extends, entity);
    }
  } else if (entity instanceof FunctionNode) {
    collectFunctionLinks(collector, entity);
  } else if (entity instanceof UiComponentNode) {
    for (const child of entity.contains ?? []) {
      collector.addReference(child, entity);
      collector.addName(collector.containedBy, child, entity.name);
    }
  } else if (entity instanceof AssetNode) {
    if (entity.containsProgram !== undefined) {
      collector.addReference(entity.containsProgram, entity);
    }
  } else if (entity instanceof ConstantsNode) {
    collector.addAll(entity.calls, entity);
    if (entity.schema !== undefined) {
      collector.addReference(entity.schema, entity);
    }
  } else if (entity instanceof DependencyNode) {
    collector.addAll(entity.exports, entity);
  }
  // DtoNode and RunParameterNode carry no forward reference fields.
};

export const computeLinks = (entities: readonly EntityNode[]): LinkIndex => {
  const byName = new Map<string, EntityNode>();
  for (const entity of entities) {
    byName.set(entity.name, entity);
  }
  const collector = new LinkCollector(byName);
  for (const entity of entities) {
    collectEntityLinks(collector, entity);
  }
  return new LinkIndex({
    referencedBy: collector.referencedBy,
    containedBy: collector.containedBy,
    affectedBy: collector.affectedBy,
    consumedBy: collector.consumedBy,
    importedBy: collector.importedBy,
  });
};
