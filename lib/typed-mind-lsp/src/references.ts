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
  context: { readonly exportingOwner?: string; readonly importingOwner?: string } = {},
): Location[] => {
  const target =
    names === undefined
      ? undefined
      : context.exportingOwner === undefined
        ? resolvedNameTarget(names.resolve(name, context.importingOwner === undefined ? {} : { importingFile: context.importingOwner }))
            ?.name
        : resolvedNameTarget(names.resolveExport(context.exportingOwner, name))?.name;
  if (names !== undefined && target === undefined) return [];
  const occurrences =
    target === undefined || names === undefined
      ? nameIndex.occurrencesOf(name)
      : nameIndex.all().filter((occurrence) => targetOfOccurrence(occurrence, names)?.name === target);
  return occurrences.map((occurrence) => toLspLocation(uri, occurrence));
};
