// RFC-TM-13 C-prime: the language escapes only quotes and backslashes.
// Unknown escapes retain their backslash; these are not JSON strings.
// The reversible domain is single-line values. Programmatic multiline
// emission keeps its pre-existing behavior; the grammar rejects newlines.
export const encodeQuotedString = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export const decodeQuotedString = (token: string): string => {
  return token
    .replace(/^"/, '')
    .replace(/"$/, '')
    .replace(/\\(["\\])/g, '$1');
};

export interface QuotedStringMatch {
  readonly value: string;
  readonly endIndex: number;
}

// Scans one token, leaving any following type operator to its caller.
// Escape pairs advance together, so odd/even backslash parity determines
// whether a quote closes the token. Malformed input never becomes a literal.
export const scanQuotedString = (text: string, startIndex = 0): QuotedStringMatch | undefined => {
  if (text[startIndex] !== '"') {
    return undefined;
  }
  for (let index = startIndex + 1; index < text.length; index += 1) {
    const character = text[index];
    if (character === '\n' || character === '\r') {
      return undefined;
    }
    if (character === '\\') {
      const escaped = text[index + 1];
      if (escaped === undefined || escaped === '\n' || escaped === '\r') {
        return undefined;
      }
      index += 1;
    } else if (character === '"') {
      return { value: decodeQuotedString(text.slice(startIndex, index + 1)), endIndex: index + 1 };
    }
  }
  return undefined;
};
