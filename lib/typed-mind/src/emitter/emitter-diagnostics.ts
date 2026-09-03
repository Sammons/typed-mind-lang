// Issue #130 (git.tail4ea214.ts.net/sammons/typed-mind-lang) — disposition
// (b). `quoteStringLiteral` (quote-string-literal.ts) swaps every embedded
// `"` for `'` on emission, because the grammar's string token has no escape
// production (see that module's own header comment). The swap is the only
// mechanically-safe move available today, but until disposition (a) — a
// grammar-level escaped-quote production — lands, it is still a silent
// rewrite of user-authored content. This module is the fix for the SILENCE,
// not the rewrite: it produces a `Diagnostic` (ast/diagnostic.ts's shape,
// the same shape `imports/*`/`semantics/*`/`syntax/*` codes use) naming the
// entity and property whose content was mutated.
//
// `emitter/*` diagnostics are deliberately NOT added to CHECK_CODES
// (checker/check-codes.ts) — that registry's own header comment freezes it
// as "the frozen public checker-code registry" scoped to `code:` sites
// under src/checker/ and src/pipeline/ only (check-codes.test.ts's
// stability test greps exactly those two directories, and
// check-diagnostic-code-audit.mjs / check-diagnostic-jargon.mjs scan the
// same two directories). The operative predicate is DIRECTORY, not code
// prefix: `imports/*` and `semantics/*` live in `pipeline/` and ARE scanned
// by both scripts — they are IN CHECK_CODES's scanned scope, just absent
// from the registry array itself (PR #141 review correction: an earlier
// version of this comment claimed prefix was the reason those codes sit
// outside CHECK_CODES, which is wrong — it is the registry array's own
// contents, not their directory). `emitter/quote-swap` is exempt because
// `src/emitter/` is a directory neither script scans at all, not because of
// its `emitter/` prefix.
import type { AssetNode } from '../ast/asset-node.ts';
import type { ClassFileNode } from '../ast/class-file-node.ts';
import type { ClassNode } from '../ast/class-node.ts';
import type { ConstantsNode } from '../ast/constants-node.ts';
import type { DependencyNode } from '../ast/dependency-node.ts';
import type { Diagnostic } from '../ast/diagnostic.ts';
import type { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { FileNode } from '../ast/file-node.ts';
import type { FunctionNode } from '../ast/function-node.ts';
import type { ProgramNode } from '../ast/program-node.ts';
import type { RunParameterNode } from '../ast/run-parameter-node.ts';
import type { Span } from '../ast/span.ts';
import type { TypeDefNode } from '../ast/type-def-node.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import type { UiComponentNode } from '../ast/ui-component-node.ts';
import { printTypeExpr } from './print-type-expr.ts';
import { quoteSwapOccurred } from './quote-string-literal.ts';

export const QUOTE_SWAP_CODE = 'emitter/quote-swap';

// Issue #130, second face — the LONGFORM-ONLY counterpart of the quote-swap
// silence above, added in this PR's review round. A TypeDef alias whose
// printed type OPENS with a string literal (`"active"`, `"active" |
// "inactive"`) has no correct longform spelling in EITHER representation:
// quoted double-wraps into an unparsable value, and unquoted is claimed by
// P1 `property_string`, whose `unquote` silently degrades a
// `literal`/literalKind:'string' leaf to a `named` one. The checker
// DISTINGUISHES those kinds (`check-dto-fields.ts:181` gates
// `checker/enum-literal-outside-members` on `literalKind === 'string'`), so
// the unquoted route is a semantic change, not a spelling nicety.
//
// `typeDefToLongform` (emit-longform.ts `aliasTypeValue`) deliberately picks
// the QUOTED route for this class, so the failure is at least loud at parse
// time. This diagnostic makes it loud at EMIT time too, so a caller holding
// the emitted text does not have to reparse to discover the emission could
// not represent its input. Shortform is unaffected — `Name = "active"`
// round-trips byte-perfect — so this is form-gated to longform, the same way
// `comment` and TypeDef `purpose` are.
export const UNREPRESENTABLE_ALIAS_CODE = 'emitter/unrepresentable-alias';

export const unrepresentableAliasDiagnostic = (entityName: string, printedType: string, span: Span): Diagnostic => {
  return {
    code: UNREPRESENTABLE_ALIAS_CODE,
    severity: 'warning',
    span,
    message: `'aliasType' on '${entityName}' prints as \`${printedType}\`, which opens with a string literal and has no longform spelling — the grammar's 'type:' slot cannot represent it, so this emission will not reparse; keep this entity in shortform (\`${entityName} = ${printedType}\`), which round-trips exactly`,
  };
};

// The emitter-side twin of `aliasTypeValue`'s exclusion in emit-longform.ts:
// a printed type whose first chunk is a string literal. Kept here (not
// imported from the emitter) because this module must not depend on
// emit-longform.ts — that module already imports THIS one.
const opensWithStringLiteral = (printed: string): boolean => printed.trimStart().startsWith('"');

// Style guide (lib/typed-mind/docs/diagnostic-style-guide.md): WHAT + WHERE
// in `message` (backtick-quoted names), WHAT-TO-DO folded into `message`
// too — `Diagnostic` carries no `suggestion` field (TM-3's message-only
// design, per checker/finding.ts's header comment), matching the existing
// `imports/read-failure` / `semantics/illegal-continuation` precedent of
// folding clause 3 into the message text itself.
export const quoteSwapDiagnostic = (entityName: string, propertyName: string, span: Span): Diagnostic => {
  return {
    code: QUOTE_SWAP_CODE,
    severity: 'warning',
    span,
    message: `'${propertyName}' on '${entityName}' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character`,
  };
};

const pushIfSwapped = (
  diagnostics: Diagnostic[],
  entityName: string,
  propertyName: string,
  value: string | undefined,
  span: Span,
): void => {
  if (value !== undefined && quoteSwapOccurred(value)) {
    diagnostics.push(quoteSwapDiagnostic(entityName, propertyName, span));
  }
};

// PR #141 review (blockers 1/2) — `printTypeExpr` (print-type-expr.ts:32)
// IS a real `quoteStringLiteral` producing site: `TypeLiteralNode` with
// `literalKind === 'string'` routes its `value` through the same swap.
// `printTypeExpr` is called on `TypeDefNode.aliasType` (both
// `typeDefToShortform`/`typeDefToLongform`) and would also fire for a
// future caller printing a `DtoFieldNode.typeExpr` (not exercised by the
// current emitter — DTO field types print `field.type`, the preserved raw
// text, verbatim — but the walker below covers it defensively so a future
// call site cannot reintroduce this exact gap silently). Walks every
// `literal` leaf reachable through union/intersection/array/generic
// composition (the only structured shapes that can nest a literal) and
// returns each swapped string value, in encounter order.
const swappedStringLiteralsIn = (node: TypeExprNode): string[] => {
  switch (node.kind) {
    case 'literal':
      return node.literalKind === 'string' && quoteSwapOccurred(node.value) ? [node.value] : [];
    case 'generic':
      return node.args.flatMap(swappedStringLiteralsIn);
    case 'array':
      return swappedStringLiteralsIn(node.element);
    case 'union':
    case 'intersection':
      return node.members.flatMap(swappedStringLiteralsIn);
    case 'named':
    case 'opaque':
      return [];
  }
};

const pushIfTypeExprSwapped = (
  diagnostics: Diagnostic[],
  entityName: string,
  propertyName: string,
  typeExpr: TypeExprNode | undefined,
  span: Span,
): void => {
  if (typeExpr === undefined) {
    return;
  }
  const swappedCount = swappedStringLiteralsIn(typeExpr).length;
  for (let index = 0; index < swappedCount; index += 1) {
    diagnostics.push(quoteSwapDiagnostic(entityName, propertyName, span));
  }
};

// Mirrors exactly the set of free-text properties and TypeExprNode-typed
// fields emit-shortform.ts/emit-longform.ts route through
// `quoteStringLiteral` (directly, or transitively via `printTypeExpr` — see
// `swappedStringLiteralsIn`/`pushIfTypeExprSwapped` above) for each entity
// kind. `entity.comment` is quoted ONLY in longform
// (`descriptionAndPurposeLines` prints it as `description:`) — shortform's
// own inline comment (`withInlineComment`, emit-shortform.ts) is appended as
// a raw, unquoted trailing `# comment` and never reaches
// `quoteStringLiteral`, so `form` gates whether `comment` is checked at all;
// checking it unconditionally would over-report a shortform emission that
// never touched the value. `DtoFieldNode.description` is checked only where
// a field carries one. TypeDefNode's `purpose` is likewise longform-only
// (`typeDefToShortform` never references it). TypeDefNode's `aliasType`,
// for the 'alias' variant, IS checked in both forms via `printTypeExpr` —
// PR #141 review, blocker 1: an earlier version of this module claimed the
// alias branch never reaches `quoteStringLiteral` at all, which was wrong.
// The genuinely-excluded call site is a different one: `typeDefToLongform`'s
// own outer `type: "..."` wrapper (its own comment in emit-longform.ts) does
// not call `quoteStringLiteral` — there is nothing to report for the
// wrapper text itself, only for a literal member `printTypeExpr` prints
// inside it, which this function now covers.
export const quoteSwapDiagnosticsFor = (entity: EntityNode, form: 'shortform' | 'longform'): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  if (form === 'longform') {
    pushIfSwapped(diagnostics, entity.name, 'comment', entity.comment, entity.span);
  }
  switch (entity.kind) {
    case 'Program':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as ProgramNode).purpose, entity.span);
      break;
    case 'File':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as FileNode).purpose, entity.span);
      break;
    case 'Function':
      pushIfSwapped(diagnostics, entity.name, 'description', (entity as FunctionNode).description, entity.span);
      break;
    case 'Class':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as ClassNode).purpose, entity.span);
      break;
    case 'ClassFile':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as ClassFileNode).purpose, entity.span);
      break;
    case 'Constants':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as ConstantsNode).purpose, entity.span);
      break;
    case 'DTO': {
      const dto = entity as DtoNode;
      pushIfSwapped(diagnostics, entity.name, 'purpose', dto.purpose, entity.span);
      for (const field of dto.fields) {
        pushIfSwapped(diagnostics, entity.name, `field '${field.name}'.description`, field.description, field.span);
        // Not reachable through the current emitter (dtoFieldLine/
        // dtoFieldToLongform print `field.type`, the preserved raw text,
        // never `field.typeExpr`) — checked anyway so a future emission
        // path that prints `field.typeExpr` via `printTypeExpr` cannot
        // reintroduce blocker 1/2's exact gap silently.
        pushIfTypeExprSwapped(diagnostics, entity.name, `field '${field.name}'.type`, field.typeExpr, field.span);
      }
      break;
    }
    case 'Asset':
      pushIfSwapped(diagnostics, entity.name, 'description', (entity as AssetNode).description, entity.span);
      break;
    case 'UIComponent':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as UiComponentNode).purpose, entity.span);
      break;
    case 'RunParameter': {
      const runParameter = entity as RunParameterNode;
      pushIfSwapped(diagnostics, entity.name, 'description', runParameter.description, entity.span);
      pushIfSwapped(diagnostics, entity.name, 'defaultValue', runParameter.defaultValue, entity.span);
      break;
    }
    case 'Dependency':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as DependencyNode).purpose, entity.span);
      break;
    case 'TypeDef': {
      // PR #141 review, blocker 1 — corrected: the alias branch DOES reach
      // `quoteStringLiteral`, through `printTypeExpr` (print-type-expr.ts:32)
      // printing a `TypeLiteralNode` member of `aliasType`. Both
      // `typeDefToShortform` (emit-shortform.ts) and `typeDefToLongform`
      // (emit-longform.ts) call `printTypeExpr(entity.aliasType)`
      // unconditionally on the 'alias' variant, in both forms — this is NOT
      // form-gated the way `comment` is. The genuinely-excluded call site is
      // a DIFFERENT one: `typeDefToLongform`'s own outer `type: "..."`
      // wrapper (emit-longform.ts's own comment on that function) does not
      // call `quoteStringLiteral` at all, so there is nothing to report for
      // the wrapper itself — only for a literal member printTypeExpr prints
      // inside it.
      const typeDef = entity as TypeDefNode;
      // Unlike every other kind's `purpose`, TypeDef's `purpose` is quoted
      // ONLY in longform: `typeDefToShortform` (emit-shortform.ts) never
      // references `entity.purpose` at all — only `typeDefToLongform`'s
      // `descriptionAndPurposeLines` call does. Form-gated the same way
      // `comment` is gated above, for the same reason (unconditionally
      // checking it would over-report a shortform emission that never
      // touched the value).
      if (form === 'longform') {
        pushIfSwapped(diagnostics, entity.name, 'purpose', typeDef.purpose, entity.span);
      }
      if (typeDef.variant === 'alias') {
        pushIfTypeExprSwapped(diagnostics, entity.name, 'aliasType', typeDef.aliasType, entity.span);
        // Longform-only: shortform prints `Name = "active"`, which
        // round-trips byte-perfect. Only the longform `type:` slot cannot
        // represent a leading string literal. See
        // UNREPRESENTABLE_ALIAS_CODE's comment above.
        if (form === 'longform' && typeDef.aliasType !== undefined) {
          const printed = printTypeExpr(typeDef.aliasType);
          if (opensWithStringLiteral(printed)) {
            diagnostics.push(unrepresentableAliasDiagnostic(entity.name, printed, entity.span));
          }
        }
      }
      break;
    }
  }
  return diagnostics;
};
