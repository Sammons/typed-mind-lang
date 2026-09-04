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
  // Gap 67 (ladder rung sammons/slat-harness, fixture
  // 67-implements-data-interface). DTO joins both inherit slots.
  //
  // The old comment on `implements` — "In TypedMind, interfaces are
  // represented as Classes" — was a HALF truth, and the half that was false
  // is what made fixture 67 unsatisfiable. A TypeScript interface has no
  // single TypedMind kind: the extractor classifies it BY SHAPE
  // (typescript-to-typedmind-converter.ts `convertInterface`), because the
  // language models a method surface only on Class (`ClassNode.methods`,
  // check-method-calls.ts:36) and a field surface only on DTO
  // (`DtoNode.fields`). A method-bearing interface is a Class; a
  // property-only interface is a DTO. Both are correct classifications, and
  // BOTH are legitimate `implements` targets in the source language — a TS
  // class may implement a purely data-shaped interface, which is exactly
  // fixture 67's `class NoopSpan implements Span` where `Span` is
  // `{ name: string; ended: boolean }`.
  //
  // Restricting the slot to Class/ClassFile therefore did not express a
  // language rule; it hard-coded one half of a classification the extractor
  // performs on the other side, making a legal and common source shape
  // unrepresentable no matter which kind the converter picked. Widening the
  // slot is the smaller, more honest change than forcing every data-shaped
  // interface into the Class kind purely to satisfy this table — that
  // alternative would strip the interface's fields (ClassNode has no field
  // surface at all), trading a checker error for silent data loss.
  //
  // BOTH slots are widened, not just `implements`, because shortform emission
  // collapses `extends` + `implements` into the single `<:` inherit list
  // (emit-shortform.ts `inheritanceSuffix`), so a round-trip re-parse
  // attributes the FIRST target to `extends`. Widening `implements` alone
  // would leave fixture 67 failing in shortform while passing in longform —
  // the exact split the fixture's own header documents.
  //
  // What stays enforced: the `from` side is untouched (only a Class or
  // ClassFile can declare inheritance), the target must still EXIST
  // (`unknown-base-class` in check-cycles.ts), and inheritance cycles are
  // still rejected. Widening the `to` side does not open Function, File,
  // Program, or any other kind — only the second of the two kinds a
  // TypeScript interface legitimately converts to.
  extends: {
    from: ['Class', 'ClassFile'],
    to: ['Class', 'ClassFile', 'DTO'],
  },
  implements: {
    from: ['Class', 'ClassFile'],
    to: ['Class', 'ClassFile', 'DTO'],
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
