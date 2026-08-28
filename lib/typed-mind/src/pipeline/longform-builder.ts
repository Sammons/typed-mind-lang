// RFC-TM-3 §3.1 (rfc-tm-3-diamond.md) — longform blocks map their typed
// property_*/dto_fields_block children onto the semantic classes. The per-kind
// key mapping replicates longform-parser.ts:181-343, including its quirks:
//   - comment = the `description` property, for every kind (longform-parser.ts:183);
//   - purpose = `purpose` ?? `description` where both are read (program/file/
//     class/constants/dto; dependency adds the '' default);
//   - component purpose = `description` only (longform-parser.ts:279);
//   - parameter `type` → paramType, `default` → defaultValue.
// Two deliberate deltas from legacy, both grammar-grounded:
//   - `classfile Name { ... }` (H11) and `Name #: path { ... }` (H12) blocks
//     are mapped (the legacy longform regex has no classfile arm and drops
//     both shapes wholesale);
//   - a `key: value` the legacy per-line regexes could not match (freetext
//     values like `signature: (id: string) => User`, dropped silently at
//     longform-parser.ts:93-139) attaches through P7's property_freetext.
// Unknown keys stay silently ignored (legacy: stored in the property map but
// never read), EXCEPT `imports` on a `class` block: ClassNode carries no
// imports per the §2.2 F3 ruling, so the property becomes
// `semantics/illegal-continuation` instead of silent data loss.

import type { Diagnostic } from '../ast/diagnostic.ts';
import { DtoFieldNode } from '../ast/dto-field-node.ts';
import type { EntityKind } from '../ast/entity-kind.ts';
import type {
  CstBlockProperty,
  CstClassfileBlockSigil,
  CstDtoFieldBlock,
  CstDtoFieldsBlock,
  CstLongformBlock,
} from '../ast/gen/cst-nodes.ts';
import type { Span } from '../ast/span.ts';
import { illegalContinuationDiagnostic } from './attachment-rules.ts';
import { EntityAccumulator } from './entity-accumulator.ts';
import { tokenSpanOf } from './spans.ts';
import { parseTypeExprText } from './type-expr-from-text.ts';

export interface LongformAttachment {
  readonly entityName: string;
  readonly group: string;
  readonly span: Span;
}

export interface LongformBuildResult {
  readonly accumulator: EntityAccumulator;
  readonly diagnostics: readonly Diagnostic[];
  readonly attachments: readonly LongformAttachment[];
}

const LONGFORM_KIND_BY_KEYWORD: Record<string, EntityKind> = {
  program: 'Program',
  file: 'File',
  function: 'Function',
  class: 'Class',
  classfile: 'ClassFile',
  dto: 'DTO',
  component: 'UIComponent',
  asset: 'Asset',
  constants: 'Constants',
  parameter: 'RunParameter',
  dependency: 'Dependency',
  // X-TYPE-7 (rfc-tm-8-diamond.md §5): `typedef Name { ... }` longform.
  typedef: 'TypeDef',
};

const unquote = (text: string): string => {
  return text.replace(/^"/, '').replace(/"$/, '');
};

interface ScalarProperty {
  kind: 'scalar';
  key: string;
  value: string;
  span: Span;
}

interface ListProperty {
  kind: 'list';
  key: string;
  names: string[];
  span: Span;
}

interface BoolProperty {
  kind: 'bool';
  key: string;
  value: boolean;
  span: Span;
}

interface FieldsProperty {
  kind: 'fields';
  key: string;
  fields: DtoFieldNode[];
  span: Span;
}

type LongformProperty = ScalarProperty | ListProperty | BoolProperty | FieldsProperty;

const fieldPropsOf = (properties: LongformProperty[]): { type?: string; typeSpan?: Span; description?: string; optional: boolean } => {
  let typeText: string | undefined;
  let typeSpan: Span | undefined;
  let descriptionText: string | undefined;
  let optional = false;
  for (const property of properties) {
    if (property.key === 'type' && property.kind === 'scalar') {
      typeText = property.value;
      typeSpan = property.span;
    }
    if (property.key === 'description' && property.kind === 'scalar') {
      descriptionText = property.value;
    }
    if (property.key === 'optional') {
      optional = property.kind === 'bool' ? property.value : property.kind === 'scalar' && property.value === 'true';
    }
  }
  return {
    ...(typeText !== undefined ? { type: typeText } : {}),
    ...(typeSpan !== undefined ? { typeSpan } : {}),
    ...(descriptionText !== undefined ? { description: descriptionText } : {}),
    optional,
  };
};

const dtoFieldsOf = (fieldsBlock: CstDtoFieldsBlock): DtoFieldNode[] => {
  const fields: DtoFieldNode[] = [];
  for (const fieldBlock of fieldsBlock.dtoFieldBlockChildren()) {
    fields.push(dtoFieldOf(fieldBlock));
  }
  return fields;
};

const dtoFieldOf = (fieldBlock: CstDtoFieldBlock): DtoFieldNode => {
  const span = tokenSpanOf(fieldBlock.syntaxNode);
  const inline = fieldBlock.dtoFieldInlineChildren().at(0);
  let fieldName: string;
  let properties: LongformProperty[];
  if (inline !== undefined) {
    fieldName = inline.propertyKeyChildren().at(0)?.text ?? '';
    properties = inline.inlineFieldPairChildren().map((pair) => {
      const pairSpan = tokenSpanOf(pair.syntaxNode);
      const key = pair.propertyKeyChildren().at(0)?.text ?? '';
      const stringValue = pair.stringChildren().at(0)?.text;
      if (stringValue !== undefined) {
        return { kind: 'scalar', key, value: unquote(stringValue), span: pairSpan } satisfies ScalarProperty;
      }
      const boolValue = pair.boolLiteralChildren().at(0)?.text;
      if (boolValue !== undefined) {
        return { kind: 'bool', key, value: boolValue === 'true', span: pairSpan } satisfies BoolProperty;
      }
      return { kind: 'scalar', key, value: pair.entityNameChildren().at(0)?.text ?? '', span: pairSpan } satisfies ScalarProperty;
    });
  } else {
    fieldName = fieldBlock.propertyKeyChildren().at(0)?.text ?? '';
    properties = fieldBlock
      .blockPropertyChildren()
      .map(classifyBlockProperty)
      .filter((property) => property !== undefined);
  }
  const props = fieldPropsOf(properties);
  const typeText = props.type ?? 'any';
  // X-TYPE-2 (rfc-tm-8-diamond.md §2/§6): the longform `type:` value is a
  // QUOTED STRING at the grammar level (corpus: every longform fixture's
  // `type: "string[]"` spelling) — its inner text is opaque to tree-sitter,
  // so typeExpr comes from the shared string-based parser (type-expr-from-
  // text.ts) rather than a CST walk. baseLine/baseColumn anchor the parsed
  // structure's spans at the type property's own span start — an
  // approximation (the property span covers `type: "..."` as a whole, not
  // just the string's inner text) that is good enough for Q1's "populate the
  // structure" bar; per-part span precision for the checker's findings is
  // Q2's X-TYPE-4 concern, scoped to the shortform CST-derived path.
  const typeSpanStart = (props.typeSpan ?? span).start;
  const typeExpr = parseTypeExprText(typeText, { baseLine: typeSpanStart.line, baseColumn: typeSpanStart.column }).typeExpr;
  return new DtoFieldNode({
    name: fieldName,
    // 'any' is the legacy default for a longform field with no type key
    // (longform-parser.ts:249) — a data value, not a TypeScript type.
    type: typeText,
    typeExpr,
    // Longform spells optionality as `optional: true`; the marker maps to the
    // 'parenthesized' variant (both spell the word `optional` explicitly; the
    // 'question' variant is reserved for the shortform `?` sigil, doc §2.2).
    optionalityMarker: props.optional ? 'parenthesized' : 'none',
    ...(props.description !== undefined ? { description: props.description } : {}),
    span,
  });
};

const classifyBlockProperty = (property: CstBlockProperty): LongformProperty | undefined => {
  const span = tokenSpanOf(property.syntaxNode);
  const stringProperty = property.propertyStringChildren().at(0);
  if (stringProperty !== undefined) {
    return {
      kind: 'scalar',
      key: stringProperty.propertyKeyChildren().at(0)?.text ?? '',
      value: unquote(stringProperty.stringChildren().at(0)?.text ?? '""'),
      span,
    };
  }
  const identifierProperty = property.propertyIdentifierChildren().at(0);
  if (identifierProperty !== undefined) {
    return {
      kind: 'scalar',
      key: identifierProperty.propertyKeyChildren().at(0)?.text ?? '',
      value: identifierProperty.entityNameChildren().at(0)?.text ?? '',
      span,
    };
  }
  const freetextProperty = property.propertyFreetextChildren().at(0);
  if (freetextProperty !== undefined) {
    return {
      kind: 'scalar',
      key: freetextProperty.propertyKeyChildren().at(0)?.text ?? '',
      value: (freetextProperty.freetextValueChildren().at(0)?.text ?? '').trim(),
      span,
    };
  }
  const boolProperty = property.propertyBoolChildren().at(0);
  if (boolProperty !== undefined) {
    return {
      kind: 'bool',
      key: boolProperty.propertyKeyChildren().at(0)?.text ?? '',
      value: boolProperty.boolLiteralChildren().at(0)?.text === 'true',
      span,
    };
  }
  const listProperty = property.propertyListChildren().at(0);
  if (listProperty !== undefined) {
    const entries = listProperty.nameListChildren().at(0)?.listEntryChildren() ?? [];
    return {
      kind: 'list',
      key: listProperty.propertyKeyChildren().at(0)?.text ?? '',
      names: entries.map((entry) => entry.text),
      span,
    };
  }
  const fieldsBlock = property.dtoFieldsBlockChildren().at(0);
  if (fieldsBlock !== undefined) {
    return { kind: 'fields', key: 'fields', fields: dtoFieldsOf(fieldsBlock), span };
  }
  // property_nested_block under a non-`fields` key and a stray inline field
  // object outside a fields container: the legacy parser stored these in the
  // property map but no kind ever read them — ignored, matching legacy.
  return undefined;
};

interface CollectedProperties {
  scalars: Map<string, string>;
  lists: Map<string, { names: string[]; span: Span }>;
  bools: Map<string, boolean>;
  fields: DtoFieldNode[] | undefined;
  all: LongformProperty[];
}

const collectProperties = (blockProperties: CstBlockProperty[]): CollectedProperties => {
  const collected: CollectedProperties = { scalars: new Map(), lists: new Map(), bools: new Map(), fields: undefined, all: [] };
  for (const blockProperty of blockProperties) {
    const property = classifyBlockProperty(blockProperty);
    if (property === undefined) {
      continue;
    }
    collected.all.push(property);
    // Map.set replicates the legacy last-wins on repeated keys
    // (longform-parser.ts parseProperty → properties.set).
    if (property.kind === 'scalar') {
      collected.scalars.set(property.key, property.value);
    } else if (property.kind === 'bool') {
      collected.bools.set(property.key, property.value);
    } else if (property.kind === 'list') {
      collected.lists.set(property.key, { names: property.names, span: property.span });
    } else {
      collected.fields = property.fields;
    }
  }
  return collected;
};

const applyProperties = (accumulator: EntityAccumulator, collected: CollectedProperties, diagnostics: Diagnostic[]): void => {
  const { slots } = accumulator;
  const scalar = (key: string): string | undefined => collected.scalars.get(key);
  const list = (key: string): string[] | undefined => collected.lists.get(key)?.names;
  const description = scalar('description');
  const purposeOrDescription = scalar('purpose') ?? description;
  switch (accumulator.kind) {
    case 'Program': {
      slots.entry = scalar('entry') ?? '';
      const version = scalar('version');
      if (version !== undefined) {
        slots.version = version;
      }
      if (purposeOrDescription !== undefined) {
        slots.purpose = purposeOrDescription;
      }
      const exports = list('exports');
      if (exports !== undefined) {
        slots.exports = exports;
      }
      break;
    }
    case 'File': {
      slots.path = scalar('path') ?? '';
      slots.imports = list('imports') ?? [];
      slots.exports = list('exports') ?? [];
      if (purposeOrDescription !== undefined) {
        slots.purpose = purposeOrDescription;
      }
      break;
    }
    case 'Function': {
      slots.signature = scalar('signature') ?? '';
      slots.calls = list('calls') ?? [];
      if (description !== undefined) {
        slots.description = description;
      }
      const input = scalar('input');
      if (input !== undefined) {
        slots.input = input;
      }
      const output = scalar('output');
      if (output !== undefined) {
        slots.output = output;
      }
      const affects = list('affects');
      if (affects !== undefined) {
        slots.affects = affects;
      }
      const consumes = list('consumes');
      if (consumes !== undefined) {
        slots.consumes = consumes;
      }
      break;
    }
    case 'Class': {
      const extendsName = scalar('extends');
      if (extendsName !== undefined) {
        slots.extendsName = extendsName;
      }
      slots.implementsList = list('implements') ?? [];
      slots.methods = list('methods') ?? [];
      if (purposeOrDescription !== undefined) {
        slots.purpose = purposeOrDescription;
      }
      const importsProperty = collected.lists.get('imports');
      if (importsProperty !== undefined) {
        // §2.2 F3 ruling: ClassNode carries no imports; the property would be
        // silent data loss, so it surfaces as the same illegal-continuation
        // class the shortform `<- [...]` case produces.
        diagnostics.push(illegalContinuationDiagnostic('imports property (`imports: [...]`)', 'Class', importsProperty.span));
      }
      break;
    }
    case 'ClassFile': {
      const path = scalar('path');
      if (path !== undefined) {
        slots.path = path;
      }
      const extendsName = scalar('extends');
      if (extendsName !== undefined) {
        slots.extendsName = extendsName;
      }
      slots.implementsList = list('implements') ?? slots.implementsList ?? [];
      slots.methods = list('methods') ?? [];
      slots.imports = list('imports') ?? [];
      slots.exports = list('exports') ?? [];
      if (purposeOrDescription !== undefined) {
        slots.purpose = purposeOrDescription;
      }
      break;
    }
    case 'Constants': {
      slots.path = scalar('path') ?? '';
      const schema = scalar('schema');
      if (schema !== undefined) {
        slots.schema = schema;
      }
      if (purposeOrDescription !== undefined) {
        slots.purpose = purposeOrDescription;
      }
      break;
    }
    case 'DTO': {
      slots.fields = collected.fields ?? [];
      if (purposeOrDescription !== undefined) {
        slots.purpose = purposeOrDescription;
      }
      break;
    }
    case 'Asset': {
      slots.description = description ?? '';
      const containsProgram = scalar('containsProgram');
      if (containsProgram !== undefined) {
        slots.containsProgram = containsProgram;
      }
      break;
    }
    case 'UIComponent': {
      // Legacy component purpose reads ONLY `description` (longform-parser.ts:279).
      slots.purpose = description ?? '';
      slots.root = collected.bools.get('root') ?? false;
      const contains = list('contains');
      if (contains !== undefined) {
        slots.contains = contains;
      }
      const containedBy = list('containedBy');
      if (containedBy !== undefined) {
        slots.declaredContainedBy = containedBy;
      }
      const affectedBy = list('affectedBy');
      if (affectedBy !== undefined) {
        slots.declaredAffectedBy = affectedBy;
      }
      break;
    }
    case 'RunParameter': {
      slots.paramType = scalar('type') ?? 'env';
      slots.description = description ?? '';
      const defaultValue = scalar('default');
      if (defaultValue !== undefined) {
        slots.defaultValue = defaultValue;
      }
      const required = collected.bools.get('required');
      if (required !== undefined) {
        slots.required = required;
      }
      break;
    }
    case 'Dependency': {
      slots.purpose = purposeOrDescription ?? '';
      const version = scalar('version');
      if (version !== undefined) {
        slots.version = version;
      }
      const exports = list('exports');
      if (exports !== undefined) {
        slots.exports = exports;
      }
      break;
    }
    case 'TypeDef': {
      // X-TYPE-7 (rfc-tm-8-diamond.md §5): `variant: enum|alias` is the
      // discriminant key (distinct from every other kind's `type: <Kind>`
      // decorative line — TypeDef's OWN `type:` key is reserved for the
      // alias variant's aliased type text, mirroring a DTO field's `type:`
      // property, longform-builder.ts's dtoFieldOf). `members: [...]` carries
      // the enum's member list; a `type:` value with no `variant: enum` line
      // defaults to the alias reading (the common case — most longform
      // TypeDefs alias a type and never spell `variant:` at all).
      const variant = scalar('variant') === 'enum' ? 'enum' : 'alias';
      slots.typeDefVariant = variant;
      if (variant === 'enum') {
        slots.members = list('members') ?? [];
      } else {
        const aliasTypeProperty = collected.scalars.get('type');
        const aliasTypeSpanStart = collected.all.find((property) => property.key === 'type')?.span.start ?? accumulator.span.start;
        const typeText = aliasTypeProperty ?? 'any';
        slots.aliasType = parseTypeExprText(typeText, {
          baseLine: aliasTypeSpanStart.line,
          baseColumn: aliasTypeSpanStart.column,
        }).typeExpr;
      }
      if (purposeOrDescription !== undefined) {
        slots.purpose = purposeOrDescription;
      }
      break;
    }
  }
};

const buildResult = (accumulator: EntityAccumulator, collected: CollectedProperties): LongformBuildResult => {
  const diagnostics: Diagnostic[] = [];
  applyProperties(accumulator, collected, diagnostics);
  const attachments = collected.all.map((property) => ({
    entityName: accumulator.name,
    group: property.key,
    span: property.span,
  }));
  return { accumulator, diagnostics, attachments };
};

export const buildFromLongformBlock = (block: CstLongformBlock): LongformBuildResult | undefined => {
  const header = block.blockHeaderChildren().at(0);
  if (header === undefined) {
    return undefined;
  }
  const keywordText = (header.blockKwChildren().at(0)?.text ?? '').split(/[ \t]/)[0] ?? '';
  const kind = LONGFORM_KIND_BY_KEYWORD[keywordText];
  if (kind === undefined) {
    return undefined;
  }
  const collected = collectProperties(block.blockPropertyChildren());
  const accumulator = new EntityAccumulator({
    kind,
    name: header.headerName(),
    span: tokenSpanOf(block.syntaxNode),
    raw: block.syntaxNode.text.trimEnd(),
    // Legacy longform comment = the description property (longform-parser.ts:183).
    comment: collected.scalars.get('description'),
    // RFC-TM-4 §2 (rfc-tm-4-diamond.md): a brace-block header is 'longform'.
    sourceForm: 'longform',
  });
  return buildResult(accumulator, collected);
};

export const buildFromClassfileBlockSigil = (block: CstClassfileBlockSigil): LongformBuildResult => {
  const collected = collectProperties(block.blockPropertyChildren());
  const accumulator = new EntityAccumulator({
    kind: 'ClassFile',
    name: block.entityNameChildren().at(0)?.text ?? '',
    span: tokenSpanOf(block.syntaxNode),
    raw: block.syntaxNode.text.trimEnd(),
    comment: collected.scalars.get('description'),
    // RFC-TM-4 §2 (rfc-tm-4-diamond.md, FID-6): the sigil-with-brace ClassFile
    // header `Name #: path {` is a brace-block header => 'longform'.
    sourceForm: 'longform',
  });
  // Header parts win their slots first; block properties may override.
  accumulator.slots.path = (block.pathChildren().at(0)?.text ?? '').trim();
  const inheritNames =
    block
      .inheritListChildren()
      .at(0)
      ?.entityNameChildren()
      .map((entityName) => entityName.text) ?? [];
  const [extendsName, ...implementsList] = inheritNames;
  if (extendsName !== undefined) {
    accumulator.slots.extendsName = extendsName;
    accumulator.slots.implementsList = implementsList;
  }
  return buildResult(accumulator, collected);
};
