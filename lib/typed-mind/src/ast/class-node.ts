// RFC-TM-3 §2.2 honest-fields table + F2/F3 fusion ruling
// (rfc-tm-3-diamond.md): Class. Required: implements, methods.
// Language-optional: extends, purpose. Legacy `container` (dead) and
// `path`/`imports` are dropped: the File→Class lookahead heuristic's product is
// a ClassFileNode, and a `<- [...]` continuation on a declared Class becomes
// `semantics/illegal-continuation` (zero corpus instances; verdict-moving,
// enumerated for TM-4's S-TEST-1 amendments). ClassNode carries NO
// declaredImports field — that is the F3 disposition, not an omission.
// RFC-TM-14 §S3 (rfc-tm-14-diamond.md): Class gains `calls` and `consumes`
// with FunctionNode's defaults (`[]` / undefined). The slot is per class —
// "a member body of this class calls X / reads Y"; no per-member surface.

import type { ClassMemberArgs, ClassMembers } from './class-members.ts';
import { EntityNode, type EntityNodeArgs } from './entity-node.ts';
import { type ClassHeritage, type ClassHeritageArgs, classHeritageFromArgs } from './heritage-reference.ts';
import type { TypeParameterNode } from './type-parameter-node.ts';

export class ClassNode extends EntityNode {
  override readonly kind = 'Class' as const;
  readonly implements: readonly string[];
  readonly methods: readonly string[];
  readonly members: ClassMembers | undefined;
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
        purpose?: string;
        calls?: readonly string[];
        consumes?: readonly string[];
        typeParameters?: readonly TypeParameterNode[];
      },
  ) {
    super(args);
    this.heritage = classHeritageFromArgs(args, args.span);
    this.implements = this.heritage.implements.flatMap((reference) => (reference.kind === 'named' ? [reference.base.name] : []));
    this.members = args.members;
    this.methods =
      args.members === undefined
        ? args.methods
        : args.members.methods.flatMap((method) => (method.name === undefined ? [] : [method.name]));
    this.extends = this.heritage.extends?.kind === 'named' ? this.heritage.extends.base.name : undefined;
    this.purpose = args.purpose;
    this.calls = args.calls ?? [];
    this.consumes = args.consumes;
    this.typeParameters = args.typeParameters;
  }
}
