// RFC-TM-8 §5 (rfc-tm-8-diamond.md, X-TYPE-7) — the TypeDef entity: one kind,
// two variants (enum | alias), the RULING spelling ("TypeAlias misleads
// because the kind carries enums"). Enum variants carry `members`; alias
// variants carry the aliased type as a `TypeExprNode` (opaque leaf allowed,
// per the same amendment X-TYPE-2's opaque leaf already carries). The two
// variant shapes are mutually exclusive at the type level via a discriminated
// union on `variant`, mirroring `OptionalityMarker`'s discriminant shape
// (dto-field-node.ts) rather than two independent optional fields — a
// TypeDef is always exactly one variant, never both or neither.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';
import type { TypeExprNode } from './type-expr-node.ts';

export class TypeDefNode extends EntityNode {
  override readonly kind = 'TypeDef' as const;
  readonly variant: 'enum' | 'alias';
  // Present only when variant === 'enum'; absent for 'alias'.
  readonly members: readonly string[] | undefined;
  // Present only when variant === 'alias'; absent for 'enum'.
  readonly aliasType: TypeExprNode | undefined;
  readonly purpose: string | undefined;

  constructor(
    args: EntityNodeArgs &
      (
        | { variant: 'enum'; members: readonly string[]; aliasType?: undefined }
        | { variant: 'alias'; aliasType: TypeExprNode; members?: undefined }
      ) & { purpose?: string },
  ) {
    super(args);
    this.variant = args.variant;
    this.members = args.variant === 'enum' ? args.members : undefined;
    this.aliasType = args.variant === 'alias' ? args.aliasType : undefined;
    this.purpose = args.purpose;
  }
}
