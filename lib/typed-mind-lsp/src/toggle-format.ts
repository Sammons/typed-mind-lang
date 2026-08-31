// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — toggleFormat drops the Result box. The
// custom typedmind/toggleFormat handler (legacy server.ts:659-721) calls the
// facade's toggleFormat/detectFormat instead of `new DSLChecker().toggleFormat`
// with its `_tag` unwrapping and the SyntaxGenerator field's detectFormat
// (legacy server.ts:35,692). TypedMind.toggleFormat/detectFormat are plain
// synchronous methods that never throw on malformed input (the tolerant
// pipeline, doc §1) — no Result box to unwrap, no try/catch needed for the
// conversion step itself.
//
// Defect fix (same-day follow-up to PR #122, independent post-merge review
// finding) — `params.uri` is threaded through to `typedMind.toggleFormat` as
// its `filePath` argument so `@import`-bearing documents resolve their
// imports before toggling, matching parse()/check()'s existing filePath
// wiring. `params.uri` is an LSP `file://` URI; `fileURLToPath` (node:url) is
// the standard conversion to the filesystem path `resolveImportsInto`/
// `dirname` expect (no existing uri-to-path helper elsewhere in this
// package to reuse — confirmed by search). A non-`file://` URI (untitled
// buffers, etc.) fails the conversion; that case falls back to no filePath,
// preserving today's single-document behavior for those buffers rather than
// throwing.
//
// Range-scoped toggles NEVER resolve imports (PR #123 review finding,
// comment id=20118): the caller replaces ONLY the selected lines with
// `newText`, so splicing the imported module's entities into a line-sliced
// substring would duplicate them into the document as local text —
// corrupting it. Import resolution is correct only when the toggled text is
// the whole document; a selection falls back to single-document mode.

import { fileURLToPath } from 'node:url';
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
  const filePath = params.range === undefined ? toFilePathOrUndefined(params.uri) : undefined;
  const newText = typedMind.toggleFormat(textToProcess, filePath);
  return { newText };
};

const toFilePathOrUndefined = (uri: string): string | undefined => {
  try {
    return fileURLToPath(uri);
  } catch {
    // Non-file:// URI (e.g. an untitled/unsaved buffer) — fall back to
    // single-document mode rather than throwing, same tolerant-pipeline
    // stance as the rest of this handler.
    return undefined;
  }
};
