// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): ClassFile (the
// Class+File fusion kind). Required: path, implements, methods, imports,
// exports. Language-optional: extends, purpose. Auto-self-export replicated
// from parser.ts:287: construction always includes `name` in `exports`.
// RFC-TM-14 §S3 (rfc-tm-14-diamond.md): ClassFile gains `calls` and
// `consumes` with FunctionNode's defaults, the same per-class slot as
// ClassNode (see class-node.ts).

import type { ClassMemberArgs, ClassMembers } from './class-members.ts';
import { EntityNode, type EntityNodeArgs } from './entity-node.ts';
import { type ClassHeritage, type ClassHeritageArgs, classHeritageFromArgs } from './heritage-reference.ts';
import type { TypeParameterNode } from './type-parameter-node.ts';

export class ClassFileNode extends EntityNode {
  override readonly kind = 'ClassFile' as const;
  readonly path: string;
  readonly implements: readonly string[];
  readonly methods: readonly string[];
  readonly members: ClassMembers | undefined;
  readonly imports: readonly string[];
  readonly exports: readonly string[];
  readonly extends: string | undefined;
  readonly purpose: string | undefined;
  readonly calls: readonly string[];
  readonly consumes: readonly string[] | undefined;
  readonly heritage: ClassHeritage;
  readonly typeParameters: readonly TypeParameterNode[] | undefined;

  constructor(
    args: EntityNodeArgs &
      ClassHeritageArgs &
      ClassMemberArgs & {
        path: string;
        imports: readonly string[];
        exports: readonly string[];
        purpose?: string;
        calls?: readonly string[];
        consumes?: readonly string[];
        typeParameters?: readonly TypeParameterNode[];
      },
  ) {
    super(args);
    this.path = args.path;
    this.heritage = classHeritageFromArgs(args, args.span);
    this.implements = this.heritage.implements.flatMap((reference) => (reference.kind === 'named' ? [reference.base.name] : []));
    this.members = args.members;
    this.methods =
      args.members === undefined
        ? args.methods
        : args.members.methods.flatMap((method) => (method.name === undefined ? [] : [method.name]));
    this.imports = args.imports;
    // Fusion auto-self-export (parser.ts:287): the class name is always
    // exported by its own file. Pure expression, assign-only constructor.
    this.exports = args.exports.includes(args.name) ? args.exports : [...args.exports, args.name];
    this.extends = this.heritage.extends?.kind === 'named' ? this.heritage.extends.base.name : undefined;
    this.purpose = args.purpose;
    this.calls = args.calls ?? [];
    this.consumes = args.consumes;
    this.typeParameters = args.typeParameters;
  }
}
