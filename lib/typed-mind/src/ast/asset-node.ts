// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): Asset.
// Required: description. Language-optional: containsProgram.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class AssetNode extends EntityNode {
  override readonly kind = 'Asset' as const;
  readonly description: string;
  readonly containsProgram: string | undefined;

  constructor(args: EntityNodeArgs & { description: string; containsProgram?: string }) {
    super(args);
    this.description = args.description;
    this.containsProgram = args.containsProgram;
  }
}
