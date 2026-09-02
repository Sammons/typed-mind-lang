// Completion items: static entity-type keywords + operator hints (unchanged
// from legacy — this list is language-surface documentation, not a scanner)
// plus one item per known entity name, kind resolved via the enum table
// (RFC-TM-5 §1 leaf d — ClassFile now included, no default-arm fallthrough).

import type { EntityNode } from '@sammons/typed-mind';
import { type CompletionItem, CompletionItemKind } from 'vscode-languageserver/node';
import { getCompletionItemKind } from './entity-kind-maps.ts';

const ENTITY_TYPE_ITEMS: readonly CompletionItem[] = [
  'Program',
  'File',
  'Function',
  'Class',
  'ClassFile',
  'Constants',
  'DTO',
  'Asset',
  'UIComponent',
  'RunParameter',
  'Dependency',
  'TypeDef',
].map((type) => ({ label: type, kind: CompletionItemKind.Keyword, detail: `Entity type: ${type}` }));

const OPERATOR_ITEMS: readonly CompletionItem[] = [
  { label: '->', detail: 'Entry point operator' },
  { label: '<-', detail: 'Import operator' },
  { label: '@', detail: 'Location operator' },
  { label: '::', detail: 'Function signature operator' },
  { label: '~>', detail: 'Function calls operator' },
  { label: '<:', detail: 'Extends operator' },
  { label: '!', detail: 'Constants operator' },
  { label: '=>', detail: 'Methods operator' },
  { label: '%', detail: 'DTO operator' },
  { label: '~', detail: 'Asset operator' },
  { label: '&', detail: 'UIComponent operator' },
  { label: '&!', detail: 'Root UIComponent operator' },
  { label: '#:', detail: 'ClassFile operator' },
  { label: '^', detail: 'Dependency operator' },
  { label: '$env', detail: 'Environment variable parameter' },
  { label: '$iam', detail: 'IAM role parameter' },
  { label: '$runtime', detail: 'Runtime configuration parameter' },
  { label: '$config', detail: 'Application configuration parameter' },
  { label: '$<', detail: 'Function consumes parameters' },
  { label: '>>', detail: 'Asset contains program' },
  { label: '>', detail: 'UIComponent contains' },
  { label: '<', detail: 'UIComponent contained by' },
  { label: '=', detail: 'TypeDef operator' },
].map((op) => ({ label: op.label, kind: CompletionItemKind.Operator, detail: op.detail }));

export const provideCompletionsForEntities = (entities: ReadonlyMap<string, EntityNode>): CompletionItem[] => {
  const items: CompletionItem[] = [...ENTITY_TYPE_ITEMS, ...OPERATOR_ITEMS];
  for (const [name, entity] of entities) {
    items.push({ label: name, kind: getCompletionItemKind(entity.kind), detail: `${entity.kind}: ${name}` });
  }
  return items;
};
