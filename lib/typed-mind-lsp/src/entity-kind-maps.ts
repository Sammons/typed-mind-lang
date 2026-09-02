// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — the two UI-enum dispatch tables, both
// gaining the ClassFile case that legacy's server.ts:255-280/623-645 missed.
// These are enum dispatches over the closed EntityKind union, not tokenizers —
// CST queries (NameOccurrenceIndex) do not replace them. Both switches are
// exhaustive over all 11 EntityKind values with no `default` arm for a known
// kind: TypeScript's exhaustiveness check on a closed union is the mechanism
// that keeps a twelfth kind from silently falling through again.

import type { EntityKind } from '@sammons/typed-mind';
import { CompletionItemKind, SemanticTokenTypes } from 'vscode-languageserver/node';

const assertNever = (value: never): never => {
  throw new Error(`entity-kind-maps: unhandled EntityKind ${JSON.stringify(value)}`);
};

export const getCompletionItemKind = (kind: EntityKind): CompletionItemKind => {
  switch (kind) {
    case 'Program':
      return CompletionItemKind.Module;
    case 'File':
      return CompletionItemKind.File;
    case 'Function':
      return CompletionItemKind.Function;
    case 'Class':
      return CompletionItemKind.Class;
    case 'ClassFile':
      return CompletionItemKind.Class;
    case 'Constants':
      return CompletionItemKind.Constant;
    case 'DTO':
      return CompletionItemKind.Interface;
    case 'Asset':
      return CompletionItemKind.File;
    case 'UIComponent':
      return CompletionItemKind.Class;
    case 'RunParameter':
      return CompletionItemKind.Property;
    case 'Dependency':
      return CompletionItemKind.Module;
    case 'TypeDef':
      return CompletionItemKind.TypeParameter;
    default:
      return assertNever(kind);
  }
};

// Legend order/content mirrors the legacy tokenTypes array (server.ts:41-50):
// function, class, interface, variable, parameter, property, namespace, type.
export const SEMANTIC_TOKEN_LEGEND: readonly string[] = [
  SemanticTokenTypes.function,
  SemanticTokenTypes.class,
  SemanticTokenTypes.interface,
  SemanticTokenTypes.variable,
  SemanticTokenTypes.parameter,
  SemanticTokenTypes.property,
  SemanticTokenTypes.namespace,
  SemanticTokenTypes.type,
];

export const getSemanticTokenType = (kind: EntityKind): number => {
  switch (kind) {
    case 'Function':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.function);
    case 'Class':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.class);
    case 'ClassFile':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.class);
    case 'DTO':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.interface);
    case 'Asset':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.interface);
    case 'UIComponent':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.interface);
    case 'RunParameter':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.parameter);
    case 'Constants':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.property);
    case 'Program':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.namespace);
    case 'Dependency':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.namespace);
    case 'File':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.type);
    case 'TypeDef':
      return SEMANTIC_TOKEN_LEGEND.indexOf(SemanticTokenTypes.type);
    default:
      return assertNever(kind);
  }
};
