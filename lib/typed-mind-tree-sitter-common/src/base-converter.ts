import { type EntityKind, type EntityNode, type Span, SyntaxEmitter } from '@sammons/typed-mind';

export const SYNTHETIC_SPAN: Span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

const LEGACY_SECTION_ORDER: readonly EntityKind[] = ['Program', 'Dependency', 'File', 'ClassFile', 'Class', 'Function', 'DTO', 'Constants'];

export const sortIntoLegacySectionOrder = (entities: readonly EntityNode[]): EntityNode[] => {
  const rank = new Map(LEGACY_SECTION_ORDER.map((kind, index) => [kind, index]));
  return [...entities].sort(
    (a, b) => (rank.get(a.kind) ?? LEGACY_SECTION_ORDER.length) - (rank.get(b.kind) ?? LEGACY_SECTION_ORDER.length),
  );
};

export const collapseDescription = (raw: string): string => {
  const [firstParagraph] = raw.split(/\n\s*\n/);
  return (firstParagraph ?? '').replace(/\s+/g, ' ').trim();
};

export function emitTmd(entities: readonly EntityNode[]): string {
  const emitter = new SyntaxEmitter();
  return emitter.emitShortform({
    entities: sortIntoLegacySectionOrder(entities),
    imports: [],
    suppressions: [],
    diagnostics: [],
  });
}
