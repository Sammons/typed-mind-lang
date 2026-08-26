// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): File.
// Required: path, imports, exports. Language-optional: purpose.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class FileNode extends EntityNode {
  override readonly kind = 'File' as const;
  readonly path: string;
  readonly imports: readonly string[];
  readonly exports: readonly string[];
  readonly purpose: string | undefined;

  constructor(args: EntityNodeArgs & { path: string; imports: readonly string[]; exports: readonly string[]; purpose?: string }) {
    super(args);
    this.path = args.path;
    this.imports = args.imports;
    this.exports = args.exports;
    this.purpose = args.purpose;
  }
}
