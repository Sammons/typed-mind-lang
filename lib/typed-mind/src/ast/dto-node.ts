// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): DTO.
// Required: fields. Language-optional: purpose.

import type { DtoFieldNode } from './dto-field-node.ts';
import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class DtoNode extends EntityNode {
  override readonly kind = 'DTO' as const;
  readonly fields: readonly DtoFieldNode[];
  readonly purpose: string | undefined;

  constructor(args: EntityNodeArgs & { fields: readonly DtoFieldNode[]; purpose?: string }) {
    super(args);
    this.fields = args.fields;
    this.purpose = args.purpose;
  }
}
