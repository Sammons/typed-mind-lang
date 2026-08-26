// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — the compat-alias intersection views the
// Q2 companion census (PR #20) recommended and this Quantum ships for TM-5
// (LSP) and TM-6 (typescript converter, renderer) to migrate against. A
// migrating consumer today reads `entity.type` (EntityType) and
// `entity.position` (Position) off the legacy `Entity` shape (types.ts); the
// new `EntityNode` carries the same information as `entity.kind` (EntityKind)
// and `entity.span.start` (Span's start Position, matching Position's line/
// column fields verbatim, ast/span.ts). This view adds the two legacy-named
// accessors on top of a real EntityNode instance — mechanical bridge only, no
// behavior change, no data duplication (both accessors read live off the
// underlying node). It does NOT replicate `referencedBy` (the legacy Entity's
// reverse-link field) — LinkIndex is the new surface's replacement for that,
// and mixing the two would recreate the exact duplicated-computation problem
// RFC-TM-3's Problem section names.

import type { EntityKind } from '../ast/entity-kind.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { Position } from '../ast/span.ts';

export type EntityView<T extends EntityNode = EntityNode> = T & {
  readonly type: EntityKind;
  readonly position: Position;
};

export const toEntityView = <T extends EntityNode>(entity: T): EntityView<T> => {
  return Object.assign(Object.create(Object.getPrototypeOf(entity)), entity, {
    type: entity.kind,
    position: entity.span.start,
  }) as EntityView<T>;
};
