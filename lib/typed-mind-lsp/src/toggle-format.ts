// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — toggleFormat drops the Result box. The
// custom typedmind/toggleFormat handler (legacy server.ts:659-721) calls the
// facade's toggleFormat/detectFormat instead of `new DSLChecker().toggleFormat`
// with its `_tag` unwrapping and the SyntaxGenerator field's detectFormat
// (legacy server.ts:35,692). TypedMind.toggleFormat/detectFormat are plain
// synchronous methods that never throw on malformed input (the tolerant
// pipeline, doc §1) — no Result box to unwrap, no try/catch needed for the
// conversion step itself.

import type { TypedMind } from '@sammons/typed-mind';

export interface ToggleFormatParams {
  readonly uri: string;
  readonly range?: { readonly start: number; readonly end: number };
}

export interface ToggleFormatResult {
  readonly newText: string;
  readonly error?: string;
}

export const handleToggleFormat = (typedMind: TypedMind, fullText: string, params: ToggleFormatParams): ToggleFormatResult => {
  let textToProcess = fullText;
  if (params.range !== undefined) {
    const lines = fullText.split('\n');
    const startLineIndex = Math.max(0, params.range.start);
    const endLineIndex = Math.min(lines.length - 1, params.range.end);
    if (startLineIndex <= endLineIndex) {
      textToProcess = lines.slice(startLineIndex, endLineIndex + 1).join('\n');
    }
  }
  const newText = typedMind.toggleFormat(textToProcess);
  return { newText };
};
