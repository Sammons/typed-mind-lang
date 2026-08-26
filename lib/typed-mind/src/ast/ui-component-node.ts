// RFC-TM-3 §2.2 honest-fields table + F1 ruling (rfc-tm-3-diamond.md):
// UIComponent. Required: purpose, root. Language-optional: contains,
// declaredContainedBy, declaredAffectedBy. The declared halves of the legacy
// containedBy/affectedBy merge stay here as parse products — they are language
// surface (`< [A,B]` is grammar production C9; longform declares both keys,
// longform-parser.ts:282-283) and dropping them would be silent data loss. The
// derived halves live only in the Q4 LinkIndex; TM-4's validator compares
// declared against derived (the disagreement error class).

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class UiComponentNode extends EntityNode {
  override readonly kind = 'UIComponent' as const;
  readonly purpose: string;
  readonly root: boolean;
  readonly contains: readonly string[] | undefined;
  readonly declaredContainedBy: readonly string[] | undefined;
  readonly declaredAffectedBy: readonly string[] | undefined;

  constructor(
    args: EntityNodeArgs & {
      purpose: string;
      root: boolean;
      contains?: readonly string[];
      declaredContainedBy?: readonly string[];
      declaredAffectedBy?: readonly string[];
    },
  ) {
    super(args);
    this.purpose = args.purpose;
    this.root = args.root;
    this.contains = args.contains;
    this.declaredContainedBy = args.declaredContainedBy;
    this.declaredAffectedBy = args.declaredAffectedBy;
  }
}
