// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — DSLValidator.checkDTOFieldTypes ported
// verbatim (validator.ts:1473-1592): the Function-typed-field ban (exact match
// or \bFunction\b word test), then per-field type-reference validation with
// the legacy type-extraction pipeline — array-suffix stripping, union
// splitting, the primitive allowlist, the uppercase custom-type test, and the
// simplified `<...>` generic inner-type extraction.

import { DtoNode } from '../ast/dto-node.ts';
import type { CheckContext } from './check-context.ts';

const PRIMITIVES = [
  'string',
  'number',
  'boolean',
  'object',
  'any',
  'void',
  'null',
  'undefined',
  'Date',
  'Array',
  'Promise',
  'Map',
  'Set',
  'Record',
  'Partial',
  'Required',
  'Pick',
  'Omit',
];

const isPrimitiveType = (typeName: string): boolean => {
  return PRIMITIVES.includes(typeName);
};

const isCustomTypeName = (typeName: string): boolean => {
  if (typeName.includes('<') && typeName.includes('>')) {
    const match = typeName.match(/<([^>]+)>/);
    if (match !== null && match[1] !== undefined) {
      return isCustomTypeName(match[1]);
    }
  }
  return /^[A-Z]/.test(typeName) && /^[A-Za-z][A-Za-z0-9_]*$/.test(typeName);
};

const extractTypesFromFieldType = (fieldType: string): string[] => {
  const types: string[] = [];
  const baseType = fieldType.replace(/\[\]/g, '');

  if (baseType.includes('|')) {
    const unionParts = baseType.split('|').map((part) => part.trim());
    for (const part of unionParts) {
      if (!isPrimitiveType(part) && isCustomTypeName(part)) {
        types.push(part);
      }
    }
  } else if (!isPrimitiveType(baseType) && isCustomTypeName(baseType)) {
    types.push(baseType);
  }

  return types;
};

export const checkDtoFieldTypes = (context: CheckContext): void => {
  for (const entity of context.byName.values()) {
    if (!(entity instanceof DtoNode)) {
      continue;
    }
    for (const field of entity.fields) {
      if (!field.type) {
        continue; // legacy skipped absent types (validator.ts:1481)
      }

      if (field.type === 'Function' || /\bFunction\b/.test(field.type)) {
        context.addFinding({
          code: 'checker/dto-field-function-type',
          severity: 'error',
          span: entity.span,
          message: `DTO '${entity.name}' field '${field.name}' cannot have Function type`,
          suggestion: 'DTOs should only contain data fields. Use string, number, boolean, object, array, or other data types instead',
        });
        continue;
      }

      for (const typeName of extractTypesFromFieldType(field.type)) {
        const referenced = context.byName.get(typeName);
        if (referenced === undefined) {
          context.addFinding({
            code: 'checker/dto-field-unknown-type',
            severity: 'error',
            span: entity.span,
            message: `DTO '${entity.name}' field '${field.name}' references undefined type '${typeName}'`,
            suggestion: `Define '${typeName}' as a DTO or Class entity`,
          });
        } else if (referenced.kind !== 'DTO' && referenced.kind !== 'Class') {
          context.addFinding({
            code: 'checker/dto-field-non-data-type',
            severity: 'error',
            span: entity.span,
            message: `DTO '${entity.name}' field '${field.name}' references '${typeName}' which is a ${referenced.kind}, not a DTO or Class`,
            suggestion: 'Field types should reference DTO or Class entities for complex types',
          });
        }
      }
    }
  }
};
