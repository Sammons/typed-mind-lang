// RFC-TM-3 §2.2 honest-fields table + F2/F3 fusion ruling
// (rfc-tm-3-diamond.md): Class. Required: implements, methods.
// Language-optional: extends, purpose. Legacy `container` (dead) and
// `path`/`imports` are dropped: the File→Class lookahead heuristic's product is
// a ClassFileNode, and a `<- [...]` continuation on a declared Class becomes
// `semantics/illegal-continuation` (zero corpus instances; verdict-moving,
// enumerated for TM-4's S-TEST-1 amendments). ClassNode carries NO
// declaredImports field — that is the F3 disposition, not an omission.

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class ClassNode extends EntityNode {
  override readonly kind = 'Class' as const;
  readonly implements: readonly string[];
  readonly methods: readonly string[];
  readonly extends: string | undefined;
  readonly purpose: string | undefined;

  constructor(args: EntityNodeArgs & { implements: readonly string[]; methods: readonly string[]; extends?: string; purpose?: string }) {
    super(args);
    this.implements = args.implements;
    this.methods = args.methods;
    this.extends = args.extends;
    this.purpose = args.purpose;
  }
}
