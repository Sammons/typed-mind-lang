// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — DSLValidator.checkImports ported
// verbatim (validator.ts:369-406). Operates on the post-merge entity set (the
// §1 ordering disposition: an import-satisfied dependency neither distributes
// nor errors). The legacy isDependency rescue (:388) is unreachable — the map
// is name-keyed, so a Dependency named `imp` would have satisfied
// `entities.has(imp)` — and is ported as the same dead guard for fidelity.

import { ClassFileNode } from '../ast/class-file-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import type { CheckContext } from './check-context.ts';
import type { CheckerFinding } from './finding.ts';
import { findSimilar } from './name-similarity.ts';

const importsOf = (entity: EntityNode): readonly string[] | undefined => {
  if (entity instanceof FileNode || entity instanceof ClassFileNode) {
    return entity.imports;
  }
  return undefined;
};

export const checkImports = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    const imports = importsOf(entity);
    if (imports === undefined) {
      continue;
    }
    for (const imported of imports) {
      if (imported.includes('*')) {
        const base = imported.split('*')[0] ?? '';
        const hasMatch = [...context.byName.keys()].some((name) => name.startsWith(base));
        if (!hasMatch) {
          context.addFinding({
            code: 'checker/import-pattern-unmatched',
            severity: 'error',
            span: entity.span,
            message: `No entities match import pattern '${imported}'`,
          });
        }
      } else if (!context.byName.has(imported)) {
        const isDependency = [...context.byName.values()].some(
          (candidate) => candidate.kind === 'Dependency' && candidate.name === imported,
        );
        if (!isDependency) {
          const suggestion = findSimilar(imported, context.byName.keys());
          const finding: CheckerFinding = {
            code: 'checker/import-not-found',
            severity: 'error',
            span: entity.span,
            message: `Import '${imported}' not found`,
            ...(suggestion === null ? {} : { suggestion: `Did you mean '${suggestion}'?` }),
          };
          context.addFinding(finding);
        }
      }
    }
  }
};
