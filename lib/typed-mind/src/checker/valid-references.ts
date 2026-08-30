// RFC-TM-4 §1, reference-legality leaf (rfc-tm-4-diamond.md) — the
// VALID_REFERENCES table ported verbatim from DSLValidator (validator.ts:30-95),
// re-keyed on the new EntityKind vocabulary (string-identical to the legacy
// EntityType strings, ast/entity-kind.ts). The table is the shared authority
// for the from-side / to-side legality checks in check-reference-legality.ts.

import type { EntityKind } from '../ast/entity-kind.ts';

export type ReferenceKind =
  | 'imports'
  | 'exports'
  | 'calls'
  | 'extends'
  | 'implements'
  | 'contains'
  | 'containedBy'
  | 'affects'
  | 'affectedBy'
  | 'consumes'
  | 'consumedBy'
  | 'input'
  | 'output'
  | 'entry'
  | 'containsProgram'
  | 'schema';

export interface ReferenceLegality {
  readonly from: readonly EntityKind[];
  readonly to: readonly EntityKind[];
}

export const VALID_REFERENCES: Record<ReferenceKind, ReferenceLegality> = {
  imports: {
    from: ['File', 'Class', 'ClassFile'],
    to: ['Function', 'Class', 'ClassFile', 'Constants', 'DTO', 'Asset', 'UIComponent', 'RunParameter', 'File', 'Dependency'],
  },
  exports: {
    from: ['File', 'ClassFile', 'Program', 'Dependency'],
    to: ['Function', 'Class', 'ClassFile', 'Constants', 'DTO', 'Asset', 'UIComponent', 'File'],
  },
  calls: {
    from: ['Function'],
    to: ['Function', 'Class'], // Class is allowed because of method calls
  },
  extends: {
    from: ['Class', 'ClassFile'],
    to: ['Class', 'ClassFile'],
  },
  implements: {
    from: ['Class', 'ClassFile'],
    to: ['Class', 'ClassFile'], // In TypedMind, interfaces are represented as Classes
  },
  contains: {
    from: ['UIComponent'],
    to: ['UIComponent'],
  },
  containedBy: {
    from: ['UIComponent'],
    to: ['UIComponent'],
  },
  affects: {
    from: ['Function'],
    to: ['UIComponent'],
  },
  affectedBy: {
    from: ['UIComponent'],
    to: ['Function'],
  },
  consumes: {
    from: ['Function'],
    to: ['RunParameter', 'Asset', 'Dependency', 'Constants'],
  },
  consumedBy: {
    from: ['RunParameter'],
    to: ['Function'],
  },
  input: {
    from: ['Function'],
    to: ['DTO'],
  },
  output: {
    from: ['Function'],
    to: ['DTO'],
  },
  entry: {
    from: ['Program'],
    // issue #90 (lead ruling) — a ClassFile is, by definition, a File fused
    // with a Class (`--prefer-class-file`'s fusion of an entrypoint module
    // that declares a top-level class). It satisfies "entry is a file" the
    // same way a plain File does, so it is a legal Program.entry target.
    // Zero grammar change — this is a reference-legality row widening only.
    to: ['File', 'ClassFile'],
  },
  containsProgram: {
    from: ['Asset'],
    to: ['Program'],
  },
  schema: {
    from: ['Constants'],
    // RFC-TM-8 §5 (rfc-tm-8-diamond.md, X-TYPE-7): TypeDef joins the legal
    // schema-reference targets — a Constants entity's schema may now name an
    // enum or alias TypeDef, not only a Class or DTO.
    to: ['Class', 'DTO', 'TypeDef'], // Schema can reference a type definition
  },
};
