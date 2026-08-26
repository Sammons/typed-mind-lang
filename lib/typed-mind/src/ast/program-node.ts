// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): Program.
// Required: entry. Language-optional: purpose, version, exports.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class ProgramNode extends EntityNode {
  override readonly kind = 'Program' as const;
  readonly entry: string;
  readonly purpose: string | undefined;
  readonly version: string | undefined;
  readonly exports: readonly string[] | undefined;

  constructor(args: EntityNodeArgs & { entry: string; purpose?: string; version?: string; exports?: readonly string[] }) {
    super(args);
    this.entry = args.entry;
    this.purpose = args.purpose;
    this.version = args.version;
    this.exports = args.exports;
  }
}
