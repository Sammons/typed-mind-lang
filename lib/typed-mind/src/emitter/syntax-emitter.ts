// RFC-TM-4 §2 (rfc-tm-4-diamond.md) — SyntaxEmitter: emits from ParseOutcome's
// AST only (never LinkIndex/derived data — the Rejected Alternatives entry
// "Emitting derived reverse links" fails parse→emit→parse deep-equal by
// construction wherever derived ⊃ declared). Per-entity form selection comes
// from `entity.sourceForm` (S-CORE-2a): a shortform-sourced entity emits
// shortform lines; a longform-sourced entity (keyword block OR the
// sigil-with-brace ClassFile header) emits the canonical longform keyword
// block. This is what makes a genuinely mixed document (scenario-31) stay
// mixed after a round-trip: format selection is per entity, not per document.
//
// RC-C (issue #102) forced-longform override: a `forceForm: 'shortform'`
// caller (emitShortform(), or toggleFormat() targeting shortform) means
// "make an honest single-format document" — it must never mean "silently
// drop or corrupt data a specific entity cannot express in that form."
// `shortformCannotExpress` (emit-shortform.ts) flags the two known cases
// (Program.exports, a declared ClassFile's purpose) where the shortform
// grammar has no legal continuation slot for a real AST field. When it
// fires, THIS entity emits longform regardless of `forceForm`, while every
// other entity in the document still honors the caller's forced form — the
// exception is per-entity, not a silent downgrade of the whole document.
import type { Diagnostic } from '../ast/diagnostic.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { SuppressionNode } from '../ast/suppression-node.ts';
import type { ParseOutcome } from '../pipeline/parse-outcome.ts';
import { detectFormat, type FormatDetectionResult, type SyntaxFormat } from './detect-format.ts';
import { emitLongform, emitLongformWithDiagnostics } from './emit-longform.ts';
import { emitShortform, emitShortformWithDiagnostics, shortformCannotExpress } from './emit-shortform.ts';
import { quoteSwapDiagnosticsForSuppressions, suppressionsToLongformBlock, suppressionToShortformLine } from './emit-suppression.ts';

export type { FormatDetectionResult, SyntaxFormat };
export { detectFormat };

export interface EmitOptions {
  // Force every entity to one form regardless of its own sourceForm — the
  // mechanism toggleFormat/emitShortform/emitLongform use to produce an
  // honest single-format document (RFC §2: "toggleFormat becomes an honest
  // operation on the new surface: parse → emit other format"). An entity
  // `shortformCannotExpress` still promotes to longform even when this is
  // 'shortform' — see the RC-C header comment above.
  readonly forceForm?: SyntaxFormat;
}

const resolvedFormFor = (entity: EntityNode, options: EmitOptions): SyntaxFormat => {
  const requestedForm = options.forceForm ?? entity.sourceForm;
  return requestedForm === 'shortform' && shortformCannotExpress(entity) ? 'longform' : requestedForm;
};

const emitEntity = (entity: EntityNode, options: EmitOptions): string[] => {
  const form = resolvedFormFor(entity, options);
  return form === 'longform' ? emitLongform(entity) : emitShortform(entity);
};

// Issue #130, disposition (b) — same per-entity form resolution as
// `emitEntity`, additionally collecting the quote-swap diagnostics each
// entity's emission produced.
const emitEntityWithDiagnostics = (entity: EntityNode, options: EmitOptions): { lines: string[]; diagnostics: Diagnostic[] } => {
  const form = resolvedFormFor(entity, options);
  return form === 'longform' ? emitLongformWithDiagnostics(entity) : emitShortformWithDiagnostics(entity);
};

// RFC-TM-8 §7 (rfc-tm-8-diamond.md, X-SUPP-4): suppressions carry no
// per-instance sourceForm (unlike EntityNode) — the doc's two forms are
// document-level choices (one `suppress` line per entry, or one `suppress {
// ... }` block for every entry), not a per-suppression declared form. Emit
// follows the SAME options.forceForm the caller already picked for entities:
// emitShortform()/plain emit() print one shortform line per suppression;
// emitLongform() groups every suppression into one block, mirroring
// SyntaxEmitter's own "format selection is per document for suppressions,
// per entity for entities" split (the flat ParseOutcome.suppressions list
// has no other document-order signal to preserve, per the doc's own
// Rejected Alternatives stance against inventing unstated ordering surface).
const emitSuppressions = (suppressions: readonly SuppressionNode[], form: SyntaxFormat): string[] => {
  if (form === 'longform') {
    return suppressionsToLongformBlock(suppressions);
  }
  return suppressions.map(suppressionToShortformLine);
};

export class SyntaxEmitter {
  // Emits every entity in ParseOutcome.entities, each in its own declared (or
  // forced) form, blank-line separated — declared-fields emission only.
  // Suppressions (X-SUPP-4) emit as their own block(s), appended after every
  // entity, in the same per-call form.
  emit(outcome: ParseOutcome, options: EmitOptions = {}): string {
    const entityBlocks = outcome.entities.map((entity) => emitEntity(entity, options).join('\n'));
    const suppressionForm: SyntaxFormat = options.forceForm ?? 'shortform';
    const suppressionLines = emitSuppressions(outcome.suppressions, suppressionForm);
    const blocks = suppressionLines.length === 0 ? entityBlocks : [...entityBlocks, suppressionLines.join('\n')];
    return blocks.join('\n\n').trim();
  }

  emitShortform(outcome: ParseOutcome): string {
    return this.emit(outcome, { forceForm: 'shortform' });
  }

  emitLongform(outcome: ParseOutcome): string {
    return this.emit(outcome, { forceForm: 'longform' });
  }

  // RFC §2: an honest operation on the new surface — the caller reparses
  // `source`, and this method emits the OTHER of the two forms from the
  // parsed outcome (no derived-field reintroduction, unlike the legacy
  // pass-through converters, syntax-generator.ts:306-356).
  toggleFormat(outcome: ParseOutcome, currentFormat: SyntaxFormat): string {
    const targetForm: SyntaxFormat = currentFormat === 'longform' ? 'shortform' : 'longform';
    return this.emit(outcome, { forceForm: targetForm });
  }

  // Issue #130, disposition (b) — sibling of `emit` that additionally
  // collects every quote-swap `Diagnostic` (emitter-diagnostics.ts) produced
  // while quoting free-text fields. Added as a new method rather than
  // changing `emit`'s own return shape so every existing caller of
  // `emit`/`emitShortform`/`emitLongform`/`toggleFormat` keeps compiling and
  // behaving unchanged; a caller that wants the warnings opts into this
  // parallel surface instead.
  emitWithDiagnostics(outcome: ParseOutcome, options: EmitOptions = {}): { text: string; diagnostics: Diagnostic[] } {
    const diagnostics: Diagnostic[] = [];
    const entityBlocks = outcome.entities.map((entity) => {
      const result = emitEntityWithDiagnostics(entity, options);
      diagnostics.push(...result.diagnostics);
      return result.lines.join('\n');
    });
    const suppressionForm: SyntaxFormat = options.forceForm ?? 'shortform';
    const suppressionLines = emitSuppressions(outcome.suppressions, suppressionForm);
    diagnostics.push(...quoteSwapDiagnosticsForSuppressions(outcome.suppressions));
    const blocks = suppressionLines.length === 0 ? entityBlocks : [...entityBlocks, suppressionLines.join('\n')];
    return { text: blocks.join('\n\n').trim(), diagnostics };
  }

  emitShortformWithDiagnostics(outcome: ParseOutcome): { text: string; diagnostics: Diagnostic[] } {
    return this.emitWithDiagnostics(outcome, { forceForm: 'shortform' });
  }

  emitLongformWithDiagnostics(outcome: ParseOutcome): { text: string; diagnostics: Diagnostic[] } {
    return this.emitWithDiagnostics(outcome, { forceForm: 'longform' });
  }

  // Same honest-toggle contract as `toggleFormat`, additionally surfacing
  // the quote-swap diagnostics for the caller to display (LSP toggle-format
  // command, playground, a future CLI emission surface).
  toggleFormatWithDiagnostics(outcome: ParseOutcome, currentFormat: SyntaxFormat): { text: string; diagnostics: Diagnostic[] } {
    const targetForm: SyntaxFormat = currentFormat === 'longform' ? 'shortform' : 'longform';
    return this.emitWithDiagnostics(outcome, { forceForm: targetForm });
  }
}
