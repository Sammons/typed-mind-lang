// GENERATED FILE — DO NOT EDIT.
// Emitted by lib/typed-mind/grammar/codegen/generate-cst-nodes.mjs (RFC-TM-3 §2.1)
// from lib/typed-mind/grammar/src/node-types.json: 121 named nodes,
// 30 `_final` twins → 91 wrapper classes (one per logical production).
// Regenerate: node lib/typed-mind/grammar/codegen/generate-cst-nodes.mjs
// CI diff-gates this file via scripts/check-generated.mjs step 2b.

import type { Node as SyntaxNode } from 'web-tree-sitter';
import type { Span } from '../span.ts';

export const CST_NAMED_NODE_TYPE_COUNT = 121;
export const CST_FINAL_TWIN_COUNT = 30;
export const CST_LOGICAL_CLASS_COUNT = 91;

const spanOf = (syntaxNode: SyntaxNode): Span => ({
  start: { line: syntaxNode.startPosition.row + 1, column: syntaxNode.startPosition.column + 1 },
  end: { line: syntaxNode.endPosition.row + 1, column: syntaxNode.endPosition.column + 1 },
});

export abstract class CstNode {
  // Explicit field assignment (not a constructor parameter property): parameter
  // properties are non-erasable syntax and break Node's strip-only execution.
  readonly syntaxNode: SyntaxNode;

  protected constructor(syntaxNode: SyntaxNode, expectedTypes: readonly string[]) {
    if (!expectedTypes.includes(syntaxNode.type)) {
      throw new Error(`CST wrapper type mismatch: expected ${expectedTypes.join(' | ')}, got ${syntaxNode.type}`);
    }
    this.syntaxNode = syntaxNode;
  }

  get text(): string {
    return this.syntaxNode.text;
  }

  get isFinal(): boolean {
    return this.syntaxNode.type.endsWith('_final');
  }

  span(): Span {
    return spanOf(this.syntaxNode);
  }

  namedChildNodes(): CstNamedNode[] {
    const wrapped: CstNamedNode[] = [];
    for (const child of this.syntaxNode.namedChildren) {
      const wrappedChild = wrapCstNode(child);
      if (wrappedChild !== undefined) {
        wrapped.push(wrappedChild);
      }
    }
    return wrapped;
  }

  protected childrenOfTypes<WrapperType extends CstNode>(
    concreteTypes: readonly string[],
    wrapperClass: new (syntaxNode: SyntaxNode) => WrapperType,
  ): WrapperType[] {
    const collected: WrapperType[] = [];
    for (const child of this.syntaxNode.namedChildren) {
      if (concreteTypes.includes(child.type)) {
        collected.push(new wrapperClass(child));
      }
    }
    return collected;
  }
}

export class CstAffectsList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['affects_list', 'affects_list_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstAffectsList.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  nameListChildren(): CstNameList[] {
    return this.childrenOfTypes(['name_list'], CstNameList);
  }
}

export class CstAssetDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['asset_declaration', 'asset_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstAssetDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstBlockCommentLine extends CstNode {
  static readonly nodeTypes: readonly string[] = ['block_comment_line'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstBlockCommentLine.nodeTypes);
  }
  commentChildren(): CstComment[] {
    return this.childrenOfTypes(['comment'], CstComment);
  }
}

export class CstBlockHeader extends CstNode {
  static readonly nodeTypes: readonly string[] = ['block_header'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstBlockHeader.nodeTypes);
  }
  nameField(): CstHeaderNameRest | CstHeaderQuotedName | undefined {
    const fieldNode = this.syntaxNode.childForFieldName('name');
    if (fieldNode === null) {
      return undefined;
    }
    if (fieldNode.type === 'header_name_rest') {
      return new CstHeaderNameRest(fieldNode);
    }
    if (fieldNode.type === 'header_quoted_name') {
      return new CstHeaderQuotedName(fieldNode);
    }
    return undefined;
  }
  blockKwChildren(): CstBlockKw[] {
    return this.childrenOfTypes(['block_kw'], CstBlockKw);
  }
  headerName(): string {
    const nameField = this.nameField();
    if (nameField instanceof CstHeaderQuotedName) {
      return nameField.text.slice(0, -1);
    }
    const keywordText = this.blockKwChildren().at(0)?.text ?? '';
    const lastKeywordCharacter = keywordText.slice(-1);
    if (nameField === undefined) {
      return lastKeywordCharacter;
    }
    return lastKeywordCharacter + nameField.text;
  }
}

export class CstBlockKw extends CstNode {
  static readonly nodeTypes: readonly string[] = ['block_kw'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstBlockKw.nodeTypes);
  }
}

export class CstBlockProperty extends CstNode {
  static readonly nodeTypes: readonly string[] = ['block_property'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstBlockProperty.nodeTypes);
  }
  dtoFieldInlineChildren(): CstDtoFieldInline[] {
    return this.childrenOfTypes(['dto_field_inline'], CstDtoFieldInline);
  }
  dtoFieldsBlockChildren(): CstDtoFieldsBlock[] {
    return this.childrenOfTypes(['dto_fields_block'], CstDtoFieldsBlock);
  }
  propertyBoolChildren(): CstPropertyBool[] {
    return this.childrenOfTypes(['property_bool'], CstPropertyBool);
  }
  propertyFreetextChildren(): CstPropertyFreetext[] {
    return this.childrenOfTypes(['property_freetext'], CstPropertyFreetext);
  }
  propertyIdentifierChildren(): CstPropertyIdentifier[] {
    return this.childrenOfTypes(['property_identifier'], CstPropertyIdentifier);
  }
  propertyListChildren(): CstPropertyList[] {
    return this.childrenOfTypes(['property_list'], CstPropertyList);
  }
  propertyNestedBlockChildren(): CstPropertyNestedBlock[] {
    return this.childrenOfTypes(['property_nested_block'], CstPropertyNestedBlock);
  }
  propertyStringChildren(): CstPropertyString[] {
    return this.childrenOfTypes(['property_string'], CstPropertyString);
  }
}

export class CstBoolLiteral extends CstNode {
  static readonly nodeTypes: readonly string[] = ['bool_literal'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstBoolLiteral.nodeTypes);
  }
}

export class CstCallsList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['calls_list', 'calls_list_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstCallsList.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  nameListChildren(): CstNameList[] {
    return this.childrenOfTypes(['name_list'], CstNameList);
  }
}

export class CstCheckCode extends CstNode {
  static readonly nodeTypes: readonly string[] = ['check_code'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstCheckCode.nodeTypes);
  }
}

export class CstClassDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['class_declaration', 'class_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstClassDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inheritListChildren(): CstInheritList[] {
    return this.childrenOfTypes(['inherit_list'], CstInheritList);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
}

export class CstClassfileBlockSigil extends CstNode {
  static readonly nodeTypes: readonly string[] = ['classfile_block_sigil'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstClassfileBlockSigil.nodeTypes);
  }
  blockCommentLineChildren(): CstBlockCommentLine[] {
    return this.childrenOfTypes(['block_comment_line'], CstBlockCommentLine);
  }
  blockPropertyChildren(): CstBlockProperty[] {
    return this.childrenOfTypes(['block_property'], CstBlockProperty);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inheritListChildren(): CstInheritList[] {
    return this.childrenOfTypes(['inherit_list'], CstInheritList);
  }
  pathChildren(): CstPath[] {
    return this.childrenOfTypes(['path'], CstPath);
  }
}

export class CstClassfileDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['classfile_declaration', 'classfile_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstClassfileDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inheritListChildren(): CstInheritList[] {
    return this.childrenOfTypes(['inherit_list'], CstInheritList);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  pathChildren(): CstPath[] {
    return this.childrenOfTypes(['path'], CstPath);
  }
}

export class CstComment extends CstNode {
  static readonly nodeTypes: readonly string[] = ['comment'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstComment.nodeTypes);
  }
}

export class CstCommentLine extends CstNode {
  static readonly nodeTypes: readonly string[] = ['comment_line', 'comment_line_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstCommentLine.nodeTypes);
  }
  commentChildren(): CstComment[] {
    return this.childrenOfTypes(['comment'], CstComment);
  }
}

export class CstConstantsDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['constants_declaration', 'constants_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstConstantsDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  pathChildren(): CstPath[] {
    return this.childrenOfTypes(['path'], CstPath);
  }
}

export class CstConsumesList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['consumes_list', 'consumes_list_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstConsumesList.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  nameListChildren(): CstNameList[] {
    return this.childrenOfTypes(['name_list'], CstNameList);
  }
}

export class CstContainedByList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['contained_by_list', 'contained_by_list_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstContainedByList.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  nameListChildren(): CstNameList[] {
    return this.childrenOfTypes(['name_list'], CstNameList);
  }
}

export class CstContainsList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['contains_list', 'contains_list_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstContainsList.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  nameListChildren(): CstNameList[] {
    return this.childrenOfTypes(['name_list'], CstNameList);
  }
}

export class CstContainsProgram extends CstNode {
  static readonly nodeTypes: readonly string[] = ['contains_program', 'contains_program_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstContainsProgram.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
}

export class CstDefaultValue extends CstNode {
  static readonly nodeTypes: readonly string[] = ['default_value', 'default_value_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstDefaultValue.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstDependencyDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['dependency_declaration', 'dependency_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstDependencyDeclaration.nodeTypes);
  }
  dependencyNameChildren(): CstDependencyName[] {
    return this.childrenOfTypes(['dependency_name'], CstDependencyName);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
  versionChildren(): CstVersion[] {
    return this.childrenOfTypes(['version'], CstVersion);
  }
}

export class CstDependencyName extends CstNode {
  static readonly nodeTypes: readonly string[] = ['dependency_name'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstDependencyName.nodeTypes);
  }
}

export class CstDescriptionLine extends CstNode {
  static readonly nodeTypes: readonly string[] = ['description_line', 'description_line_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstDescriptionLine.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstDtoDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['dto_declaration', 'dto_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstDtoDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstDtoField extends CstNode {
  static readonly nodeTypes: readonly string[] = ['dto_field', 'dto_field_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstDtoField.nodeTypes);
  }
  fieldNameChildren(): CstFieldName[] {
    return this.childrenOfTypes(['field_name'], CstFieldName);
  }
  fieldTypeChildren(): CstFieldType[] {
    return this.childrenOfTypes(['field_type'], CstFieldType);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  optionalMarkerChildren(): CstOptionalMarker[] {
    return this.childrenOfTypes(['optional_marker'], CstOptionalMarker);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstDtoFieldBlock extends CstNode {
  static readonly nodeTypes: readonly string[] = ['dto_field_block'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstDtoFieldBlock.nodeTypes);
  }
  blockCommentLineChildren(): CstBlockCommentLine[] {
    return this.childrenOfTypes(['block_comment_line'], CstBlockCommentLine);
  }
  blockPropertyChildren(): CstBlockProperty[] {
    return this.childrenOfTypes(['block_property'], CstBlockProperty);
  }
  dtoFieldInlineChildren(): CstDtoFieldInline[] {
    return this.childrenOfTypes(['dto_field_inline'], CstDtoFieldInline);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
}

export class CstDtoFieldInline extends CstNode {
  static readonly nodeTypes: readonly string[] = ['dto_field_inline'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstDtoFieldInline.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  inlineFieldPairChildren(): CstInlineFieldPair[] {
    return this.childrenOfTypes(['inline_field_pair'], CstInlineFieldPair);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
}

export class CstDtoFieldsBlock extends CstNode {
  static readonly nodeTypes: readonly string[] = ['dto_fields_block'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstDtoFieldsBlock.nodeTypes);
  }
  blockCommentLineChildren(): CstBlockCommentLine[] {
    return this.childrenOfTypes(['block_comment_line'], CstBlockCommentLine);
  }
  dtoFieldBlockChildren(): CstDtoFieldBlock[] {
    return this.childrenOfTypes(['dto_field_block'], CstDtoFieldBlock);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
}

export class CstEntityComment extends CstNode {
  static readonly nodeTypes: readonly string[] = ['entity_comment', 'entity_comment_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstEntityComment.nodeTypes);
  }
  commentChildren(): CstComment[] {
    return this.childrenOfTypes(['comment'], CstComment);
  }
}

export class CstEntityName extends CstNode {
  static readonly nodeTypes: readonly string[] = ['entity_name'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstEntityName.nodeTypes);
  }
}

export class CstEnumKw extends CstNode {
  static readonly nodeTypes: readonly string[] = ['enum_kw'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstEnumKw.nodeTypes);
  }
}

export class CstExportList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['export_list', 'export_list_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstExportList.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  nameListChildren(): CstNameList[] {
    return this.childrenOfTypes(['name_list'], CstNameList);
  }
}

export class CstFieldName extends CstNode {
  static readonly nodeTypes: readonly string[] = ['field_name'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstFieldName.nodeTypes);
  }
}

export class CstFieldType extends CstNode {
  static readonly nodeTypes: readonly string[] = ['field_type'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstFieldType.nodeTypes);
  }
  typeExprChildren(): CstTypeExpr[] {
    return this.childrenOfTypes(['type_expr'], CstTypeExpr);
  }
}

export class CstFileDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['file_declaration', 'file_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstFileDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  pathChildren(): CstPath[] {
    return this.childrenOfTypes(['path'], CstPath);
  }
}

export class CstFreetextValue extends CstNode {
  static readonly nodeTypes: readonly string[] = ['freetext_value'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstFreetextValue.nodeTypes);
  }
}

export class CstFunctionDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['function_declaration', 'function_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstFunctionDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  signatureChildren(): CstSignature[] {
    return this.childrenOfTypes(['signature'], CstSignature);
  }
}

export class CstHeaderNameRest extends CstNode {
  static readonly nodeTypes: readonly string[] = ['header_name_rest'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstHeaderNameRest.nodeTypes);
  }
}

export class CstHeaderQuotedName extends CstNode {
  static readonly nodeTypes: readonly string[] = ['header_quoted_name'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstHeaderQuotedName.nodeTypes);
  }
}

export class CstImportHead extends CstNode {
  static readonly nodeTypes: readonly string[] = ['import_head'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstImportHead.nodeTypes);
  }
}

export class CstImportList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['import_list', 'import_list_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstImportList.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  nameListChildren(): CstNameList[] {
    return this.childrenOfTypes(['name_list'], CstNameList);
  }
}

export class CstImportStatement extends CstNode {
  static readonly nodeTypes: readonly string[] = ['import_statement', 'import_statement_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstImportStatement.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  importHeadChildren(): CstImportHead[] {
    return this.childrenOfTypes(['import_head'], CstImportHead);
  }
}

export class CstInheritList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['inherit_list'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstInheritList.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
}

export class CstInlineComment extends CstNode {
  static readonly nodeTypes: readonly string[] = ['inline_comment'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstInlineComment.nodeTypes);
  }
}

export class CstInlineFieldPair extends CstNode {
  static readonly nodeTypes: readonly string[] = ['inline_field_pair'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstInlineFieldPair.nodeTypes);
  }
  boolLiteralChildren(): CstBoolLiteral[] {
    return this.childrenOfTypes(['bool_literal'], CstBoolLiteral);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstInputName extends CstNode {
  static readonly nodeTypes: readonly string[] = ['input_name', 'input_name_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstInputName.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
}

export class CstListEntry extends CstNode {
  static readonly nodeTypes: readonly string[] = ['list_entry'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstListEntry.nodeTypes);
  }
}

export class CstLongformBlock extends CstNode {
  static readonly nodeTypes: readonly string[] = ['longform_block'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstLongformBlock.nodeTypes);
  }
  blockCommentLineChildren(): CstBlockCommentLine[] {
    return this.childrenOfTypes(['block_comment_line'], CstBlockCommentLine);
  }
  blockHeaderChildren(): CstBlockHeader[] {
    return this.childrenOfTypes(['block_header'], CstBlockHeader);
  }
  blockPropertyChildren(): CstBlockProperty[] {
    return this.childrenOfTypes(['block_property'], CstBlockProperty);
  }
}

export class CstMethodsList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['methods_list', 'methods_list_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstMethodsList.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  nameListChildren(): CstNameList[] {
    return this.childrenOfTypes(['name_list'], CstNameList);
  }
}

export class CstNameList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['name_list'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstNameList.nodeTypes);
  }
  listEntryChildren(): CstListEntry[] {
    return this.childrenOfTypes(['list_entry'], CstListEntry);
  }
}

export class CstOptionalMarker extends CstNode {
  static readonly nodeTypes: readonly string[] = ['optional_marker'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstOptionalMarker.nodeTypes);
  }
}

export class CstOutputName extends CstNode {
  static readonly nodeTypes: readonly string[] = ['output_name', 'output_name_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstOutputName.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
}

export class CstParamMarker extends CstNode {
  static readonly nodeTypes: readonly string[] = ['param_marker'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstParamMarker.nodeTypes);
  }
}

export class CstParamType extends CstNode {
  static readonly nodeTypes: readonly string[] = ['param_type'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstParamType.nodeTypes);
  }
}

export class CstPath extends CstNode {
  static readonly nodeTypes: readonly string[] = ['path'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstPath.nodeTypes);
  }
}

export class CstProgramDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['program_declaration', 'program_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstProgramDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
  versionChildren(): CstVersion[] {
    return this.childrenOfTypes(['version'], CstVersion);
  }
}

export class CstPropertyBool extends CstNode {
  static readonly nodeTypes: readonly string[] = ['property_bool'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstPropertyBool.nodeTypes);
  }
  boolLiteralChildren(): CstBoolLiteral[] {
    return this.childrenOfTypes(['bool_literal'], CstBoolLiteral);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
}

export class CstPropertyFreetext extends CstNode {
  static readonly nodeTypes: readonly string[] = ['property_freetext'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstPropertyFreetext.nodeTypes);
  }
  freetextValueChildren(): CstFreetextValue[] {
    return this.childrenOfTypes(['freetext_value'], CstFreetextValue);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
}

export class CstPropertyIdentifier extends CstNode {
  static readonly nodeTypes: readonly string[] = ['property_identifier'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstPropertyIdentifier.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
}

export class CstPropertyKey extends CstNode {
  static readonly nodeTypes: readonly string[] = ['property_key'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstPropertyKey.nodeTypes);
  }
}

export class CstPropertyList extends CstNode {
  static readonly nodeTypes: readonly string[] = ['property_list'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstPropertyList.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  nameListChildren(): CstNameList[] {
    return this.childrenOfTypes(['name_list'], CstNameList);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
}

export class CstPropertyNestedBlock extends CstNode {
  static readonly nodeTypes: readonly string[] = ['property_nested_block'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstPropertyNestedBlock.nodeTypes);
  }
  blockCommentLineChildren(): CstBlockCommentLine[] {
    return this.childrenOfTypes(['block_comment_line'], CstBlockCommentLine);
  }
  dtoFieldBlockChildren(): CstDtoFieldBlock[] {
    return this.childrenOfTypes(['dto_field_block'], CstDtoFieldBlock);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
}

export class CstPropertyString extends CstNode {
  static readonly nodeTypes: readonly string[] = ['property_string'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstPropertyString.nodeTypes);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  propertyKeyChildren(): CstPropertyKey[] {
    return this.childrenOfTypes(['property_key'], CstPropertyKey);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstReadonlyBraceRest extends CstNode {
  static readonly nodeTypes: readonly string[] = ['readonly_brace_rest'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstReadonlyBraceRest.nodeTypes);
  }
}

export class CstReadonlyKw extends CstNode {
  static readonly nodeTypes: readonly string[] = ['readonly_kw'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstReadonlyKw.nodeTypes);
  }
}

export class CstReadonlyNameRest extends CstNode {
  static readonly nodeTypes: readonly string[] = ['readonly_name_rest'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstReadonlyNameRest.nodeTypes);
  }
}

export class CstReadonlyParenRest extends CstNode {
  static readonly nodeTypes: readonly string[] = ['readonly_paren_rest'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstReadonlyParenRest.nodeTypes);
  }
}

export class CstRunparameterDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['runparameter_declaration', 'runparameter_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstRunparameterDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  paramMarkerChildren(): CstParamMarker[] {
    return this.childrenOfTypes(['param_marker'], CstParamMarker);
  }
  paramTypeChildren(): CstParamType[] {
    return this.childrenOfTypes(['param_type'], CstParamType);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstSignature extends CstNode {
  static readonly nodeTypes: readonly string[] = ['signature'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstSignature.nodeTypes);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstSourceFile extends CstNode {
  static readonly nodeTypes: readonly string[] = ['source_file'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstSourceFile.nodeTypes);
  }
  affectsListChildren(): CstAffectsList[] {
    return this.childrenOfTypes(['affects_list', 'affects_list_final'], CstAffectsList);
  }
  assetDeclarationChildren(): CstAssetDeclaration[] {
    return this.childrenOfTypes(['asset_declaration', 'asset_declaration_final'], CstAssetDeclaration);
  }
  callsListChildren(): CstCallsList[] {
    return this.childrenOfTypes(['calls_list', 'calls_list_final'], CstCallsList);
  }
  classDeclarationChildren(): CstClassDeclaration[] {
    return this.childrenOfTypes(['class_declaration', 'class_declaration_final'], CstClassDeclaration);
  }
  classfileBlockSigilChildren(): CstClassfileBlockSigil[] {
    return this.childrenOfTypes(['classfile_block_sigil'], CstClassfileBlockSigil);
  }
  classfileDeclarationChildren(): CstClassfileDeclaration[] {
    return this.childrenOfTypes(['classfile_declaration', 'classfile_declaration_final'], CstClassfileDeclaration);
  }
  commentLineChildren(): CstCommentLine[] {
    return this.childrenOfTypes(['comment_line', 'comment_line_final'], CstCommentLine);
  }
  constantsDeclarationChildren(): CstConstantsDeclaration[] {
    return this.childrenOfTypes(['constants_declaration', 'constants_declaration_final'], CstConstantsDeclaration);
  }
  consumesListChildren(): CstConsumesList[] {
    return this.childrenOfTypes(['consumes_list', 'consumes_list_final'], CstConsumesList);
  }
  containedByListChildren(): CstContainedByList[] {
    return this.childrenOfTypes(['contained_by_list', 'contained_by_list_final'], CstContainedByList);
  }
  containsListChildren(): CstContainsList[] {
    return this.childrenOfTypes(['contains_list', 'contains_list_final'], CstContainsList);
  }
  containsProgramChildren(): CstContainsProgram[] {
    return this.childrenOfTypes(['contains_program', 'contains_program_final'], CstContainsProgram);
  }
  defaultValueChildren(): CstDefaultValue[] {
    return this.childrenOfTypes(['default_value', 'default_value_final'], CstDefaultValue);
  }
  dependencyDeclarationChildren(): CstDependencyDeclaration[] {
    return this.childrenOfTypes(['dependency_declaration', 'dependency_declaration_final'], CstDependencyDeclaration);
  }
  descriptionLineChildren(): CstDescriptionLine[] {
    return this.childrenOfTypes(['description_line', 'description_line_final'], CstDescriptionLine);
  }
  dtoDeclarationChildren(): CstDtoDeclaration[] {
    return this.childrenOfTypes(['dto_declaration', 'dto_declaration_final'], CstDtoDeclaration);
  }
  dtoFieldChildren(): CstDtoField[] {
    return this.childrenOfTypes(['dto_field', 'dto_field_final'], CstDtoField);
  }
  entityCommentChildren(): CstEntityComment[] {
    return this.childrenOfTypes(['entity_comment', 'entity_comment_final'], CstEntityComment);
  }
  exportListChildren(): CstExportList[] {
    return this.childrenOfTypes(['export_list', 'export_list_final'], CstExportList);
  }
  fileDeclarationChildren(): CstFileDeclaration[] {
    return this.childrenOfTypes(['file_declaration', 'file_declaration_final'], CstFileDeclaration);
  }
  functionDeclarationChildren(): CstFunctionDeclaration[] {
    return this.childrenOfTypes(['function_declaration', 'function_declaration_final'], CstFunctionDeclaration);
  }
  importListChildren(): CstImportList[] {
    return this.childrenOfTypes(['import_list', 'import_list_final'], CstImportList);
  }
  importStatementChildren(): CstImportStatement[] {
    return this.childrenOfTypes(['import_statement', 'import_statement_final'], CstImportStatement);
  }
  inputNameChildren(): CstInputName[] {
    return this.childrenOfTypes(['input_name', 'input_name_final'], CstInputName);
  }
  longformBlockChildren(): CstLongformBlock[] {
    return this.childrenOfTypes(['longform_block'], CstLongformBlock);
  }
  methodsListChildren(): CstMethodsList[] {
    return this.childrenOfTypes(['methods_list', 'methods_list_final'], CstMethodsList);
  }
  outputNameChildren(): CstOutputName[] {
    return this.childrenOfTypes(['output_name', 'output_name_final'], CstOutputName);
  }
  programDeclarationChildren(): CstProgramDeclaration[] {
    return this.childrenOfTypes(['program_declaration', 'program_declaration_final'], CstProgramDeclaration);
  }
  runparameterDeclarationChildren(): CstRunparameterDeclaration[] {
    return this.childrenOfTypes(['runparameter_declaration', 'runparameter_declaration_final'], CstRunparameterDeclaration);
  }
  suppressLineChildren(): CstSuppressLine[] {
    return this.childrenOfTypes(['suppress_line', 'suppress_line_final'], CstSuppressLine);
  }
  suppressionBlockChildren(): CstSuppressionBlock[] {
    return this.childrenOfTypes(['suppression_block'], CstSuppressionBlock);
  }
  typedefDeclarationChildren(): CstTypedefDeclaration[] {
    return this.childrenOfTypes(['typedef_declaration', 'typedef_declaration_final'], CstTypedefDeclaration);
  }
  uicomponentDeclarationChildren(): CstUicomponentDeclaration[] {
    return this.childrenOfTypes(['uicomponent_declaration', 'uicomponent_declaration_final'], CstUicomponentDeclaration);
  }
}

export class CstString extends CstNode {
  static readonly nodeTypes: readonly string[] = ['string'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstString.nodeTypes);
  }
}

export class CstSuppressBlockKw extends CstNode {
  static readonly nodeTypes: readonly string[] = ['suppress_block_kw'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstSuppressBlockKw.nodeTypes);
  }
}

export class CstSuppressKw extends CstNode {
  static readonly nodeTypes: readonly string[] = ['suppress_kw'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstSuppressKw.nodeTypes);
  }
}

export class CstSuppressLine extends CstNode {
  static readonly nodeTypes: readonly string[] = ['suppress_line', 'suppress_line_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstSuppressLine.nodeTypes);
  }
  codeField(): CstCheckCode | undefined {
    const fieldNode = this.syntaxNode.childForFieldName('code');
    if (fieldNode === null) {
      return undefined;
    }
    if (fieldNode.type === 'check_code') {
      return new CstCheckCode(fieldNode);
    }
    return undefined;
  }
  reasonField(): CstString | undefined {
    const fieldNode = this.syntaxNode.childForFieldName('reason');
    if (fieldNode === null) {
      return undefined;
    }
    if (fieldNode.type === 'string') {
      return new CstString(fieldNode);
    }
    return undefined;
  }
  targetField(): CstHeaderNameRest | undefined {
    const fieldNode = this.syntaxNode.childForFieldName('target');
    if (fieldNode === null) {
      return undefined;
    }
    if (fieldNode.type === 'header_name_rest') {
      return new CstHeaderNameRest(fieldNode);
    }
    return undefined;
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  suppressKwChildren(): CstSuppressKw[] {
    return this.childrenOfTypes(['suppress_kw'], CstSuppressKw);
  }
}

export class CstSuppressionBlock extends CstNode {
  static readonly nodeTypes: readonly string[] = ['suppression_block'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstSuppressionBlock.nodeTypes);
  }
  blockCommentLineChildren(): CstBlockCommentLine[] {
    return this.childrenOfTypes(['block_comment_line'], CstBlockCommentLine);
  }
  suppressBlockKwChildren(): CstSuppressBlockKw[] {
    return this.childrenOfTypes(['suppress_block_kw'], CstSuppressBlockKw);
  }
  suppressionEntryChildren(): CstSuppressionEntry[] {
    return this.childrenOfTypes(['suppression_entry'], CstSuppressionEntry);
  }
}

export class CstSuppressionEntry extends CstNode {
  static readonly nodeTypes: readonly string[] = ['suppression_entry'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstSuppressionEntry.nodeTypes);
  }
  codeField(): CstCheckCode | undefined {
    const fieldNode = this.syntaxNode.childForFieldName('code');
    if (fieldNode === null) {
      return undefined;
    }
    if (fieldNode.type === 'check_code') {
      return new CstCheckCode(fieldNode);
    }
    return undefined;
  }
  reasonField(): CstString | undefined {
    const fieldNode = this.syntaxNode.childForFieldName('reason');
    if (fieldNode === null) {
      return undefined;
    }
    if (fieldNode.type === 'string') {
      return new CstString(fieldNode);
    }
    return undefined;
  }
  targetField(): CstEntityName | undefined {
    const fieldNode = this.syntaxNode.childForFieldName('target');
    if (fieldNode === null) {
      return undefined;
    }
    if (fieldNode.type === 'entity_name') {
      return new CstEntityName(fieldNode);
    }
    return undefined;
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
}

export class CstTypeAtom extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_atom'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeAtom.nodeTypes);
  }
  typeExprChildren(): CstTypeExpr[] {
    return this.childrenOfTypes(['type_expr'], CstTypeExpr);
  }
  typeGenericChildren(): CstTypeGeneric[] {
    return this.childrenOfTypes(['type_generic'], CstTypeGeneric);
  }
  typeLiteralNumberChildren(): CstTypeLiteralNumber[] {
    return this.childrenOfTypes(['type_literal_number'], CstTypeLiteralNumber);
  }
  typeLiteralStringChildren(): CstTypeLiteralString[] {
    return this.childrenOfTypes(['type_literal_string'], CstTypeLiteralString);
  }
  typeNamedChildren(): CstTypeNamed[] {
    return this.childrenOfTypes(['type_named'], CstTypeNamed);
  }
  typeOpaqueChildren(): CstTypeOpaque[] {
    return this.childrenOfTypes(['type_opaque'], CstTypeOpaque);
  }
  typeReadonlyArrayChildren(): CstTypeReadonlyArray[] {
    return this.childrenOfTypes(['type_readonly_array'], CstTypeReadonlyArray);
  }
}

export class CstTypeExpr extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_expr'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeExpr.nodeTypes);
  }
  typeUnionChildren(): CstTypeUnion[] {
    return this.childrenOfTypes(['type_union'], CstTypeUnion);
  }
}

export class CstTypeGeneric extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_generic'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeGeneric.nodeTypes);
  }
  baseField(): CstTypeNamed | undefined {
    const fieldNode = this.syntaxNode.childForFieldName('base');
    if (fieldNode === null) {
      return undefined;
    }
    if (fieldNode.type === 'type_named') {
      return new CstTypeNamed(fieldNode);
    }
    return undefined;
  }
  typeExprChildren(): CstTypeExpr[] {
    return this.childrenOfTypes(['type_expr'], CstTypeExpr);
  }
}

export class CstTypeIntersection extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_intersection'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeIntersection.nodeTypes);
  }
  typePostfixChildren(): CstTypePostfix[] {
    return this.childrenOfTypes(['type_postfix'], CstTypePostfix);
  }
}

export class CstTypeLiteralNumber extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_literal_number'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeLiteralNumber.nodeTypes);
  }
}

export class CstTypeLiteralString extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_literal_string'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeLiteralString.nodeTypes);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstTypeNamed extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_named'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeNamed.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
}

export class CstTypeOpaque extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_opaque'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeOpaque.nodeTypes);
  }
}

export class CstTypePostfix extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_postfix'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypePostfix.nodeTypes);
  }
  typeAtomChildren(): CstTypeAtom[] {
    return this.childrenOfTypes(['type_atom'], CstTypeAtom);
  }
}

export class CstTypeReadonlyArray extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_readonly_array'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeReadonlyArray.nodeTypes);
  }
  elementField(): CstReadonlyBraceRest | CstReadonlyNameRest | CstReadonlyParenRest | undefined {
    const fieldNode = this.syntaxNode.childForFieldName('element');
    if (fieldNode === null) {
      return undefined;
    }
    if (fieldNode.type === 'readonly_brace_rest') {
      return new CstReadonlyBraceRest(fieldNode);
    }
    if (fieldNode.type === 'readonly_name_rest') {
      return new CstReadonlyNameRest(fieldNode);
    }
    if (fieldNode.type === 'readonly_paren_rest') {
      return new CstReadonlyParenRest(fieldNode);
    }
    return undefined;
  }
  readonlyKwChildren(): CstReadonlyKw[] {
    return this.childrenOfTypes(['readonly_kw'], CstReadonlyKw);
  }
}

export class CstTypeUnion extends CstNode {
  static readonly nodeTypes: readonly string[] = ['type_union'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypeUnion.nodeTypes);
  }
  typeIntersectionChildren(): CstTypeIntersection[] {
    return this.childrenOfTypes(['type_intersection'], CstTypeIntersection);
  }
}

export class CstTypedefDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['typedef_declaration', 'typedef_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypedefDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  typeExprChildren(): CstTypeExpr[] {
    return this.childrenOfTypes(['type_expr'], CstTypeExpr);
  }
  typedefEnumVariantChildren(): CstTypedefEnumVariant[] {
    return this.childrenOfTypes(['typedef_enum_variant'], CstTypedefEnumVariant);
  }
}

export class CstTypedefEnumVariant extends CstNode {
  static readonly nodeTypes: readonly string[] = ['typedef_enum_variant'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstTypedefEnumVariant.nodeTypes);
  }
  enumKwChildren(): CstEnumKw[] {
    return this.childrenOfTypes(['enum_kw'], CstEnumKw);
  }
  listEntryChildren(): CstListEntry[] {
    return this.childrenOfTypes(['list_entry'], CstListEntry);
  }
}

export class CstUicomponentDeclaration extends CstNode {
  static readonly nodeTypes: readonly string[] = ['uicomponent_declaration', 'uicomponent_declaration_final'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstUicomponentDeclaration.nodeTypes);
  }
  entityNameChildren(): CstEntityName[] {
    return this.childrenOfTypes(['entity_name'], CstEntityName);
  }
  inlineCommentChildren(): CstInlineComment[] {
    return this.childrenOfTypes(['inline_comment'], CstInlineComment);
  }
  stringChildren(): CstString[] {
    return this.childrenOfTypes(['string'], CstString);
  }
}

export class CstVersion extends CstNode {
  static readonly nodeTypes: readonly string[] = ['version'];
  constructor(syntaxNode: SyntaxNode) {
    super(syntaxNode, CstVersion.nodeTypes);
  }
}

export type CstNamedNode =
  | CstAffectsList
  | CstAssetDeclaration
  | CstBlockCommentLine
  | CstBlockHeader
  | CstBlockKw
  | CstBlockProperty
  | CstBoolLiteral
  | CstCallsList
  | CstCheckCode
  | CstClassDeclaration
  | CstClassfileBlockSigil
  | CstClassfileDeclaration
  | CstComment
  | CstCommentLine
  | CstConstantsDeclaration
  | CstConsumesList
  | CstContainedByList
  | CstContainsList
  | CstContainsProgram
  | CstDefaultValue
  | CstDependencyDeclaration
  | CstDependencyName
  | CstDescriptionLine
  | CstDtoDeclaration
  | CstDtoField
  | CstDtoFieldBlock
  | CstDtoFieldInline
  | CstDtoFieldsBlock
  | CstEntityComment
  | CstEntityName
  | CstEnumKw
  | CstExportList
  | CstFieldName
  | CstFieldType
  | CstFileDeclaration
  | CstFreetextValue
  | CstFunctionDeclaration
  | CstHeaderNameRest
  | CstHeaderQuotedName
  | CstImportHead
  | CstImportList
  | CstImportStatement
  | CstInheritList
  | CstInlineComment
  | CstInlineFieldPair
  | CstInputName
  | CstListEntry
  | CstLongformBlock
  | CstMethodsList
  | CstNameList
  | CstOptionalMarker
  | CstOutputName
  | CstParamMarker
  | CstParamType
  | CstPath
  | CstProgramDeclaration
  | CstPropertyBool
  | CstPropertyFreetext
  | CstPropertyIdentifier
  | CstPropertyKey
  | CstPropertyList
  | CstPropertyNestedBlock
  | CstPropertyString
  | CstReadonlyBraceRest
  | CstReadonlyKw
  | CstReadonlyNameRest
  | CstReadonlyParenRest
  | CstRunparameterDeclaration
  | CstSignature
  | CstSourceFile
  | CstString
  | CstSuppressBlockKw
  | CstSuppressKw
  | CstSuppressLine
  | CstSuppressionBlock
  | CstSuppressionEntry
  | CstTypeAtom
  | CstTypeExpr
  | CstTypeGeneric
  | CstTypeIntersection
  | CstTypeLiteralNumber
  | CstTypeLiteralString
  | CstTypeNamed
  | CstTypeOpaque
  | CstTypePostfix
  | CstTypeReadonlyArray
  | CstTypeUnion
  | CstTypedefDeclaration
  | CstTypedefEnumVariant
  | CstUicomponentDeclaration
  | CstVersion;

export const cstNodeClassByType: ReadonlyMap<string, new (syntaxNode: SyntaxNode) => CstNamedNode> = new Map<
  string,
  new (
    syntaxNode: SyntaxNode,
  ) => CstNamedNode
>([
  ['affects_list', CstAffectsList],
  ['affects_list_final', CstAffectsList],
  ['asset_declaration', CstAssetDeclaration],
  ['asset_declaration_final', CstAssetDeclaration],
  ['block_comment_line', CstBlockCommentLine],
  ['block_header', CstBlockHeader],
  ['block_kw', CstBlockKw],
  ['block_property', CstBlockProperty],
  ['bool_literal', CstBoolLiteral],
  ['calls_list', CstCallsList],
  ['calls_list_final', CstCallsList],
  ['check_code', CstCheckCode],
  ['class_declaration', CstClassDeclaration],
  ['class_declaration_final', CstClassDeclaration],
  ['classfile_block_sigil', CstClassfileBlockSigil],
  ['classfile_declaration', CstClassfileDeclaration],
  ['classfile_declaration_final', CstClassfileDeclaration],
  ['comment', CstComment],
  ['comment_line', CstCommentLine],
  ['comment_line_final', CstCommentLine],
  ['constants_declaration', CstConstantsDeclaration],
  ['constants_declaration_final', CstConstantsDeclaration],
  ['consumes_list', CstConsumesList],
  ['consumes_list_final', CstConsumesList],
  ['contained_by_list', CstContainedByList],
  ['contained_by_list_final', CstContainedByList],
  ['contains_list', CstContainsList],
  ['contains_list_final', CstContainsList],
  ['contains_program', CstContainsProgram],
  ['contains_program_final', CstContainsProgram],
  ['default_value', CstDefaultValue],
  ['default_value_final', CstDefaultValue],
  ['dependency_declaration', CstDependencyDeclaration],
  ['dependency_declaration_final', CstDependencyDeclaration],
  ['dependency_name', CstDependencyName],
  ['description_line', CstDescriptionLine],
  ['description_line_final', CstDescriptionLine],
  ['dto_declaration', CstDtoDeclaration],
  ['dto_declaration_final', CstDtoDeclaration],
  ['dto_field', CstDtoField],
  ['dto_field_block', CstDtoFieldBlock],
  ['dto_field_final', CstDtoField],
  ['dto_field_inline', CstDtoFieldInline],
  ['dto_fields_block', CstDtoFieldsBlock],
  ['entity_comment', CstEntityComment],
  ['entity_comment_final', CstEntityComment],
  ['entity_name', CstEntityName],
  ['enum_kw', CstEnumKw],
  ['export_list', CstExportList],
  ['export_list_final', CstExportList],
  ['field_name', CstFieldName],
  ['field_type', CstFieldType],
  ['file_declaration', CstFileDeclaration],
  ['file_declaration_final', CstFileDeclaration],
  ['freetext_value', CstFreetextValue],
  ['function_declaration', CstFunctionDeclaration],
  ['function_declaration_final', CstFunctionDeclaration],
  ['header_name_rest', CstHeaderNameRest],
  ['header_quoted_name', CstHeaderQuotedName],
  ['import_head', CstImportHead],
  ['import_list', CstImportList],
  ['import_list_final', CstImportList],
  ['import_statement', CstImportStatement],
  ['import_statement_final', CstImportStatement],
  ['inherit_list', CstInheritList],
  ['inline_comment', CstInlineComment],
  ['inline_field_pair', CstInlineFieldPair],
  ['input_name', CstInputName],
  ['input_name_final', CstInputName],
  ['list_entry', CstListEntry],
  ['longform_block', CstLongformBlock],
  ['methods_list', CstMethodsList],
  ['methods_list_final', CstMethodsList],
  ['name_list', CstNameList],
  ['optional_marker', CstOptionalMarker],
  ['output_name', CstOutputName],
  ['output_name_final', CstOutputName],
  ['param_marker', CstParamMarker],
  ['param_type', CstParamType],
  ['path', CstPath],
  ['program_declaration', CstProgramDeclaration],
  ['program_declaration_final', CstProgramDeclaration],
  ['property_bool', CstPropertyBool],
  ['property_freetext', CstPropertyFreetext],
  ['property_identifier', CstPropertyIdentifier],
  ['property_key', CstPropertyKey],
  ['property_list', CstPropertyList],
  ['property_nested_block', CstPropertyNestedBlock],
  ['property_string', CstPropertyString],
  ['readonly_brace_rest', CstReadonlyBraceRest],
  ['readonly_kw', CstReadonlyKw],
  ['readonly_name_rest', CstReadonlyNameRest],
  ['readonly_paren_rest', CstReadonlyParenRest],
  ['runparameter_declaration', CstRunparameterDeclaration],
  ['runparameter_declaration_final', CstRunparameterDeclaration],
  ['signature', CstSignature],
  ['source_file', CstSourceFile],
  ['string', CstString],
  ['suppress_block_kw', CstSuppressBlockKw],
  ['suppress_kw', CstSuppressKw],
  ['suppress_line', CstSuppressLine],
  ['suppress_line_final', CstSuppressLine],
  ['suppression_block', CstSuppressionBlock],
  ['suppression_entry', CstSuppressionEntry],
  ['type_atom', CstTypeAtom],
  ['type_expr', CstTypeExpr],
  ['type_generic', CstTypeGeneric],
  ['type_intersection', CstTypeIntersection],
  ['type_literal_number', CstTypeLiteralNumber],
  ['type_literal_string', CstTypeLiteralString],
  ['type_named', CstTypeNamed],
  ['type_opaque', CstTypeOpaque],
  ['type_postfix', CstTypePostfix],
  ['type_readonly_array', CstTypeReadonlyArray],
  ['type_union', CstTypeUnion],
  ['typedef_declaration', CstTypedefDeclaration],
  ['typedef_declaration_final', CstTypedefDeclaration],
  ['typedef_enum_variant', CstTypedefEnumVariant],
  ['uicomponent_declaration', CstUicomponentDeclaration],
  ['uicomponent_declaration_final', CstUicomponentDeclaration],
  ['version', CstVersion],
]);

export const wrapCstNode = (syntaxNode: SyntaxNode): CstNamedNode | undefined => {
  const wrapperClass = cstNodeClassByType.get(syntaxNode.type);
  if (wrapperClass === undefined) {
    return undefined;
  }
  return new wrapperClass(syntaxNode);
};
