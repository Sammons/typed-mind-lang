// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — the three cycle checks ported verbatim:
//   - checkCircularDeps (validator.ts:408-473): the import graph among
//     File/ClassFile entities only;
//   - checkCircularUIComponentContainment (validator.ts:475-552): the
//     UIComponent contains graph, with the self-containment special case;
//   - checkInheritanceChains (validator.ts:554-653): extends existence,
//     self-inheritance, implements existence, and the single-inheritance
//     cycle walk.
// Each replicates the legacy DFS shape: shared visited set, recursion stack,
// first-found cycle reported once per sort-normalized cycle key, error at the
// walk's ROOT entity (not the cycle's entry), messages + suggestions verbatim.

import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import type { CheckContext } from './check-context.ts';

interface CycleWalkArgs {
  readonly neighborsOf: (node: string) => readonly string[] | undefined;
  readonly onSelfReference?: ((node: string) => void) | undefined;
  readonly onCycle: (root: string, cycle: readonly string[]) => void;
  readonly nodes: readonly string[];
}

// The shared legacy DFS shape (validator.ts:424-472 and twins): `visited`
// persists across roots, so a node explored from an earlier root is never
// re-walked; `recursionStack` detects the back edge; the reported path is the
// path from the CURRENT root into the cycle plus the closing node.
const walkForCycles = (args: CycleWalkArgs): void => {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const reportedCycles = new Set<string>();

  const hasCycle = (node: string, path: string[]): string[] | null => {
    if (args.neighborsOf(node) === undefined) {
      return null;
    }
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const neighbor of args.neighborsOf(node) ?? []) {
      if (neighbor === node && args.onSelfReference !== undefined) {
        args.onSelfReference(node);
        continue;
      }
      if (!visited.has(neighbor)) {
        const cycle = hasCycle(neighbor, [...path]);
        if (cycle) {
          return cycle;
        }
      } else if (recursionStack.has(neighbor)) {
        return [...path, neighbor];
      }
    }

    recursionStack.delete(node);
    return null;
  };

  for (const node of args.nodes) {
    if (visited.has(node)) {
      continue;
    }
    const cycle = hasCycle(node, []);
    if (cycle) {
      const cycleKey = [...cycle].sort().join('->');
      if (!reportedCycles.has(cycleKey)) {
        reportedCycles.add(cycleKey);
        args.onCycle(node, cycle);
      }
    }
  }
};

export const checkCircularDeps = (context: CheckContext): void => {
  const importGraph = new Map<string, string[]>();
  for (const [name, entity] of context.byName) {
    if (entity instanceof FileNode || entity instanceof ClassFileNode) {
      const fileImports = entity.imports.filter((imported) => {
        const target = context.byName.get(imported);
        return target !== undefined && (target.kind === 'File' || target.kind === 'ClassFile');
      });
      importGraph.set(name, fileImports);
    }
  }

  walkForCycles({
    nodes: [...importGraph.keys()],
    neighborsOf: (node) => importGraph.get(node),
    onCycle: (root, cycle) => {
      const entity = context.byName.get(root);
      if (entity !== undefined) {
        context.addFinding({
          code: 'checker/circular-import',
          severity: 'error',
          span: entity.span,
          message: `Circular import detected: ${cycle.join(' -> ')}`,
          suggestion: 'Break the circular dependency by refactoring shared code into a separate module',
        });
      }
    },
  });
};

export const checkCircularUiContainment = (context: CheckContext): void => {
  const containmentGraph = new Map<string, readonly string[]>();
  for (const [name, entity] of context.byName) {
    if (entity instanceof UiComponentNode && entity.contains !== undefined) {
      containmentGraph.set(name, entity.contains);
    }
  }

  walkForCycles({
    nodes: [...containmentGraph.keys()],
    neighborsOf: (node) => containmentGraph.get(node),
    onSelfReference: (node) => {
      const entity = context.byName.get(node);
      if (entity !== undefined) {
        context.addFinding({
          code: 'checker/self-containment',
          severity: 'error',
          span: entity.span,
          message: `UIComponent '${node}' contains itself`,
          suggestion: 'Remove self-reference from the contains list',
        });
      }
    },
    onCycle: (root, cycle) => {
      const entity = context.byName.get(root);
      if (entity !== undefined) {
        context.addFinding({
          code: 'checker/circular-containment',
          severity: 'error',
          span: entity.span,
          message: `UIComponent '${root}' has circular containment: ${cycle.join(' -> ')}`,
          suggestion: 'Break the circular containment by removing one of the contains relationships',
        });
      }
    },
  });
};

export const checkInheritanceChains = (context: CheckContext): void => {
  const inheritanceGraph = new Map<string, string>();

  for (const [name, entity] of context.byName) {
    if (!(entity instanceof ClassNode || entity instanceof ClassFileNode)) {
      continue;
    }
    if (entity.extends !== undefined) {
      inheritanceGraph.set(name, entity.extends);

      if (entity.extends === name) {
        context.addFinding({
          code: 'checker/self-inheritance',
          severity: 'error',
          span: entity.span,
          message: `Class '${name}' inherits from itself`,
          suggestion: 'Remove the self-inheritance or choose a different base class',
        });
      } else if (!context.byName.has(entity.extends)) {
        // Legacy `continue`s after self-inheritance, so the existence check
        // only runs for non-self extends (validator.ts:566-584).
        context.addFinding({
          code: 'checker/unknown-base-class',
          severity: 'error',
          span: entity.span,
          message: `Class '${name}' extends '${entity.extends}' which does not exist`,
          suggestion: `Define '${entity.extends}' as a Class or ClassFile entity`,
        });
      }
    }

    // Legacy checks implements even when extends is absent — but skips the
    // whole entity after a SELF-extends `continue` (validator.ts:573).
    if (entity.extends === name) {
      continue;
    }
    for (const implemented of entity.implements) {
      if (!context.byName.has(implemented)) {
        context.addFinding({
          code: 'checker/unknown-interface',
          severity: 'error',
          span: entity.span,
          message: `Class '${name}' implements '${implemented}' which does not exist`,
          suggestion: `Define '${implemented}' as a Class or ClassFile entity`,
        });
      }
    }
  }

  walkForCycles({
    nodes: [...inheritanceGraph.keys()],
    neighborsOf: (node) => {
      const parent = inheritanceGraph.get(node);
      return parent === undefined ? undefined : [parent];
    },
    onCycle: (root, cycle) => {
      const entity = context.byName.get(root);
      if (entity !== undefined) {
        context.addFinding({
          code: 'checker/circular-inheritance',
          severity: 'error',
          span: entity.span,
          message: `Class '${root}' has circular inheritance: ${cycle.join(' -> ')}`,
          suggestion: 'Break the circular inheritance by removing one of the extends relationships',
        });
      }
    },
  });
};
