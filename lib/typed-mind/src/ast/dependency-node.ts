// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): Dependency.
// Required: purpose. Language-optional: version, exports. Legacy `importedBy`
// is dropped — non-declarable (longform hardcodes `[]`, longform-parser.ts:334;
// no shortform sigil exists); it is derived-only in the Q4 LinkIndex.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class DependencyNode extends EntityNode {
  override readonly kind = 'Dependency' as const;
  readonly purpose: string;
  readonly version: string | undefined;
  readonly exports: readonly string[] | undefined;

  constructor(args: EntityNodeArgs & { purpose: string; version?: string; exports?: readonly string[] }) {
    super(args);
    this.purpose = args.purpose;
    this.version = args.version;
    this.exports = args.exports;
  }
}
