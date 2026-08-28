// RFC-TM-3 §3.1 (rfc-tm-3-diamond.md) — the mutable per-entity accumulator the
// walk/attach layer fills while an entity is "open" (declaration seen, its
// continuation lines still attaching). Semantic nodes are immutable (§2.2, all
// fields readonly), so mutation lives HERE and only here: the walker assigns
// slots (repeated continuations of the same kind replicate legacy last-wins
// assignment, parser.ts:457-650; DTO fields append, parser.ts:586), then
// finalize() constructs the semantic class once, when the entity closes.

import { AssetNode } from '../ast/asset-node.ts';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { ConstantsNode } from '../ast/constants-node.ts';
import { DependencyNode } from '../ast/dependency-node.ts';
import type { DtoFieldNode } from '../ast/dto-field-node.ts';
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityKind, RunParameterType, TypeDefVariant } from '../ast/entity-kind.ts';
import type { EntityNode, EntityNodeArgs, SourceForm } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { RunParameterNode } from '../ast/run-parameter-node.ts';
import type { Span } from '../ast/span.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';

export interface AccumulatorSlots {
  entry?: string | undefined;
  purpose?: string | undefined;
  version?: string | undefined;
  exports?: string[] | undefined;
  path?: string | undefined;
  imports?: string[] | undefined;
  signature?: string | undefined;
  calls?: string[] | undefined;
  pendingDependencies?: string[] | undefined;
  description?: string | undefined;
  input?: string | undefined;
  output?: string | undefined;
  affects?: string[] | undefined;
  consumes?: string[] | undefined;
  extendsName?: string | undefined;
  implementsList?: string[] | undefined;
  methods?: string[] | undefined;
  schema?: string | undefined;
  fields?: DtoFieldNode[] | undefined;
  containsProgram?: string | undefined;
  root?: boolean | undefined;
  contains?: string[] | undefined;
  declaredContainedBy?: string[] | undefined;
  declaredAffectedBy?: string[] | undefined;
  paramType?: string | undefined;
  defaultValue?: string | undefined;
  required?: boolean | undefined;
  // X-TYPE-7 (rfc-tm-8-diamond.md §5): TypeDef's own slots. variant is always
  // set by the opener/builder before finalize(); members/aliasType are set
  // per-variant (mutually exclusive, mirroring TypeDefNode's own constructor
  // discriminant).
  typeDefVariant?: TypeDefVariant | undefined;
  members?: string[] | undefined;
  aliasType?: TypeExprNode | undefined;
}

export interface EntityAccumulatorArgs {
  readonly kind: EntityKind;
  readonly name: string;
  readonly span: Span;
  readonly raw: string;
  readonly comment?: string | undefined;
  // The File→Class lookahead conversion origin flag (§2.2 F2/F3): a
  // ClassFileNode produced by the heuristic keeps the legacy converted-Class
  // continuation surface (description_line attaches purpose, parser.ts:611-613)
  // that a declared `#:` ClassFile never had.
  readonly viaLookahead?: boolean | undefined;
  // RFC-TM-4 §2 (rfc-tm-4-diamond.md, FID-6): which CST node class opened this
  // entity — a line declaration (openers) is 'shortform'; a brace-block header
  // (buildFromLongformBlock / buildFromClassfileBlockSigil, the latter for the
  // sigil-with-brace ClassFile header `Name #: path {`) is 'longform'.
  readonly sourceForm: SourceForm;
}

export class EntityAccumulator {
  readonly kind: EntityKind;
  readonly name: string;
  readonly span: Span;
  readonly raw: string;
  readonly comment: string | undefined;
  readonly viaLookahead: boolean;
  readonly sourceForm: SourceForm;
  readonly slots: AccumulatorSlots = {};

  constructor(args: EntityAccumulatorArgs) {
    this.kind = args.kind;
    this.name = args.name;
    this.span = args.span;
    this.raw = args.raw;
    this.comment = args.comment;
    this.viaLookahead = args.viaLookahead ?? false;
    this.sourceForm = args.sourceForm;
  }

  baseArgs(): EntityNodeArgs {
    return {
      name: this.name,
      span: this.span,
      raw: this.raw,
      sourceForm: this.sourceForm,
      ...(this.comment !== undefined ? { comment: this.comment } : {}),
    };
  }

  finalize(): EntityNode {
    const finalizer = FINALIZERS[this.kind];
    return finalizer(this);
  }
}

type Finalizer = (accumulator: EntityAccumulator) => EntityNode;

// Optional-field spreads keep explicit `undefined` out of the constructor args
// (exactOptionalPropertyTypes); required-field defaults mirror the legacy
// entity literals (parser.ts:187-455, longform-parser.ts:181-343).
const FINALIZERS: Record<EntityKind, Finalizer> = {
  Program: (accumulator) => {
    const { slots } = accumulator;
    return new ProgramNode({
      ...accumulator.baseArgs(),
      entry: slots.entry ?? '',
      ...(slots.purpose !== undefined ? { purpose: slots.purpose } : {}),
      ...(slots.version !== undefined ? { version: slots.version } : {}),
      ...(slots.exports !== undefined ? { exports: slots.exports } : {}),
    });
  },
  File: (accumulator) => {
    const { slots } = accumulator;
    return new FileNode({
      ...accumulator.baseArgs(),
      path: slots.path ?? '',
      imports: slots.imports ?? [],
      exports: slots.exports ?? [],
      ...(slots.purpose !== undefined ? { purpose: slots.purpose } : {}),
    });
  },
  Function: (accumulator) => {
    const { slots } = accumulator;
    return new FunctionNode({
      ...accumulator.baseArgs(),
      signature: slots.signature ?? '',
      calls: slots.calls ?? [],
      pendingDependencies: slots.pendingDependencies ?? [],
      ...(slots.description !== undefined ? { description: slots.description } : {}),
      ...(slots.input !== undefined ? { input: slots.input } : {}),
      ...(slots.output !== undefined ? { output: slots.output } : {}),
      ...(slots.affects !== undefined ? { affects: slots.affects } : {}),
      ...(slots.consumes !== undefined ? { consumes: slots.consumes } : {}),
    });
  },
  Class: (accumulator) => {
    const { slots } = accumulator;
    return new ClassNode({
      ...accumulator.baseArgs(),
      implements: slots.implementsList ?? [],
      methods: slots.methods ?? [],
      ...(slots.extendsName !== undefined ? { extends: slots.extendsName } : {}),
      ...(slots.purpose !== undefined ? { purpose: slots.purpose } : {}),
    });
  },
  ClassFile: (accumulator) => {
    const { slots } = accumulator;
    return new ClassFileNode({
      ...accumulator.baseArgs(),
      path: slots.path ?? '',
      implements: slots.implementsList ?? [],
      methods: slots.methods ?? [],
      imports: slots.imports ?? [],
      // Auto-self-export lives in the ClassFileNode constructor (parser.ts:287).
      exports: slots.exports ?? [],
      ...(slots.extendsName !== undefined ? { extends: slots.extendsName } : {}),
      ...(slots.purpose !== undefined ? { purpose: slots.purpose } : {}),
    });
  },
  Constants: (accumulator) => {
    const { slots } = accumulator;
    return new ConstantsNode({
      ...accumulator.baseArgs(),
      path: slots.path ?? '',
      ...(slots.schema !== undefined ? { schema: slots.schema } : {}),
      ...(slots.purpose !== undefined ? { purpose: slots.purpose } : {}),
    });
  },
  DTO: (accumulator) => {
    const { slots } = accumulator;
    return new DtoNode({
      ...accumulator.baseArgs(),
      fields: slots.fields ?? [],
      ...(slots.purpose !== undefined ? { purpose: slots.purpose } : {}),
    });
  },
  Asset: (accumulator) => {
    const { slots } = accumulator;
    return new AssetNode({
      ...accumulator.baseArgs(),
      description: slots.description ?? '',
      ...(slots.containsProgram !== undefined ? { containsProgram: slots.containsProgram } : {}),
    });
  },
  UIComponent: (accumulator) => {
    const { slots } = accumulator;
    return new UiComponentNode({
      ...accumulator.baseArgs(),
      purpose: slots.purpose ?? '',
      root: slots.root ?? false,
      ...(slots.contains !== undefined ? { contains: slots.contains } : {}),
      ...(slots.declaredContainedBy !== undefined ? { declaredContainedBy: slots.declaredContainedBy } : {}),
      ...(slots.declaredAffectedBy !== undefined ? { declaredAffectedBy: slots.declaredAffectedBy } : {}),
    });
  },
  RunParameter: (accumulator) => {
    const { slots } = accumulator;
    return new RunParameterNode({
      ...accumulator.baseArgs(),
      // Replicates the legacy blind narrowing at parser.ts:397 (any `$word`
      // sigil is carried as-is; paramType legality is TM-4 validator scope).
      paramType: (slots.paramType ?? 'env') as RunParameterType,
      description: slots.description ?? '',
      ...(slots.defaultValue !== undefined ? { defaultValue: slots.defaultValue } : {}),
      ...(slots.required !== undefined ? { required: slots.required } : {}),
    });
  },
  Dependency: (accumulator) => {
    const { slots } = accumulator;
    return new DependencyNode({
      ...accumulator.baseArgs(),
      purpose: slots.purpose ?? '',
      ...(slots.version !== undefined ? { version: slots.version } : {}),
      ...(slots.exports !== undefined ? { exports: slots.exports } : {}),
    });
  },
  TypeDef: (accumulator) => {
    const { slots } = accumulator;
    const purposeArgs = slots.purpose !== undefined ? { purpose: slots.purpose } : {};
    // Defensive default: a malformed/incomplete accumulation (e.g. a future
    // parse-recovery path that opens a TypeDef without ever setting its
    // variant) falls back to an empty alias-of-opaque rather than throwing —
    // parsing stays tolerant end to end, matching the same tolerance
    // attachment-rules.ts's typeExprOf documents for a missing type_expr.
    if (slots.typeDefVariant === 'enum') {
      return new TypeDefNode({
        ...accumulator.baseArgs(),
        variant: 'enum',
        members: slots.members ?? [],
        ...purposeArgs,
      });
    }
    return new TypeDefNode({
      ...accumulator.baseArgs(),
      variant: 'alias',
      aliasType: slots.aliasType ?? { kind: 'opaque', text: '', span: accumulator.span },
      ...purposeArgs,
    });
  },
};
