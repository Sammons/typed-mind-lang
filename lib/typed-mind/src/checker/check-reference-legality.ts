// RFC-TM-4 §1, reference-legality leaf (rfc-tm-4-diamond.md) — the validation
// half of legacy populateReferencedBy (validator.ts:1244-1439). The population
// half lives in the TM-3 LinkIndex (error-free derivation by design); the
// three error classes against VALID_REFERENCES port here as a walk over the
// forward fields, messages verbatim:
//   - unknown-ref-type (validator.ts:1258) — unreachable with a closed
//     ReferenceKind table, ported for structure;
//   - from-side (validator.ts:1267-1274): "X 'name' cannot have 'refType'
//     references";
//   - to-side (validator.ts:1278-1285): "Cannot use 'refType' to reference
//     Type 'name'".
// Replicated legacy walk quirks (each cited):
//   - a missing target short-circuits BEFORE any legality check
//     (validator.ts:1252-1253), so unresolved names produce nothing here;
//   - wildcard imports are skipped and an import whose target is a Dependency
//     takes the importedBy route with no legality check (validator.ts:1305-1321);
//   - RFC-TM-13 Q replaces first-dot call truncation with checked qualified resolution;
//   - extends/implements are walked only for referencers whose LEGACY type is
//     'Class' (validator.ts:1400-1409): ClassNodes, plus lookahead-converted
//     ClassFileNodes (raw lacks the '#:' sigil — the pinned P2 discriminant
//     from the TM-3 Q5 substrate; legacy stored those as Class). A genuine
//     `#:` ClassFile's extends/implements were never legality-checked;
//   - errors emit once per occurrence, before the population-side dedupe
//     (the dedupe guarded referencedBy pushes, not error emission).

import { AssetNode } from '../ast/asset-node.ts';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { ConstantsNode } from '../ast/constants-node.ts';
import { parametersOf } from '../ast/declared-type-parameters.ts';
import { DependencyNode } from '../ast/dependency-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { resolvedNameTarget } from '../ast/qualified-name-resolver.ts';
import { RunParameterNode } from '../ast/run-parameter-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import type { CheckContext } from './check-context.ts';
import { type ReferenceKind, VALID_REFERENCES } from './valid-references.ts';

// Exported for the per-direction fixtures (Q1 check binding): the from-side
// and unknown-ref-type arms are defensive gates unreachable through the typed
// AST walk (every walked field lives on a kind its from-list allows), so the
// fixtures exercise this arm directly.
export const checkSingleReference = (context: CheckContext, from: EntityNode, referenceKind: ReferenceKind, targetName: string): void => {
  if (
    (referenceKind === 'extends' || referenceKind === 'implements') &&
    parametersOf(from)?.some((parameter) => parameter.name === targetName)
  )
    return;
  const result =
    referenceKind === 'calls'
      ? context.names.resolve(targetName)
      : referenceKind === 'exports'
        ? context.resolveExport(from.name, targetName, from.span)
        : context.resolveName(targetName, from.span, referenceKind === 'imports' ? from.name : undefined);
  // Dependency exports represent external types/members without a local kind.
  if (result.kind === 'external' && referenceKind !== 'calls') return;
  const target =
    resolvedNameTarget(result) ??
    (referenceKind === 'calls' && result.kind === 'unresolved' && !result.ownerName.includes('.')
      ? context.byName.get(result.ownerName)
      : undefined);
  if (target === undefined) {
    return; // validator.ts:1252-1253 — missing targets short-circuit silently
  }

  const legality = VALID_REFERENCES[referenceKind];
  if (legality === undefined) {
    // Unreachable with the closed table; ported for structure (validator.ts:1258).
    context.addFinding({
      code: 'checker/reference-unknown-type',
      severity: 'error',
      span: from.span,
      message: `Unknown reference type '${referenceKind}' on '${from.name}'`,
      suggestion: `File a bug report — this reference kind should never reach the checker`,
    });
    return;
  }

  if (!legality.from.includes(from.kind)) {
    context.addFinding({
      code: 'checker/reference-from-illegal',
      severity: 'error',
      span: from.span,
      message: `${from.kind} '${from.name}' cannot have '${referenceKind}' references`,
      suggestion: `Only ${legality.from.join(', ')} entities can have '${referenceKind}' references`,
    });
    return;
  }

  const verifiedClassFileMethod = referenceKind === 'calls' && result.kind === 'member' && result.owner instanceof ClassFileNode;
  if (!legality.to.includes(target.kind) && !verifiedClassFileMethod) {
    context.addFinding({
      code: 'checker/reference-to-illegal',
      severity: 'error',
      span: from.span,
      message: `Cannot use '${referenceKind}' to reference ${target.kind} '${referenceKind === 'calls' ? target.name : targetName}'`,
      suggestion: `'${referenceKind}' can only reference: ${legality.to.join(', ')}`,
    });
  }
};

const checkImportsOf = (context: CheckContext, from: EntityNode, imports: readonly string[]): void => {
  for (const imported of imports) {
    if (imported.includes('*')) {
      continue; // wildcard imports skip the walk (validator.ts:1305)
    }
    const target = context.byName.get(imported);
    if (target !== undefined && target.kind === 'Dependency') {
      continue; // the importedBy route carries no legality check (validator.ts:1309-1317)
    }
    checkSingleReference(context, from, 'imports', imported);
  }
};

// The pinned P2 discriminant (TM-3 Q5 substrate): a lookahead-converted
// ClassFileNode's raw is the `Name @ path:` File declaration — no `#:` sigil.
// Legacy stored the conversion as type 'Class' (parser.ts:226-235).
const isLegacyClass = (entity: EntityNode): boolean => {
  return entity instanceof ClassNode || (entity instanceof ClassFileNode && !entity.raw.includes('#:'));
};

const checkFunctionReferences = (context: CheckContext, fn: FunctionNode): void => {
  for (const call of fn.calls) {
    checkSingleReference(context, fn, 'calls', call);
  }
  if (fn.input !== undefined) {
    checkSingleReference(context, fn, 'input', fn.input);
  }
  if (fn.output !== undefined) {
    checkSingleReference(context, fn, 'output', fn.output);
  }
  for (const consumed of fn.consumes ?? []) {
    checkSingleReference(context, fn, 'consumes', consumed);
  }
  for (const affected of fn.affects ?? []) {
    checkSingleReference(context, fn, 'affects', affected);
  }
};

const checkEntityReferences = (context: CheckContext, entity: EntityNode): void => {
  if (entity instanceof FileNode) {
    checkImportsOf(context, entity, entity.imports);
    for (const exported of entity.exports) {
      checkSingleReference(context, entity, 'exports', exported);
    }
  } else if (entity instanceof ClassFileNode) {
    checkImportsOf(context, entity, entity.imports);
    for (const exported of entity.exports) {
      checkSingleReference(context, entity, 'exports', exported);
    }
    if (isLegacyClass(entity)) {
      if (entity.extends !== undefined) {
        checkSingleReference(context, entity, 'extends', entity.extends);
      }
      for (const implemented of entity.implements) {
        checkSingleReference(context, entity, 'implements', implemented);
      }
    }
  } else if (entity instanceof ClassNode) {
    if (entity.extends !== undefined) {
      checkSingleReference(context, entity, 'extends', entity.extends);
    }
    for (const implemented of entity.implements) {
      checkSingleReference(context, entity, 'implements', implemented);
    }
  } else if (entity instanceof ProgramNode) {
    checkSingleReference(context, entity, 'entry', entity.entry);
    for (const exported of entity.exports ?? []) {
      checkSingleReference(context, entity, 'exports', exported);
    }
  } else if (entity instanceof FunctionNode) {
    checkFunctionReferences(context, entity);
  } else if (entity instanceof UiComponentNode) {
    for (const child of entity.contains ?? []) {
      checkSingleReference(context, entity, 'contains', child);
    }
    for (const parent of entity.declaredContainedBy ?? []) {
      checkSingleReference(context, entity, 'containedBy', parent);
    }
    for (const affecting of entity.declaredAffectedBy ?? []) {
      checkSingleReference(context, entity, 'affectedBy', affecting);
    }
  } else if (entity instanceof AssetNode) {
    if (entity.containsProgram !== undefined) {
      checkSingleReference(context, entity, 'containsProgram', entity.containsProgram);
    }
  } else if (entity instanceof ConstantsNode) {
    if (entity.schema !== undefined) {
      checkSingleReference(context, entity, 'schema', entity.schema);
    }
  } else if (entity instanceof RunParameterNode) {
    // Legacy walked param.consumedBy (validator.ts:1430-1437), populated only
    // by the parser's derived reverse writes — the derivation now lives on the
    // LinkIndex. Structurally ported; silent by construction (every derived
    // entry names an existing Function).
    for (const consumer of context.links.consumedBy(entity.name)) {
      checkSingleReference(context, entity, 'consumedBy', consumer);
    }
  } else if (entity instanceof DependencyNode) {
    // Legacy's 'exports' walk included Dependencies (validator.ts:1327-1331);
    // the from-side gate lists Dependency, so only to-side errors can fire.
    for (const exported of entity.exports ?? []) {
      checkSingleReference(context, entity, 'exports', exported);
    }
  }
};

export const checkReferenceLegality = (context: CheckContext): void => {
  // Legacy iterated the name-keyed Map (validator.ts:1301) — last-wins view,
  // one walk per surviving entity, not per declaration.
  for (const entity of context.byName.values()) {
    checkEntityReferences(context, entity);
  }
};
