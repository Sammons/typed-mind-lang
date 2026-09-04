// Literal-aware segmentation for TypeScript type TEXT.
//
// PR #158 review finding (comment 22136): a text-blind regex pass over a type
// string cannot tell a STRUCTURAL character from one that lives INSIDE a
// string-literal type. A string-literal type's value is its exact characters,
// so rewriting them changes the type's MEANING:
//
//   'E ( bad )'   must NOT become   'E (bad)'
//   'typeof x'    must NOT become   '(typeof x)'
//
// Both forms parse cleanly, so no checker diagnostic catches the corruption —
// it is a silent wrong answer, which is the worst failure mode available.
//
// This is the same defect class, and the same remedy, that PR #156's review
// found in the core's `normalizeOpaqueWhitespace`
// (lib/typed-mind/src/pipeline/type-expr-from-text.ts): replace the regex
// chain with a single left-to-right scan that copies quoted spans through
// byte-for-byte and applies rewrites only to the structural text between them.
//
// The core does not export its scanner, so this is the converter-side twin.
// Keeping it in its own module (rather than inlined in the converter) is what
// lets it carry direct unit tests for the literal-preservation contract.

/** One run of type text, tagged by whether it is inside a string literal. */
export interface TypeTextSegment {
  readonly text: string;
  /** True when this run is a quoted span and must be copied verbatim. */
  readonly isLiteral: boolean;
}

/**
 * Split type text into alternating structural and string-literal runs.
 *
 * Recognizes single-quoted, double-quoted, and backtick-quoted spans, and
 * honors backslash escapes inside them (`'a\'b'` is ONE literal). An
 * unterminated quote consumes the rest of the text as a literal — the
 * conservative choice, since copying too much verbatim can only leave text
 * unchanged, while copying too little would resume rewriting inside a literal.
 */
export const segmentTypeText = (text: string): TypeTextSegment[] => {
  const segments: TypeTextSegment[] = [];
  let structuralStart = 0;
  let index = 0;

  const pushStructural = (endIndex: number): void => {
    if (endIndex > structuralStart) {
      segments.push({ text: text.slice(structuralStart, endIndex), isLiteral: false });
    }
  };

  while (index < text.length) {
    const char = text[index];

    if (char === "'" || char === '"' || char === '`') {
      pushStructural(index);

      const quote = char;
      let cursor = index + 1;

      while (cursor < text.length) {
        const inner = text[cursor];
        if (inner === '\\') {
          cursor += 2;
          continue;
        }
        if (inner === quote) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }

      const end = Math.min(cursor, text.length);
      segments.push({ text: text.slice(index, end), isLiteral: true });
      index = end;
      structuralStart = end;
      continue;
    }

    index += 1;
  }

  pushStructural(text.length);

  return segments;
};

/**
 * Apply `transform` to every STRUCTURAL run of `text`, copying every
 * string-literal run through untouched, then rejoin.
 *
 * Callers get regex ergonomics back without the literal-blindness: a regex
 * inside `transform` can only ever see text that is outside a string literal.
 */
export const mapStructuralSegments = (text: string, transform: (segment: string) => string): string => {
  return segmentTypeText(text)
    .map((segment) => (segment.isLiteral ? segment.text : transform(segment.text)))
    .join('');
};
