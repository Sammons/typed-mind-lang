// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — the fuzzy-suggestion helper ported
// verbatim from DSLValidator.findSimilar/similarity (validator.ts:734-785):
// Levenshtein distance normalized by the longer length, strict > 0.6
// threshold, case-insensitive, first-best wins on ties. Suggestion text parity
// ("Did you mean '...'?") depends on this port staying byte-equivalent.

export const similarity = (a: string, b: string): number => {
  if (a === b) {
    return 1;
  }
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [];
    for (let j = 0; j <= a.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else if (j === 0) {
        matrix[i][j] = i;
      } else {
        matrix[i][j] = 0;
      }
    }
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  return 1 - distance / Math.max(a.length, b.length);
};

export const findSimilar = (target: string, candidateNames: Iterable<string>): string | null => {
  let bestMatch = '';
  let bestScore = 0.6; // Threshold (validator.ts:736)

  for (const name of candidateNames) {
    const score = similarity(target.toLowerCase(), name.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      bestMatch = name;
    }
  }

  return bestMatch || null;
};
