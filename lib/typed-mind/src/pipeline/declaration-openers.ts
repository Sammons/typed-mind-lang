// RFC-TM-3 §3.1 (rfc-tm-3-diamond.md) — declaration openers: one function per
// shortform declaration production (E1-E11) building the EntityAccumulator the
// continuation lines then attach to. Field extraction mirrors the legacy
// entity literals (parser.ts:187-455) with real spans instead of column 1.
// Includes the File→Class lookahead heuristic, replicated as a named
// attach-layer rule per the §2.2 F2/F3 ruling.

import type { Node as SyntaxNode } from 'web-tree-sitter';
import {
  CstAssetDeclaration,
  CstClassDeclaration,
  CstClassfileDeclaration,
  CstConstantsDeclaration,
  CstDependencyDeclaration,
  CstDtoDeclaration,
  CstFileDeclaration,
  CstFunctionDeclaration,
  type CstInheritList,
  CstProgramDeclaration,
  CstRunparameterDeclaration,
  CstTypedefDeclaration,
  CstUicomponentDeclaration,
} from '../ast/gen/cst-nodes.ts';
import { EntityAccumulator, type EntityAccumulatorArgs } from './entity-accumulator.ts';
import { tokenSpanOf } from './spans.ts';
import { typeExprFromCst } from './type-expr-from-cst.ts';

const unquote = (text: string): string => {
  return text.replace(/^"/, '').replace(/"$/, '');
};

// Legacy version captures strip the `v` prefix (parser-patterns.ts PROGRAM
// `v([\d.]+)` and DEPENDENCY `v?([\d.\-\w]+)`); the grammar's `version` token
// keeps it, so the opener strips it once here.
const stripVersionPrefix = (text: string): string => {
  return text.replace(/^v/, '');
};

const inlineCommentTextOf = (wrapped: { inlineCommentChildren(): { text: string }[] }): string | undefined => {
  const commentText = wrapped.inlineCommentChildren().at(0)?.text;
  if (commentText === undefined) {
    return undefined;
  }
  // Legacy INLINE_COMMENT captures the trimmed text after `# ` (parser.ts:656-665).
  return commentText.replace(/^#[ \t]*/, '').trim();
};

const baseArgs = (
  kind: EntityAccumulatorArgs['kind'],
  name: string,
  syntaxNode: SyntaxNode,
  comment: string | undefined,
  viaLookahead = false,
): EntityAccumulatorArgs => {
  return {
    kind,
    name,
    span: tokenSpanOf(syntaxNode),
    raw: syntaxNode.text.trimEnd(),
    comment,
    viaLookahead,
    // RFC-TM-4 §2 (rfc-tm-4-diamond.md): every declaration opener here
    // corresponds to a line-declaration CST production => 'shortform'.
    sourceForm: 'shortform',
  };
};

// Verbatim copy of the legacy entity-declaration probe
// (parser-patterns.ts GENERAL_PATTERNS.ENTITY_DECLARATION), duplicated here so
// the pipeline never imports the legacy parser modules TM-4 deletes.
const LEGACY_ENTITY_DECLARATION_PATTERN = /^[@\w\-/]+\s*(->|@|<:|#:|!|::|%|~|&|\$|\^|\s*:)/;

// The File→Class lookahead heuristic (parser.ts:211-235), replicated line-for-
// line as a named attach-layer rule: a `Name @ path:` declaration reclassifies
// when a `=>` line appears within the next 5 source lines, stopping early at
// the next entity declaration. Under the new model the converted entity is a
// ClassFileNode (§2.2 F2/F3 disposition), not a path-carrying Class.
export const fileDeclarationOpensClassFile = (sourceLines: readonly string[], declarationLineIndex: number): boolean => {
  const scanEnd = Math.min(declarationLineIndex + 6, sourceLines.length);
  for (let lineIndex = declarationLineIndex + 1; lineIndex < scanEnd; lineIndex++) {
    const trimmedLine = (sourceLines[lineIndex] ?? '').trim();
    if (trimmedLine.startsWith('=>')) {
      return true;
    }
    if (trimmedLine.length > 0 && LEGACY_ENTITY_DECLARATION_PATTERN.test(trimmedLine)) {
      return false;
    }
  }
  return false;
};

const inheritanceOf = (inheritList: CstInheritList | undefined): { extendsName?: string; implementsList: string[] } => {
  // Legacy split: first entry is the base class, the rest are interfaces
  // (parser.ts:266-277, 296-307).
  const names = inheritList === undefined ? [] : inheritList.entityNameChildren().map((entityName) => entityName.text);
  const [extendsName, ...implementsList] = names;
  return extendsName === undefined ? { implementsList: [] } : { extendsName, implementsList };
};

export const openProgram = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstProgramDeclaration(syntaxNode);
  const names = declaration.entityNameChildren();
  const accumulator = new EntityAccumulator(baseArgs('Program', names.at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)));
  accumulator.slots.entry = names.at(1)?.text ?? '';
  const purposeText = declaration.stringChildren().at(0)?.text;
  if (purposeText !== undefined) {
    accumulator.slots.purpose = unquote(purposeText);
  }
  const versionText = declaration.versionChildren().at(0)?.text;
  if (versionText !== undefined) {
    accumulator.slots.version = stripVersionPrefix(versionText);
  }
  return accumulator;
};

export const openFileOrClassFile = (syntaxNode: SyntaxNode, sourceLines: readonly string[]): EntityAccumulator => {
  const declaration = new CstFileDeclaration(syntaxNode);
  const viaLookahead = fileDeclarationOpensClassFile(sourceLines, syntaxNode.startPosition.row);
  const accumulator = new EntityAccumulator(
    baseArgs(
      viaLookahead ? 'ClassFile' : 'File',
      declaration.entityNameChildren().at(0)?.text ?? '',
      syntaxNode,
      inlineCommentTextOf(declaration),
      viaLookahead,
    ),
  );
  accumulator.slots.path = (declaration.pathChildren().at(0)?.text ?? '').trim();
  return accumulator;
};

export const openFunction = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstFunctionDeclaration(syntaxNode);
  const accumulator = new EntityAccumulator(
    baseArgs('Function', declaration.entityNameChildren().at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)),
  );
  accumulator.slots.signature = (declaration.signatureChildren().at(0)?.text ?? '').trim();
  return accumulator;
};

export const openClass = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstClassDeclaration(syntaxNode);
  const accumulator = new EntityAccumulator(
    baseArgs('Class', declaration.entityNameChildren().at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)),
  );
  const inheritance = inheritanceOf(declaration.inheritListChildren().at(0));
  if (inheritance.extendsName !== undefined) {
    accumulator.slots.extendsName = inheritance.extendsName;
  }
  accumulator.slots.implementsList = inheritance.implementsList;
  return accumulator;
};

export const openClassFile = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstClassfileDeclaration(syntaxNode);
  const accumulator = new EntityAccumulator(
    baseArgs('ClassFile', declaration.entityNameChildren().at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)),
  );
  accumulator.slots.path = (declaration.pathChildren().at(0)?.text ?? '').trim();
  const inheritance = inheritanceOf(declaration.inheritListChildren().at(0));
  if (inheritance.extendsName !== undefined) {
    accumulator.slots.extendsName = inheritance.extendsName;
  }
  accumulator.slots.implementsList = inheritance.implementsList;
  return accumulator;
};

export const openConstants = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstConstantsDeclaration(syntaxNode);
  const names = declaration.entityNameChildren();
  const accumulator = new EntityAccumulator(baseArgs('Constants', names.at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)));
  accumulator.slots.path = (declaration.pathChildren().at(0)?.text ?? '').trim();
  const schemaName = names.at(1)?.text;
  if (schemaName !== undefined) {
    accumulator.slots.schema = schemaName;
  }
  return accumulator;
};

export const openDto = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstDtoDeclaration(syntaxNode);
  const accumulator = new EntityAccumulator(
    baseArgs('DTO', declaration.entityNameChildren().at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)),
  );
  const purposeText = declaration.stringChildren().at(0)?.text;
  if (purposeText !== undefined) {
    accumulator.slots.purpose = unquote(purposeText);
  }
  return accumulator;
};

export const openAsset = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstAssetDeclaration(syntaxNode);
  const accumulator = new EntityAccumulator(
    baseArgs('Asset', declaration.entityNameChildren().at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)),
  );
  accumulator.slots.description = unquote(declaration.stringChildren().at(0)?.text ?? '""');
  return accumulator;
};

export const openUiComponent = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstUicomponentDeclaration(syntaxNode);
  const accumulator = new EntityAccumulator(
    baseArgs('UIComponent', declaration.entityNameChildren().at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)),
  );
  accumulator.slots.purpose = unquote(declaration.stringChildren().at(0)?.text ?? '""');
  // The `&!` root sigil is an anonymous token (like the dto_field `?`):
  // detected by walking the full child list.
  let root = false;
  for (let childIndex = 0; childIndex < syntaxNode.childCount; childIndex++) {
    const child = syntaxNode.child(childIndex);
    if (child !== null && !child.isNamed && child.type === '&!') {
      root = true;
      break;
    }
  }
  accumulator.slots.root = root;
  return accumulator;
};

export const openRunParameter = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstRunparameterDeclaration(syntaxNode);
  const accumulator = new EntityAccumulator(
    baseArgs('RunParameter', declaration.entityNameChildren().at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)),
  );
  // param_type token is `$word`; the sigil is stripped (parser.ts:397).
  accumulator.slots.paramType = (declaration.paramTypeChildren().at(0)?.text ?? '$env').slice(1);
  accumulator.slots.description = unquote(declaration.stringChildren().at(0)?.text ?? '""');
  // Legacy: only the literal `(required)` marker sets required=true; any other
  // marker (incl. `(optional)`) leaves it undefined (parser.ts:398-405).
  const marker = declaration.paramMarkerChildren().at(0)?.text;
  if (marker === '(required)') {
    accumulator.slots.required = true;
  }
  return accumulator;
};

export const openDependency = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstDependencyDeclaration(syntaxNode);
  const name = declaration.entityNameChildren().at(0)?.text ?? declaration.dependencyNameChildren().at(0)?.text ?? '';
  const accumulator = new EntityAccumulator(baseArgs('Dependency', name, syntaxNode, inlineCommentTextOf(declaration)));
  accumulator.slots.purpose = unquote(declaration.stringChildren().at(0)?.text ?? '""');
  const versionText = declaration.versionChildren().at(0)?.text;
  if (versionText !== undefined) {
    accumulator.slots.version = stripVersionPrefix(versionText);
  }
  return accumulator;
};

// X-TYPE-7 (rfc-tm-8-diamond.md §5): `Name = enum [A, B]` (enum variant) or
// `Name = TypeExpr` (alias variant) — grammar.js's typedef_declaration choice
// makes the two variants mutually exclusive at parse time (typedef_enum_variant
// XOR a bare type_expr child), so the opener need only check which CST child
// is present, mirroring dtoFieldFromCst's typeExprOf pattern for the alias
// case (attachment-rules.ts).
export const openTypeDef = (syntaxNode: SyntaxNode): EntityAccumulator => {
  const declaration = new CstTypedefDeclaration(syntaxNode);
  const accumulator = new EntityAccumulator(
    baseArgs('TypeDef', declaration.entityNameChildren().at(0)?.text ?? '', syntaxNode, inlineCommentTextOf(declaration)),
  );
  const enumVariant = declaration.typedefEnumVariantChildren().at(0);
  if (enumVariant !== undefined) {
    accumulator.slots.typeDefVariant = 'enum';
    accumulator.slots.members = enumVariant.listEntryChildren().map((entry) => entry.text);
    return accumulator;
  }
  accumulator.slots.typeDefVariant = 'alias';
  const typeExprCst = declaration.typeExprChildren().at(0);
  accumulator.slots.aliasType =
    typeExprCst === undefined ? { kind: 'opaque', text: '', span: accumulator.span } : typeExprFromCst(typeExprCst);
  return accumulator;
};
