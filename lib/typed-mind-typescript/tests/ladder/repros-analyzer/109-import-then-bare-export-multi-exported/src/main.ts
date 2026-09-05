// Consumer that imports the re-exported names THROUGH the forwarding modules,
// the way lib/typed-mind/src/typed-mind.ts imports `detectFormat` via the
// emitter surface rather than from detect-format.ts directly.
import { formatLabel } from './format-api.ts';
import { detectFormat, type FormatDetectionResult, SyntaxEmitter } from './syntax-emitter.ts';

export const describeSource = (source: string): string => {
  const detection: FormatDetectionResult = detectFormat(source);
  return new SyntaxEmitter().emit(source) + detection.format + formatLabel(source);
};
