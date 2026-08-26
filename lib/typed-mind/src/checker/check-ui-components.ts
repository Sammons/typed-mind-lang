// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — the UIComponent checks:
//   - checkUIComponentRelationships (validator.ts:997-1047): contains
//     existence/kind, and the declared-containedBy existence + kind checks
//     ("references unknown parent" / "cannot be contained by ... (it's a X)")
//     against declaredContainedBy — existence + kind ONLY; legacy has no
//     containedBy disagreement error and none is originated here (§1, FID-4);
//   - checkFunctionUIComponentAffects (validator.ts:1049-1106): affects
//     existence/kind, plus the affectedBy DISAGREEMENT — the declared
//     affectedBy claims compared against the LinkIndex derivation of
//     Function.affects (legacy compared against its inline componentAffectedBy
//     accumulation, which the LinkIndex reproduces: targets that exist, from
//     affecting Functions);
//   - checkUIComponentContainment (validator.ts:1136-1172): every non-root
//     UIComponent must be contained — the containment evidence is the
//     LinkIndex containedBy derivation from `contains`, matching the legacy
//     containedComponents mechanics for entities that exist (§1).

import { FunctionNode } from '../ast/function-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import type { CheckContext } from './check-context.ts';

export const checkUiComponentRelationships = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof UiComponentNode)) {
      continue;
    }
    for (const childName of entity.contains ?? []) {
      const child = context.byName.get(childName);
      if (child === undefined) {
        context.addFinding({
          code: 'checker/contains-unknown',
          severity: 'error',
          span: entity.span,
          message: `UIComponent '${entity.name}' contains unknown component '${childName}'`,
          suggestion: `Define '${childName}' as a UIComponent`,
        });
      } else if (child.kind !== 'UIComponent') {
        context.addFinding({
          code: 'checker/contains-non-uicomponent',
          severity: 'error',
          span: entity.span,
          message: `UIComponent '${entity.name}' cannot contain '${childName}' (it's a ${child.kind})`,
          suggestion: 'Only UIComponents can contain other UIComponents',
        });
      }
    }
    for (const parentName of entity.declaredContainedBy ?? []) {
      const parent = context.byName.get(parentName);
      if (parent === undefined) {
        context.addFinding({
          code: 'checker/containedby-unknown-parent',
          severity: 'error',
          span: entity.span,
          message: `UIComponent '${entity.name}' references unknown parent '${parentName}'`,
          suggestion: `Define '${parentName}' as a UIComponent`,
        });
      } else if (parent.kind !== 'UIComponent') {
        context.addFinding({
          code: 'checker/containedby-non-uicomponent',
          severity: 'error',
          span: entity.span,
          message: `UIComponent '${entity.name}' cannot be contained by '${parentName}' (it's a ${parent.kind})`,
          suggestion: 'Only UIComponents can contain other UIComponents',
        });
      }
    }
  }
};

export const checkFunctionUiComponentAffects = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof FunctionNode)) {
      continue;
    }
    for (const componentName of entity.affects ?? []) {
      const component = context.byName.get(componentName);
      if (component === undefined) {
        context.addFinding({
          code: 'checker/affects-unknown',
          severity: 'error',
          span: entity.span,
          message: `Function '${entity.name}' affects unknown component '${componentName}'`,
          suggestion: `Define '${componentName}' as a UIComponent`,
        });
      } else if (component.kind !== 'UIComponent') {
        context.addFinding({
          code: 'checker/affects-non-uicomponent',
          severity: 'error',
          span: entity.span,
          message: `Function '${entity.name}' cannot affect '${componentName}' (it's a ${component.kind})`,
          suggestion: 'Functions can only affect UIComponents',
        });
      }
    }
  }

  // The affectedBy disagreement (validator.ts:1085-1105): declared claims
  // versus the derived affecting set.
  for (const entity of context.byName.values()) {
    if (!(entity instanceof UiComponentNode)) {
      continue;
    }
    const declared = entity.declaredAffectedBy ?? [];
    if (declared.length === 0) {
      continue;
    }
    const functionsAffecting = context.links.affectedBy(entity.name);
    for (const funcName of declared) {
      if (!functionsAffecting.includes(funcName)) {
        context.addFinding({
          code: 'checker/affectedby-disagreement',
          severity: 'error',
          span: entity.span,
          message: `UIComponent '${entity.name}' claims to be affected by '${funcName}', but that function doesn't affect it`,
          suggestion: `Add '${entity.name}' to the affects list of function '${funcName}'`,
        });
      }
    }
  }
};

export const checkUiComponentContainment = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof UiComponentNode)) {
      continue;
    }
    if (entity.root) {
      continue; // root components need no container (validator.ts:1157)
    }
    if (context.links.containedBy(entity.name).length === 0) {
      context.addFinding({
        code: 'checker/uncontained-uicomponent',
        severity: 'error',
        span: entity.span,
        message: `UIComponent '${entity.name}' is not contained by any other UIComponent`,
        suggestion: `Either add '${entity.name}' to another UIComponent's contains list, or mark it as a root component with &!`,
      });
    }
  }
};
