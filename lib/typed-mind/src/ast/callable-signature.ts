import type { Span } from './span.ts';
import type { TypeExprNode } from './type-expr-node.ts';
import type { TypeParameterNode } from './type-parameter-node.ts';

export type SignatureTypePosition =
  | { readonly kind: 'type'; readonly text: string; readonly span: Span; readonly typeExpr: TypeExprNode }
  | { readonly kind: 'callable'; readonly text: string; readonly span: Span; readonly signature: ParsedSignature };

export interface SignatureParameter {
  readonly binding: string;
  readonly span: Span;
  readonly type: SignatureTypePosition | undefined;
  readonly optional: boolean;
  readonly rest: boolean;
  readonly defaultText: string | undefined;
}

export interface ParsedSignature {
  readonly text: string;
  readonly span: Span;
  readonly displayName: string | undefined;
  readonly async: boolean;
  readonly typeParameterText: string | undefined;
  readonly typeParameterNames: readonly string[];
  readonly typeParameters?: readonly TypeParameterNode[];
  readonly parameters: readonly SignatureParameter[];
  readonly returnType: SignatureTypePosition | undefined;
}

export type SignatureParseResult =
  | { readonly kind: 'parsed'; readonly signature: ParsedSignature }
  | {
      readonly kind: 'opaque';
      readonly text: string;
      readonly span: Span;
      readonly reason: 'unsupported-shape' | 'incomplete-signature' | 'unconsumed-text';
    };
