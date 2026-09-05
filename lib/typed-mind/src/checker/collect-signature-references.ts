import type { ParsedSignature } from '../pipeline/parse-signature-text.ts';
import { walkSignatureTypes } from '../pipeline/type-reference-walk.ts';
import { isPrimitiveType } from './type-builtins.ts';

// Signature-local and nested callback binders never consume global names.
export const collectSignatureReferences = (
  signature: ParsedSignature,
  referenced: Set<string>,
  outerBinders: ReadonlySet<string> = new Set(),
): void => {
  walkSignatureTypes(signature, outerBinders, {
    reference: (node, args) => {
      if (args.length === 0 || !isPrimitiveType(node.name)) referenced.add(node.name);
    },
  });
};
