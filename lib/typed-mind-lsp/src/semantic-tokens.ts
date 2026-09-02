// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — provideSemanticTokens: iterate the
// occurrence index; token type from the entity's kind via the enum table. The
// regex line-scan (legacy server.ts:598-618, word regex at :603) is deleted.
// Declaration tokens carry the `declaration` modifier — this replicates
// getSemanticTokenModifier's operator-lookahead heuristic (legacy
// server.ts:647-654) with a fact the CST already proved: an entity_name
// occurrence IS the declaration.

import { SemanticTokenModifiers, SemanticTokensBuilder } from 'vscode-languageserver/node';
import type { DocumentState } from './document-state.ts';
import { getSemanticTokenType, SEMANTIC_TOKEN_LEGEND } from './entity-kind-maps.ts';

export const SEMANTIC_TOKEN_MODIFIERS: readonly string[] = [
  SemanticTokenModifiers.declaration,
  SemanticTokenModifiers.definition,
  SemanticTokenModifiers.readonly,
  SemanticTokenModifiers.static,
];

const DECLARATION_MODIFIER_BIT = 1 << SEMANTIC_TOKEN_MODIFIERS.indexOf(SemanticTokenModifiers.declaration);

export const provideSemanticTokensForDocument = (state: DocumentState) => {
  const builder = new SemanticTokensBuilder();
  for (const occurrence of state.nameIndex.all()) {
    const entity = state.byName.get(occurrence.name);
    if (entity === undefined) {
      continue;
    }
    const tokenType = getSemanticTokenType(entity.kind);
    const tokenModifiers = occurrence.isDeclaration ? DECLARATION_MODIFIER_BIT : 0;
    // LSP semantic tokens are single-line, 0-based; Span is 1-based. Every
    // NameOccurrenceIndex entry is a leaf token (entity_name/list_entry) so it
    // never spans multiple lines.
    builder.push(
      occurrence.startLine - 1,
      occurrence.startColumn - 1,
      occurrence.endColumn - occurrence.startColumn,
      tokenType,
      tokenModifiers,
    );
  }
  return builder.build();
};

export { SEMANTIC_TOKEN_LEGEND };
