// RFC-TM-4 §1, "Originated, not ported" (rfc-tm-4-diamond.md) — the
// duplicate-name validator. Legacy diagnosed only cross-kind shortform
// collisions through the parser's namingConflicts side channel
// (validator.ts:153-189; checkNamingConflicts at :191-243 is vacuous over a
// name-keyed Map); same-kind and longform collisions were invisible. This
// check walks the duplicate-preserving ParseOutcome.entities list and reports
// EVERY name collision — kind-agnostic, both syntaxes — with a finding at each
// colliding declaration's span. The Class/File fusion hint (verbatim legacy
// message + suggestion, validator.ts:166-178) is preserved for Class/File
// members of a group. The checker-facade error "Entity 'X' conflicts with
// imported entity" (index.ts:118) folds in here: an imported entity appended
// to the merged entities list collides by name and is reported by this check
// (message changes accordingly; no corpus assertions exist against it — §1).

import { ClassNode } from '../ast/class-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import type { CheckContext } from './check-context.ts';

const FUSION_MESSAGE = (name: string): string => {
  return `Entity name '${name}' is used by both a File and a Class. Consider using the #: operator for class-file fusion.`;
};

export const checkDuplicateNames = (context: CheckContext): void => {
  const groups = new Map<string, EntityNode[]>();
  for (const entity of context.entities) {
    const group = groups.get(entity.name) ?? [];
    group.push(entity);
    groups.set(entity.name, group);
  }

  for (const [name, group] of groups) {
    if (group.length < 2) {
      continue;
    }
    const classMember = group.find((entity) => entity instanceof ClassNode);
    const fileMember = group.find((entity) => entity instanceof FileNode);
    const fusionPair = classMember !== undefined && fileMember !== undefined;
    const kinds = group.map((entity) => entity.kind).join(', ');

    for (const entity of group) {
      if (fusionPair && (entity instanceof ClassNode || entity instanceof FileNode)) {
        // Legacy fusion hint, message + suggestion verbatim (validator.ts:166-178).
        context.addFinding({
          code: 'checker/duplicate-name',
          severity: 'error',
          span: entity.span,
          message: FUSION_MESSAGE(name),
          suggestion: `Replace with: ${name} #: ${fileMember.path} <: BaseClass`,
        });
        continue;
      }
      // Originated coverage: same-kind, longform, and mixed collisions the
      // legacy side channel never saw. Message shape follows the legacy
      // generic conflict text (validator.ts:181-186) with the group's kinds in
      // declaration order; one finding PER declaration so both spans surface.
      context.addFinding({
        code: 'checker/duplicate-name',
        severity: 'error',
        span: entity.span,
        message: `Duplicate entity name '${name}' found in multiple ${kinds} entities`,
        suggestion: 'Entity names must be unique across the entire codebase',
      });
    }
  }
};
