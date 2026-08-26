// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — the CST NameOccurrenceIndex replacing
// the four private scanners (the semantic-token regex line-scan, the
// reference substring line-scan, getWordRangeAtPosition/isEntityNameChar, and
// isWordBoundary). Walks the parseWithCst tree ONCE per parse and collects
// every name-bearing token — declaration headers (`entity_name`) and list
// references (`list_entry`) — with its real span. The four scanners then
// become lookups against this index (doc §1): no hand-rolled character class
// survives (I-2), so highlighting/references/word-ranges cannot drift from
// the grammar's real name class again.

import type { CstNode, CstSourceFile } from '@sammons/typed-mind';

export interface NameOccurrence {
  readonly name: string;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
  // A declaration occurrence is the entity_name token of a *_declaration
  // header; every other occurrence (list_entry) is a reference.
  readonly isDeclaration: boolean;
}

const NAME_BEARING_TYPES = new Set(['entity_name', 'list_entry']);

const collectOccurrences = (node: CstNode, out: NameOccurrence[]): void => {
  const concreteType = node.syntaxNode.type;
  if (NAME_BEARING_TYPES.has(concreteType)) {
    const span = node.span();
    out.push({
      name: node.text,
      startLine: span.start.line,
      startColumn: span.start.column,
      endLine: span.end.line,
      endColumn: span.end.column,
      isDeclaration: concreteType === 'entity_name',
    });
    // entity_name/list_entry are grammar leaves (no name-bearing descendants);
    // stop the walk here rather than recursing into token internals.
    return;
  }
  for (const child of node.namedChildNodes()) {
    collectOccurrences(child, out);
  }
};

// NameOccurrenceIndex is built ONCE per parseWithCst call (per document
// version) and answers every LSP feature that used to hand-roll its own
// text scan: semantic tokens, references, word-range-at-position.
export class NameOccurrenceIndex {
  // Sorted by position (line, then column) — the walk visits the CST in
  // source order, which already satisfies this; asserted by construction,
  // not re-sorted.
  readonly #occurrences: readonly NameOccurrence[];
  readonly #byName: ReadonlyMap<string, readonly NameOccurrence[]>;

  constructor(cst: CstSourceFile) {
    const occurrences: NameOccurrence[] = [];
    collectOccurrences(cst, occurrences);
    this.#occurrences = occurrences;
    const byName = new Map<string, NameOccurrence[]>();
    for (const occurrence of occurrences) {
      const bucket = byName.get(occurrence.name) ?? [];
      bucket.push(occurrence);
      byName.set(occurrence.name, bucket);
    }
    this.#byName = byName;
  }

  all(): readonly NameOccurrence[] {
    return this.#occurrences;
  }

  occurrencesOf(name: string): readonly NameOccurrence[] {
    return this.#byName.get(name) ?? [];
  }

  // Replaces getWordRangeAtPosition/isEntityNameChar/isWordBoundary
  // (server.ts:535-574): a position falls inside an occurrence's span, or it
  // falls on nothing — the grammar's name class is the only definition.
  occurrenceAt(line: number, column: number): NameOccurrence | undefined {
    return this.#occurrences.find((occurrence) => {
      if (line < occurrence.startLine || line > occurrence.endLine) {
        return false;
      }
      if (line === occurrence.startLine && column < occurrence.startColumn) {
        return false;
      }
      if (line === occurrence.endLine && column >= occurrence.endColumn) {
        return false;
      }
      return true;
    });
  }
}
