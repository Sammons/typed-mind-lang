import {
  canonicalizeTypeText,
  type HeritageReference,
  parseHeritageText,
  parseTypeExprText,
  parseTypeParameterText,
  type Span,
  type TypeExprNode,
  type TypeParameterNode,
} from '@sammons/typed-mind';
import type { ParsedTypeParameter, ParsedTypeText } from './types.ts';

const span: Span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
export interface GenericMetadataContext {
  readonly rewrite: (info: ParsedTypeText) => string;
  readonly error: (message: string) => void;
}
const operand = (info: ParsedTypeText | undefined, context: GenericMetadataContext): TypeExprNode | undefined => {
  if (info === undefined) return undefined;
  const text = context.rewrite(info);
  const canonical = canonicalizeTypeText(text);
  if (typeof canonical === 'string') {
    context.error(`Unsupported generic type: ${canonical}; original operand retained`);
    return { kind: 'opaque', text, span };
  }
  const parsed = parseTypeExprText(canonical.text);
  return parsed.remainder.trim() === '' ? parsed.typeExpr : { kind: 'opaque', text: canonical.text, span };
};

export const convertSourceTypeParameters = (
  parameters: readonly ParsedTypeParameter[] | undefined,
  context: GenericMetadataContext,
): readonly TypeParameterNode[] | undefined => {
  if (parameters === undefined || parameters.length === 0) return undefined;
  return parameters.map((parameter) => {
    const parsed = parseTypeParameterText(parameter.text);
    let head = parsed.kind === 'parsed' ? parsed.parameters[0] : undefined;
    if (head === undefined) {
      context.error(
        `Unsupported type parameter '${parameter.name}': ${parsed.kind === 'invalid' ? parsed.reason : 'invalid-binding'}; source facts retained`,
      );
      // A1 ranges prove the boundary before the first operand, even when an
      // operand contains a physical multiline literal the DSL cannot encode.
      const first = parameter.constraint ?? parameter.defaultType;
      const offset =
        first?.source === undefined || first.source.filePath !== parameter.declaration.filePath
          ? undefined
          : first.source.start - parameter.declaration.start;
      if (offset !== undefined && offset >= 0 && offset <= parameter.text.length) {
        const prefix = canonicalizeTypeText(parameter.text.slice(0, offset));
        if (typeof prefix !== 'string') {
          const binding = parseTypeParameterText(prefix.text.replace(/(?:\bextends|=)\s*$/, '').trim());
          if (binding.kind === 'parsed' && binding.parameters[0]?.name === parameter.name) head = binding.parameters[0];
        }
      }
    }
    return {
      name: parameter.name,
      modifiers: head?.modifiers ?? [],
      constraint: operand(parameter.constraint, context),
      defaultType: operand(parameter.defaultType, context),
      raw: parameter.text,
      span: head?.span ?? span,
    };
  });
};

export const convertSourceHeritage = (
  fallback: string,
  info: ParsedTypeText | undefined,
  context: GenericMetadataContext,
  baseReplacement?: string,
): HeritageReference => {
  const text = info === undefined ? fallback : context.rewrite(info);
  const canonical = canonicalizeTypeText(text);
  if (typeof canonical === 'string') {
    context.error(`Unsupported heritage type: ${canonical}; original text retained`);
    return { kind: 'opaque', text, span };
  }
  const parsed = parseHeritageText(canonical.text);
  return parsed.kind === 'named' && baseReplacement !== undefined ? { ...parsed, base: { ...parsed.base, name: baseReplacement } } : parsed;
};
