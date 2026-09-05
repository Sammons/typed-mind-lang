import { type ParsedSignature, parseSignatureText, parseTypeExprText, type Span, type TypeExprNode } from '@sammons/typed-mind';
import type { ParsedTypeText, TypeReferenceOccurrence } from './types.ts';

export interface TypeReferenceReplacement {
  readonly occurrence: TypeReferenceOccurrence;
  readonly name: string;
}
export interface TypeReferenceRewriteResult {
  readonly text: string;
  readonly applied: readonly TypeReferenceReplacement[];
  readonly unsupported: readonly TypeReferenceOccurrence[];
}

const offsetAt = (text: string, position: Span['start']): number => {
  const lines = text.split('\n');
  return lines.slice(0, position.line - 1).reduce((offset, line) => offset + line.length + 1, 0) + position.column - 1;
};

// Parsing establishes eligible name intervals; provenance alone does not make
// arbitrary TypeScript syntax safe to rewrite. All intervals address raw text.
const structuralNames = (text: string): ReadonlyMap<number, number> => {
  const names = new Map<number, number>();
  const visitType = (raw: string, baseOffset: number): void => {
    const callable = parseSignatureText(raw);
    if (callable.kind === 'parsed') {
      visitSignature(callable.signature, raw, baseOffset);
      return;
    }
    const parsed = parseTypeExprText(raw);
    if (parsed.remainder !== '') return;
    const visit = (node: TypeExprNode): void => {
      // TypeExpr reports linear columns even for embedded newlines.
      const start = node.span.start.column - 1;
      const end = node.span.end.column - 1;
      switch (node.kind) {
        case 'named':
          if (raw.slice(start, end) === node.name) names.set(baseOffset + start, baseOffset + end);
          break;
        case 'generic':
          visit(node.base);
          node.args.forEach(visit);
          break;
        case 'array':
          if (node.spelling === 'generic' && raw.slice(start, start + 5) === 'Array') {
            names.set(baseOffset + start, baseOffset + start + 5);
          }
          visit(node.element);
          break;
        case 'union':
        case 'intersection':
          node.members.forEach(visit);
          break;
        case 'opaque': {
          const nested = raw.slice(start, end);
          const signature = parseSignatureText(nested);
          if (signature.kind === 'parsed') visitSignature(signature.signature, nested, baseOffset + start);
          break;
        }
        case 'literal':
          break;
      }
    };
    visit(parsed.typeExpr);
  };
  const visitSignature = (signature: ParsedSignature, raw: string, baseOffset: number): void => {
    for (const parameter of signature.typeParameters ?? []) {
      for (const type of [parameter.constraint, parameter.defaultType]) {
        if (type === undefined) continue;
        const start = offsetAt(raw, type.span.start);
        const end = offsetAt(raw, type.span.end);
        visitType(raw.slice(start, end), baseOffset + start);
      }
    }
    for (const parameter of signature.parameters) {
      if (parameter.type === undefined) continue;
      visitType(parameter.type.text, baseOffset + offsetAt(raw, parameter.type.span.start));
    }
    if (signature.returnType !== undefined) {
      visitType(signature.returnType.text, baseOffset + offsetAt(raw, signature.returnType.span.start));
    }
  };
  visitType(text, 0);
  return names;
};

export const rewriteTypeReferences = (
  info: ParsedTypeText,
  replacementFor: (occurrence: TypeReferenceOccurrence) => string | undefined,
): TypeReferenceRewriteResult => {
  const candidates = info.references
    .filter((occurrence) => occurrence.origin.kind !== 'type-parameter' && occurrence.origin.kind !== 'typescript-lib')
    .map((occurrence) => ({ occurrence, name: replacementFor(occurrence) }))
    .filter(
      (candidate): candidate is TypeReferenceReplacement =>
        candidate.name !== undefined && candidate.name !== candidate.occurrence.writtenName,
    );
  const sorted = [...info.references].sort((left, right) => left.start - right.start);
  if (
    sorted.some(
      (reference, index) =>
        reference.start < 0 ||
        reference.end > info.text.length ||
        reference.start >= reference.end ||
        info.text.slice(reference.start, reference.end) !== reference.writtenName ||
        (index > 0 && reference.start < (sorted[index - 1]?.end ?? 0)),
    )
  ) {
    return { text: info.text, applied: [], unsupported: candidates.map((candidate) => candidate.occurrence) };
  }
  const names = structuralNames(info.text);
  const applied = candidates.filter(({ occurrence }) => names.get(occurrence.start) === occurrence.end);
  const unsupported = candidates
    .filter(({ occurrence }) => names.get(occurrence.start) !== occurrence.end)
    .map(({ occurrence }) => occurrence);
  const text = [...applied]
    .sort((left, right) => right.occurrence.start - left.occurrence.start)
    .reduce((value, { occurrence, name }) => value.slice(0, occurrence.start) + name + value.slice(occurrence.end), info.text);
  return { text, applied, unsupported };
};
