// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): File.
// Required: path, imports, exports, reExports. Language-optional: purpose.
//
// RFC-TM-11 §RX-2 (rfc-tm-11-diamond.md) — reExports names a File's
// pass-through re-exports (`<-> [...]` shortform / `reexports: [...]`
// longform): a name real importers reference directly that this File does
// not itself declare. Required (defaults to `[]`, never `undefined`) per
// the same honest-fields discipline as `imports`/`exports` — a File's
// re-export list is always knowable once parsed. Deliberately NOT wired
// into `valid-references.ts`'s reference-legality table: the declaring
// entity lives outside this document's traversal by construction, so
// `reExports` is consulted only by `check-orphans.ts`'s `isFileConsumed`
// (RX-3), never validated as "must resolve to an entity."
// ClassFileNode does NOT carry this field (RX-1): a ClassFile always
// auto-self-exports its own class name, so it can never have an empty
// `exports` the way a re-export barrel File can, and `checkOrphans` never
// routes a ClassFile through `isFileConsumed` at all.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class FileNode extends EntityNode {
  override readonly kind = 'File' as const;
  readonly path: string;
  readonly imports: readonly string[];
  readonly exports: readonly string[];
  readonly reExports: readonly string[];
  readonly purpose: string | undefined;

  constructor(
    args: EntityNodeArgs & {
      path: string;
      imports: readonly string[];
      exports: readonly string[];
      reExports: readonly string[];
      purpose?: string;
    },
  ) {
    super(args);
    this.path = args.path;
    this.imports = args.imports;
    this.exports = args.exports;
    this.reExports = args.reExports;
    this.purpose = args.purpose;
  }
}
