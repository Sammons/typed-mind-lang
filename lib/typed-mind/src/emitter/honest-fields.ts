// RFC-TM-8 §3 (rfc-tm-8-diamond.md, X-TYPE-3) — the shared honest-field
// projection used by every round-trip check (round-trip.test.ts's
// parse->emit->parse AST-equality bar, and toggle-round-trip.test.ts's
// parse->toggle->toggle-back AST-equality bar). Extracted from
// round-trip.test.ts (originally private to that file) so both suites stay
// on one implementation instead of two copies that could drift.
//
// toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/typedmind/
// toggle-fidelity-audit-2026-08-31.md) — extended past the original DtoNode-
// only special case to also strip TypeDefNode.aliasType's own recursive span
// tree (X-TYPE-3 applies identically to it: a TypeExprNode's spans move on
// every re-emission, whether it arrived via a DtoFieldNode.typeExpr or a
// TypeDefNode.aliasType — same TypeExprNode union, same span-bearing shape).
// SuppressionNode is handled by the caller (it is not an EntityNode, so it
// never reaches honestFieldsOf) via the sibling honestSuppressionOf export.

import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { SuppressionNode } from '../ast/suppression-node.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';

// typeExpr carries its own recursive span tree (one per structured
// sub-node); a round-trip regenerates new text so every span in that tree
// moves the same way DtoFieldNode.span/TypeDefNode.span itself does.
// honestTypeExprOf strips span at every level, recursing through the
// union/intersection/array/generic member arrays.
export const honestTypeExprOf = (typeExpr: TypeExprNode): unknown => {
  const { span: _span, ...rest } = typeExpr;
  if (rest.kind === 'union' || rest.kind === 'intersection') {
    return { ...rest, members: rest.members.map(honestTypeExprOf) };
  }
  if (rest.kind === 'array') {
    return { ...rest, element: honestTypeExprOf(rest.element) };
  }
  if (rest.kind === 'generic') {
    const { span: _baseSpan, ...baseRest } = rest.base;
    return { ...rest, base: baseRest, args: rest.args.map(honestTypeExprOf) };
  }
  return rest;
};

// Honest-field projection: every own enumerable field except span/raw, which
// are expected to move across a round-trip (new source text, new positions).
// DtoNode's fields carry their own per-field span (DtoFieldNode) and typeExpr
// span tree, stripped the same way one level down. TypeDefNode's aliasType
// carries the identical span tree one level down (X-TYPE-7's alias variant).
export const honestFieldsOf = (entity: EntityNode): Record<string, unknown> => {
  const { span: _span, raw: _raw, ...fields } = { ...entity };
  if (entity instanceof DtoNode) {
    return {
      ...fields,
      fields: entity.fields.map((field) => {
        const { span: _fieldSpan, typeExpr, ...fieldRest } = { ...field };
        return { ...fieldRest, typeExpr: honestTypeExprOf(typeExpr) };
      }),
    };
  }
  if (entity instanceof TypeDefNode && entity.aliasType !== undefined) {
    return { ...fields, aliasType: honestTypeExprOf(entity.aliasType) };
  }
  return fields;
};

// SuppressionNode is document-level, not an EntityNode (ast/suppression-node.ts's
// own doc comment: its target entity may not exist, so it cannot live
// attached to an entity or as an EntityKind member). It carries no nested
// span tree beyond its own top-level span/raw, so honesty here is a flat
// strip — included for symmetry with honestFieldsOf so callers never reach
// for entity.span/entity.raw comparison logic ad hoc.
export const honestSuppressionOf = (suppression: SuppressionNode): Record<string, unknown> => {
  const { span: _span, raw: _raw, ...fields } = { ...suppression };
  return fields;
};

// toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/typedmind/
// toggle-fidelity-audit-2026-08-31.md) — the toggle-specific honest-field
// projection. Confirmed structural (not a bug, not fixable at the emitter
// level without a language-level design change): `comment` and
// `purpose`/`description`-shaped fields are BOTH free-text carriers, and
// neither is ever read by the checker or link-index (grep-confirmed: zero
// `.comment` or `.purpose` reads outside the emitter/tests) — they exist
// purely for re-emission fidelity. Shortform can express EITHER slot
// independently (a bare inline `# comment` sets only `comment`; a quoted
// continuation line sets only `purpose`/`description`), while longform's
// `description:` property sets BOTH slots to the same value at once
// (longform-builder.ts: "Legacy longform comment = the description
// property"). Toggling a shortform-authored entity that used only ONE slot
// through longform and back therefore CAN move that text from `comment` to
// `purpose` (or vice versa) — not lose it, not corrupt it, just re-attribute
// which field carries it. This projection accepts that specific, harmless
// re-attribution while still catching a REAL loss: if the text disappears
// from BOTH slots, or changes value, the comparison still fails.
const FREE_TEXT_FIELD_BY_KIND: Partial<Record<EntityNode['kind'], string>> = {
  Program: 'purpose',
  File: 'purpose',
  Function: 'description',
  Class: 'purpose',
  ClassFile: 'purpose',
  Constants: 'purpose',
  DTO: 'purpose',
  Asset: 'description',
  UIComponent: 'purpose',
  RunParameter: 'description',
  Dependency: 'purpose',
  // TypeDef has no purpose/description continuation slot in shortform
  // (typeDefToShortform, emit-shortform.ts) — its `comment` is never a
  // duplicate of anything the body already shows, so no normalization
  // applies; omitted from this map on purpose.
};

export const honestFieldsAcrossToggleOf = (entity: EntityNode): Record<string, unknown> => {
  const fields = honestFieldsOf(entity);
  const freeTextKey = FREE_TEXT_FIELD_BY_KIND[entity.kind];
  if (freeTextKey === undefined) {
    return fields;
  }
  const commentValue = fields['comment'];
  const freeTextValue = fields[freeTextKey];
  // Collapse comment/free-text-field into ONE canonical value ONLY when at
  // most one of the two actually carries text (the shapes a real
  // shortform-authored document produces: either a bare inline `# comment`
  // sets only `comment`, or a quoted continuation line sets only
  // `purpose`/`description`, never both independently unless the author
  // wrote a genuinely distinct pair — `Foo % "purpose" # comment` — which
  // IS both non-undefined and DIFFERENT, so it falls through and both
  // fields stay in the comparison honestly). This is what lets a
  // comment-vs-purpose re-attribution (either direction) compare equal
  // while a real content change or total loss on either side still shows
  // up as a diff: collapsing unconditionally (an earlier version of this
  // function keyed only on `commentValue === undefined || commentValue ===
  // freeTextValue`) missed the case where the ORIGINAL side carries the
  // text in `comment` alone and the TOGGLED side carries it in the
  // free-text field alone — confirmed via a synthetic corrupted-entity
  // check that a genuine loss of a distinct comment slipped through
  // undetected before this fix.
  const collapsedValue = commentValue ?? freeTextValue;
  const canCollapse = commentValue === undefined || freeTextValue === undefined || commentValue === freeTextValue;
  if (canCollapse) {
    const { comment: _comment, ...rest } = fields;
    return { ...rest, [freeTextKey]: collapsedValue };
  }
  return fields;
};
