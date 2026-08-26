// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — provideReferences: return the
// occurrence spans for the target name. The substring line-scan (legacy
// server.ts:507-530) is deleted; occurrence boundaries come from the grammar
// via NameOccurrenceIndex, not a hand-rolled word-boundary character class.

import type { Location } from 'vscode-languageserver/node.js';
import type { NameOccurrence, NameOccurrenceIndex } from './name-occurrence-index.ts';

export const toLspLocation = (uri: string, occurrence: NameOccurrence): Location => {
  return {
    uri,
    range: {
      start: { line: occurrence.startLine - 1, character: occurrence.startColumn - 1 },
      end: { line: occurrence.endLine - 1, character: occurrence.endColumn - 1 },
    },
  };
};

export const provideReferencesForName = (uri: string, name: string, nameIndex: NameOccurrenceIndex): Location[] => {
  return nameIndex.occurrencesOf(name).map((occurrence) => toLspLocation(uri, occurrence));
};
