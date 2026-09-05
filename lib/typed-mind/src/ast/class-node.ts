// RFC-TM-3 §2.2 honest-fields table + F2/F3 fusion ruling
// (rfc-tm-3-diamond.md): Class. Required: implements, methods.
// Language-optional: extends, purpose. Legacy `container` (dead) and
// `path`/`imports` are dropped: the File→Class lookahead heuristic's product is
// a ClassFileNode, and a `<- [...]` continuation on a declared Class becomes
// `semantics/illegal-continuation` (zero corpus instances; verdict-moving,
// enumerated for TM-4's S-TEST-1 amendments). ClassNode carries NO
// declaredImports field — that is the F3 disposition, not an omission.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';
import { type ClassHeritage, type ClassHeritageArgs, classHeritageFromArgs } from './heritage-reference.ts';
import type { TypeParameterNode } from './type-parameter-node.ts';

export class ClassNode extends EntityNode {
  override readonly kind = 'Class' as const;
  readonly implements: readonly string[];
  readonly methods: readonly string[];
  readonly extends: string | undefined;
  readonly purpose: string | undefined;
  readonly heritage: ClassHeritage;
  readonly typeParameters: readonly TypeParameterNode[] | undefined;

  constructor(
    args: EntityNodeArgs &
      ClassHeritageArgs & { methods: readonly string[]; purpose?: string; typeParameters?: readonly TypeParameterNode[] },
  ) {
    super(args);
    this.heritage = classHeritageFromArgs(args, args.span);
    this.implements = this.heritage.implements.flatMap((reference) => (reference.kind === 'named' ? [reference.base.name] : []));
    this.methods = args.methods;
    this.extends = this.heritage.extends?.kind === 'named' ? this.heritage.extends.base.name : undefined;
    this.purpose = args.purpose;
    this.typeParameters = args.typeParameters;
  }
}
