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
import type { ParseOutcome } from '../pipeline/parse-outcome.ts';
import { detectFormat, type FormatDetectionResult, type SyntaxFormat } from './detect-format.ts';
import { emitLongform } from './emit-longform.ts';
import { emitShortform } from './emit-shortform.ts';

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

export class SyntaxEmitter {
  // Emits every entity in ParseOutcome.entities, each in its own declared (or
  // forced) form, blank-line separated — declared-fields emission only.
  emit(outcome: ParseOutcome, options: EmitOptions = {}): string {
    const blocks = outcome.entities.map((entity) => emitEntity(entity, options).join('\n'));
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
