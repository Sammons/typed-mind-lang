// The same import-then-bare-export idiom in a module that declares NO class,
// so the emitted entity is a plain File and carries the `reexports:` slot
// RFC-TM-11 §RX-2 added. This is where the provenance fact is directly
// observable: `<-> [FormatDetectionResult, detectFormat]` on this File,
// and NEITHER name in its `-> [...]` exports.
import { detectFormat, type FormatDetectionResult } from './detect-format.ts';

export type { FormatDetectionResult };
export { detectFormat };

export const formatLabel = (source: string): string => detectFormat(source).format;
