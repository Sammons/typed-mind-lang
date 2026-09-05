// RFC-TM-4 §2 (rfc-tm-4-diamond.md) — longform emission, ported from the
// legacy per-kind longform converters (syntax-generator.ts:733-1011) with the
// ClassFile keyword-header form as the canonical longform (the RFC: "the
// ClassFile keyword-header emission aligns with the grammar's canonical
// form, closing the TM-2-era round-trip break") — the sigil-with-brace input
// shape (`Name #: path { ... }`) and the keyword shape (`classfile Name {
// ... }`) both parse to the same ClassFileNode (sourceForm: 'longform'), so
// emitting the single canonical keyword form round-trips both.
//
// `description`/`purpose` property emission (longform-builder.ts §header
// comment): the walker reads ONE `description:` property into BOTH
// `comment` (always) and, for kinds whose honest-fields table has a purpose,
// `purpose` (as `purpose-key ?? description-key`). So `comment === purpose`
// whenever both are set from a single `description:` line; a distinct
// `purpose:` line only exists when it diverges from `comment`. Emission
// mirrors this: one `description:` line carries `comment` (and doubles as
// `purpose` when they're equal); a `purpose:` line is added only when
// `purpose` differs from `comment` (including comment undefined). Function,
// Asset, RunParameter, and UIComponent have no separate purpose key at all —
// their purpose/description-shaped field and `comment` are always identical
// on a longform round-trip, so one `description:` line always covers both.

import type { AssetNode } from '../ast/asset-node.ts';
import type { ClassFileNode } from '../ast/class-file-node.ts';
import type { ClassNode } from '../ast/class-node.ts';
import type { ConstantsNode } from '../ast/constants-node.ts';
import type { DependencyNode } from '../ast/dependency-node.ts';
import type { Diagnostic } from '../ast/diagnostic.ts';
import type { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { FileNode } from '../ast/file-node.ts';
import type { FunctionNode } from '../ast/function-node.ts';
import type { ProgramNode } from '../ast/program-node.ts';
import type { RunParameterNode } from '../ast/run-parameter-node.ts';
import type { TypeDefNode } from '../ast/type-def-node.ts';
import type { UiComponentNode } from '../ast/ui-component-node.ts';
import { genericEmissionDiagnostics, heritageLines, parameterLines, printHeritage } from './generic-declaration-emission.ts';
import { printTypeExpr } from './print-type-expr.ts';
import { quoteStringLiteral } from './quote-string-literal.ts';

const indent = (lines: string[]): string[] => lines.map((line) => `  ${line}`);

// grammar.js entity_name is `[A-Za-z_]\w*`: a longform block header's bare
// (unquoted) name form only accepts that identifier shape. Every other kind's
// block header requires the bare form, but `dependency` also accepts a quoted
// header name (H10, block_header — added for scoped-package names like
// `@types/node` that dependency_name's broader shortform pattern allows but
// entity_name does not); quote whenever the name falls outside entity_name's
// shape so a Dependency block header always round-trips.
const IDENTIFIER_PATTERN = /^[A-Za-z_]\w*$/;
const dependencyHeaderName = (name: string): string => {
  return IDENTIFIER_PATTERN.test(name) ? name : quoteStringLiteral(name);
};

// The shared description/purpose property lines for the six kinds whose
// honest-fields table carries a distinct `purpose`.
//
// toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/typedmind/
// toggle-fidelity-audit-2026-08-31.md) — the `comment === undefined` case
// used to fall through to "distinct purpose" and emit ONLY `purpose: "..."`,
// never `description: "..."`. That is functionally harmless in isolation
// (longform-builder.ts sets `comment` from `description:` alone, never from
// `purpose:`, but neither the checker nor link-index ever reads `.comment` —
// it exists purely for re-emission fidelity) but it broke the toggle
// round-trip's own honest-field bar: a longform-authored entity with
// `comment === purpose` (the common case) that bounces through a shortform
// intermediate form loses `comment` on the way back (emit-shortform.ts's
// withInlineComment dedup, per that file's own comment, correctly drops the
// duplicate `# comment` when it equals the body's own purpose/description
// line — so the reparsed shortform entity has `comment: undefined`,
// `purpose` intact) and then re-longforming via the OLD `purpose:`-only path
// never restored it. Since `description:` sets BOTH `comment` and `purpose`
// identically whenever they're meant to agree, preferring `description:`
// here (falling back to `purpose:` only when the caller's `comment` is
// undefined AND we want the value to read back into `purpose` alone, which
// no caller here needs) closes the gap with no downside: a document that
// legitimately never had a `comment` still round-trips fine, and a document
// that DID gets it back.
const descriptionAndPurposeLines = (comment: string | undefined, purpose: string | undefined): string[] => {
  const lines: string[] = [];
  if (comment !== undefined) {
    lines.push(`description: ${quoteStringLiteral(comment)}`);
    if (purpose !== undefined && purpose !== comment) {
      lines.push(`purpose: ${quoteStringLiteral(purpose)}`);
    }
    return lines;
  }
  if (purpose !== undefined) {
    // No distinct comment to preserve: emit as `description:` so a reparse
    // sets BOTH comment and purpose to this value, matching what an author
    // who typed one `description:` line would have produced in the first
    // place (longform-builder.ts's buildFromLongformBlock: `comment:
    // collected.scalars.get('description')`).
    lines.push(`description: ${quoteStringLiteral(purpose)}`);
  }
  return lines;
};

const programToLongform = (entity: ProgramNode): string[] => {
  const body: string[] = [`type: Program`, `entry: ${entity.entry}`];
  if (entity.version !== undefined) {
    body.push(`version: ${entity.version}`);
  }
  body.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
  if (entity.exports !== undefined && entity.exports.length > 0) {
    body.push(`exports: [${entity.exports.join(', ')}]`);
  }
  return [`program ${entity.name} {`, ...indent(body), '}'];
};

const fileToLongform = (entity: FileNode): string[] => {
  const body: string[] = [`type: File`, `path: ${entity.path}`];
  body.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
  if (entity.imports.length > 0) {
    body.push(`imports: [${entity.imports.join(', ')}]`);
  }
  if (entity.exports.length > 0) {
    body.push(`exports: [${entity.exports.join(', ')}]`);
  }
  // RFC-TM-11 §RX-5 (rfc-tm-11-diamond.md) — File only, after exports.
  if (entity.reExports.length > 0) {
    body.push(`reexports: [${entity.reExports.join(', ')}]`);
  }
  return [`file ${entity.name} {`, ...indent(body), '}'];
};

const functionToLongform = (entity: FunctionNode): string[] => {
  const body: string[] = [`type: Function`, `signature: ${entity.signature}`];
  body.push(...parameterLines(entity));
  if (entity.description !== undefined) {
    body.push(`description: ${quoteStringLiteral(entity.description)}`);
  }
  if (entity.input !== undefined) {
    body.push(`input: ${entity.input}`);
  }
  if (entity.output !== undefined) {
    body.push(`output: ${entity.output}`);
  }
  if (entity.calls.length > 0) {
    body.push(`calls: [${entity.calls.join(', ')}]`);
  }
  if (entity.affects !== undefined && entity.affects.length > 0) {
    body.push(`affects: [${entity.affects.join(', ')}]`);
  }
  if (entity.consumes !== undefined && entity.consumes.length > 0) {
    body.push(`consumes: [${entity.consumes.join(', ')}]`);
  }
  // Issue #121: pendingDependencies is the unresolved residue of a shortform
  // `<- [...]` import-list continuation after Q4's forward-semantics
  // distribution (RFC-TM-3 §3.4) sorts resolvable names into
  // calls/affects/consumes/input. `dependencies` mirrors those siblings'
  // bare-plural-noun naming and was unused as a longform key before this fix.
  if (entity.pendingDependencies.length > 0) {
    body.push(`dependencies: [${entity.pendingDependencies.join(', ')}]`);
  }
  return [`function ${entity.name} {`, ...indent(body), '}'];
};

const classToLongform = (entity: ClassNode): string[] => {
  const body: string[] = [`type: Class`];
  body.push(...parameterLines(entity));
  body.push(...heritageLines(entity));
  body.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
  if (entity.methods.length > 0) {
    body.push(`methods: [${entity.methods.join(', ')}]`);
  }
  return [`class ${entity.name} {`, ...indent(body), '}'];
};

const classFileToLongform = (entity: ClassFileNode): string[] => {
  const body: string[] = [`type: ClassFile`, `path: ${entity.path}`];
  body.push(...parameterLines(entity));
  body.push(...heritageLines(entity));
  body.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
  if (entity.imports.length > 0) {
    body.push(`imports: [${entity.imports.join(', ')}]`);
  }
  if (entity.methods.length > 0) {
    body.push(`methods: [${entity.methods.join(', ')}]`);
  }
  // The auto-self-export (ClassFileNode constructor) reconstructs itself on
  // re-parse even if omitted; emit the full declared list including it (the
  // constructor's `.includes` guard makes this idempotent, never a duplicate).
  if (entity.exports.length > 0) {
    body.push(`exports: [${entity.exports.join(', ')}]`);
  }
  return [`classfile ${entity.name} {`, ...indent(body), '}'];
};

const constantsToLongform = (entity: ConstantsNode): string[] => {
  const body: string[] = [`type: Constants`, `path: ${entity.path}`];
  if (entity.calls.length > 0) {
    body.push(`calls: [${entity.calls.join(', ')}]`);
  }
  if (entity.schema !== undefined) {
    body.push(`schema: ${entity.schema}`);
  }
  body.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
  return [`constants ${entity.name} {`, ...indent(body), '}'];
};

// RFC-TM-13 C-prime: both type slots use one escaped outer string.
// Decoding that wrapper restores the complete type expression, including
// its own literal delimiters, before the type parser reads it.
const longformTypeValue = quoteStringLiteral;

const dtoFieldToLongform = (field: DtoNode['fields'][number]): string[] => {
  const body: string[] = [`type: ${longformTypeValue(field.type)}`];
  if (field.description !== undefined) {
    body.push(`description: ${quoteStringLiteral(field.description)}`);
  }
  // Longform spells both `?` and `(optional)` inputs as `optional: true`
  // (longform-builder.ts fieldPropsOf/dtoFieldOf: both map to the
  // 'parenthesized' marker on parse, per §2.2 — the 'question' variant is
  // reserved for the shortform `?` sigil). Emitting `optional: true` for
  // either non-'none' marker is therefore the only round-trip-consistent
  // choice for a longform DTO field: a longform round-trip never sees
  // 'question' land here in practice, but the mapping is total regardless.
  if (field.optionalityMarker !== 'none') {
    body.push(`optional: true`);
  }
  return [`${field.name}: {`, ...indent(body), '}'];
};

const dtoToLongform = (entity: DtoNode): string[] => {
  const body: string[] = [`type: DTO`, ...descriptionAndPurposeLines(entity.comment, entity.purpose)];
  body.push(...parameterLines(entity));
  body.push(...(entity.extendsReferences ?? []).map((reference) => `extends: ${quoteStringLiteral(printHeritage(reference))}`));
  if (entity.fields.length > 0) {
    const fieldLines = entity.fields.flatMap((field) => dtoFieldToLongform(field));
    body.push('fields: {', ...indent(fieldLines), '}');
  }
  return [`dto ${entity.name} {`, ...indent(body), '}'];
};

const assetToLongform = (entity: AssetNode): string[] => {
  const body: string[] = [`type: Asset`, `description: ${quoteStringLiteral(entity.description)}`];
  if (entity.containsProgram !== undefined) {
    body.push(`containsProgram: ${entity.containsProgram}`);
  }
  return [`asset ${entity.name} {`, ...indent(body), '}'];
};

const uiComponentToLongform = (entity: UiComponentNode): string[] => {
  const body: string[] = [`type: UIComponent`, `description: ${quoteStringLiteral(entity.purpose)}`];
  if (entity.root) {
    body.push(`root: true`);
  }
  if (entity.contains !== undefined && entity.contains.length > 0) {
    body.push(`contains: [${entity.contains.join(', ')}]`);
  }
  if (entity.declaredContainedBy !== undefined && entity.declaredContainedBy.length > 0) {
    body.push(`containedBy: [${entity.declaredContainedBy.join(', ')}]`);
  }
  if (entity.declaredAffectedBy !== undefined && entity.declaredAffectedBy.length > 0) {
    body.push(`affectedBy: [${entity.declaredAffectedBy.join(', ')}]`);
  }
  return [`component ${entity.name} {`, ...indent(body), '}'];
};

const runParameterToLongform = (entity: RunParameterNode): string[] => {
  // No decorative `type: RunParameter` line here (unlike every other kind):
  // longform-builder.ts's applyProperties reads RunParameter's `paramType`
  // FROM the `type:` key itself (`scalar('type') ?? 'env'`) — there is no
  // separate `paramType:` key the new parser recognizes. A `type: RunParameter`
  // decorative line (what the legacy converter emitted, syntax-generator.ts:975,
  // alongside its own now-dead `paramType:` key) would collide with and
  // overwrite the real paramType on reparse.
  const body: string[] = [`type: ${entity.paramType}`, `description: ${quoteStringLiteral(entity.description)}`];
  if (entity.defaultValue !== undefined) {
    body.push(`default: ${quoteStringLiteral(entity.defaultValue)}`);
  }
  if (entity.required === true) {
    body.push(`required: true`);
  }
  return [`parameter ${entity.name} {`, ...indent(body), '}'];
};

const dependencyToLongform = (entity: DependencyNode): string[] => {
  const body: string[] = [`type: Dependency`];
  body.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
  if (entity.version !== undefined) {
    body.push(`version: ${entity.version}`);
  }
  if (entity.exports !== undefined && entity.exports.length > 0) {
    body.push(`exports: [${entity.exports.join(', ')}]`);
  }
  return [`dependency ${dependencyHeaderName(entity.name)} {`, ...indent(body), '}'];
};

// X-TYPE-7 (rfc-tm-8-diamond.md §5): `typedef Name { variant: enum, members:
// [...] }` or `typedef Name { type: TypeExpr }` — NO decorative `type: TypeDef`
// line here (unlike every other kind): TypeDef's OWN `type:` key is reserved
// for the alias variant's aliased type text (mirrors RunParameter's identical
// `type:`-key-collision avoidance above — longform-builder.ts's applyProperties
// reads the alias's type FROM the `type:` key itself). A decorative
// `type: TypeDef` line would collide with and overwrite the real aliasType on
// reparse. `variant:` defaults to alias when unspelled (applyProperties
// mirrors this same default on parse), so a re-emitted alias round-trips
// without ever printing a redundant `variant: alias` line.
const typeDefToLongform = (entity: TypeDefNode): string[] => {
  const body: string[] = [];
  body.push(...parameterLines(entity));
  if (entity.variant === 'enum') {
    body.push('variant: enum');
    body.push(`members: [${(entity.members ?? []).join(', ')}]`);
  } else {
    // The `undefined` arm is unreachable for an alias: TypeDefNode's
    // constructor union pins `{ variant: 'alias'; aliasType: TypeExprNode }`,
    // and the field is only widened to `| undefined` to cover the enum
    // variant. Kept for the narrowing.
    body.push(`type: ${longformTypeValue(entity.aliasType === undefined ? '' : printTypeExpr(entity.aliasType))}`);
  }
  body.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
  return [`typedef ${entity.name} {`, ...indent(body), '}'];
};

export const emitLongform = (entity: EntityNode): string[] => {
  switch (entity.kind) {
    case 'Program':
      return programToLongform(entity as ProgramNode);
    case 'File':
      return fileToLongform(entity as FileNode);
    case 'Function':
      return functionToLongform(entity as FunctionNode);
    case 'Class':
      return classToLongform(entity as ClassNode);
    case 'ClassFile':
      return classFileToLongform(entity as ClassFileNode);
    case 'Constants':
      return constantsToLongform(entity as ConstantsNode);
    case 'DTO':
      return dtoToLongform(entity as DtoNode);
    case 'Asset':
      return assetToLongform(entity as AssetNode);
    case 'UIComponent':
      return uiComponentToLongform(entity as UiComponentNode);
    case 'RunParameter':
      return runParameterToLongform(entity as RunParameterNode);
    case 'Dependency':
      return dependencyToLongform(entity as DependencyNode);
    case 'TypeDef':
      return typeDefToLongform(entity as TypeDefNode);
  }
};

// The diagnostic API remains available; escaped output requires no mutation warning.
export const emitLongformWithDiagnostics = (entity: EntityNode): { lines: string[]; diagnostics: Diagnostic[] } => {
  return { lines: emitLongform(entity), diagnostics: genericEmissionDiagnostics(entity) };
};
