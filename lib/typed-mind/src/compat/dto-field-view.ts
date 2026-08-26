// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — the `DtoFieldNode & { optional }` compat
// view named in the RFC text. Legacy `DTOField.optional?: boolean` (types.ts)
// collapsed the three-way `optionalityMarker` discriminant TM-3 introduced
// (dto-field-node.ts) back into one boolean; `DtoFieldNode.isOptional` is
// already that boolean, exposed under a getter named for the new surface. This
// view re-exposes it under the legacy field name `optional` so a migrating
// consumer's existing `field.optional` reads keep working against the new
// class without a rename at every call site.

import type { DtoFieldNode } from '../ast/dto-field-node.ts';

export type DtoFieldView = DtoFieldNode & { readonly optional: boolean };

export const toDtoFieldView = (field: DtoFieldNode): DtoFieldView => {
  return Object.assign(Object.create(Object.getPrototypeOf(field)), field, {
    optional: field.isOptional,
  }) as DtoFieldView;
};
