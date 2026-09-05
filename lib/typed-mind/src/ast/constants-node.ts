// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): Constants.
// Required: path. Language-optional: schema, purpose.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class ConstantsNode extends EntityNode {
  override readonly kind = 'Constants' as const;
  readonly path: string;
  readonly schema: string | undefined;
  readonly purpose: string | undefined;
  readonly calls: readonly string[];

  constructor(args: EntityNodeArgs & { path: string; schema?: string; purpose?: string; calls?: readonly string[] }) {
    super(args);
    this.path = args.path;
    this.schema = args.schema;
    this.purpose = args.purpose;
    this.calls = args.calls ?? [];
  }
}
