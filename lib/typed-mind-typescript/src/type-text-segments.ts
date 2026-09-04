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
  /**
   * True when this run must be copied verbatim by `mapStructuralSegments`.
   *
   * Both quoted spans AND comment spans are flagged. A comment's own bytes are
   * not structural type text, so a rewrite must not reach inside one either;
   * callers that want comments GONE strip them from the structural text they
   * receive, which is exactly what `normalizeUnionAliasText` does.
   */
  readonly isLiteral: boolean;
}

/**
 * Split type text into alternating structural, string-literal, and comment runs.
 *
 * Recognizes single-quoted, double-quoted, and backtick-quoted spans, and
 * honors backslash escapes inside them (`'a\'b'` is ONE literal). An
 * unterminated quote consumes the rest of the text as a literal — the
 * conservative choice, since copying too much verbatim can only leave text
 * unchanged, while copying too little would resume rewriting inside a literal.
 *
 * COMMENTS ARE RECOGNIZED BEFORE QUOTES, in one left-to-right pass (PR #165
 * review, comment 22273). Order is the whole point: a quote character inside a
 * comment is commentary, not the start of a literal, and vice versa. Scanning
 * quotes first meant a backtick inside a JSDoc block (`` a Mode's `apply` ``,
 * ubiquitous in real doc comments) opened a bogus template span that swallowed
 * the comment's closing delimiter — so the caller's `/* ... *\/` strip never
 * matched and the comment survived into the emitted type. That is the root
 * cause of fixture 101, and it is why a two-pass "strip comments, then segment
 * quotes" design cannot be correct in either order: the two span kinds are
 * mutually exclusive and must be decided by whichever opens FIRST.
 *
 * An unterminated block comment consumes to end of text, for the same
 * conservative reason an unterminated quote does.
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

  // One left-to-right pass. At each position the FIRST span opener wins, so a
  // quote inside a comment and a comment delimiter inside a string are each
  // correctly treated as ordinary content of the span that opened first.
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    // Line comment: runs to (but does not include) the newline that ends it,
    // so the newline stays structural and still separates the tokens around it.
    if (char === '/' && next === '/') {
      pushStructural(index);
      const newlineIndex = text.indexOf('\n', index);
      const end = newlineIndex === -1 ? text.length : newlineIndex;
      segments.push({ text: text.slice(index, end), isLiteral: true });
      index = end;
      structuralStart = end;
      continue;
    }

    // Block comment: runs through its closing delimiter. Unterminated consumes
    // the remainder.
    if (char === '/' && next === '*') {
      pushStructural(index);
      const closeIndex = text.indexOf('*/', index + 2);
      const end = closeIndex === -1 ? text.length : closeIndex + 2;
      segments.push({ text: text.slice(index, end), isLiteral: true });
      index = end;
      structuralStart = end;
      continue;
    }

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

/**
 * Remove every comment span from `text`, leaving literals and structural text
 * untouched.
 *
 * This is the correct way to strip comments from type text (PR #165 review,
 * comment 22273). A regex over the whole string is literal-blind — it eats the
 * rest of a union at the first `//` inside `'https://example.com/path'`, and it
 * mangles `` `a/*not a comment*\/b` `` — while a regex applied only to
 * STRUCTURAL runs can never match a comment at all, now that comments are their
 * own span kind.
 *
 * A block comment is replaced by a single space so the tokens it separated do
 * not fuse. A line comment is replaced by a newline: the scanner leaves the
 * terminating newline structural, but a line comment at end-of-text has none,
 * and the substitution keeps the two cases uniform for a later whitespace
 * collapse.
 */
export const stripComments = (text: string): string => {
  return segmentTypeText(text)
    .map((segment) => {
      if (!segment.isLiteral) {
        return segment.text;
      }
      if (segment.text.startsWith('/*')) {
        return ' ';
      }
      if (segment.text.startsWith('//')) {
        return '\n';
      }
      return segment.text;
    })
    .join('');
};
