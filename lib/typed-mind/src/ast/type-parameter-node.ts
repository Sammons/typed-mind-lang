import type { Span } from './span.ts';
import type { TypeExprNode } from './type-expr-node.ts';

// Source facts and local bindings, not generic instantiations. Raw text is
// observational source metadata; emitters use the structured fields.
export interface TypeParameterNode {
  readonly name: string;
  readonly modifiers: readonly ('const' | 'in' | 'out')[];
  readonly constraint: TypeExprNode | undefined;
  readonly defaultType: TypeExprNode | undefined;
  readonly raw: string;
  readonly span: Span;
}
