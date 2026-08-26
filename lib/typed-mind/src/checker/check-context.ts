// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — the shared state every ported check
// consumes. The context replaces the legacy `Map<string, AnyEntity>` argument:
// `entities` is the duplicate-preserving ParseOutcome list (the duplicate-name
// check walks it), `byName` is the insertion-order last-wins projection every
// other check resolves through (replicating the legacy Map lookup,
// parser.ts:122), `links` is the TM-3 LinkIndex (the derived reverse data that
// replaced populateReferencedBy's population half), and `parseDiagnostics` is
// the carrier for the F4 double-report skip (code + span match key, §1).

import type { Diagnostic } from '../ast/diagnostic.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { Span } from '../ast/span.ts';
import type { LinkIndex } from '../pipeline/link-index.ts';
import type { CheckerFinding } from './finding.ts';

const spanEquals = (left: Span, right: Span): boolean => {
  return (
    left.start.line === right.start.line &&
    left.start.column === right.start.column &&
    left.end.line === right.end.line &&
    left.end.column === right.end.column
  );
};

export class CheckContext {
  readonly entities: readonly EntityNode[];
  readonly byName: ReadonlyMap<string, EntityNode>;
  readonly links: LinkIndex;
  readonly parseDiagnostics: readonly Diagnostic[];
  readonly #findings: CheckerFinding[] = [];

  constructor(args: {
    entities: readonly EntityNode[];
    links: LinkIndex;
    parseDiagnostics: readonly Diagnostic[];
  }) {
    this.entities = args.entities;
    const byName = new Map<string, EntityNode>();
    for (const entity of args.entities) {
      byName.set(entity.name, entity);
    }
    this.byName = byName;
    this.links = args.links;
    this.parseDiagnostics = args.parseDiagnostics;
  }

  addFinding(finding: CheckerFinding): void {
    this.#findings.push(finding);
  }

  get findings(): readonly CheckerFinding[] {
    return this.#findings;
  }

  // The F4 double-report resolution's match key (§1): a parse-time diagnostic
  // with this code on this exact span means the parse-time report wins and the
  // validator stays silent for it.
  hasParseDiagnostic(code: string, span: Span): boolean {
    return this.parseDiagnostics.some((diagnostic) => diagnostic.code === code && spanEquals(diagnostic.span, span));
  }
}
