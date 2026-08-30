// RFC-TM-8 §4 (rfc-tm-8-diamond.md, X-TYPE-4) — checkDtoFieldTypes replaces
// the string-splitting pipeline (`extractTypesFromFieldType`, the legacy
// TM-4 port) with a TypeExprNode walk. RULING (doc §4, adopted): per-part
// findings REUSE the existing checker codes (`checker/dto-field-unknown-type`,
// `checker/dto-field-non-data-type`) with REFINED SPANS — the failing part's
// own span, not the entity's — rather than minting new per-part codes; a
// union with one bad variant flags ONLY that variant's span (doc's named
// negative fixture). The Function-typed-field ban (exact-match / word-
// boundary test against the raw text) is unchanged, still ported verbatim
// from validator.ts:1473-1592.
//
// X-TYPE-7 (doc §5): entity-table names resolve when the referenced kind is
// DTO, Class, or TypeDef (the new named-type entity kind) — both enforcement
// points the doc names gain the kind: this file's inline kind check (was
// `referenced.kind !== 'DTO' && referenced.kind !== 'Class'`) AND
// VALID_REFERENCES.schema.to (valid-references.ts, a distinct reference verb,
// edited separately). The enum closed-set rule also lives here: a union
// field type mixing a named reference to an enum-variant TypeDef with string
// literals flags any literal absent from that enum's member set
// (`checker/enum-literal-outside-members`, severity error) — the FAQ's
// minimal trigger (doc §"FAQ", "What exactly triggers the enum closed-set
// check?").

import { DtoNode } from '../ast/dto-node.ts';
import type { Span } from '../ast/span.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
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
  'Readonly', // issue #78 — asymmetric gap: `Required` was allowlisted, `Readonly` was not.
  'Pick',
  'Omit',
  // issue #89 — same class of gap as #78: these are real lib.es2015+/lib.es5
  // TS/JS builtins with no import statement (never from an npm package), so
  // `addExternalTypeToDepExports`'s package-based stubbing can never cover
  // them either. `ReadonlyMap`/`Uint8Array` were the two live corpus
  // instances (`lib/typed-mind`'s own `LinkIndexMaps`/`TypedMindParserOptions`);
  // `ReadonlySet`/`ReadonlyArray`/the rest of the typed-array family and
  // `WeakMap`/`WeakSet` are the same class of builtin, added on audit.
  'ReadonlyMap',
  'ReadonlySet',
  'ReadonlyArray',
  'WeakMap',
  'WeakSet',
  'Uint8Array',
  'Int8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Int16Array',
  'Uint32Array',
  'Int32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
];

const isPrimitiveType = (typeName: string): boolean => {
  return PRIMITIVES.includes(typeName);
};

// The two kinds a field-type reference may resolve to (doc §5's second
// enforcement point). Extracted so the enum closed-set walk (below) and the
// per-part walk share one definition of "is this a legal data-type kind."
const isDataTypeKind = (kind: string): boolean => {
  return kind === 'DTO' || kind === 'Class' || kind === 'TypeDef';
};

const checkNamedPart = (context: CheckContext, entity: DtoNode, fieldName: string, name: string, span: Span): void => {
  if (isPrimitiveType(name)) {
    return;
  }
  // Lowercase names that are not in the primitive allowlist are treated as
  // ordinary (unresolvable-by-convention) type text, not a reference —
  // mirrors the legacy `isCustomTypeName`'s uppercase-first requirement: only
  // a Capitalized name is a candidate entity-table reference.
  if (!/^[A-Z]/.test(name)) {
    return;
  }
  const referenced = context.byName.get(name);
  if (referenced === undefined) {
    context.addFinding({
      code: 'checker/dto-field-unknown-type',
      severity: 'error',
      span,
      message: `DTO '${entity.name}' field '${fieldName}' references undefined type '${name}'`,
      suggestion: `Define '${name}' as a DTO or Class entity`,
    });
    return;
  }
  if (!isDataTypeKind(referenced.kind)) {
    context.addFinding({
      code: 'checker/dto-field-non-data-type',
      severity: 'error',
      span,
      message: `DTO '${entity.name}' field '${fieldName}' references '${name}' which is a ${referenced.kind}, not a DTO or Class`,
      suggestion: 'Field types should reference DTO or Class entities for complex types',
    });
  }
};

// X-TYPE-4's per-part walk: each TypeExprNode kind recurses per doc §4's
// per-kind table. `opaque` carries no findings (the unvalidated leaf,
// identical trust level to today's non-matching chunks, doc §4/§10).
const walkTypeExpr = (context: CheckContext, entity: DtoNode, fieldName: string, node: TypeExprNode): void => {
  switch (node.kind) {
    case 'named':
      checkNamedPart(context, entity, fieldName, node.name, node.span);
      return;
    case 'generic':
      // The base resolves as a named part (builtin generic or entity); each
      // argument validates recursively (doc §4: "Pick<S3Client, "send">
      // resolves Pick from the allowlist, S3Client against the entity
      // table, and passes "send" as a literal — three parts, three
      // verdicts").
      checkNamedPart(context, entity, fieldName, node.base.name, node.base.span);
      for (const arg of node.args) {
        walkTypeExpr(context, entity, fieldName, arg);
      }
      return;
    case 'union':
    case 'intersection':
      for (const member of node.members) {
        walkTypeExpr(context, entity, fieldName, member);
      }
      return;
    case 'array':
      walkTypeExpr(context, entity, fieldName, node.element);
      return;
    case 'literal':
      return; // passes (doc §4)
    case 'opaque':
      return; // no findings — the unvalidated leaf (doc §4/§10)
  }
};

// X-TYPE-7 enum closed-set rule (doc §5, FAQ "What exactly triggers the enum
// closed-set check?"): a `union` field type containing exactly the shape
// "one named reference to an enum-variant TypeDef entity plus one or more
// string literals" flags each literal absent from that enum's member set.
// A union of literals with no enum reference is unchecked (no declared set to
// check against); a bare enum reference with no literals is an ordinary named
// part, already covered by walkTypeExpr above.
const checkEnumClosedSet = (context: CheckContext, entity: DtoNode, fieldName: string, node: TypeExprNode): void => {
  if (node.kind !== 'union') {
    return;
  }
  let enumDef: TypeDefNode | undefined;
  const literalMembers: Array<{ value: string; span: Span }> = [];
  for (const member of node.members) {
    if (member.kind === 'named') {
      const referenced = context.byName.get(member.name);
      if (referenced instanceof TypeDefNode && referenced.variant === 'enum') {
        // Doc's minimal reading: exactly one enum reference triggers the
        // rule; a union naming two DIFFERENT enums has no single closed set
        // to check literals against, so only the first-seen enum reference
        // anchors the check (a second enum reference does not itself
        // produce a finding — it is an ordinary named part, already
        // resolved by walkTypeExpr).
        enumDef ??= referenced;
      }
      continue;
    }
    if (member.kind === 'literal' && member.literalKind === 'string') {
      literalMembers.push({ value: member.value, span: member.span });
    }
  }
  if (enumDef === undefined || literalMembers.length === 0) {
    return;
  }
  const memberSet = new Set(enumDef.members ?? []);
  for (const literal of literalMembers) {
    if (!memberSet.has(literal.value)) {
      context.addFinding({
        code: 'checker/enum-literal-outside-members',
        severity: 'error',
        span: literal.span,
        message: `DTO '${entity.name}' field '${fieldName}' union literal '${literal.value}' is not a member of enum '${enumDef.name}'`,
        suggestion: `Use one of: ${[...memberSet].join(', ')}`,
      });
    }
  }
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

      walkTypeExpr(context, entity, field.name, field.typeExpr);
      checkEnumClosedSet(context, entity, field.name, field.typeExpr);
    }
  }
};
