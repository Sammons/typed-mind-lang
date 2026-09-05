// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — the per-document cache becomes
// ParseOutput. `documentEntities: Map<string, Map<string, AnyEntity>>`
// (legacy server.ts:38) becomes `Map<uri, DocumentState>`, filled from ONE
// parseWithCst call per document version. Entity-by-name lookup builds one
// `Map<string, EntityNode>` per parse from `output.entities` by plain
// iteration `Map.set` — LAST declaration wins, the frozen duplicate semantics
// (rfc-tm-3-diamond.md §3.6; link-index.ts:17, legacy parser.ts:122).

import { type CstSourceFile, type EntityNode, type ParseOutput, QualifiedNameResolver, resolvedNameTarget } from '@sammons/typed-mind';
import { type NameOccurrence, NameOccurrenceIndex } from './name-occurrence-index.ts';

// The return type of TypedMind.parseWithCst(): ParseOutput (entities, imports,
// diagnostics, links) plus the shared CST (doc §1, one parse per document
// version — no second TypedMindParser, no re-parse).
export type ParseWithCstOutput = ParseOutput & { readonly cst: CstSourceFile };

export interface DocumentState {
  readonly output: ParseWithCstOutput;
  readonly nameIndex: NameOccurrenceIndex;
  readonly byName: ReadonlyMap<string, EntityNode>;
  readonly names: QualifiedNameResolver;
}

// Last-wins over the duplicate-preserving entity list: a later declaration of
// the same name overwrites an earlier one's Map.set entry, matching the
// insertion-order last-wins projection rule (rfc-tm-3-diamond.md §3.6) and the
// LinkIndex's own name resolution (link-index.ts:17).
export const buildEntityByNameIndex = (output: ParseWithCstOutput): ReadonlyMap<string, EntityNode> => {
  const byName = new Map<string, EntityNode>();
  for (const entity of output.entities) {
    byName.set(entity.name, entity);
  }
  return byName;
};

export const buildDocumentState = (output: ParseWithCstOutput): DocumentState => {
  const byName = buildEntityByNameIndex(output);
  return {
    output,
    nameIndex: new NameOccurrenceIndex(output.cst, output.entities),
    byName,
    names: new QualifiedNameResolver(byName),
  };
};

export const targetOfOccurrence = (occurrence: NameOccurrence, names: QualifiedNameResolver): EntityNode | undefined => {
  return occurrence.exportingOwner === undefined
    ? names.target(occurrence.name)
    : resolvedNameTarget(names.resolveExport(occurrence.exportingOwner, occurrence.name));
};
