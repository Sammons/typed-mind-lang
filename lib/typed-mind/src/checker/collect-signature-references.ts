import type { ParsedSignature } from '../pipeline/parse-signature-text.ts';
import { walkSignatureTypes } from '../pipeline/type-reference-walk.ts';
import { isAmbientPlatformType, isPrimitiveType } from './type-builtins.ts';

// Signature-local and nested callback binders never consume global names.
// No `valueReference` hook on purpose (RFC-TM-14 §S4 R4b, G-1): a `(typeof X)`
// leaf names a value, and this collector feeds type-only checks.
export const collectSignatureReferences = (
  signature: ParsedSignature,
  referenced: Set<string>,
  outerBinders: ReadonlySet<string> = new Set(),
): void => {
  walkSignatureTypes(signature, outerBinders, {
    reference: (node, args) => {
      if (args.length === 0 || (!isPrimitiveType(node.name) && !isAmbientPlatformType(node.name))) referenced.add(node.name);
    },
  });
};
