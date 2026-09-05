// Corpus: sammons/typed-mind-lang lib/typed-mind/src/emitter/detect-format.ts —
// the DECLARING module. It owns `SyntaxFormat` (a TypeDef-predicted alias),
// `FormatDetectionResult` (an interface → DTO), and `detectFormat`.
export type SyntaxFormat = 'shortform' | 'longform' | 'mixed';

export interface FormatDetectionResult {
  format: SyntaxFormat;
  confidence: number;
}

export const detectFormat = (source: string): FormatDetectionResult => {
  const format: SyntaxFormat = source.includes('@') ? 'shortform' : 'longform';
  return { format, confidence: 1 };
};
