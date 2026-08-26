// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): ClassFile (the
// Class+File fusion kind). Required: path, implements, methods, imports,
// exports. Language-optional: extends, purpose. Auto-self-export replicated
// from parser.ts:287: construction always includes `name` in `exports`.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class ClassFileNode extends EntityNode {
  override readonly kind = 'ClassFile' as const;
  readonly path: string;
  readonly implements: readonly string[];
  readonly methods: readonly string[];
  readonly imports: readonly string[];
  readonly exports: readonly string[];
  readonly extends: string | undefined;
  readonly purpose: string | undefined;

  constructor(
    args: EntityNodeArgs & {
      path: string;
      implements: readonly string[];
      methods: readonly string[];
      imports: readonly string[];
      exports: readonly string[];
      extends?: string;
      purpose?: string;
    },
  ) {
    super(args);
    this.path = args.path;
    this.implements = args.implements;
    this.methods = args.methods;
    this.imports = args.imports;
    // Fusion auto-self-export (parser.ts:287): the class name is always
    // exported by its own file. Pure expression, assign-only constructor.
    this.exports = args.exports.includes(args.name) ? args.exports : [...args.exports, args.name];
    this.extends = args.extends;
    this.purpose = args.purpose;
  }
}
