// RFC-TM-4 §2 (rfc-tm-4-diamond.md) — shortform emission, one function per
// entity kind, ported from the legacy per-kind shortform converters
// (syntax-generator.ts:491-729) with one deliberate delta: this module emits
// only DECLARED fields carried by the AST (never LinkIndex/derived data), so
// UIComponent's `containedBy` continuation prints `declaredContainedBy`
// verbatim and nothing else — the round-trip-consistent choice per the RFC's
// Rejected Alternatives ("Emitting derived reverse links").
//
// DTO field optionality (S-CORE-2b): the legacy converter collapsed both
// spellings into one boolean and always re-derived the `(optional)` suffix
// (syntax-generator.ts:647-663); this port switches on the three-way
// `optionalityMarker` so `?` round-trips as `?` and `(optional)` round-trips
// as `(optional)`, per field.

import type { AssetNode } from '../ast/asset-node.ts';
import type { ClassFileNode } from '../ast/class-file-node.ts';
import type { ClassNode } from '../ast/class-node.ts';
import type { ConstantsNode } from '../ast/constants-node.ts';
import type { DependencyNode } from '../ast/dependency-node.ts';
import type { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { FileNode } from '../ast/file-node.ts';
import type { FunctionNode } from '../ast/function-node.ts';
import type { ProgramNode } from '../ast/program-node.ts';
import type { RunParameterNode } from '../ast/run-parameter-node.ts';
import type { UiComponentNode } from '../ast/ui-component-node.ts';

// A shortform `comment` is an INLINE trailing comment on the declaration's
// own first line (grammar.js: every *_declaration production takes an
// optional inline_comment before its line end — `Name -> Entry # comment`),
// not a preceding standalone comment line (which the walker treats as a
// comment_line that never attaches, cst-to-ast.ts). Appending it to the first
// emitted line is what makes it re-attach on reparse.
const withInlineComment = (lines: string[], comment: string | undefined): string[] => {
  if (comment === undefined || lines.length === 0) {
    return lines;
  }
  const [first, ...rest] = lines;
  return [`${first} # ${comment}`, ...rest];
};

const programToShortform = (entity: ProgramNode): string[] => {
  let line = `${entity.name} -> ${entity.entry}`;
  if (entity.purpose !== undefined) {
    line += ` "${entity.purpose}"`;
  }
  if (entity.version !== undefined) {
    line += ` v${entity.version}`;
  }
  const lines = [line];
  if (entity.exports !== undefined && entity.exports.length > 0) {
    lines.push(`  -> [${entity.exports.join(', ')}]`);
  }
  return lines;
};

const fileToShortform = (entity: FileNode): string[] => {
  const lines = [`${entity.name} @ ${entity.path}:`];
  if (entity.purpose !== undefined) {
    lines.push(`  "${entity.purpose}"`);
  }
  if (entity.imports.length > 0) {
    lines.push(`  <- [${entity.imports.join(', ')}]`);
  }
  if (entity.exports.length > 0) {
    lines.push(`  -> [${entity.exports.join(', ')}]`);
  }
  return lines;
};

const functionToShortform = (entity: FunctionNode): string[] => {
  const lines = [`${entity.name} :: ${entity.signature}`];
  if (entity.description !== undefined) {
    lines.push(`  "${entity.description}"`);
  }
  // pendingDependencies is the unresolved residue of the mixed `<- [...]`
  // list after Q4's forward-semantics distribution (§3.4) — the names that
  // resolved into calls/affects/consumes/input are ALREADY carried by those
  // fields below; re-emitting the residue as its own `<- [...]` (the
  // import_list continuation, a distinct production from the unbracketed
  // `<- Name` input line, so the two coexist) is what makes distribution
  // re-derive the identical residue on reparse instead of silently dropping
  // it (the validator's "Function dependency not found" check, RFC §1,
  // consumes exactly this field).
  if (entity.pendingDependencies.length > 0) {
    lines.push(`  <- [${entity.pendingDependencies.join(', ')}]`);
  }
  if (entity.input !== undefined) {
    lines.push(`  <- ${entity.input}`);
  }
  if (entity.output !== undefined) {
    lines.push(`  -> ${entity.output}`);
  }
  if (entity.calls.length > 0) {
    lines.push(`  ~> [${entity.calls.join(', ')}]`);
  }
  if (entity.affects !== undefined && entity.affects.length > 0) {
    lines.push(`  ~ [${entity.affects.join(', ')}]`);
  }
  if (entity.consumes !== undefined && entity.consumes.length > 0) {
    lines.push(`  $< [${entity.consumes.join(', ')}]`);
  }
  return lines;
};

const inheritanceSuffix = (extendsName: string | undefined, implementsList: readonly string[]): string => {
  if (extendsName === undefined) {
    return implementsList.length > 0 ? ` ${implementsList.join(', ')}` : '';
  }
  return implementsList.length > 0 ? ` ${extendsName}, ${implementsList.join(', ')}` : ` ${extendsName}`;
};

const classToShortform = (entity: ClassNode): string[] => {
  const lines = [`${entity.name} <:${inheritanceSuffix(entity.extends, entity.implements)}`];
  if (entity.purpose !== undefined) {
    lines.push(`  "${entity.purpose}"`);
  }
  if (entity.methods.length > 0) {
    lines.push(`  => [${entity.methods.join(', ')}]`);
  }
  return lines;
};

const classFileToShortform = (entity: ClassFileNode): string[] => {
  const inheritance =
    entity.extends === undefined && entity.implements.length === 0 ? '' : ` <:${inheritanceSuffix(entity.extends, entity.implements)}`;
  const lines = [`${entity.name} #: ${entity.path}${inheritance}`];
  if (entity.purpose !== undefined) {
    lines.push(`  "${entity.purpose}"`);
  }
  if (entity.imports.length > 0) {
    lines.push(`  <- [${entity.imports.join(', ')}]`);
  }
  if (entity.methods.length > 0) {
    lines.push(`  => [${entity.methods.join(', ')}]`);
  }
  // Auto-self-export (ClassFileNode constructor) is not re-emitted as a
  // visible export list unless something else is exported too, matching the
  // legacy behavior that only prints exports beyond the implicit self-export
  // would be redundant to reconstruct — but since the AST already folded the
  // self-export in, emit exactly what's declared (round-trip-consistent: the
  // ClassFileNode constructor re-adds the self-export on the next parse if
  // it's ever missing, so omitting a self-export-only list is lossless).
  const visibleExports = entity.exports.filter((exportName) => exportName !== entity.name);
  if (visibleExports.length > 0) {
    lines.push(`  -> [${entity.exports.join(', ')}]`);
  }
  return lines;
};

const constantsToShortform = (entity: ConstantsNode): string[] => {
  let line = `${entity.name} ! ${entity.path}`;
  if (entity.schema !== undefined) {
    line += ` : ${entity.schema}`;
  }
  const lines = [line];
  if (entity.purpose !== undefined) {
    lines.push(`  "${entity.purpose}"`);
  }
  return lines;
};

const dtoFieldLine = (field: DtoNode['fields'][number]): string => {
  let fieldLine = `  - ${field.name}`;
  if (field.optionalityMarker === 'question') {
    fieldLine += '?';
  }
  fieldLine += `: ${field.type}`;
  if (field.description !== undefined) {
    fieldLine += ` "${field.description}"`;
  }
  if (field.optionalityMarker === 'parenthesized') {
    fieldLine += ' (optional)';
  }
  return fieldLine;
};

const dtoToShortform = (entity: DtoNode): string[] => {
  let line = `${entity.name} %`;
  if (entity.purpose !== undefined) {
    line += ` "${entity.purpose}"`;
  }
  const lines = [line];
  for (const field of entity.fields) {
    lines.push(dtoFieldLine(field));
  }
  return lines;
};

const assetToShortform = (entity: AssetNode): string[] => {
  const lines = [`${entity.name} ~ "${entity.description}"`];
  if (entity.containsProgram !== undefined) {
    lines.push(`  >> ${entity.containsProgram}`);
  }
  return lines;
};

const uiComponentToShortform = (entity: UiComponentNode): string[] => {
  const marker = entity.root ? '&!' : '&';
  const lines = [`${entity.name} ${marker} "${entity.purpose}"`];
  if (entity.contains !== undefined && entity.contains.length > 0) {
    lines.push(`  > [${entity.contains.join(', ')}]`);
  }
  if (entity.declaredContainedBy !== undefined && entity.declaredContainedBy.length > 0) {
    lines.push(`  < [${entity.declaredContainedBy.join(', ')}]`);
  }
  return lines;
};

const runParameterToShortform = (entity: RunParameterNode): string[] => {
  let line = `${entity.name} $${entity.paramType} "${entity.description}"`;
  if (entity.required === true) {
    line += ' (required)';
  }
  const lines = [line];
  if (entity.defaultValue !== undefined) {
    lines.push(`  = "${entity.defaultValue}"`);
  }
  return lines;
};

const dependencyToShortform = (entity: DependencyNode): string[] => {
  let line = `${entity.name} ^ "${entity.purpose}"`;
  if (entity.version !== undefined) {
    line += ` v${entity.version}`;
  }
  const lines = [line];
  if (entity.exports !== undefined && entity.exports.length > 0) {
    lines.push(`  -> [${entity.exports.join(', ')}]`);
  }
  return lines;
};

export const emitShortform = (entity: EntityNode): string[] => {
  const body = ((): string[] => {
    switch (entity.kind) {
      case 'Program':
        return programToShortform(entity as ProgramNode);
      case 'File':
        return fileToShortform(entity as FileNode);
      case 'Function':
        return functionToShortform(entity as FunctionNode);
      case 'Class':
        return classToShortform(entity as ClassNode);
      case 'ClassFile':
        return classFileToShortform(entity as ClassFileNode);
      case 'Constants':
        return constantsToShortform(entity as ConstantsNode);
      case 'DTO':
        return dtoToShortform(entity as DtoNode);
      case 'Asset':
        return assetToShortform(entity as AssetNode);
      case 'UIComponent':
        return uiComponentToShortform(entity as UiComponentNode);
      case 'RunParameter':
        return runParameterToShortform(entity as RunParameterNode);
      case 'Dependency':
        return dependencyToShortform(entity as DependencyNode);
    }
  })();
  return withInlineComment(body, entity.comment);
};
