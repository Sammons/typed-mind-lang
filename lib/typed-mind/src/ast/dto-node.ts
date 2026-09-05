// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): DTO.
// Required: fields. Language-optional: purpose.

import type { DtoFieldNode } from './dto-field-node.ts';
import { EntityNode, type EntityNodeArgs } from './entity-node.ts';
import type { HeritageReference } from './heritage-reference.ts';
import type { TypeParameterNode } from './type-parameter-node.ts';

export class DtoNode extends EntityNode {
  override readonly kind = 'DTO' as const;
  readonly fields: readonly DtoFieldNode[];
  readonly purpose: string | undefined;
  readonly typeParameters: readonly TypeParameterNode[] | undefined;
  readonly extendsReferences: readonly HeritageReference[] | undefined;

  constructor(
    args: EntityNodeArgs & {
      fields: readonly DtoFieldNode[];
      purpose?: string;
      typeParameters?: readonly TypeParameterNode[];
      extendsReferences?: readonly HeritageReference[];
    },
  ) {
    super(args);
    this.fields = args.fields;
    this.purpose = args.purpose;
    this.typeParameters = args.typeParameters;
    this.extendsReferences = args.extendsReferences;
  }
}
