// Corpus: sammons/slat products/slat/src/utils/parse-stamp-material-value.ts
// (`ParseStampMaterialValueFailure`). That union's last member carries a
// six-line JSDoc block; the emitted TypeDef spanned six physical lines and
// the parser reported a cascade of `Unparsable text` findings from there on.
//
// A TypeDef emits on ONE line, so any newline inside the alias's type text
// corrupts the document structurally — not just the one entity.
export type ParseFailure =
  | { readonly kind: 'not_an_object' }
  | {
      /** A multi-line doc comment attached to a union MEMBER.
       * It mentions `apply` in backticks and spans several lines,
       * exactly like the corpus shape this fixture is distilled from. */
      readonly kind: 'invalid_header_octets';
      readonly mode: string;
    };

/** A line comment inside a member takes the same path. */
export type LineCommentFailure =
  | { readonly kind: 'ok' }
  | {
      // a line comment inside a union member
      readonly kind: 'bad';
      readonly detail: string;
    };

export const describeParseFailure = (failure: ParseFailure): string => {
  return failure.kind;
};
