export type TypeTextFailure = 'unbalanced-parameter' | 'unsupported-multiline-literal';

export type NormalizedTypeText = { readonly text: string; readonly offsets: readonly number[] };

// Comments become whitespace, never concatenation. Literal values remain exact.
// Offsets map the canonical single-line spelling back to the source spelling.
export const canonicalizeTypeText = (raw: string): NormalizedTypeText | TypeTextFailure => {
  const chars: string[] = [];
  const offsets: number[] = [];
  let quote = '';
  const append = (char: string, index: number): void => {
    chars.push(char);
    offsets.push(index);
  };
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index] ?? '';
    if (quote !== '') {
      if (char === '\n' || char === '\r') return 'unsupported-multiline-literal';
      append(char, index);
      if (char === '\\') {
        index += 1;
        const escaped = raw[index];
        if (escaped === undefined) return 'unbalanced-parameter';
        if (escaped === '\n' || escaped === '\r') return 'unsupported-multiline-literal';
        append(escaped, index);
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      append(char, index);
      continue;
    }
    if (/\s/.test(char) || raw.startsWith('//', index) || raw.startsWith('/*', index)) {
      const whitespaceStart = index;
      if (raw.startsWith('//', index)) {
        const end = raw.indexOf('\n', index + 2);
        index = end === -1 ? raw.length - 1 : end;
      } else if (raw.startsWith('/*', index)) {
        const end = raw.indexOf('*/', index + 2);
        if (end === -1) return 'unbalanced-parameter';
        index = end + 1;
      }
      if (chars.at(-1) !== ' ') append(' ', whitespaceStart);
      continue;
    }
    append(char, index);
  }
  if (quote !== '') return 'unbalanced-parameter';
  offsets.push(raw.length);
  return { text: chars.join(''), offsets };
};

const closers: Readonly<Record<string, string>> = { '<': '>', '(': ')', '[': ']', '{': '}' };
export const scanTypeDelimiters = (text: string): readonly { readonly index: number; readonly char: string }[] | undefined => {
  const stack: string[] = [];
  const found: { index: number; char: string }[] = [];
  let quote = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';
    if (quote !== '') {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '>' && text[index - 1] === '=') continue;
    if (closers[char] !== undefined) stack.push(closers[char]);
    else if ('>)]}'.includes(char)) {
      if (stack.pop() !== char) return undefined;
    } else if (
      stack.length === 0 &&
      (char === ',' || (char === '=' && text[index + 1] !== '>' && text[index + 1] !== '=' && text[index - 1] !== '='))
    ) {
      found.push({ index, char });
    }
  }
  return stack.length === 0 && quote === '' ? found : undefined;
};
