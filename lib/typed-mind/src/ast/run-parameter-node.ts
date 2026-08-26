// RFC-TM-3 §2.2 honest-fields table (rfc-tm-3-diamond.md): RunParameter.
// Required: paramType, description. Language-optional: defaultValue, required.
// Legacy `consumedBy` is dropped — genuinely non-declarable (longform hardcodes
// `[]`, longform-parser.ts:321); it is derived-only in the Q4 LinkIndex.

import type { RunParameterType } from './entity-kind.ts';
import { EntityNode, type EntityNodeArgs } from './entity-node.ts';

export class RunParameterNode extends EntityNode {
  override readonly kind = 'RunParameter' as const;
  readonly paramType: RunParameterType;
  readonly description: string;
  readonly defaultValue: string | undefined;
  readonly required: boolean | undefined;

  constructor(args: EntityNodeArgs & { paramType: RunParameterType; description: string; defaultValue?: string; required?: boolean }) {
    super(args);
    this.paramType = args.paramType;
    this.description = args.description;
    this.defaultValue = args.defaultValue;
    this.required = args.required;
  }
}
