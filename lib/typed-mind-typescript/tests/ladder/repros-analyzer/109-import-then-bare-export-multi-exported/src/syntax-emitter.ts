// Corpus: sammons/typed-mind-lang lib/typed-mind/src/emitter/syntax-emitter.ts:14-20.
// The import-then-bare-export idiom: the names are imported on one
// statement and re-exported on separate, source-less `export { ... }` /
// `export type { ... }` statements. Before RFC-TM-13 unit R the analyzer
// recorded these exports with no `source`, so the converter's `isReExport`
// treated them as this file's OWN declarations and listed them under its
// `exports:` — alongside detect-format.ts's genuine `exports:` — and the
// checker reported `checker/multi-exported` for `detectFormat` (issue #62's
// documented residual; core-diagnostic-disposition-2026-08-29.md).
//
// The file also declares a class, exactly as the corpus file does, so the
// fused entity is a ClassFile (`--prefer-class-file` default) — the same
// entity shape the 2026-08-29 disposition saw the finding on.
import { detectFormat, type FormatDetectionResult, type SyntaxFormat } from './detect-format.ts';

export type { FormatDetectionResult, SyntaxFormat };
export { detectFormat };

export interface EmitOptions {
  readonly forceForm?: SyntaxFormat;
}

export class SyntaxEmitter {
  emit(source: string, options: EmitOptions = {}): string {
    const detection = detectFormat(source);
    return `${options.forceForm ?? detection.format}:${detection.confidence}`;
  }
}
