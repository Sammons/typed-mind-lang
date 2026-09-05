// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): Constants.
// Required: path. Language-optional: schema, purpose.
//
// RFC-TM-14 R6a (rfc-tm-14-diamond.md §S5): the schema slot is a full type
// expression (`schemaType`, the TypeDef `aliasType` precedent — grammar slot
// `type_expr`, X-TYPE-2 structured AST). `schema` is DERIVED, never
// constructed: the base name of a bare named schema (`ConfigSchema`,
// `ZFile.Model`) or of a generic schema (`Record` for `Record<string, Rule>`),
// and `undefined` for arrays, unions, intersections, literals and opaque
// text. The five name consumers (link-index, reference legality, member
// resolution, hover, assertion engine) read the derived name; everything
// that needs the whole annotation prints `schemaType`.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';
import type { TypeExprNode } from './type-expr-node.ts';

export const schemaBaseName = (schemaType: TypeExprNode | undefined): string | undefined => {
  if (schemaType === undefined) {
    return undefined;
  }
  if (schemaType.kind === 'named') {
    return schemaType.name;
  }
  if (schemaType.kind === 'generic') {
    return schemaType.base.name;
  }
  return undefined;
};

export class ConstantsNode extends EntityNode {
  override readonly kind = 'Constants' as const;
  readonly path: string;
  readonly schemaType: TypeExprNode | undefined;
  readonly schema: string | undefined;
  readonly purpose: string | undefined;
  readonly calls: readonly string[];

  constructor(args: EntityNodeArgs & { path: string; schemaType?: TypeExprNode; purpose?: string; calls?: readonly string[] }) {
    super(args);
    this.path = args.path;
    this.schemaType = args.schemaType;
    this.schema = schemaBaseName(args.schemaType);
    this.purpose = args.purpose;
    this.calls = args.calls ?? [];
  }
}
