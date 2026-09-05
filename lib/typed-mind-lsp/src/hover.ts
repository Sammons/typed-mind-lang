// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — hover joins the link phase (S-CONS-LSP-2).
// Reads declared fields off the typed EntityNode (the six `as any` casts at
// legacy server.ts:366,384,392,412,427,444 die) and reads reverse links from
// output.links: referencedBy(name) returns { from, fromType }[] — the pinned
// shape (link-index.ts:23-24, cites legacy server.ts:309-316) — and
// containedBy/affectedBy/consumedBy/importedBy(name) return name lists.
// "Referenced By" groups by fromType (LinkIndex carries the referencer's kind,
// not the legacy relationship verb) — the accepted S-AST-4 shape (FAQ Q1).
// A12: ClassFile's Exports line renders `.exports` directly, so a ClassFile
// with a declared export list shows its own self-name entry
// (rfc-tm-4-diamond.md A12).

import {
  AssetNode,
  ClassFileNode,
  ClassNode,
  ConstantsNode,
  DependencyNode,
  DtoNode,
  type EntityNode,
  FileNode,
  FunctionNode,
  type LinkIndex,
  ProgramNode,
  printHeritage,
  printSignature,
  printTypeParameter,
  RunParameterNode,
  TypeDefNode,
  UiComponentNode,
} from '@sammons/typed-mind';

const section = (label: string, value: string | undefined): string | undefined => {
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  return `**${label}**: ${value}`;
};

const listSection = (label: string, values: readonly string[] | undefined): string | undefined => {
  if (values === undefined || values.length === 0) {
    return undefined;
  }
  return `**${label}**: ${values.join(', ')}`;
};

// Groups referencedBy(name) entries by fromType (the new grouping — legacy
// grouped by relationship verb, which LinkIndex's Reference shape does not
// carry: it is { from, fromType }, not { from, type }).
const renderReferencedBy = (entity: EntityNode, links: LinkIndex): string | undefined => {
  const references = links.referencedBy(entity.name);
  if (references.length === 0) {
    return undefined;
  }
  const byFromType = new Map<string, string[]>();
  for (const reference of references) {
    const bucket = byFromType.get(reference.fromType) ?? [];
    bucket.push(reference.from);
    byFromType.set(reference.fromType, bucket);
  }
  const groups = [...byFromType.entries()].map(([fromType, froms]) => `${fromType}: ${froms.join(', ')}`);
  return `**Referenced By**: ${groups.join(' | ')}`;
};

const renderCommon = (entity: EntityNode): string[] => {
  const lines: string[] = [`**${entity.kind}**: ${entity.name}`];
  if (
    entity instanceof ClassNode ||
    entity instanceof ClassFileNode ||
    entity instanceof DtoNode ||
    entity instanceof FunctionNode ||
    entity instanceof TypeDefNode
  ) {
    const parameters = listSection('Type parameters', entity.typeParameters?.map(printTypeParameter));
    if (parameters !== undefined) lines.push(parameters);
  }
  if (entity.comment !== undefined && entity.comment.length > 0) {
    lines.push(`💬 *${entity.comment}*`);
  }
  return lines;
};

const renderProgram = (entity: ProgramNode): string[] => {
  return [
    section('Entry', entity.entry),
    section('Purpose', entity.purpose),
    section('Version', entity.version),
    listSection('Exports', entity.exports),
  ].filter((line): line is string => line !== undefined);
};

const renderFile = (entity: FileNode): string[] => {
  return [
    section('Path', entity.path),
    section('Purpose', entity.purpose),
    listSection('Imports', entity.imports),
    listSection('Exports', entity.exports),
  ].filter((line): line is string => line !== undefined);
};

const renderFunction = (entity: FunctionNode): string[] => {
  return [
    section('Signature', entity.signature.length > 0 ? `\`${entity.signature}\`` : undefined),
    section('Description', entity.description),
    section('Input', entity.input),
    section('Output', entity.output),
    listSection('Calls', entity.calls),
    listSection('Affects', entity.affects),
    listSection('Consumes', entity.consumes),
  ].filter((line): line is string => line !== undefined);
};

const renderClass = (entity: ClassNode): string[] => {
  return [
    section('Purpose', entity.purpose),
    section('Extends', entity.heritage.extends === undefined ? undefined : printHeritage(entity.heritage.extends)),
    listSection('Implements', entity.heritage.implements.map(printHeritage)),
    listSection(
      'Methods',
      entity.members?.methods.map((member) => (member.signature === undefined ? (member.name ?? '') : printSignature(member.signature))) ??
        entity.methods,
    ),
    listSection(
      'Constructors',
      entity.members?.constructors.map((member) => printSignature(member.signature)),
    ),
  ].filter((line): line is string => line !== undefined);
};

// A12 (rfc-tm-4-diamond.md): ClassFileNode.exports always includes the
// class's own name (construction-time auto-self-export, class-file-node.ts) —
// this renders that entry the same way any other export renders, which IS
// the A12 fixture assertion: no special-case branch, just `.exports` shown.
const renderClassFile = (entity: ClassFileNode): string[] => {
  return [
    section('Path', entity.path),
    section('Purpose', entity.purpose),
    section('Extends', entity.heritage.extends === undefined ? undefined : printHeritage(entity.heritage.extends)),
    listSection('Implements', entity.heritage.implements.map(printHeritage)),
    listSection(
      'Methods',
      entity.members?.methods.map((member) => (member.signature === undefined ? (member.name ?? '') : printSignature(member.signature))) ??
        entity.methods,
    ),
    listSection(
      'Constructors',
      entity.members?.constructors.map((member) => printSignature(member.signature)),
    ),
    listSection('Imports', entity.imports),
    listSection('Exports', entity.exports),
  ].filter((line): line is string => line !== undefined);
};

const renderConstants = (entity: ConstantsNode): string[] => {
  return [
    section('Path', entity.path),
    section('Schema', entity.schema),
    section('Purpose', entity.purpose),
    listSection('Calls', entity.calls),
  ].filter((line): line is string => line !== undefined);
};

const renderDto = (entity: DtoNode): string[] => {
  const lines: string[] = [];
  const inheritance = listSection('Extends', entity.extendsReferences?.map(printHeritage));
  if (inheritance !== undefined) lines.push(inheritance);
  const purpose = section('Purpose', entity.purpose);
  if (purpose !== undefined) {
    lines.push(purpose);
  }
  if (entity.fields.length > 0) {
    const fieldList = entity.fields
      .map((field) => {
        const optional = field.isOptional ? ' *(optional)*' : '';
        const desc = field.description !== undefined && field.description.length > 0 ? ` - ${field.description}` : '';
        return `• \`${field.name}: ${field.type}\`${optional}${desc}`;
      })
      .join('\n');
    lines.push(`**Fields**:\n${fieldList}`);
  }
  return lines;
};

// X-TYPE-7 (rfc-tm-8-diamond.md §5): minimal TypeDef rendering — the doc's
// "hover keeps quoting the raw spelling" FAQ answer scopes DtoFieldNode's
// preserved `type` string specifically; TypeDefNode carries no such raw-text
// field (its declared type IS the structured aliasType, no separate raw
// string), so this renders the variant discriminant and enum member list
// only, without a printed alias-type spelling — no new public printer
// dependency for a hover-only need.
const renderTypeDef = (entity: TypeDefNode): string[] => {
  const lines = [`**Variant**: ${entity.variant}`];
  if (entity.variant === 'enum') {
    const members = listSection('Members', entity.members);
    if (members !== undefined) {
      lines.push(members);
    }
  }
  const purpose = section('Purpose', entity.purpose);
  if (purpose !== undefined) {
    lines.push(purpose);
  }
  return lines;
};

const renderAsset = (entity: AssetNode): string[] => {
  return [section('Description', entity.description), section('Contains Program', entity.containsProgram)].filter(
    (line): line is string => line !== undefined,
  );
};

const renderUiComponent = (entity: UiComponentNode, links: LinkIndex): string[] => {
  const lines = [
    section('Purpose', entity.purpose),
    entity.root ? '**Root Component**: ✓' : undefined,
    listSection('Contains', entity.contains),
  ].filter((line): line is string => line !== undefined);
  const containedBy = links.containedBy(entity.name);
  if (containedBy.length > 0) {
    lines.push(`**Contained By**: ${containedBy.join(', ')}`);
  }
  const affectedBy = links.affectedBy(entity.name);
  if (affectedBy.length > 0) {
    lines.push(`**Affected By**: ${affectedBy.join(', ')}`);
  }
  return lines;
};

const renderRunParameter = (entity: RunParameterNode, links: LinkIndex): string[] => {
  const lines = [
    `**Parameter Type**: ${entity.paramType}`,
    section('Description', entity.description),
    entity.required === true ? '**Required**: ✓' : undefined,
    section('Default Value', entity.defaultValue !== undefined ? `\`${entity.defaultValue}\`` : undefined),
  ].filter((line): line is string => line !== undefined);
  const consumedBy = links.consumedBy(entity.name);
  if (consumedBy.length > 0) {
    lines.push(`**Consumed By**: ${consumedBy.join(', ')}`);
  }
  return lines;
};

const renderDependency = (entity: DependencyNode, links: LinkIndex): string[] => {
  const lines = [section('Purpose', entity.purpose), section('Version', entity.version)].filter(
    (line): line is string => line !== undefined,
  );
  const importedBy = links.importedBy(entity.name);
  if (importedBy.length > 0) {
    lines.push(`**Imported By**: ${importedBy.join(', ')}`);
  }
  return lines;
};

// One dispatch per kind (instanceof narrowing — DAG-sanctioned per
// rfc-tm-3-diamond.md Rejected Alternatives: "classes also give instanceof
// narrowing"). No `as any`: every branch narrows to its concrete node class.
export const renderHoverContents = (entity: EntityNode, links: LinkIndex): string => {
  const lines = renderCommon(entity);
  if (entity instanceof ProgramNode) {
    lines.push(...renderProgram(entity));
  } else if (entity instanceof FileNode) {
    lines.push(...renderFile(entity));
  } else if (entity instanceof FunctionNode) {
    lines.push(...renderFunction(entity));
  } else if (entity instanceof ClassFileNode) {
    lines.push(...renderClassFile(entity));
  } else if (entity instanceof ClassNode) {
    lines.push(...renderClass(entity));
  } else if (entity instanceof ConstantsNode) {
    lines.push(...renderConstants(entity));
  } else if (entity instanceof AssetNode) {
    lines.push(...renderAsset(entity));
  } else if (entity instanceof UiComponentNode) {
    lines.push(...renderUiComponent(entity, links));
  } else if (entity instanceof RunParameterNode) {
    lines.push(...renderRunParameter(entity, links));
  } else if (entity instanceof DependencyNode) {
    lines.push(...renderDependency(entity, links));
  } else if (entity instanceof DtoNode) {
    lines.push(...renderDto(entity));
  } else if (entity instanceof TypeDefNode) {
    lines.push(...renderTypeDef(entity));
  }
  const referencedBy = renderReferencedBy(entity, links);
  if (referencedBy !== undefined) {
    lines.push(referencedBy);
  }
  return lines.join('\n\n');
};
