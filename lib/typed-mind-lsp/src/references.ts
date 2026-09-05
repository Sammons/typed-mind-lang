// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — provideReferences: return the
// occurrence spans for the target name. The substring line-scan (legacy
// server.ts:507-530) is deleted; occurrence boundaries come from the grammar
// via NameOccurrenceIndex, not a hand-rolled word-boundary character class.

import { type QualifiedNameResolver, resolvedNameTarget } from '@sammons/typed-mind';
import type { Location } from 'vscode-languageserver/node';
import { targetOfOccurrence } from './document-state.ts';
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

export const provideReferencesForName = (
  uri: string,
  name: string,
  nameIndex: NameOccurrenceIndex,
  names?: QualifiedNameResolver,
  exportingOwner?: string,
): Location[] => {
  const target =
    names === undefined
      ? undefined
      : exportingOwner === undefined
        ? names.target(name)?.name
        : resolvedNameTarget(names.resolveExport(exportingOwner, name))?.name;
  const occurrences =
    target === undefined || names === undefined
      ? nameIndex.occurrencesOf(name)
      : nameIndex.all().filter((occurrence) => targetOfOccurrence(occurrence, names)?.name === target);
  return occurrences.map((occurrence) => toLspLocation(uri, occurrence));
};
