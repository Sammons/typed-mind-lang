// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): Function.
// Required: signature, calls, pendingDependencies. Language-optional:
// description, input, output, affects, consumes. Legacy `container` (dead) and
// `_dependencies` are dropped; the unresolved residue of `_dependencies`
// survives as pendingDependencies (§3.4), usually empty — the carrier TM-4's
// validator needs for "Function dependency not found" (validator.ts:1449-1467).

import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class FunctionNode extends EntityNode {
  override readonly kind = 'Function' as const;
  readonly signature: string;
  readonly calls: readonly string[];
  readonly pendingDependencies: readonly string[];
  readonly description: string | undefined;
  readonly input: string | undefined;
  readonly output: string | undefined;
  readonly affects: readonly string[] | undefined;
  readonly consumes: readonly string[] | undefined;

  constructor(
    args: EntityNodeArgs & {
      signature: string;
      calls: readonly string[];
      pendingDependencies: readonly string[];
      description?: string;
      input?: string;
      output?: string;
      affects?: readonly string[];
      consumes?: readonly string[];
    },
  ) {
    super(args);
    this.signature = args.signature;
    this.calls = args.calls;
    this.pendingDependencies = args.pendingDependencies;
    this.description = args.description;
    this.input = args.input;
    this.output = args.output;
    this.affects = args.affects;
    this.consumes = args.consumes;
  }
}
