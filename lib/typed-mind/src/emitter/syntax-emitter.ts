// RFC-TM-4 §2 (rfc-tm-4-diamond.md) — SyntaxEmitter: emits from ParseOutcome's
// AST only (never LinkIndex/derived data — the Rejected Alternatives entry
// "Emitting derived reverse links" fails parse→emit→parse deep-equal by
// construction wherever derived ⊃ declared). Per-entity form selection comes
// from `entity.sourceForm` (S-CORE-2a): a shortform-sourced entity emits
// shortform lines; a longform-sourced entity (keyword block OR the
// sigil-with-brace ClassFile header) emits the canonical longform keyword
// block. This is what makes a genuinely mixed document (scenario-31) stay
// mixed after a round-trip: format selection is per entity, not per document.

import type { EntityNode } from '../ast/entity-node.ts';
import type { SuppressionNode } from '../ast/suppression-node.ts';
import type { ParseOutcome } from '../pipeline/parse-outcome.ts';
import { detectFormat, type FormatDetectionResult, type SyntaxFormat } from './detect-format.ts';
import { emitLongform } from './emit-longform.ts';
import { emitShortform } from './emit-shortform.ts';
import { suppressionsToLongformBlock, suppressionToShortformLine } from './emit-suppression.ts';

export type { FormatDetectionResult, SyntaxFormat };
export { detectFormat };

export interface EmitOptions {
  // Force every entity to one form regardless of its own sourceForm — the
  // mechanism toggleFormat/emitShortform/emitLongform use to produce an
  // honest single-format document (RFC §2: "toggleFormat becomes an honest
  // operation on the new surface: parse → emit other format").
  readonly forceForm?: SyntaxFormat;
}

const emitEntity = (entity: EntityNode, options: EmitOptions): string[] => {
  const form = options.forceForm ?? entity.sourceForm;
  return form === 'longform' ? emitLongform(entity) : emitShortform(entity);
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
}
