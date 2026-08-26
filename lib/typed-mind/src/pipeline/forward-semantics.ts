// RFC-TM-3 §3.4 (rfc-tm-3-diamond.md) — forward semantics as a named phase:
// the port of the legacy distributeFunctionDependencies (parser.ts:764-868)
// forward half. Each Function's mixed `<- [...]` list (carried raw on
// pendingDependencies by the Q3 attach layer) distributes by referenced-entity
// kind: DTO→input (first only), Function/Class/ClassFile→calls,
// UIComponent→affects, Asset/RunParameter/Constants→consumes. Unresolved names
// stay on pendingDependencies — the F5 carrier TM-4's validator consumes
// (validator.ts:1449-1467). The two legacy silent behaviors become diagnostics
// (§3.3, both warning severity, both verdict-moving in TM-4):
//   - semantics/extra-input-dto: DTOs beyond the first, silently ignored today
//     (parser.ts:842-856);
//   - semantics/dependency-direct-consumption: a Dependency in the list, today
//     deferred to a worse-message validator error; the name ALSO stays on
//     pendingDependencies exactly as legacy keeps it in _dependencies, so the
//     TM-4 double-report risk noted in the §3.3 table is preserved, not fixed
//     here.
// The phase writes FORWARD fields only (the S-AST-4 boundary): the legacy
// inline reverse writes (affectedBy/consumedBy, parser.ts:797-830) do not
// exist here — reverse data belongs to computeLinks (§3.5).
//
// Ordering (pinned legacy quirk, doc §3.4): the phase runs per document,
// BEFORE any import merge (index.ts:104-127) — TypedMindParser.parse() calls
// it, the Q5 import resolver does not re-run it. A dependency satisfied only
// by an import is therefore never distributed yet never errored.
//
// Mutation shape: semantic nodes are immutable (§2.2, all fields readonly), so
// the phase never writes to a node — it REPLACES each FunctionNode that has a
// pending list with a rebuilt FunctionNode in the entities array. Name
// resolution uses a last-wins map over the duplicate-preserving list,
// replicating the legacy Map lookup (parser.ts:122).

import type { Diagnostic } from '../ast/diagnostic.ts';
import type { EntityKind } from '../ast/entity-kind.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FunctionNode } from '../ast/function-node.ts';

const CALL_KINDS: readonly EntityKind[] = ['Function', 'Class', 'ClassFile'];
const CONSUMED_KINDS: readonly EntityKind[] = ['Asset', 'RunParameter', 'Constants'];

const pushUnique = (list: string[], name: string): void => {
  if (!list.includes(name)) {
    list.push(name);
  }
};

const dependencyDirectConsumptionDiagnostic = (fn: FunctionNode, dependencyName: string): Diagnostic => {
  return {
    code: 'semantics/dependency-direct-consumption',
    severity: 'warning',
    span: fn.span,
    message: `Function '${fn.name}' lists Dependency '${dependencyName}' in its \`<- [...]\` dependency list; Dependencies cannot be consumed directly — a File must import '${dependencyName}' first`,
  };
};

const extraInputDtoDiagnostic = (fn: FunctionNode, extraDto: string, firstDto: string): Diagnostic => {
  return {
    code: 'semantics/extra-input-dto',
    severity: 'warning',
    span: fn.span,
    message: `Function '${fn.name}' lists extra input DTO '${extraDto}' beyond the first ('${firstDto}') in its \`<- [...]\` dependency list; it is ignored — a Function takes one input DTO (\`<- Name\`)`,
  };
};

const distributeOne = (fn: FunctionNode, byName: ReadonlyMap<string, EntityNode>, diagnostics: Diagnostic[]): FunctionNode => {
  const unresolved: string[] = [];
  const dtos: string[] = [];
  const calls = [...fn.calls];
  let affects = fn.affects === undefined ? undefined : [...fn.affects];
  let consumes = fn.consumes === undefined ? undefined : [...fn.consumes];
  let input = fn.input;

  for (const dependencyName of fn.pendingDependencies) {
    const target = byName.get(dependencyName);
    if (target === undefined) {
      unresolved.push(dependencyName);
    } else if (target.kind === 'DTO') {
      dtos.push(dependencyName);
    } else if (CALL_KINDS.includes(target.kind)) {
      pushUnique(calls, dependencyName);
    } else if (target.kind === 'UIComponent') {
      affects = affects ?? [];
      pushUnique(affects, dependencyName);
    } else if (target.kind === 'Dependency') {
      diagnostics.push(dependencyDirectConsumptionDiagnostic(fn, dependencyName));
      unresolved.push(dependencyName);
    } else if (CONSUMED_KINDS.includes(target.kind)) {
      consumes = consumes ?? [];
      pushUnique(consumes, dependencyName);
    } else {
      // File and Program targets: legacy default arm (parser.ts:833-835) —
      // kept unresolved for the validator.
      unresolved.push(dependencyName);
    }
  }

  const firstDto = dtos.at(0);
  if (firstDto !== undefined) {
    if (input === undefined) {
      input = firstDto;
    }
    for (const extraDto of dtos.slice(1)) {
      diagnostics.push(extraInputDtoDiagnostic(fn, extraDto, firstDto));
    }
  }

  return new FunctionNode({
    name: fn.name,
    span: fn.span,
    raw: fn.raw,
    sourceForm: fn.sourceForm,
    ...(fn.comment !== undefined ? { comment: fn.comment } : {}),
    signature: fn.signature,
    calls,
    pendingDependencies: unresolved,
    ...(fn.description !== undefined ? { description: fn.description } : {}),
    ...(input !== undefined ? { input } : {}),
    ...(fn.output !== undefined ? { output: fn.output } : {}),
    ...(affects !== undefined ? { affects } : {}),
    ...(consumes !== undefined ? { consumes } : {}),
  });
};

export const distributeForwardSemantics = (entities: EntityNode[]): Diagnostic[] => {
  const byName = new Map<string, EntityNode>();
  for (const entity of entities) {
    byName.set(entity.name, entity);
  }
  const diagnostics: Diagnostic[] = [];
  for (const [index, entity] of entities.entries()) {
    if (entity instanceof FunctionNode && entity.pendingDependencies.length > 0) {
      entities[index] = distributeOne(entity, byName, diagnostics);
    }
  }
  return diagnostics;
};
