#!/usr/bin/env node
"use strict";
var __create2 = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __getProtoOf2 = Object.getPrototypeOf;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __commonJS2 = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps2 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames2(from))
      if (!__hasOwnProp2.call(to, key) && key !== except)
        __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../typed-mind/dist/ast/entity-node.js
var require_entity_node = __commonJS2({
  "../typed-mind/dist/ast/entity-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EntityNode = void 0;
    var EntityNode = class {
      name;
      span;
      raw;
      comment;
      sourceForm;
      // Explicit field assignment (not constructor parameter properties):
      // parameter properties are non-erasable syntax. Assign-only, no side effects.
      constructor(args2) {
        this.name = args2.name;
        this.span = args2.span;
        this.raw = args2.raw;
        this.comment = args2.comment;
        this.sourceForm = args2.sourceForm;
      }
    };
    exports2.EntityNode = EntityNode;
  }
});

// ../typed-mind/dist/ast/asset-node.js
var require_asset_node = __commonJS2({
  "../typed-mind/dist/ast/asset-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AssetNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var AssetNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "Asset";
      description;
      containsProgram;
      constructor(args2) {
        super(args2);
        this.description = args2.description;
        this.containsProgram = args2.containsProgram;
      }
    };
    exports2.AssetNode = AssetNode2;
  }
});

// ../typed-mind/dist/ast/class-file-node.js
var require_class_file_node = __commonJS2({
  "../typed-mind/dist/ast/class-file-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ClassFileNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var ClassFileNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "ClassFile";
      path;
      implements;
      methods;
      imports;
      exports;
      extends;
      purpose;
      constructor(args2) {
        super(args2);
        this.path = args2.path;
        this.implements = args2.implements;
        this.methods = args2.methods;
        this.imports = args2.imports;
        this.exports = args2.exports.includes(args2.name) ? args2.exports : [...args2.exports, args2.name];
        this.extends = args2.extends;
        this.purpose = args2.purpose;
      }
    };
    exports2.ClassFileNode = ClassFileNode2;
  }
});

// ../typed-mind/dist/ast/class-node.js
var require_class_node = __commonJS2({
  "../typed-mind/dist/ast/class-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ClassNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var ClassNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "Class";
      implements;
      methods;
      extends;
      purpose;
      constructor(args2) {
        super(args2);
        this.implements = args2.implements;
        this.methods = args2.methods;
        this.extends = args2.extends;
        this.purpose = args2.purpose;
      }
    };
    exports2.ClassNode = ClassNode2;
  }
});

// ../typed-mind/dist/ast/constants-node.js
var require_constants_node = __commonJS2({
  "../typed-mind/dist/ast/constants-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConstantsNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var ConstantsNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "Constants";
      path;
      schema;
      purpose;
      constructor(args2) {
        super(args2);
        this.path = args2.path;
        this.schema = args2.schema;
        this.purpose = args2.purpose;
      }
    };
    exports2.ConstantsNode = ConstantsNode2;
  }
});

// ../typed-mind/dist/ast/dependency-node.js
var require_dependency_node = __commonJS2({
  "../typed-mind/dist/ast/dependency-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DependencyNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var DependencyNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "Dependency";
      purpose;
      version;
      exports;
      constructor(args2) {
        super(args2);
        this.purpose = args2.purpose;
        this.version = args2.version;
        this.exports = args2.exports;
      }
    };
    exports2.DependencyNode = DependencyNode2;
  }
});

// ../typed-mind/dist/ast/dto-field-node.js
var require_dto_field_node = __commonJS2({
  "../typed-mind/dist/ast/dto-field-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DtoFieldNode = void 0;
    var DtoFieldNode = class {
      name;
      type;
      typeExpr;
      optionalityMarker;
      description;
      span;
      constructor(args2) {
        this.name = args2.name;
        this.type = args2.type;
        this.typeExpr = args2.typeExpr;
        this.optionalityMarker = args2.optionalityMarker;
        this.description = args2.description;
        this.span = args2.span;
      }
      // Derived view preserving legacy consumer ergonomics (doc §2.2 footnote).
      get isOptional() {
        return this.optionalityMarker !== "none";
      }
    };
    exports2.DtoFieldNode = DtoFieldNode;
  }
});

// ../typed-mind/dist/ast/dto-node.js
var require_dto_node = __commonJS2({
  "../typed-mind/dist/ast/dto-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DtoNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var DtoNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "DTO";
      fields;
      purpose;
      constructor(args2) {
        super(args2);
        this.fields = args2.fields;
        this.purpose = args2.purpose;
      }
    };
    exports2.DtoNode = DtoNode2;
  }
});

// ../typed-mind/dist/ast/file-node.js
var require_file_node = __commonJS2({
  "../typed-mind/dist/ast/file-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var FileNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "File";
      path;
      imports;
      exports;
      purpose;
      constructor(args2) {
        super(args2);
        this.path = args2.path;
        this.imports = args2.imports;
        this.exports = args2.exports;
        this.purpose = args2.purpose;
      }
    };
    exports2.FileNode = FileNode2;
  }
});

// ../typed-mind/dist/ast/function-node.js
var require_function_node = __commonJS2({
  "../typed-mind/dist/ast/function-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FunctionNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var FunctionNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "Function";
      signature;
      calls;
      pendingDependencies;
      description;
      input;
      output;
      affects;
      consumes;
      constructor(args2) {
        super(args2);
        this.signature = args2.signature;
        this.calls = args2.calls;
        this.pendingDependencies = args2.pendingDependencies;
        this.description = args2.description;
        this.input = args2.input;
        this.output = args2.output;
        this.affects = args2.affects;
        this.consumes = args2.consumes;
      }
    };
    exports2.FunctionNode = FunctionNode2;
  }
});

// ../typed-mind/dist/ast/gen/cst-nodes.js
var require_cst_nodes = __commonJS2({
  "../typed-mind/dist/ast/gen/cst-nodes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CstInputName = exports2.CstInlineFieldPair = exports2.CstInlineComment = exports2.CstInheritList = exports2.CstImportStatement = exports2.CstImportList = exports2.CstImportHead = exports2.CstHeaderQuotedName = exports2.CstHeaderNameRest = exports2.CstFunctionDeclaration = exports2.CstFreetextValue = exports2.CstFileDeclaration = exports2.CstFieldType = exports2.CstFieldName = exports2.CstExportList = exports2.CstEnumKw = exports2.CstEntityName = exports2.CstEntityComment = exports2.CstDtoFieldsBlock = exports2.CstDtoFieldInline = exports2.CstDtoFieldBlock = exports2.CstDtoField = exports2.CstDtoDeclaration = exports2.CstDescriptionLine = exports2.CstDependencyName = exports2.CstDependencyDeclaration = exports2.CstDefaultValue = exports2.CstContainsProgram = exports2.CstContainsList = exports2.CstContainedByList = exports2.CstConsumesList = exports2.CstConstantsDeclaration = exports2.CstCommentLine = exports2.CstComment = exports2.CstClassfileDeclaration = exports2.CstClassfileBlockSigil = exports2.CstClassDeclaration = exports2.CstCheckCode = exports2.CstCallsList = exports2.CstBoolLiteral = exports2.CstBlockProperty = exports2.CstBlockKw = exports2.CstBlockHeader = exports2.CstBlockCommentLine = exports2.CstAssetDeclaration = exports2.CstAffectsList = exports2.CstNode = exports2.CST_LOGICAL_CLASS_COUNT = exports2.CST_FINAL_TWIN_COUNT = exports2.CST_NAMED_NODE_TYPE_COUNT = void 0;
    exports2.wrapCstNode = exports2.cstNodeClassByType = exports2.CstVersion = exports2.CstUicomponentDeclaration = exports2.CstTypedefEnumVariant = exports2.CstTypedefDeclaration = exports2.CstTypeUnion = exports2.CstTypeReadonlyArray = exports2.CstTypePostfix = exports2.CstTypeOpaque = exports2.CstTypeNamed = exports2.CstTypeLiteralString = exports2.CstTypeLiteralNumber = exports2.CstTypeIntersection = exports2.CstTypeGeneric = exports2.CstTypeExpr = exports2.CstTypeAtom = exports2.CstSuppressionEntry = exports2.CstSuppressionBlock = exports2.CstSuppressLine = exports2.CstSuppressKw = exports2.CstSuppressBlockKw = exports2.CstString = exports2.CstSourceFile = exports2.CstSignature = exports2.CstRunparameterDeclaration = exports2.CstReadonlyParenRest = exports2.CstReadonlyNameRest = exports2.CstReadonlyKw = exports2.CstReadonlyBraceRest = exports2.CstPropertyString = exports2.CstPropertyNestedBlock = exports2.CstPropertyList = exports2.CstPropertyKey = exports2.CstPropertyIdentifier = exports2.CstPropertyFreetext = exports2.CstPropertyBool = exports2.CstProgramDeclaration = exports2.CstPath = exports2.CstParamType = exports2.CstParamMarker = exports2.CstOutputName = exports2.CstOptionalMarker = exports2.CstNameList = exports2.CstMethodsList = exports2.CstLongformBlock = exports2.CstListEntry = void 0;
    exports2.CST_NAMED_NODE_TYPE_COUNT = 121;
    exports2.CST_FINAL_TWIN_COUNT = 30;
    exports2.CST_LOGICAL_CLASS_COUNT = 91;
    var spanOf = (syntaxNode) => ({
      start: { line: syntaxNode.startPosition.row + 1, column: syntaxNode.startPosition.column + 1 },
      end: { line: syntaxNode.endPosition.row + 1, column: syntaxNode.endPosition.column + 1 }
    });
    var CstNode = class {
      // Explicit field assignment (not a constructor parameter property): parameter
      // properties are non-erasable syntax and break Node's strip-only execution.
      syntaxNode;
      constructor(syntaxNode, expectedTypes) {
        if (!expectedTypes.includes(syntaxNode.type)) {
          throw new Error(`CST wrapper type mismatch: expected ${expectedTypes.join(" | ")}, got ${syntaxNode.type}`);
        }
        this.syntaxNode = syntaxNode;
      }
      get text() {
        return this.syntaxNode.text;
      }
      get isFinal() {
        return this.syntaxNode.type.endsWith("_final");
      }
      span() {
        return spanOf(this.syntaxNode);
      }
      namedChildNodes() {
        const wrapped = [];
        for (const child of this.syntaxNode.namedChildren) {
          const wrappedChild = (0, exports2.wrapCstNode)(child);
          if (wrappedChild !== void 0) {
            wrapped.push(wrappedChild);
          }
        }
        return wrapped;
      }
      childrenOfTypes(concreteTypes, wrapperClass) {
        const collected = [];
        for (const child of this.syntaxNode.namedChildren) {
          if (concreteTypes.includes(child.type)) {
            collected.push(new wrapperClass(child));
          }
        }
        return collected;
      }
    };
    exports2.CstNode = CstNode;
    var CstAffectsList = class _CstAffectsList extends CstNode {
      static nodeTypes = ["affects_list", "affects_list_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstAffectsList.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      nameListChildren() {
        return this.childrenOfTypes(["name_list"], CstNameList);
      }
    };
    exports2.CstAffectsList = CstAffectsList;
    var CstAssetDeclaration = class _CstAssetDeclaration extends CstNode {
      static nodeTypes = ["asset_declaration", "asset_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstAssetDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstAssetDeclaration = CstAssetDeclaration;
    var CstBlockCommentLine = class _CstBlockCommentLine extends CstNode {
      static nodeTypes = ["block_comment_line"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstBlockCommentLine.nodeTypes);
      }
      commentChildren() {
        return this.childrenOfTypes(["comment"], CstComment);
      }
    };
    exports2.CstBlockCommentLine = CstBlockCommentLine;
    var CstBlockHeader = class _CstBlockHeader extends CstNode {
      static nodeTypes = ["block_header"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstBlockHeader.nodeTypes);
      }
      nameField() {
        const fieldNode = this.syntaxNode.childForFieldName("name");
        if (fieldNode === null) {
          return void 0;
        }
        if (fieldNode.type === "header_name_rest") {
          return new CstHeaderNameRest(fieldNode);
        }
        if (fieldNode.type === "header_quoted_name") {
          return new CstHeaderQuotedName(fieldNode);
        }
        return void 0;
      }
      blockKwChildren() {
        return this.childrenOfTypes(["block_kw"], CstBlockKw);
      }
      headerName() {
        const nameField = this.nameField();
        if (nameField instanceof CstHeaderQuotedName) {
          return nameField.text.slice(0, -1);
        }
        const keywordText = this.blockKwChildren().at(0)?.text ?? "";
        const lastKeywordCharacter = keywordText.slice(-1);
        if (nameField === void 0) {
          return lastKeywordCharacter;
        }
        return lastKeywordCharacter + nameField.text;
      }
    };
    exports2.CstBlockHeader = CstBlockHeader;
    var CstBlockKw = class _CstBlockKw extends CstNode {
      static nodeTypes = ["block_kw"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstBlockKw.nodeTypes);
      }
    };
    exports2.CstBlockKw = CstBlockKw;
    var CstBlockProperty = class _CstBlockProperty extends CstNode {
      static nodeTypes = ["block_property"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstBlockProperty.nodeTypes);
      }
      dtoFieldInlineChildren() {
        return this.childrenOfTypes(["dto_field_inline"], CstDtoFieldInline);
      }
      dtoFieldsBlockChildren() {
        return this.childrenOfTypes(["dto_fields_block"], CstDtoFieldsBlock);
      }
      propertyBoolChildren() {
        return this.childrenOfTypes(["property_bool"], CstPropertyBool);
      }
      propertyFreetextChildren() {
        return this.childrenOfTypes(["property_freetext"], CstPropertyFreetext);
      }
      propertyIdentifierChildren() {
        return this.childrenOfTypes(["property_identifier"], CstPropertyIdentifier);
      }
      propertyListChildren() {
        return this.childrenOfTypes(["property_list"], CstPropertyList);
      }
      propertyNestedBlockChildren() {
        return this.childrenOfTypes(["property_nested_block"], CstPropertyNestedBlock);
      }
      propertyStringChildren() {
        return this.childrenOfTypes(["property_string"], CstPropertyString);
      }
    };
    exports2.CstBlockProperty = CstBlockProperty;
    var CstBoolLiteral = class _CstBoolLiteral extends CstNode {
      static nodeTypes = ["bool_literal"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstBoolLiteral.nodeTypes);
      }
    };
    exports2.CstBoolLiteral = CstBoolLiteral;
    var CstCallsList = class _CstCallsList extends CstNode {
      static nodeTypes = ["calls_list", "calls_list_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstCallsList.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      nameListChildren() {
        return this.childrenOfTypes(["name_list"], CstNameList);
      }
    };
    exports2.CstCallsList = CstCallsList;
    var CstCheckCode = class _CstCheckCode extends CstNode {
      static nodeTypes = ["check_code"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstCheckCode.nodeTypes);
      }
    };
    exports2.CstCheckCode = CstCheckCode;
    var CstClassDeclaration = class _CstClassDeclaration extends CstNode {
      static nodeTypes = ["class_declaration", "class_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstClassDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inheritListChildren() {
        return this.childrenOfTypes(["inherit_list"], CstInheritList);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
    };
    exports2.CstClassDeclaration = CstClassDeclaration;
    var CstClassfileBlockSigil = class _CstClassfileBlockSigil extends CstNode {
      static nodeTypes = ["classfile_block_sigil"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstClassfileBlockSigil.nodeTypes);
      }
      blockCommentLineChildren() {
        return this.childrenOfTypes(["block_comment_line"], CstBlockCommentLine);
      }
      blockPropertyChildren() {
        return this.childrenOfTypes(["block_property"], CstBlockProperty);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inheritListChildren() {
        return this.childrenOfTypes(["inherit_list"], CstInheritList);
      }
      pathChildren() {
        return this.childrenOfTypes(["path"], CstPath);
      }
    };
    exports2.CstClassfileBlockSigil = CstClassfileBlockSigil;
    var CstClassfileDeclaration = class _CstClassfileDeclaration extends CstNode {
      static nodeTypes = ["classfile_declaration", "classfile_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstClassfileDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inheritListChildren() {
        return this.childrenOfTypes(["inherit_list"], CstInheritList);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      pathChildren() {
        return this.childrenOfTypes(["path"], CstPath);
      }
    };
    exports2.CstClassfileDeclaration = CstClassfileDeclaration;
    var CstComment = class _CstComment extends CstNode {
      static nodeTypes = ["comment"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstComment.nodeTypes);
      }
    };
    exports2.CstComment = CstComment;
    var CstCommentLine = class _CstCommentLine extends CstNode {
      static nodeTypes = ["comment_line", "comment_line_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstCommentLine.nodeTypes);
      }
      commentChildren() {
        return this.childrenOfTypes(["comment"], CstComment);
      }
    };
    exports2.CstCommentLine = CstCommentLine;
    var CstConstantsDeclaration = class _CstConstantsDeclaration extends CstNode {
      static nodeTypes = ["constants_declaration", "constants_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstConstantsDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      pathChildren() {
        return this.childrenOfTypes(["path"], CstPath);
      }
    };
    exports2.CstConstantsDeclaration = CstConstantsDeclaration;
    var CstConsumesList = class _CstConsumesList extends CstNode {
      static nodeTypes = ["consumes_list", "consumes_list_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstConsumesList.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      nameListChildren() {
        return this.childrenOfTypes(["name_list"], CstNameList);
      }
    };
    exports2.CstConsumesList = CstConsumesList;
    var CstContainedByList = class _CstContainedByList extends CstNode {
      static nodeTypes = ["contained_by_list", "contained_by_list_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstContainedByList.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      nameListChildren() {
        return this.childrenOfTypes(["name_list"], CstNameList);
      }
    };
    exports2.CstContainedByList = CstContainedByList;
    var CstContainsList = class _CstContainsList extends CstNode {
      static nodeTypes = ["contains_list", "contains_list_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstContainsList.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      nameListChildren() {
        return this.childrenOfTypes(["name_list"], CstNameList);
      }
    };
    exports2.CstContainsList = CstContainsList;
    var CstContainsProgram = class _CstContainsProgram extends CstNode {
      static nodeTypes = ["contains_program", "contains_program_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstContainsProgram.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
    };
    exports2.CstContainsProgram = CstContainsProgram;
    var CstDefaultValue = class _CstDefaultValue extends CstNode {
      static nodeTypes = ["default_value", "default_value_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstDefaultValue.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstDefaultValue = CstDefaultValue;
    var CstDependencyDeclaration = class _CstDependencyDeclaration extends CstNode {
      static nodeTypes = ["dependency_declaration", "dependency_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstDependencyDeclaration.nodeTypes);
      }
      dependencyNameChildren() {
        return this.childrenOfTypes(["dependency_name"], CstDependencyName);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
      versionChildren() {
        return this.childrenOfTypes(["version"], CstVersion);
      }
    };
    exports2.CstDependencyDeclaration = CstDependencyDeclaration;
    var CstDependencyName = class _CstDependencyName extends CstNode {
      static nodeTypes = ["dependency_name"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstDependencyName.nodeTypes);
      }
    };
    exports2.CstDependencyName = CstDependencyName;
    var CstDescriptionLine = class _CstDescriptionLine extends CstNode {
      static nodeTypes = ["description_line", "description_line_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstDescriptionLine.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstDescriptionLine = CstDescriptionLine;
    var CstDtoDeclaration = class _CstDtoDeclaration extends CstNode {
      static nodeTypes = ["dto_declaration", "dto_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstDtoDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstDtoDeclaration = CstDtoDeclaration;
    var CstDtoField = class _CstDtoField extends CstNode {
      static nodeTypes = ["dto_field", "dto_field_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstDtoField.nodeTypes);
      }
      fieldNameChildren() {
        return this.childrenOfTypes(["field_name"], CstFieldName);
      }
      fieldTypeChildren() {
        return this.childrenOfTypes(["field_type"], CstFieldType);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      optionalMarkerChildren() {
        return this.childrenOfTypes(["optional_marker"], CstOptionalMarker);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstDtoField = CstDtoField;
    var CstDtoFieldBlock = class _CstDtoFieldBlock extends CstNode {
      static nodeTypes = ["dto_field_block"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstDtoFieldBlock.nodeTypes);
      }
      blockCommentLineChildren() {
        return this.childrenOfTypes(["block_comment_line"], CstBlockCommentLine);
      }
      blockPropertyChildren() {
        return this.childrenOfTypes(["block_property"], CstBlockProperty);
      }
      dtoFieldInlineChildren() {
        return this.childrenOfTypes(["dto_field_inline"], CstDtoFieldInline);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
    };
    exports2.CstDtoFieldBlock = CstDtoFieldBlock;
    var CstDtoFieldInline = class _CstDtoFieldInline extends CstNode {
      static nodeTypes = ["dto_field_inline"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstDtoFieldInline.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      inlineFieldPairChildren() {
        return this.childrenOfTypes(["inline_field_pair"], CstInlineFieldPair);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
    };
    exports2.CstDtoFieldInline = CstDtoFieldInline;
    var CstDtoFieldsBlock = class _CstDtoFieldsBlock extends CstNode {
      static nodeTypes = ["dto_fields_block"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstDtoFieldsBlock.nodeTypes);
      }
      blockCommentLineChildren() {
        return this.childrenOfTypes(["block_comment_line"], CstBlockCommentLine);
      }
      dtoFieldBlockChildren() {
        return this.childrenOfTypes(["dto_field_block"], CstDtoFieldBlock);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
    };
    exports2.CstDtoFieldsBlock = CstDtoFieldsBlock;
    var CstEntityComment = class _CstEntityComment extends CstNode {
      static nodeTypes = ["entity_comment", "entity_comment_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstEntityComment.nodeTypes);
      }
      commentChildren() {
        return this.childrenOfTypes(["comment"], CstComment);
      }
    };
    exports2.CstEntityComment = CstEntityComment;
    var CstEntityName = class _CstEntityName extends CstNode {
      static nodeTypes = ["entity_name"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstEntityName.nodeTypes);
      }
    };
    exports2.CstEntityName = CstEntityName;
    var CstEnumKw = class _CstEnumKw extends CstNode {
      static nodeTypes = ["enum_kw"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstEnumKw.nodeTypes);
      }
    };
    exports2.CstEnumKw = CstEnumKw;
    var CstExportList = class _CstExportList extends CstNode {
      static nodeTypes = ["export_list", "export_list_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstExportList.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      nameListChildren() {
        return this.childrenOfTypes(["name_list"], CstNameList);
      }
    };
    exports2.CstExportList = CstExportList;
    var CstFieldName = class _CstFieldName extends CstNode {
      static nodeTypes = ["field_name"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstFieldName.nodeTypes);
      }
    };
    exports2.CstFieldName = CstFieldName;
    var CstFieldType = class _CstFieldType extends CstNode {
      static nodeTypes = ["field_type"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstFieldType.nodeTypes);
      }
      typeExprChildren() {
        return this.childrenOfTypes(["type_expr"], CstTypeExpr);
      }
    };
    exports2.CstFieldType = CstFieldType;
    var CstFileDeclaration = class _CstFileDeclaration extends CstNode {
      static nodeTypes = ["file_declaration", "file_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstFileDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      pathChildren() {
        return this.childrenOfTypes(["path"], CstPath);
      }
    };
    exports2.CstFileDeclaration = CstFileDeclaration;
    var CstFreetextValue = class _CstFreetextValue extends CstNode {
      static nodeTypes = ["freetext_value"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstFreetextValue.nodeTypes);
      }
    };
    exports2.CstFreetextValue = CstFreetextValue;
    var CstFunctionDeclaration = class _CstFunctionDeclaration extends CstNode {
      static nodeTypes = ["function_declaration", "function_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstFunctionDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      signatureChildren() {
        return this.childrenOfTypes(["signature"], CstSignature);
      }
    };
    exports2.CstFunctionDeclaration = CstFunctionDeclaration;
    var CstHeaderNameRest = class _CstHeaderNameRest extends CstNode {
      static nodeTypes = ["header_name_rest"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstHeaderNameRest.nodeTypes);
      }
    };
    exports2.CstHeaderNameRest = CstHeaderNameRest;
    var CstHeaderQuotedName = class _CstHeaderQuotedName extends CstNode {
      static nodeTypes = ["header_quoted_name"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstHeaderQuotedName.nodeTypes);
      }
    };
    exports2.CstHeaderQuotedName = CstHeaderQuotedName;
    var CstImportHead = class _CstImportHead extends CstNode {
      static nodeTypes = ["import_head"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstImportHead.nodeTypes);
      }
    };
    exports2.CstImportHead = CstImportHead;
    var CstImportList = class _CstImportList extends CstNode {
      static nodeTypes = ["import_list", "import_list_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstImportList.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      nameListChildren() {
        return this.childrenOfTypes(["name_list"], CstNameList);
      }
    };
    exports2.CstImportList = CstImportList;
    var CstImportStatement = class _CstImportStatement extends CstNode {
      static nodeTypes = ["import_statement", "import_statement_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstImportStatement.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      importHeadChildren() {
        return this.childrenOfTypes(["import_head"], CstImportHead);
      }
    };
    exports2.CstImportStatement = CstImportStatement;
    var CstInheritList = class _CstInheritList extends CstNode {
      static nodeTypes = ["inherit_list"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstInheritList.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
    };
    exports2.CstInheritList = CstInheritList;
    var CstInlineComment = class _CstInlineComment extends CstNode {
      static nodeTypes = ["inline_comment"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstInlineComment.nodeTypes);
      }
    };
    exports2.CstInlineComment = CstInlineComment;
    var CstInlineFieldPair = class _CstInlineFieldPair extends CstNode {
      static nodeTypes = ["inline_field_pair"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstInlineFieldPair.nodeTypes);
      }
      boolLiteralChildren() {
        return this.childrenOfTypes(["bool_literal"], CstBoolLiteral);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstInlineFieldPair = CstInlineFieldPair;
    var CstInputName = class _CstInputName extends CstNode {
      static nodeTypes = ["input_name", "input_name_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstInputName.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
    };
    exports2.CstInputName = CstInputName;
    var CstListEntry = class _CstListEntry extends CstNode {
      static nodeTypes = ["list_entry"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstListEntry.nodeTypes);
      }
    };
    exports2.CstListEntry = CstListEntry;
    var CstLongformBlock = class _CstLongformBlock extends CstNode {
      static nodeTypes = ["longform_block"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstLongformBlock.nodeTypes);
      }
      blockCommentLineChildren() {
        return this.childrenOfTypes(["block_comment_line"], CstBlockCommentLine);
      }
      blockHeaderChildren() {
        return this.childrenOfTypes(["block_header"], CstBlockHeader);
      }
      blockPropertyChildren() {
        return this.childrenOfTypes(["block_property"], CstBlockProperty);
      }
    };
    exports2.CstLongformBlock = CstLongformBlock;
    var CstMethodsList = class _CstMethodsList extends CstNode {
      static nodeTypes = ["methods_list", "methods_list_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstMethodsList.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      nameListChildren() {
        return this.childrenOfTypes(["name_list"], CstNameList);
      }
    };
    exports2.CstMethodsList = CstMethodsList;
    var CstNameList = class _CstNameList extends CstNode {
      static nodeTypes = ["name_list"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstNameList.nodeTypes);
      }
      listEntryChildren() {
        return this.childrenOfTypes(["list_entry"], CstListEntry);
      }
    };
    exports2.CstNameList = CstNameList;
    var CstOptionalMarker = class _CstOptionalMarker extends CstNode {
      static nodeTypes = ["optional_marker"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstOptionalMarker.nodeTypes);
      }
    };
    exports2.CstOptionalMarker = CstOptionalMarker;
    var CstOutputName = class _CstOutputName extends CstNode {
      static nodeTypes = ["output_name", "output_name_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstOutputName.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
    };
    exports2.CstOutputName = CstOutputName;
    var CstParamMarker = class _CstParamMarker extends CstNode {
      static nodeTypes = ["param_marker"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstParamMarker.nodeTypes);
      }
    };
    exports2.CstParamMarker = CstParamMarker;
    var CstParamType = class _CstParamType extends CstNode {
      static nodeTypes = ["param_type"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstParamType.nodeTypes);
      }
    };
    exports2.CstParamType = CstParamType;
    var CstPath = class _CstPath extends CstNode {
      static nodeTypes = ["path"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstPath.nodeTypes);
      }
    };
    exports2.CstPath = CstPath;
    var CstProgramDeclaration = class _CstProgramDeclaration extends CstNode {
      static nodeTypes = ["program_declaration", "program_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstProgramDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
      versionChildren() {
        return this.childrenOfTypes(["version"], CstVersion);
      }
    };
    exports2.CstProgramDeclaration = CstProgramDeclaration;
    var CstPropertyBool = class _CstPropertyBool extends CstNode {
      static nodeTypes = ["property_bool"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstPropertyBool.nodeTypes);
      }
      boolLiteralChildren() {
        return this.childrenOfTypes(["bool_literal"], CstBoolLiteral);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
    };
    exports2.CstPropertyBool = CstPropertyBool;
    var CstPropertyFreetext = class _CstPropertyFreetext extends CstNode {
      static nodeTypes = ["property_freetext"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstPropertyFreetext.nodeTypes);
      }
      freetextValueChildren() {
        return this.childrenOfTypes(["freetext_value"], CstFreetextValue);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
    };
    exports2.CstPropertyFreetext = CstPropertyFreetext;
    var CstPropertyIdentifier = class _CstPropertyIdentifier extends CstNode {
      static nodeTypes = ["property_identifier"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstPropertyIdentifier.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
    };
    exports2.CstPropertyIdentifier = CstPropertyIdentifier;
    var CstPropertyKey = class _CstPropertyKey extends CstNode {
      static nodeTypes = ["property_key"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstPropertyKey.nodeTypes);
      }
    };
    exports2.CstPropertyKey = CstPropertyKey;
    var CstPropertyList = class _CstPropertyList extends CstNode {
      static nodeTypes = ["property_list"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstPropertyList.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      nameListChildren() {
        return this.childrenOfTypes(["name_list"], CstNameList);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
    };
    exports2.CstPropertyList = CstPropertyList;
    var CstPropertyNestedBlock = class _CstPropertyNestedBlock extends CstNode {
      static nodeTypes = ["property_nested_block"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstPropertyNestedBlock.nodeTypes);
      }
      blockCommentLineChildren() {
        return this.childrenOfTypes(["block_comment_line"], CstBlockCommentLine);
      }
      dtoFieldBlockChildren() {
        return this.childrenOfTypes(["dto_field_block"], CstDtoFieldBlock);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
    };
    exports2.CstPropertyNestedBlock = CstPropertyNestedBlock;
    var CstPropertyString = class _CstPropertyString extends CstNode {
      static nodeTypes = ["property_string"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstPropertyString.nodeTypes);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      propertyKeyChildren() {
        return this.childrenOfTypes(["property_key"], CstPropertyKey);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstPropertyString = CstPropertyString;
    var CstReadonlyBraceRest = class _CstReadonlyBraceRest extends CstNode {
      static nodeTypes = ["readonly_brace_rest"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstReadonlyBraceRest.nodeTypes);
      }
    };
    exports2.CstReadonlyBraceRest = CstReadonlyBraceRest;
    var CstReadonlyKw = class _CstReadonlyKw extends CstNode {
      static nodeTypes = ["readonly_kw"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstReadonlyKw.nodeTypes);
      }
    };
    exports2.CstReadonlyKw = CstReadonlyKw;
    var CstReadonlyNameRest = class _CstReadonlyNameRest extends CstNode {
      static nodeTypes = ["readonly_name_rest"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstReadonlyNameRest.nodeTypes);
      }
    };
    exports2.CstReadonlyNameRest = CstReadonlyNameRest;
    var CstReadonlyParenRest = class _CstReadonlyParenRest extends CstNode {
      static nodeTypes = ["readonly_paren_rest"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstReadonlyParenRest.nodeTypes);
      }
    };
    exports2.CstReadonlyParenRest = CstReadonlyParenRest;
    var CstRunparameterDeclaration = class _CstRunparameterDeclaration extends CstNode {
      static nodeTypes = ["runparameter_declaration", "runparameter_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstRunparameterDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      paramMarkerChildren() {
        return this.childrenOfTypes(["param_marker"], CstParamMarker);
      }
      paramTypeChildren() {
        return this.childrenOfTypes(["param_type"], CstParamType);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstRunparameterDeclaration = CstRunparameterDeclaration;
    var CstSignature = class _CstSignature extends CstNode {
      static nodeTypes = ["signature"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstSignature.nodeTypes);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstSignature = CstSignature;
    var CstSourceFile = class _CstSourceFile extends CstNode {
      static nodeTypes = ["source_file"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstSourceFile.nodeTypes);
      }
      affectsListChildren() {
        return this.childrenOfTypes(["affects_list", "affects_list_final"], CstAffectsList);
      }
      assetDeclarationChildren() {
        return this.childrenOfTypes(["asset_declaration", "asset_declaration_final"], CstAssetDeclaration);
      }
      callsListChildren() {
        return this.childrenOfTypes(["calls_list", "calls_list_final"], CstCallsList);
      }
      classDeclarationChildren() {
        return this.childrenOfTypes(["class_declaration", "class_declaration_final"], CstClassDeclaration);
      }
      classfileBlockSigilChildren() {
        return this.childrenOfTypes(["classfile_block_sigil"], CstClassfileBlockSigil);
      }
      classfileDeclarationChildren() {
        return this.childrenOfTypes(["classfile_declaration", "classfile_declaration_final"], CstClassfileDeclaration);
      }
      commentLineChildren() {
        return this.childrenOfTypes(["comment_line", "comment_line_final"], CstCommentLine);
      }
      constantsDeclarationChildren() {
        return this.childrenOfTypes(["constants_declaration", "constants_declaration_final"], CstConstantsDeclaration);
      }
      consumesListChildren() {
        return this.childrenOfTypes(["consumes_list", "consumes_list_final"], CstConsumesList);
      }
      containedByListChildren() {
        return this.childrenOfTypes(["contained_by_list", "contained_by_list_final"], CstContainedByList);
      }
      containsListChildren() {
        return this.childrenOfTypes(["contains_list", "contains_list_final"], CstContainsList);
      }
      containsProgramChildren() {
        return this.childrenOfTypes(["contains_program", "contains_program_final"], CstContainsProgram);
      }
      defaultValueChildren() {
        return this.childrenOfTypes(["default_value", "default_value_final"], CstDefaultValue);
      }
      dependencyDeclarationChildren() {
        return this.childrenOfTypes(["dependency_declaration", "dependency_declaration_final"], CstDependencyDeclaration);
      }
      descriptionLineChildren() {
        return this.childrenOfTypes(["description_line", "description_line_final"], CstDescriptionLine);
      }
      dtoDeclarationChildren() {
        return this.childrenOfTypes(["dto_declaration", "dto_declaration_final"], CstDtoDeclaration);
      }
      dtoFieldChildren() {
        return this.childrenOfTypes(["dto_field", "dto_field_final"], CstDtoField);
      }
      entityCommentChildren() {
        return this.childrenOfTypes(["entity_comment", "entity_comment_final"], CstEntityComment);
      }
      exportListChildren() {
        return this.childrenOfTypes(["export_list", "export_list_final"], CstExportList);
      }
      fileDeclarationChildren() {
        return this.childrenOfTypes(["file_declaration", "file_declaration_final"], CstFileDeclaration);
      }
      functionDeclarationChildren() {
        return this.childrenOfTypes(["function_declaration", "function_declaration_final"], CstFunctionDeclaration);
      }
      importListChildren() {
        return this.childrenOfTypes(["import_list", "import_list_final"], CstImportList);
      }
      importStatementChildren() {
        return this.childrenOfTypes(["import_statement", "import_statement_final"], CstImportStatement);
      }
      inputNameChildren() {
        return this.childrenOfTypes(["input_name", "input_name_final"], CstInputName);
      }
      longformBlockChildren() {
        return this.childrenOfTypes(["longform_block"], CstLongformBlock);
      }
      methodsListChildren() {
        return this.childrenOfTypes(["methods_list", "methods_list_final"], CstMethodsList);
      }
      outputNameChildren() {
        return this.childrenOfTypes(["output_name", "output_name_final"], CstOutputName);
      }
      programDeclarationChildren() {
        return this.childrenOfTypes(["program_declaration", "program_declaration_final"], CstProgramDeclaration);
      }
      runparameterDeclarationChildren() {
        return this.childrenOfTypes(["runparameter_declaration", "runparameter_declaration_final"], CstRunparameterDeclaration);
      }
      suppressLineChildren() {
        return this.childrenOfTypes(["suppress_line", "suppress_line_final"], CstSuppressLine);
      }
      suppressionBlockChildren() {
        return this.childrenOfTypes(["suppression_block"], CstSuppressionBlock);
      }
      typedefDeclarationChildren() {
        return this.childrenOfTypes(["typedef_declaration", "typedef_declaration_final"], CstTypedefDeclaration);
      }
      uicomponentDeclarationChildren() {
        return this.childrenOfTypes(["uicomponent_declaration", "uicomponent_declaration_final"], CstUicomponentDeclaration);
      }
    };
    exports2.CstSourceFile = CstSourceFile;
    var CstString = class _CstString extends CstNode {
      static nodeTypes = ["string"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstString.nodeTypes);
      }
    };
    exports2.CstString = CstString;
    var CstSuppressBlockKw = class _CstSuppressBlockKw extends CstNode {
      static nodeTypes = ["suppress_block_kw"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstSuppressBlockKw.nodeTypes);
      }
    };
    exports2.CstSuppressBlockKw = CstSuppressBlockKw;
    var CstSuppressKw = class _CstSuppressKw extends CstNode {
      static nodeTypes = ["suppress_kw"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstSuppressKw.nodeTypes);
      }
    };
    exports2.CstSuppressKw = CstSuppressKw;
    var CstSuppressLine = class _CstSuppressLine extends CstNode {
      static nodeTypes = ["suppress_line", "suppress_line_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstSuppressLine.nodeTypes);
      }
      codeField() {
        const fieldNode = this.syntaxNode.childForFieldName("code");
        if (fieldNode === null) {
          return void 0;
        }
        if (fieldNode.type === "check_code") {
          return new CstCheckCode(fieldNode);
        }
        return void 0;
      }
      reasonField() {
        const fieldNode = this.syntaxNode.childForFieldName("reason");
        if (fieldNode === null) {
          return void 0;
        }
        if (fieldNode.type === "string") {
          return new CstString(fieldNode);
        }
        return void 0;
      }
      targetField() {
        const fieldNode = this.syntaxNode.childForFieldName("target");
        if (fieldNode === null) {
          return void 0;
        }
        if (fieldNode.type === "header_name_rest") {
          return new CstHeaderNameRest(fieldNode);
        }
        return void 0;
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      suppressKwChildren() {
        return this.childrenOfTypes(["suppress_kw"], CstSuppressKw);
      }
    };
    exports2.CstSuppressLine = CstSuppressLine;
    var CstSuppressionBlock = class _CstSuppressionBlock extends CstNode {
      static nodeTypes = ["suppression_block"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstSuppressionBlock.nodeTypes);
      }
      blockCommentLineChildren() {
        return this.childrenOfTypes(["block_comment_line"], CstBlockCommentLine);
      }
      suppressBlockKwChildren() {
        return this.childrenOfTypes(["suppress_block_kw"], CstSuppressBlockKw);
      }
      suppressionEntryChildren() {
        return this.childrenOfTypes(["suppression_entry"], CstSuppressionEntry);
      }
    };
    exports2.CstSuppressionBlock = CstSuppressionBlock;
    var CstSuppressionEntry = class _CstSuppressionEntry extends CstNode {
      static nodeTypes = ["suppression_entry"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstSuppressionEntry.nodeTypes);
      }
      codeField() {
        const fieldNode = this.syntaxNode.childForFieldName("code");
        if (fieldNode === null) {
          return void 0;
        }
        if (fieldNode.type === "check_code") {
          return new CstCheckCode(fieldNode);
        }
        return void 0;
      }
      reasonField() {
        const fieldNode = this.syntaxNode.childForFieldName("reason");
        if (fieldNode === null) {
          return void 0;
        }
        if (fieldNode.type === "string") {
          return new CstString(fieldNode);
        }
        return void 0;
      }
      targetField() {
        const fieldNode = this.syntaxNode.childForFieldName("target");
        if (fieldNode === null) {
          return void 0;
        }
        if (fieldNode.type === "entity_name") {
          return new CstEntityName(fieldNode);
        }
        return void 0;
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
    };
    exports2.CstSuppressionEntry = CstSuppressionEntry;
    var CstTypeAtom = class _CstTypeAtom extends CstNode {
      static nodeTypes = ["type_atom"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeAtom.nodeTypes);
      }
      typeExprChildren() {
        return this.childrenOfTypes(["type_expr"], CstTypeExpr);
      }
      typeGenericChildren() {
        return this.childrenOfTypes(["type_generic"], CstTypeGeneric);
      }
      typeLiteralNumberChildren() {
        return this.childrenOfTypes(["type_literal_number"], CstTypeLiteralNumber);
      }
      typeLiteralStringChildren() {
        return this.childrenOfTypes(["type_literal_string"], CstTypeLiteralString);
      }
      typeNamedChildren() {
        return this.childrenOfTypes(["type_named"], CstTypeNamed);
      }
      typeOpaqueChildren() {
        return this.childrenOfTypes(["type_opaque"], CstTypeOpaque);
      }
      typeReadonlyArrayChildren() {
        return this.childrenOfTypes(["type_readonly_array"], CstTypeReadonlyArray);
      }
    };
    exports2.CstTypeAtom = CstTypeAtom;
    var CstTypeExpr = class _CstTypeExpr extends CstNode {
      static nodeTypes = ["type_expr"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeExpr.nodeTypes);
      }
      typeUnionChildren() {
        return this.childrenOfTypes(["type_union"], CstTypeUnion);
      }
    };
    exports2.CstTypeExpr = CstTypeExpr;
    var CstTypeGeneric = class _CstTypeGeneric extends CstNode {
      static nodeTypes = ["type_generic"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeGeneric.nodeTypes);
      }
      baseField() {
        const fieldNode = this.syntaxNode.childForFieldName("base");
        if (fieldNode === null) {
          return void 0;
        }
        if (fieldNode.type === "type_named") {
          return new CstTypeNamed(fieldNode);
        }
        return void 0;
      }
      typeExprChildren() {
        return this.childrenOfTypes(["type_expr"], CstTypeExpr);
      }
    };
    exports2.CstTypeGeneric = CstTypeGeneric;
    var CstTypeIntersection = class _CstTypeIntersection extends CstNode {
      static nodeTypes = ["type_intersection"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeIntersection.nodeTypes);
      }
      typePostfixChildren() {
        return this.childrenOfTypes(["type_postfix"], CstTypePostfix);
      }
    };
    exports2.CstTypeIntersection = CstTypeIntersection;
    var CstTypeLiteralNumber = class _CstTypeLiteralNumber extends CstNode {
      static nodeTypes = ["type_literal_number"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeLiteralNumber.nodeTypes);
      }
    };
    exports2.CstTypeLiteralNumber = CstTypeLiteralNumber;
    var CstTypeLiteralString = class _CstTypeLiteralString extends CstNode {
      static nodeTypes = ["type_literal_string"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeLiteralString.nodeTypes);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstTypeLiteralString = CstTypeLiteralString;
    var CstTypeNamed = class _CstTypeNamed extends CstNode {
      static nodeTypes = ["type_named"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeNamed.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
    };
    exports2.CstTypeNamed = CstTypeNamed;
    var CstTypeOpaque = class _CstTypeOpaque extends CstNode {
      static nodeTypes = ["type_opaque"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeOpaque.nodeTypes);
      }
    };
    exports2.CstTypeOpaque = CstTypeOpaque;
    var CstTypePostfix = class _CstTypePostfix extends CstNode {
      static nodeTypes = ["type_postfix"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypePostfix.nodeTypes);
      }
      typeAtomChildren() {
        return this.childrenOfTypes(["type_atom"], CstTypeAtom);
      }
    };
    exports2.CstTypePostfix = CstTypePostfix;
    var CstTypeReadonlyArray = class _CstTypeReadonlyArray extends CstNode {
      static nodeTypes = ["type_readonly_array"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeReadonlyArray.nodeTypes);
      }
      elementField() {
        const fieldNode = this.syntaxNode.childForFieldName("element");
        if (fieldNode === null) {
          return void 0;
        }
        if (fieldNode.type === "readonly_brace_rest") {
          return new CstReadonlyBraceRest(fieldNode);
        }
        if (fieldNode.type === "readonly_name_rest") {
          return new CstReadonlyNameRest(fieldNode);
        }
        if (fieldNode.type === "readonly_paren_rest") {
          return new CstReadonlyParenRest(fieldNode);
        }
        return void 0;
      }
      readonlyKwChildren() {
        return this.childrenOfTypes(["readonly_kw"], CstReadonlyKw);
      }
    };
    exports2.CstTypeReadonlyArray = CstTypeReadonlyArray;
    var CstTypeUnion = class _CstTypeUnion extends CstNode {
      static nodeTypes = ["type_union"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypeUnion.nodeTypes);
      }
      typeIntersectionChildren() {
        return this.childrenOfTypes(["type_intersection"], CstTypeIntersection);
      }
    };
    exports2.CstTypeUnion = CstTypeUnion;
    var CstTypedefDeclaration = class _CstTypedefDeclaration extends CstNode {
      static nodeTypes = ["typedef_declaration", "typedef_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypedefDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      typeExprChildren() {
        return this.childrenOfTypes(["type_expr"], CstTypeExpr);
      }
      typedefEnumVariantChildren() {
        return this.childrenOfTypes(["typedef_enum_variant"], CstTypedefEnumVariant);
      }
    };
    exports2.CstTypedefDeclaration = CstTypedefDeclaration;
    var CstTypedefEnumVariant = class _CstTypedefEnumVariant extends CstNode {
      static nodeTypes = ["typedef_enum_variant"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstTypedefEnumVariant.nodeTypes);
      }
      enumKwChildren() {
        return this.childrenOfTypes(["enum_kw"], CstEnumKw);
      }
      listEntryChildren() {
        return this.childrenOfTypes(["list_entry"], CstListEntry);
      }
    };
    exports2.CstTypedefEnumVariant = CstTypedefEnumVariant;
    var CstUicomponentDeclaration = class _CstUicomponentDeclaration extends CstNode {
      static nodeTypes = ["uicomponent_declaration", "uicomponent_declaration_final"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstUicomponentDeclaration.nodeTypes);
      }
      entityNameChildren() {
        return this.childrenOfTypes(["entity_name"], CstEntityName);
      }
      inlineCommentChildren() {
        return this.childrenOfTypes(["inline_comment"], CstInlineComment);
      }
      stringChildren() {
        return this.childrenOfTypes(["string"], CstString);
      }
    };
    exports2.CstUicomponentDeclaration = CstUicomponentDeclaration;
    var CstVersion = class _CstVersion extends CstNode {
      static nodeTypes = ["version"];
      constructor(syntaxNode) {
        super(syntaxNode, _CstVersion.nodeTypes);
      }
    };
    exports2.CstVersion = CstVersion;
    exports2.cstNodeClassByType = /* @__PURE__ */ new Map([
      ["affects_list", CstAffectsList],
      ["affects_list_final", CstAffectsList],
      ["asset_declaration", CstAssetDeclaration],
      ["asset_declaration_final", CstAssetDeclaration],
      ["block_comment_line", CstBlockCommentLine],
      ["block_header", CstBlockHeader],
      ["block_kw", CstBlockKw],
      ["block_property", CstBlockProperty],
      ["bool_literal", CstBoolLiteral],
      ["calls_list", CstCallsList],
      ["calls_list_final", CstCallsList],
      ["check_code", CstCheckCode],
      ["class_declaration", CstClassDeclaration],
      ["class_declaration_final", CstClassDeclaration],
      ["classfile_block_sigil", CstClassfileBlockSigil],
      ["classfile_declaration", CstClassfileDeclaration],
      ["classfile_declaration_final", CstClassfileDeclaration],
      ["comment", CstComment],
      ["comment_line", CstCommentLine],
      ["comment_line_final", CstCommentLine],
      ["constants_declaration", CstConstantsDeclaration],
      ["constants_declaration_final", CstConstantsDeclaration],
      ["consumes_list", CstConsumesList],
      ["consumes_list_final", CstConsumesList],
      ["contained_by_list", CstContainedByList],
      ["contained_by_list_final", CstContainedByList],
      ["contains_list", CstContainsList],
      ["contains_list_final", CstContainsList],
      ["contains_program", CstContainsProgram],
      ["contains_program_final", CstContainsProgram],
      ["default_value", CstDefaultValue],
      ["default_value_final", CstDefaultValue],
      ["dependency_declaration", CstDependencyDeclaration],
      ["dependency_declaration_final", CstDependencyDeclaration],
      ["dependency_name", CstDependencyName],
      ["description_line", CstDescriptionLine],
      ["description_line_final", CstDescriptionLine],
      ["dto_declaration", CstDtoDeclaration],
      ["dto_declaration_final", CstDtoDeclaration],
      ["dto_field", CstDtoField],
      ["dto_field_block", CstDtoFieldBlock],
      ["dto_field_final", CstDtoField],
      ["dto_field_inline", CstDtoFieldInline],
      ["dto_fields_block", CstDtoFieldsBlock],
      ["entity_comment", CstEntityComment],
      ["entity_comment_final", CstEntityComment],
      ["entity_name", CstEntityName],
      ["enum_kw", CstEnumKw],
      ["export_list", CstExportList],
      ["export_list_final", CstExportList],
      ["field_name", CstFieldName],
      ["field_type", CstFieldType],
      ["file_declaration", CstFileDeclaration],
      ["file_declaration_final", CstFileDeclaration],
      ["freetext_value", CstFreetextValue],
      ["function_declaration", CstFunctionDeclaration],
      ["function_declaration_final", CstFunctionDeclaration],
      ["header_name_rest", CstHeaderNameRest],
      ["header_quoted_name", CstHeaderQuotedName],
      ["import_head", CstImportHead],
      ["import_list", CstImportList],
      ["import_list_final", CstImportList],
      ["import_statement", CstImportStatement],
      ["import_statement_final", CstImportStatement],
      ["inherit_list", CstInheritList],
      ["inline_comment", CstInlineComment],
      ["inline_field_pair", CstInlineFieldPair],
      ["input_name", CstInputName],
      ["input_name_final", CstInputName],
      ["list_entry", CstListEntry],
      ["longform_block", CstLongformBlock],
      ["methods_list", CstMethodsList],
      ["methods_list_final", CstMethodsList],
      ["name_list", CstNameList],
      ["optional_marker", CstOptionalMarker],
      ["output_name", CstOutputName],
      ["output_name_final", CstOutputName],
      ["param_marker", CstParamMarker],
      ["param_type", CstParamType],
      ["path", CstPath],
      ["program_declaration", CstProgramDeclaration],
      ["program_declaration_final", CstProgramDeclaration],
      ["property_bool", CstPropertyBool],
      ["property_freetext", CstPropertyFreetext],
      ["property_identifier", CstPropertyIdentifier],
      ["property_key", CstPropertyKey],
      ["property_list", CstPropertyList],
      ["property_nested_block", CstPropertyNestedBlock],
      ["property_string", CstPropertyString],
      ["readonly_brace_rest", CstReadonlyBraceRest],
      ["readonly_kw", CstReadonlyKw],
      ["readonly_name_rest", CstReadonlyNameRest],
      ["readonly_paren_rest", CstReadonlyParenRest],
      ["runparameter_declaration", CstRunparameterDeclaration],
      ["runparameter_declaration_final", CstRunparameterDeclaration],
      ["signature", CstSignature],
      ["source_file", CstSourceFile],
      ["string", CstString],
      ["suppress_block_kw", CstSuppressBlockKw],
      ["suppress_kw", CstSuppressKw],
      ["suppress_line", CstSuppressLine],
      ["suppress_line_final", CstSuppressLine],
      ["suppression_block", CstSuppressionBlock],
      ["suppression_entry", CstSuppressionEntry],
      ["type_atom", CstTypeAtom],
      ["type_expr", CstTypeExpr],
      ["type_generic", CstTypeGeneric],
      ["type_intersection", CstTypeIntersection],
      ["type_literal_number", CstTypeLiteralNumber],
      ["type_literal_string", CstTypeLiteralString],
      ["type_named", CstTypeNamed],
      ["type_opaque", CstTypeOpaque],
      ["type_postfix", CstTypePostfix],
      ["type_readonly_array", CstTypeReadonlyArray],
      ["type_union", CstTypeUnion],
      ["typedef_declaration", CstTypedefDeclaration],
      ["typedef_declaration_final", CstTypedefDeclaration],
      ["typedef_enum_variant", CstTypedefEnumVariant],
      ["uicomponent_declaration", CstUicomponentDeclaration],
      ["uicomponent_declaration_final", CstUicomponentDeclaration],
      ["version", CstVersion]
    ]);
    var wrapCstNode = (syntaxNode) => {
      const wrapperClass = exports2.cstNodeClassByType.get(syntaxNode.type);
      if (wrapperClass === void 0) {
        return void 0;
      }
      return new wrapperClass(syntaxNode);
    };
    exports2.wrapCstNode = wrapCstNode;
  }
});

// ../typed-mind/dist/ast/import-statement-node.js
var require_import_statement_node = __commonJS2({
  "../typed-mind/dist/ast/import-statement-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ImportStatementNode = void 0;
    var ImportStatementNode = class {
      path;
      alias;
      span;
      raw;
      // Explicit field assignment (not constructor parameter properties):
      // parameter properties are non-erasable syntax. Assign-only, no side effects.
      constructor(args2) {
        this.path = args2.path;
        this.alias = args2.alias;
        this.span = args2.span;
        this.raw = args2.raw;
      }
    };
    exports2.ImportStatementNode = ImportStatementNode;
  }
});

// ../typed-mind/dist/ast/program-node.js
var require_program_node = __commonJS2({
  "../typed-mind/dist/ast/program-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProgramNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var ProgramNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "Program";
      entry;
      purpose;
      version;
      exports;
      constructor(args2) {
        super(args2);
        this.entry = args2.entry;
        this.purpose = args2.purpose;
        this.version = args2.version;
        this.exports = args2.exports;
      }
    };
    exports2.ProgramNode = ProgramNode2;
  }
});

// ../typed-mind/dist/ast/run-parameter-node.js
var require_run_parameter_node = __commonJS2({
  "../typed-mind/dist/ast/run-parameter-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RunParameterNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var RunParameterNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "RunParameter";
      paramType;
      description;
      defaultValue;
      required;
      constructor(args2) {
        super(args2);
        this.paramType = args2.paramType;
        this.description = args2.description;
        this.defaultValue = args2.defaultValue;
        this.required = args2.required;
      }
    };
    exports2.RunParameterNode = RunParameterNode2;
  }
});

// ../typed-mind/dist/ast/suppression-node.js
var require_suppression_node = __commonJS2({
  "../typed-mind/dist/ast/suppression-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SuppressionNode = void 0;
    var SuppressionNode = class {
      target;
      code;
      reason;
      span;
      raw;
      // Explicit field assignment (not constructor parameter properties):
      // parameter properties are non-erasable syntax. Assign-only, no side effects.
      constructor(args2) {
        this.target = args2.target;
        this.code = args2.code;
        this.reason = args2.reason;
        this.span = args2.span;
        this.raw = args2.raw;
      }
    };
    exports2.SuppressionNode = SuppressionNode;
  }
});

// ../typed-mind/dist/ast/type-def-node.js
var require_type_def_node = __commonJS2({
  "../typed-mind/dist/ast/type-def-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypeDefNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var TypeDefNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "TypeDef";
      variant;
      // Present only when variant === 'enum'; absent for 'alias'.
      members;
      // Present only when variant === 'alias'; absent for 'enum'.
      aliasType;
      purpose;
      constructor(args2) {
        super(args2);
        this.variant = args2.variant;
        this.members = args2.variant === "enum" ? args2.members : void 0;
        this.aliasType = args2.variant === "alias" ? args2.aliasType : void 0;
        this.purpose = args2.purpose;
      }
    };
    exports2.TypeDefNode = TypeDefNode2;
  }
});

// ../typed-mind/dist/ast/ui-component-node.js
var require_ui_component_node = __commonJS2({
  "../typed-mind/dist/ast/ui-component-node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UiComponentNode = void 0;
    var entity_node_ts_1 = require_entity_node();
    var UiComponentNode2 = class extends entity_node_ts_1.EntityNode {
      kind = "UIComponent";
      purpose;
      root;
      contains;
      declaredContainedBy;
      declaredAffectedBy;
      constructor(args2) {
        super(args2);
        this.purpose = args2.purpose;
        this.root = args2.root;
        this.contains = args2.contains;
        this.declaredContainedBy = args2.declaredContainedBy;
        this.declaredAffectedBy = args2.declaredAffectedBy;
      }
    };
    exports2.UiComponentNode = UiComponentNode2;
  }
});

// ../typed-mind/dist/emitter/detect-format.js
var require_detect_format = __commonJS2({
  "../typed-mind/dist/emitter/detect-format.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.detectFormat = void 0;
    var ENTITY_DECLARATION_PATTERN = /^[@\w\-/]+\s*(->|@|<:|#:|!|::|%|~|&|\$|\^|\s*:)/;
    var CONTINUATION_PATTERN = /^\s+(->|<-|~>|=>|>>|>|<|~|"|#|-|=|\$<)/;
    var LONGFORM_KEYWORD_PATTERN = /^(program|file|function|class|classfile|dto|component|asset|constants|parameter|import|dependency)\s+/;
    var SIGIL_BLOCK_HEADER_PATTERN = /^[@\w\-/]+\s*#:\s*\S+.*\{\s*$/;
    var SHORTFORM_ENTITY_PATTERNS = [
      /^[@\w\-/]+\s*->/,
      // Program
      /^[@\w\-/]+\s*@/,
      // File
      /^[@\w\-/]+\s*::/,
      // Function
      /^[@\w\-/]+\s*<:/,
      // Class
      /^[@\w\-/]+\s*#:/,
      // ClassFile
      /^[@\w\-/]+\s*!/,
      // Constants
      /^[@\w\-/]+\s*%/,
      // DTO
      /^[@\w\-/]+\s*~/,
      // Asset
      /^[@\w\-/]+\s*&/,
      // UIComponent
      /^[@\w\-/]+\s*\$/,
      // RunParameter
      /^[@\w\-/]+\s*\^/
      // Dependency
    ];
    var isShortformEntityLine = (line) => {
      return SHORTFORM_ENTITY_PATTERNS.some((pattern) => pattern.test(line));
    };
    var detectFormat = (content) => {
      const lines = content.split("\n");
      let shortformLines = 0;
      let longformLines = 0;
      let totalSignificantLines = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith("#")) {
          continue;
        }
        totalSignificantLines++;
        if (LONGFORM_KEYWORD_PATTERN.test(trimmed) || SIGIL_BLOCK_HEADER_PATTERN.test(trimmed)) {
          longformLines++;
          continue;
        }
        if (ENTITY_DECLARATION_PATTERN.test(trimmed) && isShortformEntityLine(trimmed)) {
          shortformLines++;
          continue;
        }
        if (CONTINUATION_PATTERN.test(line)) {
        }
      }
      const shortformRatio = totalSignificantLines > 0 ? shortformLines / totalSignificantLines : 0;
      const longformRatio = totalSignificantLines > 0 ? longformLines / totalSignificantLines : 0;
      let format;
      let confidence;
      if (shortformLines === 0 && longformLines === 0) {
        format = "shortform";
        confidence = 0.5;
      } else if (longformLines === 0 && shortformLines > 0) {
        format = "shortform";
        confidence = 1;
      } else if (shortformLines === 0 && longformLines > 0) {
        format = "longform";
        confidence = 1;
      } else if (shortformRatio > 0.6) {
        format = "shortform";
        confidence = shortformRatio;
      } else if (longformRatio > 0.6) {
        format = "longform";
        confidence = longformRatio;
      } else {
        format = "mixed";
        confidence = 1 - Math.abs(shortformRatio - longformRatio);
      }
      return { format, shortformLines, longformLines, totalLines: totalSignificantLines, confidence };
    };
    exports2.detectFormat = detectFormat;
  }
});

// ../typed-mind/dist/emitter/print-type-expr.js
var require_print_type_expr = __commonJS2({
  "../typed-mind/dist/emitter/print-type-expr.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.printTypeExpr = void 0;
    var printAtomWithParensIfNeeded = (node) => {
      if (node.kind === "union" || node.kind === "intersection") {
        return `(${(0, exports2.printTypeExpr)(node)})`;
      }
      return (0, exports2.printTypeExpr)(node);
    };
    var printTypeExpr = (node) => {
      switch (node.kind) {
        case "named":
          return node.name;
        case "literal":
          return node.literalKind === "string" ? `"${node.value}"` : node.value;
        case "generic":
          return `${node.base.name}<${node.args.map(exports2.printTypeExpr).join(", ")}>`;
        case "array":
          if (node.spelling === "generic") {
            return `Array<${(0, exports2.printTypeExpr)(node.element)}>`;
          }
          return `${node.readonly ? "readonly " : ""}${printAtomWithParensIfNeeded(node.element)}[]`;
        case "union":
          return node.members.map(printAtomWithParensIfNeeded).join(" | ");
        case "intersection":
          return node.members.map(printAtomWithParensIfNeeded).join(" & ");
        case "opaque":
          return node.text;
      }
    };
    exports2.printTypeExpr = printTypeExpr;
  }
});

// ../typed-mind/dist/emitter/emit-longform.js
var require_emit_longform = __commonJS2({
  "../typed-mind/dist/emitter/emit-longform.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.emitLongform = void 0;
    var print_type_expr_ts_1 = require_print_type_expr();
    var indent = (lines) => lines.map((line) => `  ${line}`);
    var IDENTIFIER_PATTERN = /^[A-Za-z_]\w*$/;
    var dependencyHeaderName = (name2) => {
      return IDENTIFIER_PATTERN.test(name2) ? name2 : `"${name2}"`;
    };
    var descriptionAndPurposeLines = (comment, purpose) => {
      const lines = [];
      if (comment !== void 0) {
        lines.push(`description: "${comment}"`);
      }
      if (purpose !== void 0 && purpose !== comment) {
        lines.push(`purpose: "${purpose}"`);
      }
      return lines;
    };
    var programToLongform = (entity) => {
      const body2 = [`type: Program`, `entry: ${entity.entry}`];
      if (entity.version !== void 0) {
        body2.push(`version: ${entity.version}`);
      }
      body2.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
      if (entity.exports !== void 0 && entity.exports.length > 0) {
        body2.push(`exports: [${entity.exports.join(", ")}]`);
      }
      return [`program ${entity.name} {`, ...indent(body2), "}"];
    };
    var fileToLongform = (entity) => {
      const body2 = [`type: File`, `path: ${entity.path}`];
      body2.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
      if (entity.imports.length > 0) {
        body2.push(`imports: [${entity.imports.join(", ")}]`);
      }
      if (entity.exports.length > 0) {
        body2.push(`exports: [${entity.exports.join(", ")}]`);
      }
      return [`file ${entity.name} {`, ...indent(body2), "}"];
    };
    var functionToLongform = (entity) => {
      const body2 = [`type: Function`, `signature: ${entity.signature}`];
      if (entity.description !== void 0) {
        body2.push(`description: "${entity.description}"`);
      }
      if (entity.input !== void 0) {
        body2.push(`input: ${entity.input}`);
      }
      if (entity.output !== void 0) {
        body2.push(`output: ${entity.output}`);
      }
      if (entity.calls.length > 0) {
        body2.push(`calls: [${entity.calls.join(", ")}]`);
      }
      if (entity.affects !== void 0 && entity.affects.length > 0) {
        body2.push(`affects: [${entity.affects.join(", ")}]`);
      }
      if (entity.consumes !== void 0 && entity.consumes.length > 0) {
        body2.push(`consumes: [${entity.consumes.join(", ")}]`);
      }
      return [`function ${entity.name} {`, ...indent(body2), "}"];
    };
    var classToLongform = (entity) => {
      const body2 = [`type: Class`];
      if (entity.extends !== void 0) {
        body2.push(`extends: ${entity.extends}`);
      }
      if (entity.implements.length > 0) {
        body2.push(`implements: [${entity.implements.join(", ")}]`);
      }
      body2.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
      if (entity.methods.length > 0) {
        body2.push(`methods: [${entity.methods.join(", ")}]`);
      }
      return [`class ${entity.name} {`, ...indent(body2), "}"];
    };
    var classFileToLongform = (entity) => {
      const body2 = [`type: ClassFile`, `path: ${entity.path}`];
      if (entity.extends !== void 0) {
        body2.push(`extends: ${entity.extends}`);
      }
      if (entity.implements.length > 0) {
        body2.push(`implements: [${entity.implements.join(", ")}]`);
      }
      body2.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
      if (entity.imports.length > 0) {
        body2.push(`imports: [${entity.imports.join(", ")}]`);
      }
      if (entity.methods.length > 0) {
        body2.push(`methods: [${entity.methods.join(", ")}]`);
      }
      if (entity.exports.length > 0) {
        body2.push(`exports: [${entity.exports.join(", ")}]`);
      }
      return [`classfile ${entity.name} {`, ...indent(body2), "}"];
    };
    var constantsToLongform = (entity) => {
      const body2 = [`type: Constants`, `path: ${entity.path}`];
      if (entity.schema !== void 0) {
        body2.push(`schema: ${entity.schema}`);
      }
      body2.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
      return [`constants ${entity.name} {`, ...indent(body2), "}"];
    };
    var dtoFieldToLongform = (field) => {
      const body2 = [`type: ${field.type}`];
      if (field.description !== void 0) {
        body2.push(`description: "${field.description}"`);
      }
      if (field.optionalityMarker !== "none") {
        body2.push(`optional: true`);
      }
      return [`${field.name}: {`, ...indent(body2), "}"];
    };
    var dtoToLongform = (entity) => {
      const body2 = [`type: DTO`, ...descriptionAndPurposeLines(entity.comment, entity.purpose)];
      if (entity.fields.length > 0) {
        const fieldLines = entity.fields.flatMap((field) => dtoFieldToLongform(field));
        body2.push("fields: {", ...indent(fieldLines), "}");
      }
      return [`dto ${entity.name} {`, ...indent(body2), "}"];
    };
    var assetToLongform = (entity) => {
      const body2 = [`type: Asset`, `description: "${entity.description}"`];
      if (entity.containsProgram !== void 0) {
        body2.push(`containsProgram: ${entity.containsProgram}`);
      }
      return [`asset ${entity.name} {`, ...indent(body2), "}"];
    };
    var uiComponentToLongform = (entity) => {
      const body2 = [`type: UIComponent`, `description: "${entity.purpose}"`];
      if (entity.root) {
        body2.push(`root: true`);
      }
      if (entity.contains !== void 0 && entity.contains.length > 0) {
        body2.push(`contains: [${entity.contains.join(", ")}]`);
      }
      if (entity.declaredContainedBy !== void 0 && entity.declaredContainedBy.length > 0) {
        body2.push(`containedBy: [${entity.declaredContainedBy.join(", ")}]`);
      }
      if (entity.declaredAffectedBy !== void 0 && entity.declaredAffectedBy.length > 0) {
        body2.push(`affectedBy: [${entity.declaredAffectedBy.join(", ")}]`);
      }
      return [`component ${entity.name} {`, ...indent(body2), "}"];
    };
    var runParameterToLongform = (entity) => {
      const body2 = [`type: ${entity.paramType}`, `description: "${entity.description}"`];
      if (entity.defaultValue !== void 0) {
        body2.push(`default: "${entity.defaultValue}"`);
      }
      if (entity.required === true) {
        body2.push(`required: true`);
      }
      return [`parameter ${entity.name} {`, ...indent(body2), "}"];
    };
    var dependencyToLongform = (entity) => {
      const body2 = [`type: Dependency`];
      body2.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
      if (entity.version !== void 0) {
        body2.push(`version: ${entity.version}`);
      }
      if (entity.exports !== void 0 && entity.exports.length > 0) {
        body2.push(`exports: [${entity.exports.join(", ")}]`);
      }
      return [`dependency ${dependencyHeaderName(entity.name)} {`, ...indent(body2), "}"];
    };
    var typeDefToLongform = (entity) => {
      const body2 = [];
      if (entity.variant === "enum") {
        body2.push("variant: enum");
        body2.push(`members: [${(entity.members ?? []).join(", ")}]`);
      } else {
        body2.push(`type: "${entity.aliasType === void 0 ? "" : (0, print_type_expr_ts_1.printTypeExpr)(entity.aliasType)}"`);
      }
      body2.push(...descriptionAndPurposeLines(entity.comment, entity.purpose));
      return [`typedef ${entity.name} {`, ...indent(body2), "}"];
    };
    var emitLongform = (entity) => {
      switch (entity.kind) {
        case "Program":
          return programToLongform(entity);
        case "File":
          return fileToLongform(entity);
        case "Function":
          return functionToLongform(entity);
        case "Class":
          return classToLongform(entity);
        case "ClassFile":
          return classFileToLongform(entity);
        case "Constants":
          return constantsToLongform(entity);
        case "DTO":
          return dtoToLongform(entity);
        case "Asset":
          return assetToLongform(entity);
        case "UIComponent":
          return uiComponentToLongform(entity);
        case "RunParameter":
          return runParameterToLongform(entity);
        case "Dependency":
          return dependencyToLongform(entity);
        case "TypeDef":
          return typeDefToLongform(entity);
      }
    };
    exports2.emitLongform = emitLongform;
  }
});

// ../typed-mind/dist/emitter/emit-shortform.js
var require_emit_shortform = __commonJS2({
  "../typed-mind/dist/emitter/emit-shortform.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.emitShortform = void 0;
    var print_type_expr_ts_1 = require_print_type_expr();
    var withInlineComment = (lines, comment) => {
      if (comment === void 0 || lines.length === 0) {
        return lines;
      }
      const [first, ...rest] = lines;
      return [`${first} # ${comment}`, ...rest];
    };
    var programToShortform = (entity) => {
      let line = `${entity.name} -> ${entity.entry}`;
      if (entity.purpose !== void 0) {
        line += ` "${entity.purpose}"`;
      }
      if (entity.version !== void 0) {
        line += ` v${entity.version}`;
      }
      const lines = [line];
      if (entity.exports !== void 0 && entity.exports.length > 0) {
        lines.push(`  -> [${entity.exports.join(", ")}]`);
      }
      return lines;
    };
    var fileToShortform = (entity) => {
      const lines = [`${entity.name} @ ${entity.path}:`];
      if (entity.purpose !== void 0) {
        lines.push(`  "${entity.purpose}"`);
      }
      if (entity.imports.length > 0) {
        lines.push(`  <- [${entity.imports.join(", ")}]`);
      }
      if (entity.exports.length > 0) {
        lines.push(`  -> [${entity.exports.join(", ")}]`);
      }
      return lines;
    };
    var functionToShortform = (entity) => {
      const lines = [`${entity.name} :: ${entity.signature}`];
      if (entity.description !== void 0) {
        lines.push(`  "${entity.description}"`);
      }
      if (entity.pendingDependencies.length > 0) {
        lines.push(`  <- [${entity.pendingDependencies.join(", ")}]`);
      }
      if (entity.input !== void 0) {
        lines.push(`  <- ${entity.input}`);
      }
      if (entity.output !== void 0) {
        lines.push(`  -> ${entity.output}`);
      }
      if (entity.calls.length > 0) {
        lines.push(`  ~> [${entity.calls.join(", ")}]`);
      }
      if (entity.affects !== void 0 && entity.affects.length > 0) {
        lines.push(`  ~ [${entity.affects.join(", ")}]`);
      }
      if (entity.consumes !== void 0 && entity.consumes.length > 0) {
        lines.push(`  $< [${entity.consumes.join(", ")}]`);
      }
      return lines;
    };
    var inheritanceSuffix = (extendsName, implementsList) => {
      if (extendsName === void 0) {
        return implementsList.length > 0 ? ` ${implementsList.join(", ")}` : "";
      }
      return implementsList.length > 0 ? ` ${extendsName}, ${implementsList.join(", ")}` : ` ${extendsName}`;
    };
    var classToShortform = (entity) => {
      const lines = [`${entity.name} <:${inheritanceSuffix(entity.extends, entity.implements)}`];
      if (entity.purpose !== void 0) {
        lines.push(`  "${entity.purpose}"`);
      }
      if (entity.methods.length > 0) {
        lines.push(`  => [${entity.methods.join(", ")}]`);
      }
      return lines;
    };
    var classFileToShortform = (entity) => {
      const inheritance = entity.extends === void 0 && entity.implements.length === 0 ? "" : ` <:${inheritanceSuffix(entity.extends, entity.implements)}`;
      const lines = [`${entity.name} #: ${entity.path}${inheritance}`];
      if (entity.purpose !== void 0) {
        lines.push(`  "${entity.purpose}"`);
      }
      if (entity.imports.length > 0) {
        lines.push(`  <- [${entity.imports.join(", ")}]`);
      }
      if (entity.methods.length > 0) {
        lines.push(`  => [${entity.methods.join(", ")}]`);
      }
      const visibleExports = entity.exports.filter((exportName) => exportName !== entity.name);
      if (visibleExports.length > 0) {
        lines.push(`  -> [${entity.exports.join(", ")}]`);
      }
      return lines;
    };
    var constantsToShortform = (entity) => {
      let line = `${entity.name} ! ${entity.path}`;
      if (entity.schema !== void 0) {
        line += ` : ${entity.schema}`;
      }
      const lines = [line];
      if (entity.purpose !== void 0) {
        lines.push(`  "${entity.purpose}"`);
      }
      return lines;
    };
    var dtoFieldLine = (field) => {
      let fieldLine = `  - ${field.name}`;
      if (field.optionalityMarker === "question") {
        fieldLine += "?";
      }
      fieldLine += `: ${field.type}`;
      if (field.description !== void 0) {
        fieldLine += ` "${field.description}"`;
      }
      if (field.optionalityMarker === "parenthesized") {
        fieldLine += " (optional)";
      }
      return fieldLine;
    };
    var dtoToShortform = (entity) => {
      let line = `${entity.name} %`;
      if (entity.purpose !== void 0) {
        line += ` "${entity.purpose}"`;
      }
      const lines = [line];
      for (const field of entity.fields) {
        lines.push(dtoFieldLine(field));
      }
      return lines;
    };
    var assetToShortform = (entity) => {
      const lines = [`${entity.name} ~ "${entity.description}"`];
      if (entity.containsProgram !== void 0) {
        lines.push(`  >> ${entity.containsProgram}`);
      }
      return lines;
    };
    var uiComponentToShortform = (entity) => {
      const marker = entity.root ? "&!" : "&";
      const lines = [`${entity.name} ${marker} "${entity.purpose}"`];
      if (entity.contains !== void 0 && entity.contains.length > 0) {
        lines.push(`  > [${entity.contains.join(", ")}]`);
      }
      if (entity.declaredContainedBy !== void 0 && entity.declaredContainedBy.length > 0) {
        lines.push(`  < [${entity.declaredContainedBy.join(", ")}]`);
      }
      return lines;
    };
    var runParameterToShortform = (entity) => {
      let line = `${entity.name} $${entity.paramType} "${entity.description}"`;
      if (entity.required === true) {
        line += " (required)";
      }
      const lines = [line];
      if (entity.defaultValue !== void 0) {
        lines.push(`  = "${entity.defaultValue}"`);
      }
      return lines;
    };
    var dependencyToShortform = (entity) => {
      let line = `${entity.name} ^ "${entity.purpose}"`;
      if (entity.version !== void 0) {
        line += ` v${entity.version}`;
      }
      const lines = [line];
      if (entity.exports !== void 0 && entity.exports.length > 0) {
        lines.push(`  -> [${entity.exports.join(", ")}]`);
      }
      return lines;
    };
    var typeDefToShortform = (entity) => {
      if (entity.variant === "enum") {
        return [`${entity.name} = enum [${(entity.members ?? []).join(", ")}]`];
      }
      return [`${entity.name} = ${entity.aliasType === void 0 ? "" : (0, print_type_expr_ts_1.printTypeExpr)(entity.aliasType)}`];
    };
    var emitShortform = (entity) => {
      const body2 = (() => {
        switch (entity.kind) {
          case "Program":
            return programToShortform(entity);
          case "File":
            return fileToShortform(entity);
          case "Function":
            return functionToShortform(entity);
          case "Class":
            return classToShortform(entity);
          case "ClassFile":
            return classFileToShortform(entity);
          case "Constants":
            return constantsToShortform(entity);
          case "DTO":
            return dtoToShortform(entity);
          case "Asset":
            return assetToShortform(entity);
          case "UIComponent":
            return uiComponentToShortform(entity);
          case "RunParameter":
            return runParameterToShortform(entity);
          case "Dependency":
            return dependencyToShortform(entity);
          case "TypeDef":
            return typeDefToShortform(entity);
        }
      })();
      return withInlineComment(body2, entity.comment);
    };
    exports2.emitShortform = emitShortform;
  }
});

// ../typed-mind/dist/emitter/emit-suppression.js
var require_emit_suppression = __commonJS2({
  "../typed-mind/dist/emitter/emit-suppression.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.suppressionsToLongformBlock = exports2.suppressionToShortformLine = void 0;
    var suppressionToShortformLine = (suppression) => {
      return `suppress ${suppression.target} ${suppression.code} "${suppression.reason}"`;
    };
    exports2.suppressionToShortformLine = suppressionToShortformLine;
    var suppressionToLongformEntry = (suppression) => {
      return `  ${suppression.target} ${suppression.code} "${suppression.reason}"`;
    };
    var suppressionsToLongformBlock = (suppressions) => {
      if (suppressions.length === 0) {
        return [];
      }
      return ["suppress {", ...suppressions.map(suppressionToLongformEntry), "}"];
    };
    exports2.suppressionsToLongformBlock = suppressionsToLongformBlock;
  }
});

// ../typed-mind/dist/emitter/syntax-emitter.js
var require_syntax_emitter = __commonJS2({
  "../typed-mind/dist/emitter/syntax-emitter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SyntaxEmitter = exports2.detectFormat = void 0;
    var detect_format_ts_1 = require_detect_format();
    Object.defineProperty(exports2, "detectFormat", { enumerable: true, get: function() {
      return detect_format_ts_1.detectFormat;
    } });
    var emit_longform_ts_1 = require_emit_longform();
    var emit_shortform_ts_1 = require_emit_shortform();
    var emit_suppression_ts_1 = require_emit_suppression();
    var emitEntity = (entity, options) => {
      const form = options.forceForm ?? entity.sourceForm;
      return form === "longform" ? (0, emit_longform_ts_1.emitLongform)(entity) : (0, emit_shortform_ts_1.emitShortform)(entity);
    };
    var emitSuppressions = (suppressions, form) => {
      if (form === "longform") {
        return (0, emit_suppression_ts_1.suppressionsToLongformBlock)(suppressions);
      }
      return suppressions.map(emit_suppression_ts_1.suppressionToShortformLine);
    };
    var SyntaxEmitter = class {
      // Emits every entity in ParseOutcome.entities, each in its own declared (or
      // forced) form, blank-line separated — declared-fields emission only.
      // Suppressions (X-SUPP-4) emit as their own block(s), appended after every
      // entity, in the same per-call form.
      emit(outcome, options = {}) {
        const entityBlocks = outcome.entities.map((entity) => emitEntity(entity, options).join("\n"));
        const suppressionForm = options.forceForm ?? "shortform";
        const suppressionLines = emitSuppressions(outcome.suppressions, suppressionForm);
        const blocks = suppressionLines.length === 0 ? entityBlocks : [...entityBlocks, suppressionLines.join("\n")];
        return blocks.join("\n\n").trim();
      }
      emitShortform(outcome) {
        return this.emit(outcome, { forceForm: "shortform" });
      }
      emitLongform(outcome) {
        return this.emit(outcome, { forceForm: "longform" });
      }
      // RFC §2: an honest operation on the new surface — the caller reparses
      // `source`, and this method emits the OTHER of the two forms from the
      // parsed outcome (no derived-field reintroduction, unlike the legacy
      // pass-through converters, syntax-generator.ts:306-356).
      toggleFormat(outcome, currentFormat) {
        const targetForm = currentFormat === "longform" ? "shortform" : "longform";
        return this.emit(outcome, { forceForm: targetForm });
      }
    };
    exports2.SyntaxEmitter = SyntaxEmitter;
  }
});

// ../typed-mind/dist/pipeline/link-index.js
var require_link_index = __commonJS2({
  "../typed-mind/dist/pipeline/link-index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.computeLinks = exports2.LinkIndex = void 0;
    var asset_node_ts_1 = require_asset_node();
    var class_file_node_ts_1 = require_class_file_node();
    var class_node_ts_1 = require_class_node();
    var constants_node_ts_1 = require_constants_node();
    var dependency_node_ts_1 = require_dependency_node();
    var file_node_ts_1 = require_file_node();
    var function_node_ts_1 = require_function_node();
    var program_node_ts_1 = require_program_node();
    var ui_component_node_ts_1 = require_ui_component_node();
    var NO_REFERENCES = [];
    var NO_NAMES = [];
    var LinkIndex = class {
      #maps;
      constructor(maps) {
        this.#maps = maps;
      }
      referencedBy(name2) {
        return this.#maps.referencedBy.get(name2) ?? NO_REFERENCES;
      }
      containedBy(name2) {
        return this.#maps.containedBy.get(name2) ?? NO_NAMES;
      }
      affectedBy(name2) {
        return this.#maps.affectedBy.get(name2) ?? NO_NAMES;
      }
      consumedBy(name2) {
        return this.#maps.consumedBy.get(name2) ?? NO_NAMES;
      }
      importedBy(name2) {
        return this.#maps.importedBy.get(name2) ?? NO_NAMES;
      }
    };
    exports2.LinkIndex = LinkIndex;
    var LinkCollector = class {
      #byName;
      referencedBy = /* @__PURE__ */ new Map();
      containedBy = /* @__PURE__ */ new Map();
      affectedBy = /* @__PURE__ */ new Map();
      consumedBy = /* @__PURE__ */ new Map();
      importedBy = /* @__PURE__ */ new Map();
      constructor(byName) {
        this.#byName = byName;
      }
      addReference(targetName, from) {
        if (!this.#byName.has(targetName)) {
          return;
        }
        const bucket = this.referencedBy.get(targetName) ?? [];
        if (!bucket.some((reference) => reference.from === from.name)) {
          bucket.push({ from: from.name, fromType: from.kind });
        }
        this.referencedBy.set(targetName, bucket);
      }
      addName(map, targetName, fromName) {
        if (!this.#byName.has(targetName)) {
          return;
        }
        const bucket = map.get(targetName) ?? [];
        if (!bucket.includes(fromName)) {
          bucket.push(fromName);
        }
        map.set(targetName, bucket);
      }
      addImports(from, imports) {
        for (const imported of imports) {
          if (imported.includes("*")) {
            continue;
          }
          const target = this.#byName.get(imported);
          if (target === void 0) {
            continue;
          }
          if (target.kind === "Dependency") {
            this.addName(this.importedBy, imported, from.name);
          } else {
            this.addReference(imported, from);
          }
        }
      }
      addAll(targetNames, from) {
        for (const targetName of targetNames ?? []) {
          this.addReference(targetName, from);
        }
      }
    };
    var collectFunctionLinks = (collector, fn) => {
      for (const call of fn.calls) {
        const callTarget = call.includes(".") ? call.split(".").at(0) ?? call : call;
        collector.addReference(callTarget, fn);
      }
      if (fn.input !== void 0) {
        collector.addReference(fn.input, fn);
      }
      if (fn.output !== void 0) {
        collector.addReference(fn.output, fn);
      }
      for (const affected of fn.affects ?? []) {
        collector.addReference(affected, fn);
        collector.addName(collector.affectedBy, affected, fn.name);
      }
      for (const consumed of fn.consumes ?? []) {
        collector.addReference(consumed, fn);
        collector.addName(collector.consumedBy, consumed, fn.name);
      }
    };
    var collectEntityLinks = (collector, entity) => {
      if (entity instanceof program_node_ts_1.ProgramNode) {
        if (entity.entry !== "") {
          collector.addReference(entity.entry, entity);
        }
        collector.addAll(entity.exports, entity);
      } else if (entity instanceof file_node_ts_1.FileNode) {
        collector.addImports(entity, entity.imports);
        collector.addAll(entity.exports, entity);
      } else if (entity instanceof class_file_node_ts_1.ClassFileNode) {
        collector.addImports(entity, entity.imports);
        collector.addAll(entity.exports, entity);
        collector.addAll(entity.implements, entity);
        if (entity.extends !== void 0) {
          collector.addReference(entity.extends, entity);
        }
      } else if (entity instanceof class_node_ts_1.ClassNode) {
        collector.addAll(entity.implements, entity);
        if (entity.extends !== void 0) {
          collector.addReference(entity.extends, entity);
        }
      } else if (entity instanceof function_node_ts_1.FunctionNode) {
        collectFunctionLinks(collector, entity);
      } else if (entity instanceof ui_component_node_ts_1.UiComponentNode) {
        for (const child of entity.contains ?? []) {
          collector.addReference(child, entity);
          collector.addName(collector.containedBy, child, entity.name);
        }
      } else if (entity instanceof asset_node_ts_1.AssetNode) {
        if (entity.containsProgram !== void 0) {
          collector.addReference(entity.containsProgram, entity);
        }
      } else if (entity instanceof constants_node_ts_1.ConstantsNode) {
        if (entity.schema !== void 0) {
          collector.addReference(entity.schema, entity);
        }
      } else if (entity instanceof dependency_node_ts_1.DependencyNode) {
        collector.addAll(entity.exports, entity);
      }
    };
    var computeLinks = (entities) => {
      const byName = /* @__PURE__ */ new Map();
      for (const entity of entities) {
        byName.set(entity.name, entity);
      }
      const collector = new LinkCollector(byName);
      for (const entity of entities) {
        collectEntityLinks(collector, entity);
      }
      return new LinkIndex({
        referencedBy: collector.referencedBy,
        containedBy: collector.containedBy,
        affectedBy: collector.affectedBy,
        consumedBy: collector.consumedBy,
        importedBy: collector.importedBy
      });
    };
    exports2.computeLinks = computeLinks;
  }
});

// ../typed-mind/dist/pipeline/type-expr-from-text.js
var require_type_expr_from_text = __commonJS2({
  "../typed-mind/dist/pipeline/type-expr-from-text.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parseTypeExprText = void 0;
    var NAMED_TOKEN = /^[A-Za-z_]\w*/;
    var NUMBER_TOKEN = /^-?\d+(\.\d+)?/;
    var READONLY_PREFIX = /^readonly[ \t]+(?=[A-Za-z_(])/;
    var QUALIFIED_NAME_TOKEN = /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+/;
    var TextCursor = class {
      text;
      index = 0;
      baseLine;
      baseColumn;
      constructor(text, baseLine, baseColumn) {
        this.text = text;
        this.baseLine = baseLine;
        this.baseColumn = baseColumn;
      }
      positionAt(index) {
        return { line: this.baseLine, column: this.baseColumn + index };
      }
      skipWhitespace() {
        while (this.index < this.text.length && (this.text[this.index] === " " || this.text[this.index] === "	")) {
          this.index += 1;
        }
      }
      peek() {
        return this.text.slice(this.index);
      }
      startsWith(literal) {
        return this.text.startsWith(literal, this.index);
      }
    };
    var spanFrom = (cursor, startIndex, endIndex) => {
      return { start: cursor.positionAt(startIndex), end: cursor.positionAt(endIndex) };
    };
    var parseNamed = (cursor) => {
      const match = NAMED_TOKEN.exec(cursor.peek());
      if (match === null) {
        return void 0;
      }
      const startIndex = cursor.index;
      cursor.index += match[0].length;
      return { kind: "named", name: match[0], span: spanFrom(cursor, startIndex, cursor.index) };
    };
    var parseStringLiteral = (cursor) => {
      if (cursor.peek()[0] !== '"') {
        return void 0;
      }
      const startIndex = cursor.index;
      const closingIndex = cursor.text.indexOf('"', cursor.index + 1);
      const endIndex = closingIndex === -1 ? cursor.text.length : closingIndex + 1;
      const raw = cursor.text.slice(startIndex, endIndex);
      cursor.index = endIndex;
      return {
        kind: "literal",
        literalKind: "string",
        value: raw.replace(/^"/, "").replace(/"$/, ""),
        span: spanFrom(cursor, startIndex, endIndex)
      };
    };
    var parseNumberLiteral = (cursor) => {
      const match = NUMBER_TOKEN.exec(cursor.peek());
      if (match === null) {
        return void 0;
      }
      const startIndex = cursor.index;
      cursor.index += match[0].length;
      return { kind: "literal", literalKind: "number", value: match[0], span: spanFrom(cursor, startIndex, cursor.index) };
    };
    var scanOpaqueRun = (cursor) => {
      const startIndex = cursor.index;
      const stack = [];
      const closerFor = { "(": ")", "[": "]", "{": "}" };
      while (cursor.index < cursor.text.length) {
        const ch = cursor.text[cursor.index];
        if (ch === '"' && stack.length === 0) {
          break;
        }
        if (ch === void 0) {
          break;
        }
        if (ch === "(" || ch === "[" || ch === "{") {
          stack.push(closerFor[ch] ?? "");
          cursor.index += 1;
          continue;
        }
        if (ch === ")" || ch === "]" || ch === "}") {
          if (stack.length > 0 && stack[stack.length - 1] === ch) {
            stack.pop();
            cursor.index += 1;
            continue;
          }
          if (stack.length === 0) {
            break;
          }
          cursor.index += 1;
          continue;
        }
        if (stack.length === 0 && (ch === "|" || ch === "&")) {
          break;
        }
        cursor.index += 1;
      }
      return cursor.text.slice(startIndex, cursor.index);
    };
    var parseAtom = (cursor) => {
      cursor.skipWhitespace();
      const readonlyMatch = READONLY_PREFIX.exec(cursor.peek());
      if (readonlyMatch !== null) {
        const startIndex2 = cursor.index;
        cursor.index += readonlyMatch[0].length;
        const element = parseAtom(cursor);
        cursor.skipWhitespace();
        if (cursor.startsWith("[]")) {
          cursor.index += 2;
          return { kind: "array", element, readonly: true, spelling: "suffix", span: spanFrom(cursor, startIndex2, cursor.index) };
        }
        cursor.index = startIndex2;
      }
      if (cursor.startsWith("(")) {
        const startIndex2 = cursor.index;
        cursor.index += 1;
        const inner = parseUnion(cursor);
        cursor.skipWhitespace();
        if (cursor.startsWith(")")) {
          cursor.index += 1;
          return inner;
        }
        cursor.index = startIndex2;
        const text2 = scanOpaqueRun(cursor);
        return { kind: "opaque", text: text2.trim(), span: spanFrom(cursor, startIndex2, cursor.index) };
      }
      const stringLiteral = parseStringLiteral(cursor);
      if (stringLiteral !== void 0) {
        return stringLiteral;
      }
      const numberLiteral = parseNumberLiteral(cursor);
      if (numberLiteral !== void 0) {
        return numberLiteral;
      }
      const qualifiedMatch = QUALIFIED_NAME_TOKEN.exec(cursor.peek());
      if (qualifiedMatch !== null) {
        const startIndex2 = cursor.index;
        cursor.index += qualifiedMatch[0].length;
        return { kind: "opaque", text: qualifiedMatch[0], span: spanFrom(cursor, startIndex2, cursor.index) };
      }
      const namedStartIndex = cursor.index;
      const named = parseNamed(cursor);
      if (named !== void 0) {
        cursor.skipWhitespace();
        if (cursor.startsWith("<")) {
          cursor.index += 1;
          const args2 = [parseUnion(cursor)];
          cursor.skipWhitespace();
          while (cursor.startsWith(",")) {
            cursor.index += 1;
            args2.push(parseUnion(cursor));
            cursor.skipWhitespace();
          }
          if (cursor.startsWith(">")) {
            cursor.index += 1;
          }
          const genericSpan = spanFrom(cursor, namedStartIndex, cursor.index);
          const [onlyArg] = args2;
          if (named.name === "Array" && args2.length === 1 && onlyArg !== void 0) {
            return { kind: "array", element: onlyArg, readonly: false, spelling: "generic", span: genericSpan };
          }
          return { kind: "generic", base: named, args: args2, span: genericSpan };
        }
        return named;
      }
      const startIndex = cursor.index;
      const text = scanOpaqueRun(cursor);
      if (text.length === 0) {
        cursor.index += 1;
        return { kind: "opaque", text: cursor.text.slice(startIndex, cursor.index), span: spanFrom(cursor, startIndex, cursor.index) };
      }
      return { kind: "opaque", text: text.trim(), span: spanFrom(cursor, startIndex, cursor.index) };
    };
    var parsePostfix = (cursor) => {
      const elementStartIndex = cursor.index;
      let result = parseAtom(cursor);
      cursor.skipWhitespace();
      while (cursor.startsWith("[]")) {
        cursor.index += 2;
        result = {
          kind: "array",
          element: result,
          readonly: false,
          spelling: "suffix",
          span: spanFrom(cursor, elementStartIndex, cursor.index)
        };
        cursor.skipWhitespace();
      }
      return result;
    };
    var parseIntersection = (cursor) => {
      const startIndex = cursor.index;
      const members = [parsePostfix(cursor)];
      cursor.skipWhitespace();
      while (cursor.startsWith("&")) {
        cursor.index += 1;
        members.push(parsePostfix(cursor));
        cursor.skipWhitespace();
      }
      if (members.length === 1) {
        const [only] = members;
        if (only !== void 0) {
          return only;
        }
      }
      return { kind: "intersection", members, span: spanFrom(cursor, startIndex, cursor.index) };
    };
    var parseUnion = (cursor) => {
      const startIndex = cursor.index;
      const members = [parseIntersection(cursor)];
      cursor.skipWhitespace();
      while (cursor.startsWith("|")) {
        cursor.index += 1;
        members.push(parseIntersection(cursor));
        cursor.skipWhitespace();
      }
      if (members.length === 1) {
        const [only] = members;
        if (only !== void 0) {
          return only;
        }
      }
      return { kind: "union", members, span: spanFrom(cursor, startIndex, cursor.index) };
    };
    var parseTypeExprText = (text, options = {}) => {
      const cursor = new TextCursor(text, options.baseLine ?? 1, options.baseColumn ?? 1);
      cursor.skipWhitespace();
      const typeExpr = parseUnion(cursor);
      return { typeExpr, remainder: cursor.text.slice(cursor.index) };
    };
    exports2.parseTypeExprText = parseTypeExprText;
  }
});

// ../typed-mind/dist/checker/check-codes.js
var require_check_codes = __commonJS2({
  "../typed-mind/dist/checker/check-codes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resolveSuppressionCode = exports2.RECORDED_RENAMES = exports2.CHECK_CODES = void 0;
    exports2.CHECK_CODES = [
      // check-assets.ts
      "checker/asset-contains-non-program",
      "checker/asset-program-unknown",
      // check-cycles.ts
      "checker/circular-containment",
      "checker/circular-import",
      "checker/circular-inheritance",
      "checker/self-containment",
      "checker/self-inheritance",
      "checker/unknown-base-class",
      "checker/unknown-interface",
      // check-dto-fields.ts (X-TYPE-4/X-TYPE-7)
      "checker/dto-field-function-type",
      "checker/dto-field-non-data-type",
      "checker/dto-field-unknown-type",
      "checker/enum-literal-outside-members",
      // check-duplicate-names.ts
      "checker/duplicate-name",
      // check-entry-point.ts
      "checker/entry-not-file",
      "checker/entry-not-found",
      "checker/no-entry-point",
      // check-exports.ts
      "checker/class-not-exported",
      "checker/function-not-exported",
      "checker/multi-exported",
      "checker/undefined-export",
      // check-function-graph.ts — 'input'/'output' template-literal sites
      // (checkDtoSlot) resolve to four concrete codes; the other two are plain
      // literals.
      "checker/consumes-invalid-kind",
      "checker/consumes-unknown",
      "checker/dependency-direct-consumption",
      "checker/dependency-not-found",
      "checker/input-dto-not-found",
      "checker/input-not-dto",
      "checker/output-dto-not-found",
      "checker/output-not-dto",
      // check-imports.ts
      "checker/import-not-found",
      "checker/import-pattern-unmatched",
      // check-method-calls.ts
      "checker/method-call-on-non-class",
      "checker/unknown-call-target",
      "checker/unknown-method",
      // check-orphans.ts
      "checker/orphaned-entity",
      "checker/orphaned-file",
      // check-reference-legality.ts
      "checker/reference-from-illegal",
      "checker/reference-to-illegal",
      "checker/reference-unknown-type",
      // check-run-parameters.ts
      "checker/consumedby-disagreement",
      "checker/consumedby-non-function",
      "checker/consumedby-unknown-function",
      // check-ui-components.ts
      "checker/affectedby-disagreement",
      "checker/affects-non-uicomponent",
      "checker/affects-unknown",
      "checker/containedby-non-uicomponent",
      "checker/containedby-unknown-parent",
      "checker/contains-non-uicomponent",
      "checker/contains-unknown",
      "checker/uncontained-uicomponent",
      // check-unique-paths.ts
      "checker/duplicate-path",
      // apply-suppressions.ts (X-SUPP-3) — suppression-machinery codes, not
      // suppressible themselves (doc §8's meta-suppression closing rule).
      "checker/meta-suppression-rejected",
      "checker/stale-suppression",
      // pipeline/import-resolver.ts
      "imports/circular",
      "imports/duplicate-name",
      "imports/read-failure",
      // pipeline/forward-semantics.ts
      "semantics/dependency-direct-consumption",
      "semantics/extra-input-dto",
      // pipeline/attachment-rules.ts
      "semantics/illegal-continuation",
      "semantics/orphan-continuation",
      // pipeline/syntax-diagnostics.ts
      "syntax/error",
      "syntax/missing"
    ];
    exports2.RECORDED_RENAMES = /* @__PURE__ */ new Map([]);
    var resolveSuppressionCode = (code) => {
      return exports2.RECORDED_RENAMES.get(code) ?? code;
    };
    exports2.resolveSuppressionCode = resolveSuppressionCode;
  }
});

// ../typed-mind/dist/checker/apply-suppressions.js
var require_apply_suppressions = __commonJS2({
  "../typed-mind/dist/checker/apply-suppressions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.applySuppressions = void 0;
    var check_codes_ts_1 = require_check_codes();
    var NOT_SUPPRESSIBLE_CODE_PREFIX = "checker/suppression-";
    var STALE_SUPPRESSION_CODE = "checker/stale-suppression";
    var META_SUPPRESSION_CODE = "checker/meta-suppression-rejected";
    var isMetaSuppressionCode = (code) => {
      return code === STALE_SUPPRESSION_CODE || code.startsWith(NOT_SUPPRESSIBLE_CODE_PREFIX);
    };
    var startsAtOrAfter = (candidate, boundary) => {
      if (candidate.line !== boundary.line) {
        return candidate.line > boundary.line;
      }
      return candidate.column >= boundary.column;
    };
    var endsAtOrBefore = (candidate, boundary) => {
      if (candidate.line !== boundary.line) {
        return candidate.line < boundary.line;
      }
      return candidate.column <= boundary.column;
    };
    var spanContains = (outer, inner) => {
      return startsAtOrAfter(inner.start, outer.start) && endsAtOrBefore(inner.end, outer.end);
    };
    var matchesFor = (suppression, diagnostics, byName) => {
      const target = byName.get(suppression.target);
      if (target === void 0) {
        return [];
      }
      const resolvedCode = (0, check_codes_ts_1.resolveSuppressionCode)(suppression.code);
      return diagnostics.filter((diagnostic) => diagnostic.code === resolvedCode && spanContains(target.span, diagnostic.span));
    };
    var applySuppressions = (diagnostics, suppressions, byName) => {
      const suppressedDiagnostics = /* @__PURE__ */ new Set();
      const extraFindings = [];
      const suppressionByDiagnostic = /* @__PURE__ */ new Map();
      for (const suppression of suppressions) {
        if (isMetaSuppressionCode((0, check_codes_ts_1.resolveSuppressionCode)(suppression.code))) {
          extraFindings.push({
            code: META_SUPPRESSION_CODE,
            severity: "error",
            span: suppression.span,
            message: `Suppression of '${suppression.code}' is rejected: suppression-machinery codes are not suppressible`
          });
          continue;
        }
        const matches = matchesFor(suppression, diagnostics, byName);
        if (matches.length === 0) {
          extraFindings.push({
            code: STALE_SUPPRESSION_CODE,
            severity: "error",
            span: suppression.span,
            message: `Stale suppression: '${suppression.code}' on '${suppression.target}' matches no finding this run`
          });
          continue;
        }
        for (const match of matches) {
          suppressedDiagnostics.add(match);
          suppressionByDiagnostic.set(match, suppression);
        }
      }
      const projected = diagnostics.map((diagnostic) => {
        const suppression = suppressionByDiagnostic.get(diagnostic);
        if (suppression === void 0) {
          return diagnostic;
        }
        return { ...diagnostic, suppression: { reason: suppression.reason, span: suppression.span } };
      });
      return {
        diagnostics: [...projected, ...extraFindings],
        suppressedCount: suppressedDiagnostics.size
      };
    };
    exports2.applySuppressions = applySuppressions;
  }
});

// ../typed-mind/dist/checker/check-assets.js
var require_check_assets = __commonJS2({
  "../typed-mind/dist/checker/check-assets.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkAssetProgramRelationships = void 0;
    var asset_node_ts_1 = require_asset_node();
    var checkAssetProgramRelationships = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof asset_node_ts_1.AssetNode) || entity.containsProgram === void 0) {
          continue;
        }
        const program = context.byName.get(entity.containsProgram);
        if (program === void 0) {
          context.addFinding({
            code: "checker/asset-program-unknown",
            severity: "error",
            span: entity.span,
            message: `Asset '${entity.name}' references unknown program '${entity.containsProgram}'`,
            suggestion: `Define '${entity.containsProgram}' as a Program entity`
          });
        } else if (program.kind !== "Program") {
          context.addFinding({
            code: "checker/asset-contains-non-program",
            severity: "error",
            span: entity.span,
            message: `Asset '${entity.name}' cannot contain '${entity.containsProgram}' (it's a ${program.kind})`,
            suggestion: "Assets can only contain Program entities"
          });
        }
      }
    };
    exports2.checkAssetProgramRelationships = checkAssetProgramRelationships;
  }
});

// ../typed-mind/dist/checker/check-context.js
var require_check_context = __commonJS2({
  "../typed-mind/dist/checker/check-context.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CheckContext = void 0;
    var spanEquals = (left, right) => {
      return left.start.line === right.start.line && left.start.column === right.start.column && left.end.line === right.end.line && left.end.column === right.end.column;
    };
    var CheckContext = class {
      entities;
      byName;
      links;
      parseDiagnostics;
      #findings = [];
      constructor(args2) {
        this.entities = args2.entities;
        const byName = /* @__PURE__ */ new Map();
        for (const entity of args2.entities) {
          byName.set(entity.name, entity);
        }
        this.byName = byName;
        this.links = args2.links;
        this.parseDiagnostics = args2.parseDiagnostics;
      }
      addFinding(finding) {
        this.#findings.push(finding);
      }
      get findings() {
        return this.#findings;
      }
      // The F4 double-report resolution's match key (§1): a parse-time diagnostic
      // with this code on this exact span means the parse-time report wins and the
      // validator stays silent for it.
      hasParseDiagnostic(code, span) {
        return this.parseDiagnostics.some((diagnostic) => diagnostic.code === code && spanEquals(diagnostic.span, span));
      }
    };
    exports2.CheckContext = CheckContext;
  }
});

// ../typed-mind/dist/checker/check-cycles.js
var require_check_cycles = __commonJS2({
  "../typed-mind/dist/checker/check-cycles.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkInheritanceChains = exports2.checkCircularUiContainment = exports2.checkCircularDeps = void 0;
    var class_file_node_ts_1 = require_class_file_node();
    var class_node_ts_1 = require_class_node();
    var file_node_ts_1 = require_file_node();
    var ui_component_node_ts_1 = require_ui_component_node();
    var walkForCycles = (args2) => {
      const visited = /* @__PURE__ */ new Set();
      const recursionStack = /* @__PURE__ */ new Set();
      const reportedCycles = /* @__PURE__ */ new Set();
      const hasCycle = (node, path) => {
        if (args2.neighborsOf(node) === void 0) {
          return null;
        }
        visited.add(node);
        recursionStack.add(node);
        path.push(node);
        for (const neighbor of args2.neighborsOf(node) ?? []) {
          if (neighbor === node && args2.onSelfReference !== void 0) {
            args2.onSelfReference(node);
            continue;
          }
          if (!visited.has(neighbor)) {
            const cycle = hasCycle(neighbor, [...path]);
            if (cycle) {
              return cycle;
            }
          } else if (recursionStack.has(neighbor)) {
            return [...path, neighbor];
          }
        }
        recursionStack.delete(node);
        return null;
      };
      for (const node of args2.nodes) {
        if (visited.has(node)) {
          continue;
        }
        const cycle = hasCycle(node, []);
        if (cycle) {
          const cycleKey = [...cycle].sort().join("->");
          if (!reportedCycles.has(cycleKey)) {
            reportedCycles.add(cycleKey);
            args2.onCycle(node, cycle);
          }
        }
      }
    };
    var checkCircularDeps = (context) => {
      const importGraph = /* @__PURE__ */ new Map();
      for (const [name2, entity] of context.byName) {
        if (entity instanceof file_node_ts_1.FileNode || entity instanceof class_file_node_ts_1.ClassFileNode) {
          const fileImports = entity.imports.filter((imported) => {
            const target = context.byName.get(imported);
            return target !== void 0 && (target.kind === "File" || target.kind === "ClassFile");
          });
          importGraph.set(name2, fileImports);
        }
      }
      walkForCycles({
        nodes: [...importGraph.keys()],
        neighborsOf: (node) => importGraph.get(node),
        onCycle: (root, cycle) => {
          const entity = context.byName.get(root);
          if (entity !== void 0) {
            context.addFinding({
              code: "checker/circular-import",
              severity: "error",
              span: entity.span,
              message: `Circular import detected: ${cycle.join(" -> ")}`,
              suggestion: "Break the circular dependency by refactoring shared code into a separate module"
            });
          }
        }
      });
    };
    exports2.checkCircularDeps = checkCircularDeps;
    var checkCircularUiContainment = (context) => {
      const containmentGraph = /* @__PURE__ */ new Map();
      for (const [name2, entity] of context.byName) {
        if (entity instanceof ui_component_node_ts_1.UiComponentNode && entity.contains !== void 0) {
          containmentGraph.set(name2, entity.contains);
        }
      }
      walkForCycles({
        nodes: [...containmentGraph.keys()],
        neighborsOf: (node) => containmentGraph.get(node),
        onSelfReference: (node) => {
          const entity = context.byName.get(node);
          if (entity !== void 0) {
            context.addFinding({
              code: "checker/self-containment",
              severity: "error",
              span: entity.span,
              message: `UIComponent '${node}' contains itself`,
              suggestion: "Remove self-reference from the contains list"
            });
          }
        },
        onCycle: (root, cycle) => {
          const entity = context.byName.get(root);
          if (entity !== void 0) {
            context.addFinding({
              code: "checker/circular-containment",
              severity: "error",
              span: entity.span,
              message: `UIComponent '${root}' has circular containment: ${cycle.join(" -> ")}`,
              suggestion: "Break the circular containment by removing one of the contains relationships"
            });
          }
        }
      });
    };
    exports2.checkCircularUiContainment = checkCircularUiContainment;
    var checkInheritanceChains = (context) => {
      const inheritanceGraph = /* @__PURE__ */ new Map();
      for (const [name2, entity] of context.byName) {
        if (!(entity instanceof class_node_ts_1.ClassNode || entity instanceof class_file_node_ts_1.ClassFileNode)) {
          continue;
        }
        if (entity.extends !== void 0) {
          inheritanceGraph.set(name2, entity.extends);
          if (entity.extends === name2) {
            context.addFinding({
              code: "checker/self-inheritance",
              severity: "error",
              span: entity.span,
              message: `Class '${name2}' inherits from itself`,
              suggestion: "Remove the self-inheritance or choose a different base class"
            });
          } else if (!context.byName.has(entity.extends)) {
            context.addFinding({
              code: "checker/unknown-base-class",
              severity: "error",
              span: entity.span,
              message: `Class '${name2}' extends '${entity.extends}' which does not exist`,
              suggestion: `Define '${entity.extends}' as a Class or ClassFile entity`
            });
          }
        }
        if (entity.extends === name2) {
          continue;
        }
        for (const implemented of entity.implements) {
          if (!context.byName.has(implemented)) {
            context.addFinding({
              code: "checker/unknown-interface",
              severity: "error",
              span: entity.span,
              message: `Class '${name2}' implements '${implemented}' which does not exist`,
              suggestion: `Define '${implemented}' as a Class or ClassFile entity`
            });
          }
        }
      }
      walkForCycles({
        nodes: [...inheritanceGraph.keys()],
        neighborsOf: (node) => {
          const parent = inheritanceGraph.get(node);
          return parent === void 0 ? void 0 : [parent];
        },
        onCycle: (root, cycle) => {
          const entity = context.byName.get(root);
          if (entity !== void 0) {
            context.addFinding({
              code: "checker/circular-inheritance",
              severity: "error",
              span: entity.span,
              message: `Class '${root}' has circular inheritance: ${cycle.join(" -> ")}`,
              suggestion: "Break the circular inheritance by removing one of the extends relationships"
            });
          }
        }
      });
    };
    exports2.checkInheritanceChains = checkInheritanceChains;
  }
});

// ../typed-mind/dist/checker/check-dto-fields.js
var require_check_dto_fields = __commonJS2({
  "../typed-mind/dist/checker/check-dto-fields.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkDtoFieldTypes = void 0;
    var dto_node_ts_1 = require_dto_node();
    var type_def_node_ts_1 = require_type_def_node();
    var PRIMITIVES = [
      "string",
      "number",
      "boolean",
      "object",
      "any",
      "void",
      "null",
      "undefined",
      "Date",
      "Array",
      "Promise",
      "Map",
      "Set",
      "Record",
      "Partial",
      "Required",
      "Pick",
      "Omit"
    ];
    var isPrimitiveType = (typeName) => {
      return PRIMITIVES.includes(typeName);
    };
    var isDataTypeKind = (kind) => {
      return kind === "DTO" || kind === "Class" || kind === "TypeDef";
    };
    var checkNamedPart = (context, entity, fieldName, name2, span) => {
      if (isPrimitiveType(name2)) {
        return;
      }
      if (!/^[A-Z]/.test(name2)) {
        return;
      }
      const referenced = context.byName.get(name2);
      if (referenced === void 0) {
        context.addFinding({
          code: "checker/dto-field-unknown-type",
          severity: "error",
          span,
          message: `DTO '${entity.name}' field '${fieldName}' references undefined type '${name2}'`,
          suggestion: `Define '${name2}' as a DTO or Class entity`
        });
        return;
      }
      if (!isDataTypeKind(referenced.kind)) {
        context.addFinding({
          code: "checker/dto-field-non-data-type",
          severity: "error",
          span,
          message: `DTO '${entity.name}' field '${fieldName}' references '${name2}' which is a ${referenced.kind}, not a DTO or Class`,
          suggestion: "Field types should reference DTO or Class entities for complex types"
        });
      }
    };
    var walkTypeExpr = (context, entity, fieldName, node) => {
      switch (node.kind) {
        case "named":
          checkNamedPart(context, entity, fieldName, node.name, node.span);
          return;
        case "generic":
          checkNamedPart(context, entity, fieldName, node.base.name, node.base.span);
          for (const arg of node.args) {
            walkTypeExpr(context, entity, fieldName, arg);
          }
          return;
        case "union":
        case "intersection":
          for (const member of node.members) {
            walkTypeExpr(context, entity, fieldName, member);
          }
          return;
        case "array":
          walkTypeExpr(context, entity, fieldName, node.element);
          return;
        case "literal":
          return;
        // passes (doc §4)
        case "opaque":
          return;
      }
    };
    var checkEnumClosedSet = (context, entity, fieldName, node) => {
      if (node.kind !== "union") {
        return;
      }
      let enumDef;
      const literalMembers = [];
      for (const member of node.members) {
        if (member.kind === "named") {
          const referenced = context.byName.get(member.name);
          if (referenced instanceof type_def_node_ts_1.TypeDefNode && referenced.variant === "enum") {
            enumDef ??= referenced;
          }
          continue;
        }
        if (member.kind === "literal" && member.literalKind === "string") {
          literalMembers.push({ value: member.value, span: member.span });
        }
      }
      if (enumDef === void 0 || literalMembers.length === 0) {
        return;
      }
      const memberSet = new Set(enumDef.members ?? []);
      for (const literal of literalMembers) {
        if (!memberSet.has(literal.value)) {
          context.addFinding({
            code: "checker/enum-literal-outside-members",
            severity: "error",
            span: literal.span,
            message: `DTO '${entity.name}' field '${fieldName}' union literal '${literal.value}' is not a member of enum '${enumDef.name}'`,
            suggestion: `Use one of: ${[...memberSet].join(", ")}`
          });
        }
      }
    };
    var checkDtoFieldTypes = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof dto_node_ts_1.DtoNode)) {
          continue;
        }
        for (const field of entity.fields) {
          if (!field.type) {
            continue;
          }
          if (field.type === "Function" || /\bFunction\b/.test(field.type)) {
            context.addFinding({
              code: "checker/dto-field-function-type",
              severity: "error",
              span: entity.span,
              message: `DTO '${entity.name}' field '${field.name}' cannot have Function type`,
              suggestion: "DTOs should only contain data fields. Use string, number, boolean, object, array, or other data types instead"
            });
            continue;
          }
          walkTypeExpr(context, entity, field.name, field.typeExpr);
          checkEnumClosedSet(context, entity, field.name, field.typeExpr);
        }
      }
    };
    exports2.checkDtoFieldTypes = checkDtoFieldTypes;
  }
});

// ../typed-mind/dist/checker/check-duplicate-names.js
var require_check_duplicate_names = __commonJS2({
  "../typed-mind/dist/checker/check-duplicate-names.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkDuplicateNames = void 0;
    var class_node_ts_1 = require_class_node();
    var file_node_ts_1 = require_file_node();
    var FUSION_MESSAGE = (name2) => {
      return `Entity name '${name2}' is used by both a File and a Class. Consider using the #: operator for class-file fusion.`;
    };
    var checkDuplicateNames = (context) => {
      const groups = /* @__PURE__ */ new Map();
      for (const entity of context.entities) {
        const group = groups.get(entity.name) ?? [];
        group.push(entity);
        groups.set(entity.name, group);
      }
      for (const [name2, group] of groups) {
        if (group.length < 2) {
          continue;
        }
        const classMember = group.find((entity) => entity instanceof class_node_ts_1.ClassNode);
        const fileMember = group.find((entity) => entity instanceof file_node_ts_1.FileNode);
        const fusionPair = classMember !== void 0 && fileMember !== void 0;
        const kinds = group.map((entity) => entity.kind).join(", ");
        for (const entity of group) {
          if (fusionPair && (entity instanceof class_node_ts_1.ClassNode || entity instanceof file_node_ts_1.FileNode)) {
            context.addFinding({
              code: "checker/duplicate-name",
              severity: "error",
              span: entity.span,
              message: FUSION_MESSAGE(name2),
              suggestion: `Replace with: ${name2} #: ${fileMember.path} <: BaseClass`
            });
            continue;
          }
          context.addFinding({
            code: "checker/duplicate-name",
            severity: "error",
            span: entity.span,
            message: `Duplicate entity name '${name2}' found in multiple ${kinds} entities`,
            suggestion: "Entity names must be unique across the entire codebase"
          });
        }
      }
    };
    exports2.checkDuplicateNames = checkDuplicateNames;
  }
});

// ../typed-mind/dist/checker/check-entry-point.js
var require_check_entry_point = __commonJS2({
  "../typed-mind/dist/checker/check-entry-point.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkEntryPoint = void 0;
    var program_node_ts_1 = require_program_node();
    var DOCUMENT_ORIGIN_LINE = 1;
    var DOCUMENT_ORIGIN_COLUMN = 1;
    var documentOriginSpan = () => {
      const origin = { line: DOCUMENT_ORIGIN_LINE, column: DOCUMENT_ORIGIN_COLUMN };
      return { start: origin, end: origin };
    };
    var checkEntryPoint = (context) => {
      const programs = [...context.byName.values()].filter((entity) => entity instanceof program_node_ts_1.ProgramNode);
      if (programs.length === 0) {
        context.addFinding({
          code: "checker/no-entry-point",
          severity: "error",
          span: documentOriginSpan(),
          message: "No program entry point defined",
          suggestion: "Add a Program entity: AppName -> EntryFile"
        });
      }
      for (const program of programs) {
        const entryFile = context.byName.get(program.entry);
        if (entryFile === void 0) {
          context.addFinding({
            code: "checker/entry-not-found",
            severity: "error",
            span: program.span,
            message: `Program '${program.name}' references undefined entry point '${program.entry}'`,
            suggestion: `Define a File entity: ${program.entry} @ path/to/file.ext:`
          });
        } else if (entryFile.kind !== "File") {
          context.addFinding({
            code: "checker/entry-not-file",
            severity: "error",
            span: program.span,
            message: `Program '${program.name}' entry point '${program.entry}' must be a File entity, but found ${entryFile.kind}`,
            suggestion: `Change '${program.entry}' to a File entity: ${program.entry} @ path/to/file.ext:`
          });
        }
      }
    };
    exports2.checkEntryPoint = checkEntryPoint;
  }
});

// ../typed-mind/dist/checker/check-exports.js
var require_check_exports = __commonJS2({
  "../typed-mind/dist/checker/check-exports.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkUndefinedExports = exports2.checkDuplicateExports = exports2.checkClassAndFunctionExports = void 0;
    var class_file_node_ts_1 = require_class_file_node();
    var class_node_ts_1 = require_class_node();
    var dependency_node_ts_1 = require_dependency_node();
    var file_node_ts_1 = require_file_node();
    var function_node_ts_1 = require_function_node();
    var program_node_ts_1 = require_program_node();
    var exportsOf = (entity) => {
      if (entity instanceof file_node_ts_1.FileNode || entity instanceof class_file_node_ts_1.ClassFileNode) {
        return entity.exports;
      }
      if (entity instanceof program_node_ts_1.ProgramNode || entity instanceof dependency_node_ts_1.DependencyNode) {
        return entity.exports;
      }
      return void 0;
    };
    var methodsOf = (entity) => {
      if (entity instanceof class_node_ts_1.ClassNode || entity instanceof class_file_node_ts_1.ClassFileNode) {
        return entity.methods;
      }
      return void 0;
    };
    var checkClassAndFunctionExports = (context) => {
      const exportedEntities = /* @__PURE__ */ new Set();
      const classMethods = /* @__PURE__ */ new Set();
      for (const entity of context.byName.values()) {
        for (const exported of exportsOf(entity) ?? []) {
          exportedEntities.add(exported);
        }
        for (const method of methodsOf(entity) ?? []) {
          classMethods.add(method);
        }
      }
      for (const [name2, entity] of context.byName) {
        if (entity instanceof class_node_ts_1.ClassNode && !exportedEntities.has(name2)) {
          context.addFinding({
            code: "checker/class-not-exported",
            severity: "error",
            span: entity.span,
            message: `Class '${name2}' is not exported by any file`,
            suggestion: `Add '${name2}' to the exports of a file entity or convert to ClassFile with #: operator`
          });
        } else if (entity instanceof function_node_ts_1.FunctionNode && !exportedEntities.has(name2) && !classMethods.has(name2)) {
          context.addFinding({
            code: "checker/function-not-exported",
            severity: "error",
            span: entity.span,
            message: `Function '${name2}' is not exported by any file and is not a class method`,
            suggestion: `Either add '${name2}' to the exports of a file entity or define it as a method of a class`
          });
        }
      }
    };
    exports2.checkClassAndFunctionExports = checkClassAndFunctionExports;
    var checkDuplicateExports = (context) => {
      const exportMap = /* @__PURE__ */ new Map();
      for (const entity of context.byName.values()) {
        for (const exported of exportsOf(entity) ?? []) {
          const exporters = exportMap.get(exported) ?? [];
          exporters.push(entity);
          exportMap.set(exported, exporters);
        }
      }
      for (const [exportName, exporters] of exportMap) {
        if (exporters.length > 1) {
          const isEntity = context.byName.has(exportName);
          const first = exporters[0];
          if (isEntity && first !== void 0) {
            context.addFinding({
              code: "checker/multi-exported",
              severity: "error",
              span: first.span,
              message: `Entity '${exportName}' is exported by multiple files: ${exporters.map((exporter) => exporter.name).join(", ")}`,
              suggestion: "Each entity should be exported by exactly one file. Remove the duplicate exports."
            });
          }
        }
      }
    };
    exports2.checkDuplicateExports = checkDuplicateExports;
    var checkUndefinedExports = (context) => {
      for (const entity of context.byName.values()) {
        if (entity.kind === "Dependency") {
          continue;
        }
        for (const exported of exportsOf(entity) ?? []) {
          if (!context.byName.has(exported)) {
            context.addFinding({
              code: "checker/undefined-export",
              severity: "error",
              span: entity.span,
              message: `Export '${exported}' is not defined anywhere in the codebase`,
              suggestion: `Define '${exported}' as a Function, Class, Constants, Asset, or UIComponent entity`
            });
          }
        }
      }
    };
    exports2.checkUndefinedExports = checkUndefinedExports;
  }
});

// ../typed-mind/dist/checker/check-function-graph.js
var require_check_function_graph = __commonJS2({
  "../typed-mind/dist/checker/check-function-graph.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkFunctionConsumption = exports2.checkFunctionDependencies = exports2.checkFunctionDtos = void 0;
    var dependency_node_ts_1 = require_dependency_node();
    var function_node_ts_1 = require_function_node();
    var isDtoExportedByDependency = (context, dtoName) => {
      for (const entity of context.byName.values()) {
        if (entity instanceof dependency_node_ts_1.DependencyNode && entity.exports !== void 0 && entity.exports.includes(dtoName)) {
          return true;
        }
      }
      return false;
    };
    var checkDtoSlot = (context, fn, slot, dtoName) => {
      const target = context.byName.get(dtoName);
      if (target === void 0) {
        if (!isDtoExportedByDependency(context, dtoName)) {
          context.addFinding({
            code: `checker/${slot}-dto-not-found`,
            severity: "error",
            span: fn.span,
            message: `Function ${slot} DTO '${dtoName}' not found`,
            suggestion: `Define '${dtoName}' as a DTO entity or import it from a dependency`
          });
        }
      } else if (target.kind !== "DTO") {
        context.addFinding({
          code: `checker/${slot}-not-dto`,
          severity: "error",
          span: fn.span,
          message: `Function ${slot} '${dtoName}' is not a DTO (it's a ${target.kind})`,
          suggestion: `Change '${dtoName}' to a DTO or use a different ${slot} type`
        });
      }
    };
    var checkFunctionDtos = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof function_node_ts_1.FunctionNode)) {
          continue;
        }
        if (entity.input !== void 0) {
          checkDtoSlot(context, entity, "input", entity.input);
        }
        if (entity.output !== void 0) {
          checkDtoSlot(context, entity, "output", entity.output);
        }
      }
    };
    exports2.checkFunctionDtos = checkFunctionDtos;
    var checkFunctionDependencies = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof function_node_ts_1.FunctionNode)) {
          continue;
        }
        for (const dependencyName of entity.pendingDependencies) {
          const target = context.byName.get(dependencyName);
          if (target === void 0) {
            context.addFinding({
              code: "checker/dependency-not-found",
              severity: "error",
              span: entity.span,
              message: `Function dependency '${dependencyName}' not found`,
              suggestion: `Define '${dependencyName}' as an entity or remove it from the dependency list`
            });
          } else if (target.kind === "Dependency") {
            if (context.hasParseDiagnostic("semantics/dependency-direct-consumption", entity.span)) {
              continue;
            }
            context.addFinding({
              code: "checker/dependency-direct-consumption",
              severity: "error",
              span: entity.span,
              message: `Cannot directly consume dependency '${dependencyName}' in function '${entity.name}'`,
              suggestion: `Import specific entities from '${dependencyName}' instead. If '${dependencyName}' exports entities, add them with '-> [EntityName]' and import those entities in your files.`
            });
          }
        }
      }
    };
    exports2.checkFunctionDependencies = checkFunctionDependencies;
    var VALID_CONSUME_KINDS = ["RunParameter", "Asset", "Dependency", "Constants"];
    var checkFunctionConsumption = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof function_node_ts_1.FunctionNode)) {
          continue;
        }
        for (const consumeName of entity.consumes ?? []) {
          const target = context.byName.get(consumeName);
          if (target === void 0) {
            context.addFinding({
              code: "checker/consumes-unknown",
              severity: "error",
              span: entity.span,
              message: `Function '${entity.name}' consumes unknown entity '${consumeName}'`,
              suggestion: `Define '${consumeName}' as one of: ${VALID_CONSUME_KINDS.join(", ")}`
            });
          } else if (!VALID_CONSUME_KINDS.includes(target.kind)) {
            context.addFinding({
              code: "checker/consumes-invalid-kind",
              severity: "error",
              span: entity.span,
              message: `Function '${entity.name}' cannot consume '${consumeName}' (it's a ${target.kind})`,
              suggestion: `Functions can only consume: ${VALID_CONSUME_KINDS.join(", ")}`
            });
          }
        }
      }
    };
    exports2.checkFunctionConsumption = checkFunctionConsumption;
  }
});

// ../typed-mind/dist/checker/name-similarity.js
var require_name_similarity = __commonJS2({
  "../typed-mind/dist/checker/name-similarity.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.findSimilar = exports2.similarity = void 0;
    var similarity = (a, b) => {
      if (a === b) {
        return 1;
      }
      if (a.length === 0 || b.length === 0) {
        return 0;
      }
      const matrix = [];
      for (let i2 = 0; i2 <= b.length; i2++) {
        matrix[i2] = [];
        for (let j = 0; j <= a.length; j++) {
          if (i2 === 0) {
            matrix[i2][j] = j;
          } else if (j === 0) {
            matrix[i2][j] = i2;
          } else {
            matrix[i2][j] = 0;
          }
        }
      }
      for (let i2 = 1; i2 <= b.length; i2++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i2 - 1) === a.charAt(j - 1)) {
            matrix[i2][j] = matrix[i2 - 1][j - 1];
          } else {
            matrix[i2][j] = Math.min(
              matrix[i2 - 1][j - 1] + 1,
              // substitution
              matrix[i2][j - 1] + 1,
              // insertion
              matrix[i2 - 1][j] + 1
            );
          }
        }
      }
      const distance = matrix[b.length][a.length];
      return 1 - distance / Math.max(a.length, b.length);
    };
    exports2.similarity = similarity;
    var findSimilar = (target, candidateNames) => {
      let bestMatch = "";
      let bestScore = 0.6;
      for (const name2 of candidateNames) {
        const score = (0, exports2.similarity)(target.toLowerCase(), name2.toLowerCase());
        if (score > bestScore) {
          bestScore = score;
          bestMatch = name2;
        }
      }
      return bestMatch || null;
    };
    exports2.findSimilar = findSimilar;
  }
});

// ../typed-mind/dist/checker/check-imports.js
var require_check_imports = __commonJS2({
  "../typed-mind/dist/checker/check-imports.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkImports = void 0;
    var class_file_node_ts_1 = require_class_file_node();
    var file_node_ts_1 = require_file_node();
    var name_similarity_ts_1 = require_name_similarity();
    var importsOf = (entity) => {
      if (entity instanceof file_node_ts_1.FileNode || entity instanceof class_file_node_ts_1.ClassFileNode) {
        return entity.imports;
      }
      return void 0;
    };
    var checkImports = (context) => {
      for (const entity of context.byName.values()) {
        const imports = importsOf(entity);
        if (imports === void 0) {
          continue;
        }
        for (const imported of imports) {
          if (imported.includes("*")) {
            const base = imported.split("*")[0] ?? "";
            const hasMatch = [...context.byName.keys()].some((name2) => name2.startsWith(base));
            if (!hasMatch) {
              context.addFinding({
                code: "checker/import-pattern-unmatched",
                severity: "error",
                span: entity.span,
                message: `No entities match import pattern '${imported}'`
              });
            }
          } else if (!context.byName.has(imported)) {
            const isDependency = [...context.byName.values()].some((candidate) => candidate.kind === "Dependency" && candidate.name === imported);
            if (!isDependency) {
              const suggestion = (0, name_similarity_ts_1.findSimilar)(imported, context.byName.keys());
              const finding = {
                code: "checker/import-not-found",
                severity: "error",
                span: entity.span,
                message: `Import '${imported}' not found`,
                ...suggestion === null ? {} : { suggestion: `Did you mean '${suggestion}'?` }
              };
              context.addFinding(finding);
            }
          }
        }
      }
    };
    exports2.checkImports = checkImports;
  }
});

// ../typed-mind/dist/checker/check-method-calls.js
var require_check_method_calls = __commonJS2({
  "../typed-mind/dist/checker/check-method-calls.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkMethodCalls = void 0;
    var class_file_node_ts_1 = require_class_file_node();
    var class_node_ts_1 = require_class_node();
    var function_node_ts_1 = require_function_node();
    var checkMethodCalls = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof function_node_ts_1.FunctionNode)) {
          continue;
        }
        for (const call of entity.calls) {
          if (!call.includes(".")) {
            continue;
          }
          const [objectName = "", methodName = ""] = call.split(".", 2);
          const targetEntity = context.byName.get(objectName);
          if (targetEntity === void 0) {
            context.addFinding({
              code: "checker/unknown-call-target",
              severity: "error",
              span: entity.span,
              message: `Call to '${call}' references unknown entity '${objectName}'`
            });
          } else if (!(targetEntity instanceof class_node_ts_1.ClassNode || targetEntity instanceof class_file_node_ts_1.ClassFileNode)) {
            context.addFinding({
              code: "checker/method-call-on-non-class",
              severity: "error",
              span: entity.span,
              message: `Cannot call method '${methodName}' on ${targetEntity.kind} '${objectName}'. Only Classes and ClassFiles can have methods`,
              suggestion: `Either define '${objectName}' as a Class/ClassFile or use a different call syntax`
            });
          } else if (!targetEntity.methods.includes(methodName)) {
            context.addFinding({
              code: "checker/unknown-method",
              severity: "error",
              span: entity.span,
              message: `Method '${methodName}' not found on ${targetEntity.kind.toLowerCase()} '${objectName}'`,
              suggestion: `Available methods: ${targetEntity.methods.join(", ")}`
            });
          }
        }
      }
    };
    exports2.checkMethodCalls = checkMethodCalls;
  }
});

// ../typed-mind/dist/checker/check-orphans.js
var require_check_orphans = __commonJS2({
  "../typed-mind/dist/checker/check-orphans.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkOrphans = void 0;
    var asset_node_ts_1 = require_asset_node();
    var class_file_node_ts_1 = require_class_file_node();
    var class_node_ts_1 = require_class_node();
    var file_node_ts_1 = require_file_node();
    var function_node_ts_1 = require_function_node();
    var program_node_ts_1 = require_program_node();
    var ui_component_node_ts_1 = require_ui_component_node();
    var importsOf = (entity) => {
      if (entity instanceof file_node_ts_1.FileNode || entity instanceof class_file_node_ts_1.ClassFileNode) {
        return entity.imports;
      }
      return void 0;
    };
    var collectReferencedNames = (context) => {
      const referenced = /* @__PURE__ */ new Set();
      for (const entity of context.byName.values()) {
        for (const imported of importsOf(entity) ?? []) {
          if (!imported.includes("*")) {
            referenced.add(imported);
          }
        }
        if (entity instanceof function_node_ts_1.FunctionNode) {
          for (const call of entity.calls) {
            referenced.add(call);
          }
          if (entity.input !== void 0) {
            referenced.add(entity.input);
          }
          if (entity.output !== void 0) {
            referenced.add(entity.output);
          }
          for (const consumed of entity.consumes ?? []) {
            referenced.add(consumed);
          }
        }
        if (entity instanceof class_node_ts_1.ClassNode || entity instanceof class_file_node_ts_1.ClassFileNode) {
          for (const method of entity.methods) {
            referenced.add(method);
          }
        }
        if (entity instanceof program_node_ts_1.ProgramNode) {
          referenced.add(entity.entry);
          for (const exported of entity.exports ?? []) {
            referenced.add(exported);
          }
        }
        if (entity instanceof ui_component_node_ts_1.UiComponentNode) {
          for (const child of entity.contains ?? []) {
            referenced.add(child);
          }
        }
        if (entity instanceof asset_node_ts_1.AssetNode && entity.containsProgram !== void 0) {
          referenced.add(entity.containsProgram);
        }
      }
      return referenced;
    };
    var isEntityImported = (context, entityName) => {
      for (const entity of context.byName.values()) {
        for (const imported of importsOf(entity) ?? []) {
          if (imported === entityName) {
            return true;
          }
          if (imported.includes("*")) {
            const base = imported.split("*")[0] ?? "";
            if (entityName.startsWith(base)) {
              return true;
            }
          }
        }
      }
      return false;
    };
    var isFileConsumed = (context, file) => {
      for (const exportName of file.exports) {
        if (isEntityImported(context, exportName)) {
          return true;
        }
      }
      return false;
    };
    var checkOrphans = (context) => {
      const referenced = collectReferencedNames(context);
      for (const [name2, entity] of context.byName) {
        if (referenced.has(name2) || entity.kind === "Program" || entity.kind === "Dependency") {
          continue;
        }
        if (entity instanceof file_node_ts_1.FileNode) {
          if (!isFileConsumed(context, entity)) {
            context.addFinding({
              code: "checker/orphaned-file",
              severity: "error",
              span: entity.span,
              message: `Orphaned file '${name2}' - none of its exports are imported`,
              suggestion: "Remove this file or import its exports somewhere"
            });
          }
          continue;
        }
        context.addFinding({
          code: "checker/orphaned-entity",
          severity: "error",
          span: entity.span,
          message: `Orphaned entity '${name2}'`,
          suggestion: "Remove or reference this entity"
        });
      }
    };
    exports2.checkOrphans = checkOrphans;
  }
});

// ../typed-mind/dist/checker/valid-references.js
var require_valid_references = __commonJS2({
  "../typed-mind/dist/checker/valid-references.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.VALID_REFERENCES = void 0;
    exports2.VALID_REFERENCES = {
      imports: {
        from: ["File", "Class", "ClassFile"],
        to: ["Function", "Class", "ClassFile", "Constants", "DTO", "Asset", "UIComponent", "RunParameter", "File", "Dependency"]
      },
      exports: {
        from: ["File", "ClassFile", "Program", "Dependency"],
        to: ["Function", "Class", "ClassFile", "Constants", "DTO", "Asset", "UIComponent", "File"]
      },
      calls: {
        from: ["Function"],
        to: ["Function", "Class"]
        // Class is allowed because of method calls
      },
      extends: {
        from: ["Class", "ClassFile"],
        to: ["Class", "ClassFile"]
      },
      implements: {
        from: ["Class", "ClassFile"],
        to: ["Class", "ClassFile"]
        // In TypedMind, interfaces are represented as Classes
      },
      contains: {
        from: ["UIComponent"],
        to: ["UIComponent"]
      },
      containedBy: {
        from: ["UIComponent"],
        to: ["UIComponent"]
      },
      affects: {
        from: ["Function"],
        to: ["UIComponent"]
      },
      affectedBy: {
        from: ["UIComponent"],
        to: ["Function"]
      },
      consumes: {
        from: ["Function"],
        to: ["RunParameter", "Asset", "Dependency", "Constants"]
      },
      consumedBy: {
        from: ["RunParameter"],
        to: ["Function"]
      },
      input: {
        from: ["Function"],
        to: ["DTO"]
      },
      output: {
        from: ["Function"],
        to: ["DTO"]
      },
      entry: {
        from: ["Program"],
        to: ["File"]
      },
      containsProgram: {
        from: ["Asset"],
        to: ["Program"]
      },
      schema: {
        from: ["Constants"],
        // RFC-TM-8 §5 (rfc-tm-8-diamond.md, X-TYPE-7): TypeDef joins the legal
        // schema-reference targets — a Constants entity's schema may now name an
        // enum or alias TypeDef, not only a Class or DTO.
        to: ["Class", "DTO", "TypeDef"]
        // Schema can reference a type definition
      }
    };
  }
});

// ../typed-mind/dist/checker/check-reference-legality.js
var require_check_reference_legality = __commonJS2({
  "../typed-mind/dist/checker/check-reference-legality.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkReferenceLegality = exports2.checkSingleReference = void 0;
    var asset_node_ts_1 = require_asset_node();
    var class_file_node_ts_1 = require_class_file_node();
    var class_node_ts_1 = require_class_node();
    var constants_node_ts_1 = require_constants_node();
    var dependency_node_ts_1 = require_dependency_node();
    var file_node_ts_1 = require_file_node();
    var function_node_ts_1 = require_function_node();
    var program_node_ts_1 = require_program_node();
    var run_parameter_node_ts_1 = require_run_parameter_node();
    var ui_component_node_ts_1 = require_ui_component_node();
    var valid_references_ts_1 = require_valid_references();
    var checkSingleReference = (context, from, referenceKind, targetName) => {
      const target = context.byName.get(targetName);
      if (target === void 0) {
        return;
      }
      const legality = valid_references_ts_1.VALID_REFERENCES[referenceKind];
      if (legality === void 0) {
        context.addFinding({
          code: "checker/reference-unknown-type",
          severity: "error",
          span: from.span,
          message: `Unknown reference type '${referenceKind}'`
        });
        return;
      }
      if (!legality.from.includes(from.kind)) {
        context.addFinding({
          code: "checker/reference-from-illegal",
          severity: "error",
          span: from.span,
          message: `${from.kind} '${from.name}' cannot have '${referenceKind}' references`,
          suggestion: `Only ${legality.from.join(", ")} entities can have '${referenceKind}' references`
        });
        return;
      }
      if (!legality.to.includes(target.kind)) {
        context.addFinding({
          code: "checker/reference-to-illegal",
          severity: "error",
          span: from.span,
          message: `Cannot use '${referenceKind}' to reference ${target.kind} '${targetName}'`,
          suggestion: `'${referenceKind}' can only reference: ${legality.to.join(", ")}`
        });
      }
    };
    exports2.checkSingleReference = checkSingleReference;
    var checkImportsOf = (context, from, imports) => {
      for (const imported of imports) {
        if (imported.includes("*")) {
          continue;
        }
        const target = context.byName.get(imported);
        if (target !== void 0 && target.kind === "Dependency") {
          continue;
        }
        (0, exports2.checkSingleReference)(context, from, "imports", imported);
      }
    };
    var isLegacyClass = (entity) => {
      return entity instanceof class_node_ts_1.ClassNode || entity instanceof class_file_node_ts_1.ClassFileNode && !entity.raw.includes("#:");
    };
    var checkFunctionReferences = (context, fn) => {
      for (const call of fn.calls) {
        const callTarget = call.includes(".") ? call.split(".").at(0) ?? call : call;
        (0, exports2.checkSingleReference)(context, fn, "calls", callTarget);
      }
      if (fn.input !== void 0) {
        (0, exports2.checkSingleReference)(context, fn, "input", fn.input);
      }
      if (fn.output !== void 0) {
        (0, exports2.checkSingleReference)(context, fn, "output", fn.output);
      }
      for (const consumed of fn.consumes ?? []) {
        (0, exports2.checkSingleReference)(context, fn, "consumes", consumed);
      }
      for (const affected of fn.affects ?? []) {
        (0, exports2.checkSingleReference)(context, fn, "affects", affected);
      }
    };
    var checkEntityReferences = (context, entity) => {
      if (entity instanceof file_node_ts_1.FileNode) {
        checkImportsOf(context, entity, entity.imports);
        for (const exported of entity.exports) {
          (0, exports2.checkSingleReference)(context, entity, "exports", exported);
        }
      } else if (entity instanceof class_file_node_ts_1.ClassFileNode) {
        checkImportsOf(context, entity, entity.imports);
        for (const exported of entity.exports) {
          (0, exports2.checkSingleReference)(context, entity, "exports", exported);
        }
        if (isLegacyClass(entity)) {
          if (entity.extends !== void 0) {
            (0, exports2.checkSingleReference)(context, entity, "extends", entity.extends);
          }
          for (const implemented of entity.implements) {
            (0, exports2.checkSingleReference)(context, entity, "implements", implemented);
          }
        }
      } else if (entity instanceof class_node_ts_1.ClassNode) {
        if (entity.extends !== void 0) {
          (0, exports2.checkSingleReference)(context, entity, "extends", entity.extends);
        }
        for (const implemented of entity.implements) {
          (0, exports2.checkSingleReference)(context, entity, "implements", implemented);
        }
      } else if (entity instanceof program_node_ts_1.ProgramNode) {
        (0, exports2.checkSingleReference)(context, entity, "entry", entity.entry);
        for (const exported of entity.exports ?? []) {
          (0, exports2.checkSingleReference)(context, entity, "exports", exported);
        }
      } else if (entity instanceof function_node_ts_1.FunctionNode) {
        checkFunctionReferences(context, entity);
      } else if (entity instanceof ui_component_node_ts_1.UiComponentNode) {
        for (const child of entity.contains ?? []) {
          (0, exports2.checkSingleReference)(context, entity, "contains", child);
        }
        for (const parent of entity.declaredContainedBy ?? []) {
          (0, exports2.checkSingleReference)(context, entity, "containedBy", parent);
        }
        for (const affecting of entity.declaredAffectedBy ?? []) {
          (0, exports2.checkSingleReference)(context, entity, "affectedBy", affecting);
        }
      } else if (entity instanceof asset_node_ts_1.AssetNode) {
        if (entity.containsProgram !== void 0) {
          (0, exports2.checkSingleReference)(context, entity, "containsProgram", entity.containsProgram);
        }
      } else if (entity instanceof constants_node_ts_1.ConstantsNode) {
        if (entity.schema !== void 0) {
          (0, exports2.checkSingleReference)(context, entity, "schema", entity.schema);
        }
      } else if (entity instanceof run_parameter_node_ts_1.RunParameterNode) {
        for (const consumer of context.links.consumedBy(entity.name)) {
          (0, exports2.checkSingleReference)(context, entity, "consumedBy", consumer);
        }
      } else if (entity instanceof dependency_node_ts_1.DependencyNode) {
        for (const exported of entity.exports ?? []) {
          (0, exports2.checkSingleReference)(context, entity, "exports", exported);
        }
      }
    };
    var checkReferenceLegality = (context) => {
      for (const entity of context.byName.values()) {
        checkEntityReferences(context, entity);
      }
    };
    exports2.checkReferenceLegality = checkReferenceLegality;
  }
});

// ../typed-mind/dist/checker/check-run-parameters.js
var require_check_run_parameters = __commonJS2({
  "../typed-mind/dist/checker/check-run-parameters.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkRunParameterConsumedBy = void 0;
    var function_node_ts_1 = require_function_node();
    var run_parameter_node_ts_1 = require_run_parameter_node();
    var checkRunParameterConsumedBy = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof run_parameter_node_ts_1.RunParameterNode)) {
          continue;
        }
        const consumedBy = context.links.consumedBy(entity.name);
        for (const funcName of consumedBy) {
          const funcEntity = context.byName.get(funcName);
          if (funcEntity === void 0) {
            context.addFinding({
              code: "checker/consumedby-unknown-function",
              severity: "error",
              span: entity.span,
              message: `RunParameter '${entity.name}' claims to be consumed by unknown function '${funcName}'`
            });
          } else if (!(funcEntity instanceof function_node_ts_1.FunctionNode)) {
            context.addFinding({
              code: "checker/consumedby-non-function",
              severity: "error",
              span: entity.span,
              message: `RunParameter '${entity.name}' claims to be consumed by '${funcName}' which is not a Function`
            });
          } else if (!(funcEntity.consumes ?? []).includes(entity.name)) {
            context.addFinding({
              code: "checker/consumedby-disagreement",
              severity: "error",
              span: entity.span,
              message: `RunParameter '${entity.name}' claims to be consumed by '${funcName}', but that function doesn't consume it`,
              suggestion: `Add '${entity.name}' to the consumes list of function '${funcName}'`
            });
          }
        }
      }
    };
    exports2.checkRunParameterConsumedBy = checkRunParameterConsumedBy;
  }
});

// ../typed-mind/dist/checker/check-ui-components.js
var require_check_ui_components = __commonJS2({
  "../typed-mind/dist/checker/check-ui-components.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkUiComponentContainment = exports2.checkFunctionUiComponentAffects = exports2.checkUiComponentRelationships = void 0;
    var function_node_ts_1 = require_function_node();
    var ui_component_node_ts_1 = require_ui_component_node();
    var checkUiComponentRelationships = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof ui_component_node_ts_1.UiComponentNode)) {
          continue;
        }
        for (const childName of entity.contains ?? []) {
          const child = context.byName.get(childName);
          if (child === void 0) {
            context.addFinding({
              code: "checker/contains-unknown",
              severity: "error",
              span: entity.span,
              message: `UIComponent '${entity.name}' contains unknown component '${childName}'`,
              suggestion: `Define '${childName}' as a UIComponent`
            });
          } else if (child.kind !== "UIComponent") {
            context.addFinding({
              code: "checker/contains-non-uicomponent",
              severity: "error",
              span: entity.span,
              message: `UIComponent '${entity.name}' cannot contain '${childName}' (it's a ${child.kind})`,
              suggestion: "Only UIComponents can contain other UIComponents"
            });
          }
        }
        for (const parentName of entity.declaredContainedBy ?? []) {
          const parent = context.byName.get(parentName);
          if (parent === void 0) {
            context.addFinding({
              code: "checker/containedby-unknown-parent",
              severity: "error",
              span: entity.span,
              message: `UIComponent '${entity.name}' references unknown parent '${parentName}'`,
              suggestion: `Define '${parentName}' as a UIComponent`
            });
          } else if (parent.kind !== "UIComponent") {
            context.addFinding({
              code: "checker/containedby-non-uicomponent",
              severity: "error",
              span: entity.span,
              message: `UIComponent '${entity.name}' cannot be contained by '${parentName}' (it's a ${parent.kind})`,
              suggestion: "Only UIComponents can contain other UIComponents"
            });
          }
        }
      }
    };
    exports2.checkUiComponentRelationships = checkUiComponentRelationships;
    var checkFunctionUiComponentAffects = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof function_node_ts_1.FunctionNode)) {
          continue;
        }
        for (const componentName of entity.affects ?? []) {
          const component = context.byName.get(componentName);
          if (component === void 0) {
            context.addFinding({
              code: "checker/affects-unknown",
              severity: "error",
              span: entity.span,
              message: `Function '${entity.name}' affects unknown component '${componentName}'`,
              suggestion: `Define '${componentName}' as a UIComponent`
            });
          } else if (component.kind !== "UIComponent") {
            context.addFinding({
              code: "checker/affects-non-uicomponent",
              severity: "error",
              span: entity.span,
              message: `Function '${entity.name}' cannot affect '${componentName}' (it's a ${component.kind})`,
              suggestion: "Functions can only affect UIComponents"
            });
          }
        }
      }
      for (const entity of context.byName.values()) {
        if (!(entity instanceof ui_component_node_ts_1.UiComponentNode)) {
          continue;
        }
        const declared = entity.declaredAffectedBy ?? [];
        if (declared.length === 0) {
          continue;
        }
        const functionsAffecting = context.links.affectedBy(entity.name);
        for (const funcName of declared) {
          if (!functionsAffecting.includes(funcName)) {
            context.addFinding({
              code: "checker/affectedby-disagreement",
              severity: "error",
              span: entity.span,
              message: `UIComponent '${entity.name}' claims to be affected by '${funcName}', but that function doesn't affect it`,
              suggestion: `Add '${entity.name}' to the affects list of function '${funcName}'`
            });
          }
        }
      }
    };
    exports2.checkFunctionUiComponentAffects = checkFunctionUiComponentAffects;
    var checkUiComponentContainment = (context) => {
      for (const entity of context.byName.values()) {
        if (!(entity instanceof ui_component_node_ts_1.UiComponentNode)) {
          continue;
        }
        if (entity.root) {
          continue;
        }
        if (context.links.containedBy(entity.name).length === 0) {
          context.addFinding({
            code: "checker/uncontained-uicomponent",
            severity: "error",
            span: entity.span,
            message: `UIComponent '${entity.name}' is not contained by any other UIComponent`,
            suggestion: `Either add '${entity.name}' to another UIComponent's contains list, or mark it as a root component with &!`
          });
        }
      }
    };
    exports2.checkUiComponentContainment = checkUiComponentContainment;
  }
});

// ../typed-mind/dist/checker/check-unique-paths.js
var require_check_unique_paths = __commonJS2({
  "../typed-mind/dist/checker/check-unique-paths.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkUniquePaths = void 0;
    var class_file_node_ts_1 = require_class_file_node();
    var constants_node_ts_1 = require_constants_node();
    var file_node_ts_1 = require_file_node();
    var pathOf = (entity) => {
      if (entity instanceof file_node_ts_1.FileNode || entity instanceof class_file_node_ts_1.ClassFileNode || entity instanceof constants_node_ts_1.ConstantsNode) {
        return entity.path;
      }
      return void 0;
    };
    var checkUniquePaths = (context) => {
      const entityNamesByPath = /* @__PURE__ */ new Map();
      for (const entity of context.byName.values()) {
        const path = pathOf(entity);
        if (path === void 0 || path === "") {
          continue;
        }
        if (path.includes("#")) {
          continue;
        }
        const entitiesAtPath = entityNamesByPath.get(path) ?? [];
        entityNamesByPath.set(path, entitiesAtPath);
        if (entity.kind === "File" || entity.kind === "ClassFile") {
          const existingFileType = entitiesAtPath.find((name2) => {
            const existing = context.byName.get(name2);
            return existing !== void 0 && (existing.kind === "File" || existing.kind === "ClassFile");
          });
          if (existingFileType !== void 0) {
            const existing = context.byName.get(existingFileType);
            if (existing !== void 0) {
              context.addFinding({
                code: "checker/duplicate-path",
                severity: "error",
                span: entity.span,
                message: `Path '${path}' already used by ${existing.kind} '${existing.name}'`,
                suggestion: "Each File/ClassFile must have a unique path. Consider using ClassFile fusion with #:"
              });
            }
          }
        }
        entitiesAtPath.push(entity.name);
      }
    };
    exports2.checkUniquePaths = checkUniquePaths;
  }
});

// ../typed-mind/dist/checker/ast-validator.js
var require_ast_validator = __commonJS2({
  "../typed-mind/dist/checker/ast-validator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AstValidator = void 0;
    var check_assets_ts_1 = require_check_assets();
    var check_context_ts_1 = require_check_context();
    var check_cycles_ts_1 = require_check_cycles();
    var check_dto_fields_ts_1 = require_check_dto_fields();
    var check_duplicate_names_ts_1 = require_check_duplicate_names();
    var check_entry_point_ts_1 = require_check_entry_point();
    var check_exports_ts_1 = require_check_exports();
    var check_function_graph_ts_1 = require_check_function_graph();
    var check_imports_ts_1 = require_check_imports();
    var check_method_calls_ts_1 = require_check_method_calls();
    var check_orphans_ts_1 = require_check_orphans();
    var check_reference_legality_ts_1 = require_check_reference_legality();
    var check_run_parameters_ts_1 = require_check_run_parameters();
    var check_ui_components_ts_1 = require_check_ui_components();
    var check_unique_paths_ts_1 = require_check_unique_paths();
    var AstValidator = class {
      #options;
      constructor(options = {}) {
        this.#options = options;
      }
      validate(outcome, links) {
        const context = new check_context_ts_1.CheckContext({
          entities: outcome.entities,
          links,
          parseDiagnostics: outcome.diagnostics
        });
        (0, check_reference_legality_ts_1.checkReferenceLegality)(context);
        (0, check_duplicate_names_ts_1.checkDuplicateNames)(context);
        if (this.#options.skipOrphanCheck !== true) {
          (0, check_orphans_ts_1.checkOrphans)(context);
        }
        (0, check_imports_ts_1.checkImports)(context);
        (0, check_cycles_ts_1.checkCircularDeps)(context);
        (0, check_cycles_ts_1.checkCircularUiContainment)(context);
        (0, check_cycles_ts_1.checkInheritanceChains)(context);
        (0, check_entry_point_ts_1.checkEntryPoint)(context);
        (0, check_unique_paths_ts_1.checkUniquePaths)(context);
        (0, check_exports_ts_1.checkClassAndFunctionExports)(context);
        (0, check_exports_ts_1.checkDuplicateExports)(context);
        (0, check_method_calls_ts_1.checkMethodCalls)(context);
        (0, check_exports_ts_1.checkUndefinedExports)(context);
        (0, check_function_graph_ts_1.checkFunctionDtos)(context);
        (0, check_function_graph_ts_1.checkFunctionDependencies)(context);
        (0, check_dto_fields_ts_1.checkDtoFieldTypes)(context);
        (0, check_ui_components_ts_1.checkUiComponentRelationships)(context);
        (0, check_ui_components_ts_1.checkFunctionUiComponentAffects)(context);
        (0, check_assets_ts_1.checkAssetProgramRelationships)(context);
        (0, check_ui_components_ts_1.checkUiComponentContainment)(context);
        (0, check_function_graph_ts_1.checkFunctionConsumption)(context);
        (0, check_run_parameters_ts_1.checkRunParameterConsumedBy)(context);
        return {
          valid: context.findings.every((finding) => finding.severity !== "error"),
          findings: context.findings
        };
      }
    };
    exports2.AstValidator = AstValidator;
  }
});

// ../typed-mind/dist/checker/finding.js
var require_finding = __commonJS2({
  "../typed-mind/dist/checker/finding.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.toDiagnostics = exports2.toValidationErrors = void 0;
    var toValidationErrors = (findings) => {
      return findings.map((finding) => {
        return {
          position: { line: finding.span.start.line, column: finding.span.start.column },
          message: finding.message,
          severity: finding.severity,
          ...finding.suggestion === void 0 ? {} : { suggestion: finding.suggestion }
        };
      });
    };
    exports2.toValidationErrors = toValidationErrors;
    var toDiagnostics = (findings) => {
      return findings.map((finding) => {
        return {
          code: finding.code,
          severity: finding.severity,
          span: finding.span,
          message: finding.message
        };
      });
    };
    exports2.toDiagnostics = toDiagnostics;
  }
});

// ../typed-mind/dist/pipeline/import-resolver.js
var require_import_resolver = __commonJS2({
  "../typed-mind/dist/pipeline/import-resolver.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ImportResolver = void 0;
    var node_fs_1 = require("fs");
    var node_path_1 = require("path");
    var cloneWithName = (entity, name2) => {
      const prototype = Object.getPrototypeOf(entity);
      const replica = Object.create(prototype);
      return Object.assign(replica, entity, { name: name2 });
    };
    var lastWinsByName = (entities) => {
      const byName = /* @__PURE__ */ new Map();
      for (const entity of entities) {
        byName.set(entity.name, entity);
      }
      return byName;
    };
    var ImportResolver = class {
      #parser;
      // Per-resolver-instance cache, port-fidelity decision two (doc §3.7).
      #resolvedPaths = /* @__PURE__ */ new Map();
      #resolutionStack = [];
      constructor(parser) {
        this.#parser = parser;
      }
      resolveImports(imports, basePath) {
        const resolvedEntities = /* @__PURE__ */ new Map();
        const diagnostics = [];
        for (const importStatement of imports) {
          const fullPath = this.#resolvePath(importStatement.path, basePath);
          if (this.#resolutionStack.includes(fullPath)) {
            diagnostics.push({
              code: "imports/circular",
              severity: "error",
              span: importStatement.span,
              message: `Circular import detected: ${[...this.#resolutionStack, fullPath].join(" -> ")}`
            });
            continue;
          }
          this.#resolutionStack.push(fullPath);
          const document2 = this.#resolveDocument(importStatement, fullPath);
          if (document2.failure !== void 0) {
            diagnostics.push(document2.failure);
            this.#resolutionStack.pop();
            continue;
          }
          const prefix = importStatement.alias === void 0 ? "" : `${importStatement.alias}.`;
          for (const [name2, entity] of lastWinsByName(document2.entities)) {
            const prefixedName = prefix + name2;
            if (resolvedEntities.has(prefixedName)) {
              diagnostics.push({
                code: "imports/duplicate-name",
                severity: "error",
                span: importStatement.span,
                message: `Duplicate entity name '${prefixedName}' from import; use an alias to avoid naming conflicts`
              });
            } else {
              resolvedEntities.set(prefixedName, cloneWithName(entity, prefixedName));
            }
          }
          if (document2.imports.length > 0) {
            const nested = this.resolveImports(document2.imports, (0, node_path_1.dirname)(fullPath));
            for (const [name2, entity] of nested.resolvedEntities) {
              const nestedName = prefix + name2;
              if (!resolvedEntities.has(nestedName)) {
                resolvedEntities.set(nestedName, cloneWithName(entity, nestedName));
              }
            }
            diagnostics.push(...nested.diagnostics);
          }
          this.#resolutionStack.pop();
        }
        return { resolvedEntities, diagnostics };
      }
      #resolveDocument(importStatement, fullPath) {
        const cached = this.#resolvedPaths.get(fullPath);
        if (cached !== void 0) {
          return { entities: cached.entities, imports: cached.imports, failure: void 0 };
        }
        let content;
        try {
          content = (0, node_fs_1.readFileSync)(fullPath, "utf-8");
        } catch (error) {
          return {
            entities: [],
            imports: [],
            failure: {
              code: "imports/read-failure",
              severity: "error",
              span: importStatement.span,
              // String(error) replicates the legacy `${error}` interpolation
              // (import-resolver.ts:127) — the message carries the fs error text.
              message: `Failed to import '${importStatement.path}': ${String(error)}`
            }
          };
        }
        const outcome = this.#parser.parse(content);
        this.#resolvedPaths.set(fullPath, outcome);
        return { entities: outcome.entities, imports: outcome.imports, failure: void 0 };
      }
      #resolvePath(importPath, basePath) {
        if ((0, node_path_1.isAbsolute)(importPath)) {
          return importPath;
        }
        return (0, node_path_1.resolve)(basePath, importPath);
      }
    };
    exports2.ImportResolver = ImportResolver;
  }
});

// ../../node_modules/.pnpm/web-tree-sitter@0.26.13/node_modules/web-tree-sitter/web-tree-sitter.cjs
var require_web_tree_sitter2 = __commonJS2({
  "../../node_modules/.pnpm/web-tree-sitter@0.26.13/node_modules/web-tree-sitter/web-tree-sitter.cjs"(exports, module) {
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
    var __commonJS = (cb, mod) => function __require() {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    };
    var __export = (target, all) => {
      for (var name2 in all)
        __defProp(target, name2, { get: all[name2], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var require_web_tree_sitter = __commonJS({
      "lib/web-tree-sitter.cjs"(exports, module) {
        "use strict";
        var Module = (() => {
          var _scriptName = typeof document != "undefined" ? document.currentScript?.src : void 0;
          return async function(moduleArg = {}) {
            var moduleRtn;
            var Module = moduleArg;
            var ENVIRONMENT_IS_WEB = typeof window == "object";
            var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
            var ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node && process.type != "renderer";
            Module.currentQueryProgressCallback = null;
            Module.currentProgressCallback = null;
            Module.currentLogCallback = null;
            Module.currentParseCallback = null;
            var arguments_ = [];
            var thisProgram = "./this.program";
            var quit_ = /* @__PURE__ */ __name((status, toThrow) => {
              throw toThrow;
            }, "quit_");
            if (typeof __filename != "undefined") {
              _scriptName = __filename;
            } else if (ENVIRONMENT_IS_WORKER) {
              _scriptName = self.location.href;
            }
            var scriptDirectory = "";
            function locateFile(path) {
              if (Module["locateFile"]) {
                return Module["locateFile"](path, scriptDirectory);
              }
              return scriptDirectory + path;
            }
            __name(locateFile, "locateFile");
            var readAsync, readBinary;
            if (ENVIRONMENT_IS_NODE) {
              var fs = require("fs");
              scriptDirectory = __dirname + "/";
              readBinary = /* @__PURE__ */ __name((filename) => {
                filename = isFileURI(filename) ? new URL(filename) : filename;
                var ret = fs.readFileSync(filename);
                return ret;
              }, "readBinary");
              readAsync = /* @__PURE__ */ __name(async (filename, binary2 = true) => {
                filename = isFileURI(filename) ? new URL(filename) : filename;
                var ret = fs.readFileSync(filename, binary2 ? void 0 : "utf8");
                return ret;
              }, "readAsync");
              if (process.argv.length > 1) {
                thisProgram = process.argv[1].replace(/\\/g, "/");
              }
              arguments_ = process.argv.slice(2);
              quit_ = /* @__PURE__ */ __name((status, toThrow) => {
                process.exitCode = status;
                throw toThrow;
              }, "quit_");
            } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
              try {
                scriptDirectory = new URL(".", _scriptName).href;
              } catch {
              }
              {
                if (ENVIRONMENT_IS_WORKER) {
                  readBinary = /* @__PURE__ */ __name((url) => {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", url, false);
                    xhr.responseType = "arraybuffer";
                    xhr.send(null);
                    return new Uint8Array(
                      /** @type{!ArrayBuffer} */
                      xhr.response
                    );
                  }, "readBinary");
                }
                readAsync = /* @__PURE__ */ __name(async (url) => {
                  if (isFileURI(url)) {
                    return new Promise((resolve, reject) => {
                      var xhr = new XMLHttpRequest();
                      xhr.open("GET", url, true);
                      xhr.responseType = "arraybuffer";
                      xhr.onload = () => {
                        if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                          resolve(xhr.response);
                          return;
                        }
                        reject(xhr.status);
                      };
                      xhr.onerror = reject;
                      xhr.send(null);
                    });
                  }
                  var response = await fetch(url, {
                    credentials: "same-origin"
                  });
                  if (response.ok) {
                    return response.arrayBuffer();
                  }
                  throw new Error(response.status + " : " + response.url);
                }, "readAsync");
              }
            } else {
            }
            var out = console.log.bind(console);
            var err = console.error.bind(console);
            var dynamicLibraries = [];
            var wasmBinary;
            var ABORT = false;
            var EXITSTATUS;
            var isFileURI = /* @__PURE__ */ __name((filename) => filename.startsWith("file://"), "isFileURI");
            var readyPromiseResolve, readyPromiseReject;
            var wasmMemory;
            var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
            var HEAP64, HEAPU64;
            var HEAP_DATA_VIEW;
            var runtimeInitialized = false;
            function updateMemoryViews() {
              var b = wasmMemory.buffer;
              Module["HEAP8"] = HEAP8 = new Int8Array(b);
              Module["HEAP16"] = HEAP16 = new Int16Array(b);
              Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
              Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
              Module["HEAP32"] = HEAP32 = new Int32Array(b);
              Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
              Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
              Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
              Module["HEAP64"] = HEAP64 = new BigInt64Array(b);
              Module["HEAPU64"] = HEAPU64 = new BigUint64Array(b);
              Module["HEAP_DATA_VIEW"] = HEAP_DATA_VIEW = new DataView(b);
              LE_HEAP_UPDATE();
            }
            __name(updateMemoryViews, "updateMemoryViews");
            function initMemory() {
              if (Module["wasmMemory"]) {
                wasmMemory = Module["wasmMemory"];
              } else {
                var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 33554432;
                wasmMemory = new WebAssembly.Memory({
                  "initial": INITIAL_MEMORY / 65536,
                  // In theory we should not need to emit the maximum if we want "unlimited"
                  // or 4GB of memory, but VMs error on that atm, see
                  // https://github.com/emscripten-core/emscripten/issues/14130
                  // And in the pthreads case we definitely need to emit a maximum. So
                  // always emit one.
                  "maximum": 32768
                });
              }
              updateMemoryViews();
            }
            __name(initMemory, "initMemory");
            var __RELOC_FUNCS__ = [];
            function preRun() {
              if (Module["preRun"]) {
                if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
                while (Module["preRun"].length) {
                  addOnPreRun(Module["preRun"].shift());
                }
              }
              callRuntimeCallbacks(onPreRuns);
            }
            __name(preRun, "preRun");
            function initRuntime() {
              runtimeInitialized = true;
              callRuntimeCallbacks(__RELOC_FUNCS__);
              wasmExports["__wasm_call_ctors"]();
              callRuntimeCallbacks(onPostCtors);
            }
            __name(initRuntime, "initRuntime");
            function preMain() {
            }
            __name(preMain, "preMain");
            function postRun() {
              if (Module["postRun"]) {
                if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
                while (Module["postRun"].length) {
                  addOnPostRun(Module["postRun"].shift());
                }
              }
              callRuntimeCallbacks(onPostRuns);
            }
            __name(postRun, "postRun");
            function abort(what) {
              Module["onAbort"]?.(what);
              what = "Aborted(" + what + ")";
              err(what);
              ABORT = true;
              what += ". Build with -sASSERTIONS for more info.";
              var e = new WebAssembly.RuntimeError(what);
              readyPromiseReject?.(e);
              throw e;
            }
            __name(abort, "abort");
            var wasmBinaryFile;
            function findWasmBinary() {
              return locateFile("web-tree-sitter.wasm");
            }
            __name(findWasmBinary, "findWasmBinary");
            function getBinarySync(file) {
              if (file == wasmBinaryFile && wasmBinary) {
                return new Uint8Array(wasmBinary);
              }
              if (readBinary) {
                return readBinary(file);
              }
              throw "both async and sync fetching of the wasm failed";
            }
            __name(getBinarySync, "getBinarySync");
            async function getWasmBinary(binaryFile) {
              if (!wasmBinary) {
                try {
                  var response = await readAsync(binaryFile);
                  return new Uint8Array(response);
                } catch {
                }
              }
              return getBinarySync(binaryFile);
            }
            __name(getWasmBinary, "getWasmBinary");
            async function instantiateArrayBuffer(binaryFile, imports) {
              try {
                var binary2 = await getWasmBinary(binaryFile);
                var instance2 = await WebAssembly.instantiate(binary2, imports);
                return instance2;
              } catch (reason) {
                err(`failed to asynchronously prepare wasm: ${reason}`);
                abort(reason);
              }
            }
            __name(instantiateArrayBuffer, "instantiateArrayBuffer");
            async function instantiateAsync(binary2, binaryFile, imports) {
              if (!binary2 && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) {
                try {
                  var response = fetch(binaryFile, {
                    credentials: "same-origin"
                  });
                  var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
                  return instantiationResult;
                } catch (reason) {
                  err(`wasm streaming compile failed: ${reason}`);
                  err("falling back to ArrayBuffer instantiation");
                }
              }
              return instantiateArrayBuffer(binaryFile, imports);
            }
            __name(instantiateAsync, "instantiateAsync");
            function getWasmImports() {
              return {
                "env": wasmImports,
                "wasi_snapshot_preview1": wasmImports,
                "GOT.mem": new Proxy(wasmImports, GOTHandler),
                "GOT.func": new Proxy(wasmImports, GOTHandler)
              };
            }
            __name(getWasmImports, "getWasmImports");
            async function createWasm() {
              function receiveInstance(instance2, module2) {
                wasmExports = instance2.exports;
                wasmExports = relocateExports(wasmExports, 1024);
                var metadata2 = getDylinkMetadata(module2);
                if (metadata2.neededDynlibs) {
                  dynamicLibraries = metadata2.neededDynlibs.concat(dynamicLibraries);
                }
                mergeLibSymbols(wasmExports, "main");
                LDSO.init();
                loadDylibs();
                __RELOC_FUNCS__.push(wasmExports["__wasm_apply_data_relocs"]);
                assignWasmExports(wasmExports);
                return wasmExports;
              }
              __name(receiveInstance, "receiveInstance");
              function receiveInstantiationResult(result2) {
                return receiveInstance(result2["instance"], result2["module"]);
              }
              __name(receiveInstantiationResult, "receiveInstantiationResult");
              var info2 = getWasmImports();
              if (Module["instantiateWasm"]) {
                return new Promise((resolve, reject) => {
                  Module["instantiateWasm"](info2, (mod, inst) => {
                    resolve(receiveInstance(mod, inst));
                  });
                });
              }
              wasmBinaryFile ??= findWasmBinary();
              var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info2);
              var exports2 = receiveInstantiationResult(result);
              return exports2;
            }
            __name(createWasm, "createWasm");
            class ExitStatus {
              static {
                __name(this, "ExitStatus");
              }
              name = "ExitStatus";
              constructor(status) {
                this.message = `Program terminated with exit(${status})`;
                this.status = status;
              }
            }
            var GOT = {};
            var currentModuleWeakSymbols = /* @__PURE__ */ new Set([]);
            var GOTHandler = {
              get(obj, symName) {
                var rtn = GOT[symName];
                if (!rtn) {
                  rtn = GOT[symName] = new WebAssembly.Global({
                    "value": "i32",
                    "mutable": true
                  });
                }
                if (!currentModuleWeakSymbols.has(symName)) {
                  rtn.required = true;
                }
                return rtn;
              }
            };
            var LE_ATOMICS_NATIVE_BYTE_ORDER = [];
            var LE_HEAP_LOAD_F32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat32(byteOffset, true), "LE_HEAP_LOAD_F32");
            var LE_HEAP_LOAD_F64 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat64(byteOffset, true), "LE_HEAP_LOAD_F64");
            var LE_HEAP_LOAD_I16 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt16(byteOffset, true), "LE_HEAP_LOAD_I16");
            var LE_HEAP_LOAD_I32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt32(byteOffset, true), "LE_HEAP_LOAD_I32");
            var LE_HEAP_LOAD_I64 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getBigInt64(byteOffset, true), "LE_HEAP_LOAD_I64");
            var LE_HEAP_LOAD_U32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getUint32(byteOffset, true), "LE_HEAP_LOAD_U32");
            var LE_HEAP_STORE_F32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat32(byteOffset, value, true), "LE_HEAP_STORE_F32");
            var LE_HEAP_STORE_F64 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat64(byteOffset, value, true), "LE_HEAP_STORE_F64");
            var LE_HEAP_STORE_I16 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt16(byteOffset, value, true), "LE_HEAP_STORE_I16");
            var LE_HEAP_STORE_I32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt32(byteOffset, value, true), "LE_HEAP_STORE_I32");
            var LE_HEAP_STORE_I64 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setBigInt64(byteOffset, value, true), "LE_HEAP_STORE_I64");
            var LE_HEAP_STORE_U32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setUint32(byteOffset, value, true), "LE_HEAP_STORE_U32");
            var callRuntimeCallbacks = /* @__PURE__ */ __name((callbacks) => {
              while (callbacks.length > 0) {
                callbacks.shift()(Module);
              }
            }, "callRuntimeCallbacks");
            var onPostRuns = [];
            var addOnPostRun = /* @__PURE__ */ __name((cb) => onPostRuns.push(cb), "addOnPostRun");
            var onPreRuns = [];
            var addOnPreRun = /* @__PURE__ */ __name((cb) => onPreRuns.push(cb), "addOnPreRun");
            var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
            var findStringEnd = /* @__PURE__ */ __name((heapOrArray, idx, maxBytesToRead, ignoreNul) => {
              var maxIdx = idx + maxBytesToRead;
              if (ignoreNul) return maxIdx;
              while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
              return idx;
            }, "findStringEnd");
            var UTF8ArrayToString = /* @__PURE__ */ __name((heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
              var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
              if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
                return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
              }
              var str = "";
              while (idx < endPtr) {
                var u0 = heapOrArray[idx++];
                if (!(u0 & 128)) {
                  str += String.fromCharCode(u0);
                  continue;
                }
                var u1 = heapOrArray[idx++] & 63;
                if ((u0 & 224) == 192) {
                  str += String.fromCharCode((u0 & 31) << 6 | u1);
                  continue;
                }
                var u2 = heapOrArray[idx++] & 63;
                if ((u0 & 240) == 224) {
                  u0 = (u0 & 15) << 12 | u1 << 6 | u2;
                } else {
                  u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
                }
                if (u0 < 65536) {
                  str += String.fromCharCode(u0);
                } else {
                  var ch = u0 - 65536;
                  str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
                }
              }
              return str;
            }, "UTF8ArrayToString");
            var getDylinkMetadata = /* @__PURE__ */ __name((binary2) => {
              var offset = 0;
              var end = 0;
              function getU8() {
                return binary2[offset++];
              }
              __name(getU8, "getU8");
              function getLEB() {
                var ret = 0;
                var mul = 1;
                while (1) {
                  var byte = binary2[offset++];
                  ret += (byte & 127) * mul;
                  mul *= 128;
                  if (!(byte & 128)) break;
                }
                return ret;
              }
              __name(getLEB, "getLEB");
              function getString() {
                var len = getLEB();
                offset += len;
                return UTF8ArrayToString(binary2, offset - len, len);
              }
              __name(getString, "getString");
              function getStringList() {
                var count2 = getLEB();
                var rtn = [];
                while (count2--) rtn.push(getString());
                return rtn;
              }
              __name(getStringList, "getStringList");
              function failIf(condition, message) {
                if (condition) throw new Error(message);
              }
              __name(failIf, "failIf");
              if (binary2 instanceof WebAssembly.Module) {
                var dylinkSection = WebAssembly.Module.customSections(binary2, "dylink.0");
                failIf(dylinkSection.length === 0, "need dylink section");
                binary2 = new Uint8Array(dylinkSection[0]);
                end = binary2.length;
              } else {
                var int32View = new Uint32Array(new Uint8Array(binary2.subarray(0, 24)).buffer);
                var magicNumberFound = int32View[0] == 1836278016 || int32View[0] == 6386541;
                failIf(!magicNumberFound, "need to see wasm magic number");
                failIf(binary2[8] !== 0, "need the dylink section to be first");
                offset = 9;
                var section_size = getLEB();
                end = offset + section_size;
                var name2 = getString();
                failIf(name2 !== "dylink.0");
              }
              var customSection = {
                neededDynlibs: [],
                tlsExports: /* @__PURE__ */ new Set(),
                weakImports: /* @__PURE__ */ new Set(),
                runtimePaths: []
              };
              var WASM_DYLINK_MEM_INFO = 1;
              var WASM_DYLINK_NEEDED = 2;
              var WASM_DYLINK_EXPORT_INFO = 3;
              var WASM_DYLINK_IMPORT_INFO = 4;
              var WASM_DYLINK_RUNTIME_PATH = 5;
              var WASM_SYMBOL_TLS = 256;
              var WASM_SYMBOL_BINDING_MASK = 3;
              var WASM_SYMBOL_BINDING_WEAK = 1;
              while (offset < end) {
                var subsectionType = getU8();
                var subsectionSize = getLEB();
                if (subsectionType === WASM_DYLINK_MEM_INFO) {
                  customSection.memorySize = getLEB();
                  customSection.memoryAlign = getLEB();
                  customSection.tableSize = getLEB();
                  customSection.tableAlign = getLEB();
                } else if (subsectionType === WASM_DYLINK_NEEDED) {
                  customSection.neededDynlibs = getStringList();
                } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
                  var count = getLEB();
                  while (count--) {
                    var symname = getString();
                    var flags2 = getLEB();
                    if (flags2 & WASM_SYMBOL_TLS) {
                      customSection.tlsExports.add(symname);
                    }
                  }
                } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
                  var count = getLEB();
                  while (count--) {
                    var modname = getString();
                    var symname = getString();
                    var flags2 = getLEB();
                    if ((flags2 & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) {
                      customSection.weakImports.add(symname);
                    }
                  }
                } else if (subsectionType === WASM_DYLINK_RUNTIME_PATH) {
                  customSection.runtimePaths = getStringList();
                } else {
                  offset += subsectionSize;
                }
              }
              return customSection;
            }, "getDylinkMetadata");
            function getValue(ptr, type = "i8") {
              if (type.endsWith("*")) type = "*";
              switch (type) {
                case "i1":
                  return HEAP8[ptr];
                case "i8":
                  return HEAP8[ptr];
                case "i16":
                  return LE_HEAP_LOAD_I16((ptr >> 1) * 2);
                case "i32":
                  return LE_HEAP_LOAD_I32((ptr >> 2) * 4);
                case "i64":
                  return LE_HEAP_LOAD_I64((ptr >> 3) * 8);
                case "float":
                  return LE_HEAP_LOAD_F32((ptr >> 2) * 4);
                case "double":
                  return LE_HEAP_LOAD_F64((ptr >> 3) * 8);
                case "*":
                  return LE_HEAP_LOAD_U32((ptr >> 2) * 4);
                default:
                  abort(`invalid type for getValue: ${type}`);
              }
            }
            __name(getValue, "getValue");
            var newDSO = /* @__PURE__ */ __name((name2, handle2, syms) => {
              var dso = {
                refcount: Infinity,
                name: name2,
                exports: syms,
                global: true
              };
              LDSO.loadedLibsByName[name2] = dso;
              if (handle2 != void 0) {
                LDSO.loadedLibsByHandle[handle2] = dso;
              }
              return dso;
            }, "newDSO");
            var LDSO = {
              loadedLibsByName: {},
              loadedLibsByHandle: {},
              init() {
                newDSO("__main__", 0, wasmImports);
              }
            };
            var ___heap_base = 78240;
            var alignMemory = /* @__PURE__ */ __name((size, alignment) => Math.ceil(size / alignment) * alignment, "alignMemory");
            var getMemory = /* @__PURE__ */ __name((size) => {
              if (runtimeInitialized) {
                return _calloc(size, 1);
              }
              var ret = ___heap_base;
              var end = ret + alignMemory(size, 16);
              ___heap_base = end;
              GOT["__heap_base"].value = end;
              return ret;
            }, "getMemory");
            var isInternalSym = /* @__PURE__ */ __name((symName) => ["__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js"].includes(symName) || symName.startsWith("__em_js__"), "isInternalSym");
            var uleb128EncodeWithLen = /* @__PURE__ */ __name((arr) => {
              const n = arr.length;
              return [n % 128 | 128, n >> 7, ...arr];
            }, "uleb128EncodeWithLen");
            var wasmTypeCodes = {
              "i": 127,
              // i32
              "p": 127,
              // i32
              "j": 126,
              // i64
              "f": 125,
              // f32
              "d": 124,
              // f64
              "e": 111
            };
            var generateTypePack = /* @__PURE__ */ __name((types) => uleb128EncodeWithLen(Array.from(types, (type) => {
              var code = wasmTypeCodes[type];
              return code;
            })), "generateTypePack");
            var convertJsFunctionToWasm = /* @__PURE__ */ __name((func2, sig) => {
              var bytes = Uint8Array.of(
                0,
                97,
                115,
                109,
                // magic ("\0asm")
                1,
                0,
                0,
                0,
                // version: 1
                1,
                ...uleb128EncodeWithLen([
                  1,
                  // count: 1
                  96,
                  // param types
                  ...generateTypePack(sig.slice(1)),
                  // return types (for now only supporting [] if `void` and single [T] otherwise)
                  ...generateTypePack(sig[0] === "v" ? "" : sig[0])
                ]),
                // The rest of the module is static
                2,
                7,
                // import section
                // (import "e" "f" (func 0 (type 0)))
                1,
                1,
                101,
                1,
                102,
                0,
                0,
                7,
                5,
                // export section
                // (export "f" (func 0 (type 0)))
                1,
                1,
                102,
                0,
                0
              );
              var module2 = new WebAssembly.Module(bytes);
              var instance2 = new WebAssembly.Instance(module2, {
                "e": {
                  "f": func2
                }
              });
              var wrappedFunc = instance2.exports["f"];
              return wrappedFunc;
            }, "convertJsFunctionToWasm");
            var wasmTableMirror = [];
            var wasmTable = new WebAssembly.Table({
              "initial": 31,
              "element": "anyfunc"
            });
            var getWasmTableEntry = /* @__PURE__ */ __name((funcPtr) => {
              var func2 = wasmTableMirror[funcPtr];
              if (!func2) {
                wasmTableMirror[funcPtr] = func2 = wasmTable.get(funcPtr);
              }
              return func2;
            }, "getWasmTableEntry");
            var updateTableMap = /* @__PURE__ */ __name((offset, count) => {
              if (functionsInTableMap) {
                for (var i2 = offset; i2 < offset + count; i2++) {
                  var item = getWasmTableEntry(i2);
                  if (item) {
                    functionsInTableMap.set(item, i2);
                  }
                }
              }
            }, "updateTableMap");
            var functionsInTableMap;
            var getFunctionAddress = /* @__PURE__ */ __name((func2) => {
              if (!functionsInTableMap) {
                functionsInTableMap = /* @__PURE__ */ new WeakMap();
                updateTableMap(0, wasmTable.length);
              }
              return functionsInTableMap.get(func2) || 0;
            }, "getFunctionAddress");
            var freeTableIndexes = [];
            var getEmptyTableSlot = /* @__PURE__ */ __name(() => {
              if (freeTableIndexes.length) {
                return freeTableIndexes.pop();
              }
              return wasmTable["grow"](1);
            }, "getEmptyTableSlot");
            var setWasmTableEntry = /* @__PURE__ */ __name((idx, func2) => {
              wasmTable.set(idx, func2);
              wasmTableMirror[idx] = wasmTable.get(idx);
            }, "setWasmTableEntry");
            var addFunction = /* @__PURE__ */ __name((func2, sig) => {
              var rtn = getFunctionAddress(func2);
              if (rtn) {
                return rtn;
              }
              var ret = getEmptyTableSlot();
              try {
                setWasmTableEntry(ret, func2);
              } catch (err2) {
                if (!(err2 instanceof TypeError)) {
                  throw err2;
                }
                var wrapped = convertJsFunctionToWasm(func2, sig);
                setWasmTableEntry(ret, wrapped);
              }
              functionsInTableMap.set(func2, ret);
              return ret;
            }, "addFunction");
            var updateGOT = /* @__PURE__ */ __name((exports2, replace) => {
              for (var symName in exports2) {
                if (isInternalSym(symName)) {
                  continue;
                }
                var value = exports2[symName];
                GOT[symName] ||= new WebAssembly.Global({
                  "value": "i32",
                  "mutable": true
                });
                if (replace || GOT[symName].value == 0) {
                  if (typeof value == "function") {
                    GOT[symName].value = addFunction(value);
                  } else if (typeof value == "number") {
                    GOT[symName].value = value;
                  } else {
                    err(`unhandled export type for '${symName}': ${typeof value}`);
                  }
                }
              }
            }, "updateGOT");
            var relocateExports = /* @__PURE__ */ __name((exports2, memoryBase2, replace) => {
              var relocated = {};
              for (var e in exports2) {
                var value = exports2[e];
                if (typeof value == "object") {
                  value = value.value;
                }
                if (typeof value == "number") {
                  value += memoryBase2;
                }
                relocated[e] = value;
              }
              updateGOT(relocated, replace);
              return relocated;
            }, "relocateExports");
            var isSymbolDefined = /* @__PURE__ */ __name((symName) => {
              var existing = wasmImports[symName];
              if (!existing || existing.stub) {
                return false;
              }
              return true;
            }, "isSymbolDefined");
            var dynCall = /* @__PURE__ */ __name((sig, ptr, args2 = [], promising = false) => {
              var func2 = getWasmTableEntry(ptr);
              var rtn = func2(...args2);
              function convert(rtn2) {
                return rtn2;
              }
              __name(convert, "convert");
              return convert(rtn);
            }, "dynCall");
            var stackSave = /* @__PURE__ */ __name(() => _emscripten_stack_get_current(), "stackSave");
            var stackRestore = /* @__PURE__ */ __name((val) => __emscripten_stack_restore(val), "stackRestore");
            var createInvokeFunction = /* @__PURE__ */ __name((sig) => (ptr, ...args2) => {
              var sp = stackSave();
              try {
                return dynCall(sig, ptr, args2);
              } catch (e) {
                stackRestore(sp);
                if (e !== e + 0) throw e;
                _setThrew(1, 0);
                if (sig[0] == "j") return 0n;
              }
            }, "createInvokeFunction");
            var resolveGlobalSymbol = /* @__PURE__ */ __name((symName, direct = false) => {
              var sym;
              if (isSymbolDefined(symName)) {
                sym = wasmImports[symName];
              } else if (symName.startsWith("invoke_")) {
                sym = wasmImports[symName] = createInvokeFunction(symName.split("_")[1]);
              }
              return {
                sym,
                name: symName
              };
            }, "resolveGlobalSymbol");
            var onPostCtors = [];
            var addOnPostCtor = /* @__PURE__ */ __name((cb) => onPostCtors.push(cb), "addOnPostCtor");
            var UTF8ToString = /* @__PURE__ */ __name((ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "", "UTF8ToString");
            var loadWebAssemblyModule = /* @__PURE__ */ __name((binary, flags, libName, localScope, handle) => {
              var metadata = getDylinkMetadata(binary);
              function loadModule() {
                var memAlign = Math.pow(2, metadata.memoryAlign);
                var memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0;
                var tableBase = metadata.tableSize ? wasmTable.length : 0;
                if (handle) {
                  HEAP8[handle + 8] = 1;
                  LE_HEAP_STORE_U32((handle + 12 >> 2) * 4, memoryBase);
                  LE_HEAP_STORE_I32((handle + 16 >> 2) * 4, metadata.memorySize);
                  LE_HEAP_STORE_U32((handle + 20 >> 2) * 4, tableBase);
                  LE_HEAP_STORE_I32((handle + 24 >> 2) * 4, metadata.tableSize);
                }
                if (metadata.tableSize) {
                  wasmTable.grow(metadata.tableSize);
                }
                var moduleExports;
                function resolveSymbol(sym) {
                  var resolved = resolveGlobalSymbol(sym).sym;
                  if (!resolved && localScope) {
                    resolved = localScope[sym];
                  }
                  if (!resolved) {
                    resolved = moduleExports[sym];
                  }
                  return resolved;
                }
                __name(resolveSymbol, "resolveSymbol");
                var proxyHandler = {
                  get(stubs, prop) {
                    switch (prop) {
                      case "__memory_base":
                        return memoryBase;
                      case "__table_base":
                        return tableBase;
                    }
                    if (prop in wasmImports && !wasmImports[prop].stub) {
                      var res = wasmImports[prop];
                      return res;
                    }
                    if (!(prop in stubs)) {
                      var resolved;
                      stubs[prop] = (...args2) => {
                        resolved ||= resolveSymbol(prop);
                        return resolved(...args2);
                      };
                    }
                    return stubs[prop];
                  }
                };
                var proxy = new Proxy({}, proxyHandler);
                currentModuleWeakSymbols = metadata.weakImports;
                var info = {
                  "GOT.mem": new Proxy({}, GOTHandler),
                  "GOT.func": new Proxy({}, GOTHandler),
                  "env": proxy,
                  "wasi_snapshot_preview1": proxy
                };
                function postInstantiation(module, instance) {
                  updateTableMap(tableBase, metadata.tableSize);
                  moduleExports = relocateExports(instance.exports, memoryBase);
                  if (!flags.allowUndefined) {
                    reportUndefinedSymbols();
                  }
                  function addEmAsm(addr, body) {
                    var args = [];
                    var arity = 0;
                    for (; arity < 16; arity++) {
                      if (body.indexOf("$" + arity) != -1) {
                        args.push("$" + arity);
                      } else {
                        break;
                      }
                    }
                    args = args.join(",");
                    var func = `(${args}) => { ${body} };`;
                    ASM_CONSTS[start] = eval(func);
                  }
                  __name(addEmAsm, "addEmAsm");
                  if ("__start_em_asm" in moduleExports) {
                    var start = moduleExports["__start_em_asm"];
                    var stop = moduleExports["__stop_em_asm"];
                    while (start < stop) {
                      var jsString = UTF8ToString(start);
                      addEmAsm(start, jsString);
                      start = HEAPU8.indexOf(0, start) + 1;
                    }
                  }
                  function addEmJs(name, cSig, body) {
                    var jsArgs = [];
                    cSig = cSig.slice(1, -1);
                    if (cSig != "void") {
                      cSig = cSig.split(",");
                      for (var i in cSig) {
                        var jsArg = cSig[i].split(" ").pop();
                        jsArgs.push(jsArg.replace("*", ""));
                      }
                    }
                    var func = `(${jsArgs}) => ${body};`;
                    moduleExports[name] = eval(func);
                  }
                  __name(addEmJs, "addEmJs");
                  for (var name in moduleExports) {
                    if (name.startsWith("__em_js__")) {
                      var start = moduleExports[name];
                      var jsString = UTF8ToString(start);
                      var parts = jsString.split("<::>");
                      addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]);
                      delete moduleExports[name];
                    }
                  }
                  var applyRelocs = moduleExports["__wasm_apply_data_relocs"];
                  if (applyRelocs) {
                    if (runtimeInitialized) {
                      applyRelocs();
                    } else {
                      __RELOC_FUNCS__.push(applyRelocs);
                    }
                  }
                  var init = moduleExports["__wasm_call_ctors"];
                  if (init) {
                    if (runtimeInitialized) {
                      init();
                    } else {
                      addOnPostCtor(init);
                    }
                  }
                  return moduleExports;
                }
                __name(postInstantiation, "postInstantiation");
                if (flags.loadAsync) {
                  return (async () => {
                    var instance2;
                    if (binary instanceof WebAssembly.Module) {
                      instance2 = new WebAssembly.Instance(binary, info);
                    } else {
                      ({ module: binary, instance: instance2 } = await WebAssembly.instantiate(binary, info));
                    }
                    return postInstantiation(binary, instance2);
                  })();
                }
                var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary);
                var instance = new WebAssembly.Instance(module, info);
                return postInstantiation(module, instance);
              }
              __name(loadModule, "loadModule");
              flags = {
                ...flags,
                rpath: {
                  parentLibPath: libName,
                  paths: metadata.runtimePaths
                }
              };
              if (flags.loadAsync) {
                return metadata.neededDynlibs.reduce((chain, dynNeeded) => chain.then(() => loadDynamicLibrary(dynNeeded, flags, localScope)), Promise.resolve()).then(loadModule);
              }
              metadata.neededDynlibs.forEach((needed) => loadDynamicLibrary(needed, flags, localScope));
              return loadModule();
            }, "loadWebAssemblyModule");
            var mergeLibSymbols = /* @__PURE__ */ __name((exports2, libName2) => {
              for (var [sym, exp] of Object.entries(exports2)) {
                const setImport = /* @__PURE__ */ __name((target) => {
                  if (!isSymbolDefined(target)) {
                    wasmImports[target] = exp;
                  }
                }, "setImport");
                setImport(sym);
                const main_alias = "__main_argc_argv";
                if (sym == "main") {
                  setImport(main_alias);
                }
                if (sym == main_alias) {
                  setImport("main");
                }
              }
            }, "mergeLibSymbols");
            var asyncLoad = /* @__PURE__ */ __name(async (url) => {
              var arrayBuffer = await readAsync(url);
              return new Uint8Array(arrayBuffer);
            }, "asyncLoad");
            function loadDynamicLibrary(libName2, flags2 = {
              global: true,
              nodelete: true
            }, localScope2, handle2) {
              var dso = LDSO.loadedLibsByName[libName2];
              if (dso) {
                if (!flags2.global) {
                  if (localScope2) {
                    Object.assign(localScope2, dso.exports);
                  }
                } else if (!dso.global) {
                  dso.global = true;
                  mergeLibSymbols(dso.exports, libName2);
                }
                if (flags2.nodelete && dso.refcount !== Infinity) {
                  dso.refcount = Infinity;
                }
                dso.refcount++;
                if (handle2) {
                  LDSO.loadedLibsByHandle[handle2] = dso;
                }
                return flags2.loadAsync ? Promise.resolve(true) : true;
              }
              dso = newDSO(libName2, handle2, "loading");
              dso.refcount = flags2.nodelete ? Infinity : 1;
              dso.global = flags2.global;
              function loadLibData() {
                if (handle2) {
                  var data = LE_HEAP_LOAD_U32((handle2 + 28 >> 2) * 4);
                  var dataSize = LE_HEAP_LOAD_U32((handle2 + 32 >> 2) * 4);
                  if (data && dataSize) {
                    var libData = HEAP8.slice(data, data + dataSize);
                    return flags2.loadAsync ? Promise.resolve(libData) : libData;
                  }
                }
                var libFile = locateFile(libName2);
                if (flags2.loadAsync) {
                  return asyncLoad(libFile);
                }
                if (!readBinary) {
                  throw new Error(`${libFile}: file not found, and synchronous loading of external files is not available`);
                }
                return readBinary(libFile);
              }
              __name(loadLibData, "loadLibData");
              function getExports() {
                if (flags2.loadAsync) {
                  return loadLibData().then((libData) => loadWebAssemblyModule(libData, flags2, libName2, localScope2, handle2));
                }
                return loadWebAssemblyModule(loadLibData(), flags2, libName2, localScope2, handle2);
              }
              __name(getExports, "getExports");
              function moduleLoaded(exports2) {
                if (dso.global) {
                  mergeLibSymbols(exports2, libName2);
                } else if (localScope2) {
                  Object.assign(localScope2, exports2);
                }
                dso.exports = exports2;
              }
              __name(moduleLoaded, "moduleLoaded");
              if (flags2.loadAsync) {
                return getExports().then((exports2) => {
                  moduleLoaded(exports2);
                  return true;
                });
              }
              moduleLoaded(getExports());
              return true;
            }
            __name(loadDynamicLibrary, "loadDynamicLibrary");
            var reportUndefinedSymbols = /* @__PURE__ */ __name(() => {
              for (var [symName, entry] of Object.entries(GOT)) {
                if (entry.value == 0) {
                  var value = resolveGlobalSymbol(symName, true).sym;
                  if (!value && !entry.required) {
                    continue;
                  }
                  if (typeof value == "function") {
                    entry.value = addFunction(value, value.sig);
                  } else if (typeof value == "number") {
                    entry.value = value;
                  } else {
                    throw new Error(`bad export type for '${symName}': ${typeof value}`);
                  }
                }
              }
            }, "reportUndefinedSymbols");
            var runDependencies = 0;
            var dependenciesFulfilled = null;
            var removeRunDependency = /* @__PURE__ */ __name((id) => {
              runDependencies--;
              Module["monitorRunDependencies"]?.(runDependencies);
              if (runDependencies == 0) {
                if (dependenciesFulfilled) {
                  var callback = dependenciesFulfilled;
                  dependenciesFulfilled = null;
                  callback();
                }
              }
            }, "removeRunDependency");
            var addRunDependency = /* @__PURE__ */ __name((id) => {
              runDependencies++;
              Module["monitorRunDependencies"]?.(runDependencies);
            }, "addRunDependency");
            var loadDylibs = /* @__PURE__ */ __name(async () => {
              if (!dynamicLibraries.length) {
                reportUndefinedSymbols();
                return;
              }
              addRunDependency("loadDylibs");
              for (var lib of dynamicLibraries) {
                await loadDynamicLibrary(lib, {
                  loadAsync: true,
                  global: true,
                  nodelete: true,
                  allowUndefined: true
                });
              }
              reportUndefinedSymbols();
              removeRunDependency("loadDylibs");
            }, "loadDylibs");
            var noExitRuntime = true;
            function setValue(ptr, value, type = "i8") {
              if (type.endsWith("*")) type = "*";
              switch (type) {
                case "i1":
                  HEAP8[ptr] = value;
                  break;
                case "i8":
                  HEAP8[ptr] = value;
                  break;
                case "i16":
                  LE_HEAP_STORE_I16((ptr >> 1) * 2, value);
                  break;
                case "i32":
                  LE_HEAP_STORE_I32((ptr >> 2) * 4, value);
                  break;
                case "i64":
                  LE_HEAP_STORE_I64((ptr >> 3) * 8, BigInt(value));
                  break;
                case "float":
                  LE_HEAP_STORE_F32((ptr >> 2) * 4, value);
                  break;
                case "double":
                  LE_HEAP_STORE_F64((ptr >> 3) * 8, value);
                  break;
                case "*":
                  LE_HEAP_STORE_U32((ptr >> 2) * 4, value);
                  break;
                default:
                  abort(`invalid type for setValue: ${type}`);
              }
            }
            __name(setValue, "setValue");
            var ___memory_base = new WebAssembly.Global({
              "value": "i32",
              "mutable": false
            }, 1024);
            var ___stack_high = 78240;
            var ___stack_low = 12704;
            var ___stack_pointer = new WebAssembly.Global({
              "value": "i32",
              "mutable": true
            }, 78240);
            var ___table_base = new WebAssembly.Global({
              "value": "i32",
              "mutable": false
            }, 1);
            var __abort_js = /* @__PURE__ */ __name(() => abort(""), "__abort_js");
            __abort_js.sig = "v";
            var getHeapMax = /* @__PURE__ */ __name(() => (
              // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
              // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
              // for any code that deals with heap sizes, which would require special
              // casing all heap size related code to treat 0 specially.
              2147483648
            ), "getHeapMax");
            var growMemory = /* @__PURE__ */ __name((size) => {
              var oldHeapSize = wasmMemory.buffer.byteLength;
              var pages = (size - oldHeapSize + 65535) / 65536 | 0;
              try {
                wasmMemory.grow(pages);
                updateMemoryViews();
                return 1;
              } catch (e) {
              }
            }, "growMemory");
            var _emscripten_resize_heap = /* @__PURE__ */ __name((requestedSize) => {
              var oldSize = HEAPU8.length;
              requestedSize >>>= 0;
              var maxHeapSize = getHeapMax();
              if (requestedSize > maxHeapSize) {
                return false;
              }
              for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
                var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
                overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
                var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
                var replacement = growMemory(newSize);
                if (replacement) {
                  return true;
                }
              }
              return false;
            }, "_emscripten_resize_heap");
            _emscripten_resize_heap.sig = "ip";
            var _fd_close = /* @__PURE__ */ __name((fd) => 52, "_fd_close");
            _fd_close.sig = "ii";
            var INT53_MAX = 9007199254740992;
            var INT53_MIN = -9007199254740992;
            var bigintToI53Checked = /* @__PURE__ */ __name((num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num), "bigintToI53Checked");
            function _fd_seek(fd, offset, whence, newOffset) {
              offset = bigintToI53Checked(offset);
              return 70;
            }
            __name(_fd_seek, "_fd_seek");
            _fd_seek.sig = "iijip";
            var printCharBuffers = [null, [], []];
            var printChar = /* @__PURE__ */ __name((stream, curr) => {
              var buffer = printCharBuffers[stream];
              if (curr === 0 || curr === 10) {
                (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
                buffer.length = 0;
              } else {
                buffer.push(curr);
              }
            }, "printChar");
            var _fd_write = /* @__PURE__ */ __name((fd, iov, iovcnt, pnum) => {
              var num = 0;
              for (var i2 = 0; i2 < iovcnt; i2++) {
                var ptr = LE_HEAP_LOAD_U32((iov >> 2) * 4);
                var len = LE_HEAP_LOAD_U32((iov + 4 >> 2) * 4);
                iov += 8;
                for (var j = 0; j < len; j++) {
                  printChar(fd, HEAPU8[ptr + j]);
                }
                num += len;
              }
              LE_HEAP_STORE_U32((pnum >> 2) * 4, num);
              return 0;
            }, "_fd_write");
            _fd_write.sig = "iippp";
            function _tree_sitter_log_callback(isLexMessage, messageAddress) {
              if (Module.currentLogCallback) {
                const message = UTF8ToString(messageAddress);
                Module.currentLogCallback(message, isLexMessage !== 0);
              }
            }
            __name(_tree_sitter_log_callback, "_tree_sitter_log_callback");
            function _tree_sitter_parse_callback(inputBufferAddress, index, row, column, lengthAddress) {
              const INPUT_BUFFER_SIZE = 10 * 1024;
              const string = Module.currentParseCallback(index, {
                row,
                column
              });
              if (typeof string === "string") {
                setValue(lengthAddress, string.length, "i32");
                stringToUTF16(string, inputBufferAddress, INPUT_BUFFER_SIZE);
              } else {
                setValue(lengthAddress, 0, "i32");
              }
            }
            __name(_tree_sitter_parse_callback, "_tree_sitter_parse_callback");
            function _tree_sitter_progress_callback(currentOffset, hasError) {
              if (Module.currentProgressCallback) {
                return Module.currentProgressCallback({
                  currentOffset,
                  hasError
                });
              }
              return false;
            }
            __name(_tree_sitter_progress_callback, "_tree_sitter_progress_callback");
            function _tree_sitter_query_progress_callback(currentOffset) {
              if (Module.currentQueryProgressCallback) {
                return Module.currentQueryProgressCallback({
                  currentOffset
                });
              }
              return false;
            }
            __name(_tree_sitter_query_progress_callback, "_tree_sitter_query_progress_callback");
            var runtimeKeepaliveCounter = 0;
            var keepRuntimeAlive = /* @__PURE__ */ __name(() => noExitRuntime || runtimeKeepaliveCounter > 0, "keepRuntimeAlive");
            var _proc_exit = /* @__PURE__ */ __name((code) => {
              EXITSTATUS = code;
              if (!keepRuntimeAlive()) {
                Module["onExit"]?.(code);
                ABORT = true;
              }
              quit_(code, new ExitStatus(code));
            }, "_proc_exit");
            _proc_exit.sig = "vi";
            var exitJS = /* @__PURE__ */ __name((status, implicit) => {
              EXITSTATUS = status;
              _proc_exit(status);
            }, "exitJS");
            var handleException = /* @__PURE__ */ __name((e) => {
              if (e instanceof ExitStatus || e == "unwind") {
                return EXITSTATUS;
              }
              quit_(1, e);
            }, "handleException");
            var lengthBytesUTF8 = /* @__PURE__ */ __name((str) => {
              var len = 0;
              for (var i2 = 0; i2 < str.length; ++i2) {
                var c = str.charCodeAt(i2);
                if (c <= 127) {
                  len++;
                } else if (c <= 2047) {
                  len += 2;
                } else if (c >= 55296 && c <= 57343) {
                  len += 4;
                  ++i2;
                } else {
                  len += 3;
                }
              }
              return len;
            }, "lengthBytesUTF8");
            var stringToUTF8Array = /* @__PURE__ */ __name((str, heap, outIdx, maxBytesToWrite) => {
              if (!(maxBytesToWrite > 0)) return 0;
              var startIdx = outIdx;
              var endIdx = outIdx + maxBytesToWrite - 1;
              for (var i2 = 0; i2 < str.length; ++i2) {
                var u = str.codePointAt(i2);
                if (u <= 127) {
                  if (outIdx >= endIdx) break;
                  heap[outIdx++] = u;
                } else if (u <= 2047) {
                  if (outIdx + 1 >= endIdx) break;
                  heap[outIdx++] = 192 | u >> 6;
                  heap[outIdx++] = 128 | u & 63;
                } else if (u <= 65535) {
                  if (outIdx + 2 >= endIdx) break;
                  heap[outIdx++] = 224 | u >> 12;
                  heap[outIdx++] = 128 | u >> 6 & 63;
                  heap[outIdx++] = 128 | u & 63;
                } else {
                  if (outIdx + 3 >= endIdx) break;
                  heap[outIdx++] = 240 | u >> 18;
                  heap[outIdx++] = 128 | u >> 12 & 63;
                  heap[outIdx++] = 128 | u >> 6 & 63;
                  heap[outIdx++] = 128 | u & 63;
                  i2++;
                }
              }
              heap[outIdx] = 0;
              return outIdx - startIdx;
            }, "stringToUTF8Array");
            var stringToUTF8 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite), "stringToUTF8");
            var stackAlloc = /* @__PURE__ */ __name((sz) => __emscripten_stack_alloc(sz), "stackAlloc");
            var stringToUTF8OnStack = /* @__PURE__ */ __name((str) => {
              var size = lengthBytesUTF8(str) + 1;
              var ret = stackAlloc(size);
              stringToUTF8(str, ret, size);
              return ret;
            }, "stringToUTF8OnStack");
            var AsciiToString = /* @__PURE__ */ __name((ptr) => {
              var str = "";
              while (1) {
                var ch = HEAPU8[ptr++];
                if (!ch) return str;
                str += String.fromCharCode(ch);
              }
            }, "AsciiToString");
            var stringToUTF16 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => {
              maxBytesToWrite ??= 2147483647;
              if (maxBytesToWrite < 2) return 0;
              maxBytesToWrite -= 2;
              var startPtr = outPtr;
              var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
              for (var i2 = 0; i2 < numCharsToWrite; ++i2) {
                var codeUnit = str.charCodeAt(i2);
                LE_HEAP_STORE_I16((outPtr >> 1) * 2, codeUnit);
                outPtr += 2;
              }
              LE_HEAP_STORE_I16((outPtr >> 1) * 2, 0);
              return outPtr - startPtr;
            }, "stringToUTF16");
            LE_ATOMICS_NATIVE_BYTE_ORDER = new Int8Array(new Int16Array([1]).buffer)[0] === 1 ? [
              /* little endian */
              (x) => x,
              (x) => x,
              void 0,
              (x) => x
            ] : [
              /* big endian */
              (x) => x,
              (x) => ((x & 65280) << 8 | (x & 255) << 24) >> 16,
              void 0,
              (x) => x >> 24 & 255 | x >> 8 & 65280 | (x & 65280) << 8 | (x & 255) << 24
            ];
            function LE_HEAP_UPDATE() {
              HEAPU16.unsigned = (x) => x & 65535;
              HEAPU32.unsigned = (x) => x >>> 0;
            }
            __name(LE_HEAP_UPDATE, "LE_HEAP_UPDATE");
            {
              initMemory();
              if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
              if (Module["print"]) out = Module["print"];
              if (Module["printErr"]) err = Module["printErr"];
              if (Module["dynamicLibraries"]) dynamicLibraries = Module["dynamicLibraries"];
              if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
              if (Module["arguments"]) arguments_ = Module["arguments"];
              if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
              if (Module["preInit"]) {
                if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
                while (Module["preInit"].length > 0) {
                  Module["preInit"].shift()();
                }
              }
            }
            Module["setValue"] = setValue;
            Module["getValue"] = getValue;
            Module["UTF8ToString"] = UTF8ToString;
            Module["stringToUTF8"] = stringToUTF8;
            Module["lengthBytesUTF8"] = lengthBytesUTF8;
            Module["AsciiToString"] = AsciiToString;
            Module["stringToUTF16"] = stringToUTF16;
            Module["loadWebAssemblyModule"] = loadWebAssemblyModule;
            Module["LE_HEAP_STORE_I64"] = LE_HEAP_STORE_I64;
            var ASM_CONSTS = {};
            var _malloc, _calloc, _realloc, _free, _ts_range_edit, _memcmp, _ts_language_symbol_count, _ts_language_state_count, _ts_language_abi_version, _ts_language_name, _ts_language_field_count, _ts_language_next_state, _ts_language_symbol_name, _ts_language_symbol_for_name, _strncmp, _ts_language_symbol_type, _ts_language_field_name_for_id, _ts_lookahead_iterator_new, _ts_lookahead_iterator_delete, _ts_lookahead_iterator_reset_state, _ts_lookahead_iterator_reset, _ts_lookahead_iterator_next, _ts_lookahead_iterator_current_symbol, _ts_point_edit, _ts_parser_delete, _ts_parser_reset, _ts_parser_set_language, _ts_parser_set_included_ranges, _ts_query_new, _ts_query_delete, _iswspace, _iswalnum, _ts_query_pattern_count, _ts_query_capture_count, _ts_query_string_count, _ts_query_capture_name_for_id, _ts_query_capture_quantifier_for_id, _ts_query_string_value_for_id, _ts_query_predicates_for_pattern, _ts_query_start_byte_for_pattern, _ts_query_end_byte_for_pattern, _ts_query_is_pattern_rooted, _ts_query_is_pattern_non_local, _ts_query_is_pattern_guaranteed_at_step, _ts_query_disable_capture, _ts_query_disable_pattern, _ts_tree_copy, _ts_tree_delete, _ts_init, _ts_parser_new_wasm, _ts_parser_enable_logger_wasm, _ts_parser_parse_wasm, _ts_parser_included_ranges_wasm, _ts_language_type_is_named_wasm, _ts_language_type_is_visible_wasm, _ts_language_metadata_wasm, _ts_language_supertypes_wasm, _ts_language_subtypes_wasm, _ts_tree_root_node_wasm, _ts_tree_root_node_with_offset_wasm, _ts_tree_edit_wasm, _ts_tree_included_ranges_wasm, _ts_tree_get_changed_ranges_wasm, _ts_tree_cursor_new_wasm, _ts_tree_cursor_copy_wasm, _ts_tree_cursor_delete_wasm, _ts_tree_cursor_reset_wasm, _ts_tree_cursor_reset_to_wasm, _ts_tree_cursor_goto_first_child_wasm, _ts_tree_cursor_goto_last_child_wasm, _ts_tree_cursor_goto_first_child_for_index_wasm, _ts_tree_cursor_goto_first_child_for_position_wasm, _ts_tree_cursor_goto_next_sibling_wasm, _ts_tree_cursor_goto_previous_sibling_wasm, _ts_tree_cursor_goto_descendant_wasm, _ts_tree_cursor_goto_parent_wasm, _ts_tree_cursor_current_node_type_id_wasm, _ts_tree_cursor_current_node_state_id_wasm, _ts_tree_cursor_current_node_is_named_wasm, _ts_tree_cursor_current_node_is_missing_wasm, _ts_tree_cursor_current_node_id_wasm, _ts_tree_cursor_start_position_wasm, _ts_tree_cursor_end_position_wasm, _ts_tree_cursor_start_index_wasm, _ts_tree_cursor_end_index_wasm, _ts_tree_cursor_current_field_id_wasm, _ts_tree_cursor_current_depth_wasm, _ts_tree_cursor_current_descendant_index_wasm, _ts_tree_cursor_current_node_wasm, _ts_node_symbol_wasm, _ts_node_field_name_for_child_wasm, _ts_node_field_name_for_named_child_wasm, _ts_node_children_by_field_id_wasm, _ts_node_first_child_for_byte_wasm, _ts_node_first_named_child_for_byte_wasm, _ts_node_grammar_symbol_wasm, _ts_node_child_count_wasm, _ts_node_named_child_count_wasm, _ts_node_child_wasm, _ts_node_named_child_wasm, _ts_node_child_by_field_id_wasm, _ts_node_next_sibling_wasm, _ts_node_prev_sibling_wasm, _ts_node_next_named_sibling_wasm, _ts_node_prev_named_sibling_wasm, _ts_node_descendant_count_wasm, _ts_node_parent_wasm, _ts_node_child_with_descendant_wasm, _ts_node_descendant_for_index_wasm, _ts_node_named_descendant_for_index_wasm, _ts_node_descendant_for_position_wasm, _ts_node_named_descendant_for_position_wasm, _ts_node_start_point_wasm, _ts_node_end_point_wasm, _ts_node_start_index_wasm, _ts_node_end_index_wasm, _ts_node_to_string_wasm, _ts_node_children_wasm, _ts_node_named_children_wasm, _ts_node_descendants_of_type_wasm, _ts_node_is_named_wasm, _ts_node_has_changes_wasm, _ts_node_has_error_wasm, _ts_node_is_error_wasm, _ts_node_is_missing_wasm, _ts_node_is_extra_wasm, _ts_node_parse_state_wasm, _ts_node_next_parse_state_wasm, _ts_query_matches_wasm, _ts_query_captures_wasm, _memset, _memcpy, _memmove, _iswalpha, _iswblank, _iswdigit, _iswlower, _iswupper, _iswxdigit, _memchr, _strlen, _strcmp, _strncat, _strncpy, _towlower, _towupper, _setThrew, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, ___wasm_apply_data_relocs;
            function assignWasmExports(wasmExports2) {
              Module["_malloc"] = _malloc = wasmExports2["malloc"];
              Module["_calloc"] = _calloc = wasmExports2["calloc"];
              Module["_realloc"] = _realloc = wasmExports2["realloc"];
              Module["_free"] = _free = wasmExports2["free"];
              Module["_ts_range_edit"] = _ts_range_edit = wasmExports2["ts_range_edit"];
              Module["_memcmp"] = _memcmp = wasmExports2["memcmp"];
              Module["_ts_language_symbol_count"] = _ts_language_symbol_count = wasmExports2["ts_language_symbol_count"];
              Module["_ts_language_state_count"] = _ts_language_state_count = wasmExports2["ts_language_state_count"];
              Module["_ts_language_abi_version"] = _ts_language_abi_version = wasmExports2["ts_language_abi_version"];
              Module["_ts_language_name"] = _ts_language_name = wasmExports2["ts_language_name"];
              Module["_ts_language_field_count"] = _ts_language_field_count = wasmExports2["ts_language_field_count"];
              Module["_ts_language_next_state"] = _ts_language_next_state = wasmExports2["ts_language_next_state"];
              Module["_ts_language_symbol_name"] = _ts_language_symbol_name = wasmExports2["ts_language_symbol_name"];
              Module["_ts_language_symbol_for_name"] = _ts_language_symbol_for_name = wasmExports2["ts_language_symbol_for_name"];
              Module["_strncmp"] = _strncmp = wasmExports2["strncmp"];
              Module["_ts_language_symbol_type"] = _ts_language_symbol_type = wasmExports2["ts_language_symbol_type"];
              Module["_ts_language_field_name_for_id"] = _ts_language_field_name_for_id = wasmExports2["ts_language_field_name_for_id"];
              Module["_ts_lookahead_iterator_new"] = _ts_lookahead_iterator_new = wasmExports2["ts_lookahead_iterator_new"];
              Module["_ts_lookahead_iterator_delete"] = _ts_lookahead_iterator_delete = wasmExports2["ts_lookahead_iterator_delete"];
              Module["_ts_lookahead_iterator_reset_state"] = _ts_lookahead_iterator_reset_state = wasmExports2["ts_lookahead_iterator_reset_state"];
              Module["_ts_lookahead_iterator_reset"] = _ts_lookahead_iterator_reset = wasmExports2["ts_lookahead_iterator_reset"];
              Module["_ts_lookahead_iterator_next"] = _ts_lookahead_iterator_next = wasmExports2["ts_lookahead_iterator_next"];
              Module["_ts_lookahead_iterator_current_symbol"] = _ts_lookahead_iterator_current_symbol = wasmExports2["ts_lookahead_iterator_current_symbol"];
              Module["_ts_point_edit"] = _ts_point_edit = wasmExports2["ts_point_edit"];
              Module["_ts_parser_delete"] = _ts_parser_delete = wasmExports2["ts_parser_delete"];
              Module["_ts_parser_reset"] = _ts_parser_reset = wasmExports2["ts_parser_reset"];
              Module["_ts_parser_set_language"] = _ts_parser_set_language = wasmExports2["ts_parser_set_language"];
              Module["_ts_parser_set_included_ranges"] = _ts_parser_set_included_ranges = wasmExports2["ts_parser_set_included_ranges"];
              Module["_ts_query_new"] = _ts_query_new = wasmExports2["ts_query_new"];
              Module["_ts_query_delete"] = _ts_query_delete = wasmExports2["ts_query_delete"];
              Module["_iswspace"] = _iswspace = wasmExports2["iswspace"];
              Module["_iswalnum"] = _iswalnum = wasmExports2["iswalnum"];
              Module["_ts_query_pattern_count"] = _ts_query_pattern_count = wasmExports2["ts_query_pattern_count"];
              Module["_ts_query_capture_count"] = _ts_query_capture_count = wasmExports2["ts_query_capture_count"];
              Module["_ts_query_string_count"] = _ts_query_string_count = wasmExports2["ts_query_string_count"];
              Module["_ts_query_capture_name_for_id"] = _ts_query_capture_name_for_id = wasmExports2["ts_query_capture_name_for_id"];
              Module["_ts_query_capture_quantifier_for_id"] = _ts_query_capture_quantifier_for_id = wasmExports2["ts_query_capture_quantifier_for_id"];
              Module["_ts_query_string_value_for_id"] = _ts_query_string_value_for_id = wasmExports2["ts_query_string_value_for_id"];
              Module["_ts_query_predicates_for_pattern"] = _ts_query_predicates_for_pattern = wasmExports2["ts_query_predicates_for_pattern"];
              Module["_ts_query_start_byte_for_pattern"] = _ts_query_start_byte_for_pattern = wasmExports2["ts_query_start_byte_for_pattern"];
              Module["_ts_query_end_byte_for_pattern"] = _ts_query_end_byte_for_pattern = wasmExports2["ts_query_end_byte_for_pattern"];
              Module["_ts_query_is_pattern_rooted"] = _ts_query_is_pattern_rooted = wasmExports2["ts_query_is_pattern_rooted"];
              Module["_ts_query_is_pattern_non_local"] = _ts_query_is_pattern_non_local = wasmExports2["ts_query_is_pattern_non_local"];
              Module["_ts_query_is_pattern_guaranteed_at_step"] = _ts_query_is_pattern_guaranteed_at_step = wasmExports2["ts_query_is_pattern_guaranteed_at_step"];
              Module["_ts_query_disable_capture"] = _ts_query_disable_capture = wasmExports2["ts_query_disable_capture"];
              Module["_ts_query_disable_pattern"] = _ts_query_disable_pattern = wasmExports2["ts_query_disable_pattern"];
              Module["_ts_tree_copy"] = _ts_tree_copy = wasmExports2["ts_tree_copy"];
              Module["_ts_tree_delete"] = _ts_tree_delete = wasmExports2["ts_tree_delete"];
              Module["_ts_init"] = _ts_init = wasmExports2["ts_init"];
              Module["_ts_parser_new_wasm"] = _ts_parser_new_wasm = wasmExports2["ts_parser_new_wasm"];
              Module["_ts_parser_enable_logger_wasm"] = _ts_parser_enable_logger_wasm = wasmExports2["ts_parser_enable_logger_wasm"];
              Module["_ts_parser_parse_wasm"] = _ts_parser_parse_wasm = wasmExports2["ts_parser_parse_wasm"];
              Module["_ts_parser_included_ranges_wasm"] = _ts_parser_included_ranges_wasm = wasmExports2["ts_parser_included_ranges_wasm"];
              Module["_ts_language_type_is_named_wasm"] = _ts_language_type_is_named_wasm = wasmExports2["ts_language_type_is_named_wasm"];
              Module["_ts_language_type_is_visible_wasm"] = _ts_language_type_is_visible_wasm = wasmExports2["ts_language_type_is_visible_wasm"];
              Module["_ts_language_metadata_wasm"] = _ts_language_metadata_wasm = wasmExports2["ts_language_metadata_wasm"];
              Module["_ts_language_supertypes_wasm"] = _ts_language_supertypes_wasm = wasmExports2["ts_language_supertypes_wasm"];
              Module["_ts_language_subtypes_wasm"] = _ts_language_subtypes_wasm = wasmExports2["ts_language_subtypes_wasm"];
              Module["_ts_tree_root_node_wasm"] = _ts_tree_root_node_wasm = wasmExports2["ts_tree_root_node_wasm"];
              Module["_ts_tree_root_node_with_offset_wasm"] = _ts_tree_root_node_with_offset_wasm = wasmExports2["ts_tree_root_node_with_offset_wasm"];
              Module["_ts_tree_edit_wasm"] = _ts_tree_edit_wasm = wasmExports2["ts_tree_edit_wasm"];
              Module["_ts_tree_included_ranges_wasm"] = _ts_tree_included_ranges_wasm = wasmExports2["ts_tree_included_ranges_wasm"];
              Module["_ts_tree_get_changed_ranges_wasm"] = _ts_tree_get_changed_ranges_wasm = wasmExports2["ts_tree_get_changed_ranges_wasm"];
              Module["_ts_tree_cursor_new_wasm"] = _ts_tree_cursor_new_wasm = wasmExports2["ts_tree_cursor_new_wasm"];
              Module["_ts_tree_cursor_copy_wasm"] = _ts_tree_cursor_copy_wasm = wasmExports2["ts_tree_cursor_copy_wasm"];
              Module["_ts_tree_cursor_delete_wasm"] = _ts_tree_cursor_delete_wasm = wasmExports2["ts_tree_cursor_delete_wasm"];
              Module["_ts_tree_cursor_reset_wasm"] = _ts_tree_cursor_reset_wasm = wasmExports2["ts_tree_cursor_reset_wasm"];
              Module["_ts_tree_cursor_reset_to_wasm"] = _ts_tree_cursor_reset_to_wasm = wasmExports2["ts_tree_cursor_reset_to_wasm"];
              Module["_ts_tree_cursor_goto_first_child_wasm"] = _ts_tree_cursor_goto_first_child_wasm = wasmExports2["ts_tree_cursor_goto_first_child_wasm"];
              Module["_ts_tree_cursor_goto_last_child_wasm"] = _ts_tree_cursor_goto_last_child_wasm = wasmExports2["ts_tree_cursor_goto_last_child_wasm"];
              Module["_ts_tree_cursor_goto_first_child_for_index_wasm"] = _ts_tree_cursor_goto_first_child_for_index_wasm = wasmExports2["ts_tree_cursor_goto_first_child_for_index_wasm"];
              Module["_ts_tree_cursor_goto_first_child_for_position_wasm"] = _ts_tree_cursor_goto_first_child_for_position_wasm = wasmExports2["ts_tree_cursor_goto_first_child_for_position_wasm"];
              Module["_ts_tree_cursor_goto_next_sibling_wasm"] = _ts_tree_cursor_goto_next_sibling_wasm = wasmExports2["ts_tree_cursor_goto_next_sibling_wasm"];
              Module["_ts_tree_cursor_goto_previous_sibling_wasm"] = _ts_tree_cursor_goto_previous_sibling_wasm = wasmExports2["ts_tree_cursor_goto_previous_sibling_wasm"];
              Module["_ts_tree_cursor_goto_descendant_wasm"] = _ts_tree_cursor_goto_descendant_wasm = wasmExports2["ts_tree_cursor_goto_descendant_wasm"];
              Module["_ts_tree_cursor_goto_parent_wasm"] = _ts_tree_cursor_goto_parent_wasm = wasmExports2["ts_tree_cursor_goto_parent_wasm"];
              Module["_ts_tree_cursor_current_node_type_id_wasm"] = _ts_tree_cursor_current_node_type_id_wasm = wasmExports2["ts_tree_cursor_current_node_type_id_wasm"];
              Module["_ts_tree_cursor_current_node_state_id_wasm"] = _ts_tree_cursor_current_node_state_id_wasm = wasmExports2["ts_tree_cursor_current_node_state_id_wasm"];
              Module["_ts_tree_cursor_current_node_is_named_wasm"] = _ts_tree_cursor_current_node_is_named_wasm = wasmExports2["ts_tree_cursor_current_node_is_named_wasm"];
              Module["_ts_tree_cursor_current_node_is_missing_wasm"] = _ts_tree_cursor_current_node_is_missing_wasm = wasmExports2["ts_tree_cursor_current_node_is_missing_wasm"];
              Module["_ts_tree_cursor_current_node_id_wasm"] = _ts_tree_cursor_current_node_id_wasm = wasmExports2["ts_tree_cursor_current_node_id_wasm"];
              Module["_ts_tree_cursor_start_position_wasm"] = _ts_tree_cursor_start_position_wasm = wasmExports2["ts_tree_cursor_start_position_wasm"];
              Module["_ts_tree_cursor_end_position_wasm"] = _ts_tree_cursor_end_position_wasm = wasmExports2["ts_tree_cursor_end_position_wasm"];
              Module["_ts_tree_cursor_start_index_wasm"] = _ts_tree_cursor_start_index_wasm = wasmExports2["ts_tree_cursor_start_index_wasm"];
              Module["_ts_tree_cursor_end_index_wasm"] = _ts_tree_cursor_end_index_wasm = wasmExports2["ts_tree_cursor_end_index_wasm"];
              Module["_ts_tree_cursor_current_field_id_wasm"] = _ts_tree_cursor_current_field_id_wasm = wasmExports2["ts_tree_cursor_current_field_id_wasm"];
              Module["_ts_tree_cursor_current_depth_wasm"] = _ts_tree_cursor_current_depth_wasm = wasmExports2["ts_tree_cursor_current_depth_wasm"];
              Module["_ts_tree_cursor_current_descendant_index_wasm"] = _ts_tree_cursor_current_descendant_index_wasm = wasmExports2["ts_tree_cursor_current_descendant_index_wasm"];
              Module["_ts_tree_cursor_current_node_wasm"] = _ts_tree_cursor_current_node_wasm = wasmExports2["ts_tree_cursor_current_node_wasm"];
              Module["_ts_node_symbol_wasm"] = _ts_node_symbol_wasm = wasmExports2["ts_node_symbol_wasm"];
              Module["_ts_node_field_name_for_child_wasm"] = _ts_node_field_name_for_child_wasm = wasmExports2["ts_node_field_name_for_child_wasm"];
              Module["_ts_node_field_name_for_named_child_wasm"] = _ts_node_field_name_for_named_child_wasm = wasmExports2["ts_node_field_name_for_named_child_wasm"];
              Module["_ts_node_children_by_field_id_wasm"] = _ts_node_children_by_field_id_wasm = wasmExports2["ts_node_children_by_field_id_wasm"];
              Module["_ts_node_first_child_for_byte_wasm"] = _ts_node_first_child_for_byte_wasm = wasmExports2["ts_node_first_child_for_byte_wasm"];
              Module["_ts_node_first_named_child_for_byte_wasm"] = _ts_node_first_named_child_for_byte_wasm = wasmExports2["ts_node_first_named_child_for_byte_wasm"];
              Module["_ts_node_grammar_symbol_wasm"] = _ts_node_grammar_symbol_wasm = wasmExports2["ts_node_grammar_symbol_wasm"];
              Module["_ts_node_child_count_wasm"] = _ts_node_child_count_wasm = wasmExports2["ts_node_child_count_wasm"];
              Module["_ts_node_named_child_count_wasm"] = _ts_node_named_child_count_wasm = wasmExports2["ts_node_named_child_count_wasm"];
              Module["_ts_node_child_wasm"] = _ts_node_child_wasm = wasmExports2["ts_node_child_wasm"];
              Module["_ts_node_named_child_wasm"] = _ts_node_named_child_wasm = wasmExports2["ts_node_named_child_wasm"];
              Module["_ts_node_child_by_field_id_wasm"] = _ts_node_child_by_field_id_wasm = wasmExports2["ts_node_child_by_field_id_wasm"];
              Module["_ts_node_next_sibling_wasm"] = _ts_node_next_sibling_wasm = wasmExports2["ts_node_next_sibling_wasm"];
              Module["_ts_node_prev_sibling_wasm"] = _ts_node_prev_sibling_wasm = wasmExports2["ts_node_prev_sibling_wasm"];
              Module["_ts_node_next_named_sibling_wasm"] = _ts_node_next_named_sibling_wasm = wasmExports2["ts_node_next_named_sibling_wasm"];
              Module["_ts_node_prev_named_sibling_wasm"] = _ts_node_prev_named_sibling_wasm = wasmExports2["ts_node_prev_named_sibling_wasm"];
              Module["_ts_node_descendant_count_wasm"] = _ts_node_descendant_count_wasm = wasmExports2["ts_node_descendant_count_wasm"];
              Module["_ts_node_parent_wasm"] = _ts_node_parent_wasm = wasmExports2["ts_node_parent_wasm"];
              Module["_ts_node_child_with_descendant_wasm"] = _ts_node_child_with_descendant_wasm = wasmExports2["ts_node_child_with_descendant_wasm"];
              Module["_ts_node_descendant_for_index_wasm"] = _ts_node_descendant_for_index_wasm = wasmExports2["ts_node_descendant_for_index_wasm"];
              Module["_ts_node_named_descendant_for_index_wasm"] = _ts_node_named_descendant_for_index_wasm = wasmExports2["ts_node_named_descendant_for_index_wasm"];
              Module["_ts_node_descendant_for_position_wasm"] = _ts_node_descendant_for_position_wasm = wasmExports2["ts_node_descendant_for_position_wasm"];
              Module["_ts_node_named_descendant_for_position_wasm"] = _ts_node_named_descendant_for_position_wasm = wasmExports2["ts_node_named_descendant_for_position_wasm"];
              Module["_ts_node_start_point_wasm"] = _ts_node_start_point_wasm = wasmExports2["ts_node_start_point_wasm"];
              Module["_ts_node_end_point_wasm"] = _ts_node_end_point_wasm = wasmExports2["ts_node_end_point_wasm"];
              Module["_ts_node_start_index_wasm"] = _ts_node_start_index_wasm = wasmExports2["ts_node_start_index_wasm"];
              Module["_ts_node_end_index_wasm"] = _ts_node_end_index_wasm = wasmExports2["ts_node_end_index_wasm"];
              Module["_ts_node_to_string_wasm"] = _ts_node_to_string_wasm = wasmExports2["ts_node_to_string_wasm"];
              Module["_ts_node_children_wasm"] = _ts_node_children_wasm = wasmExports2["ts_node_children_wasm"];
              Module["_ts_node_named_children_wasm"] = _ts_node_named_children_wasm = wasmExports2["ts_node_named_children_wasm"];
              Module["_ts_node_descendants_of_type_wasm"] = _ts_node_descendants_of_type_wasm = wasmExports2["ts_node_descendants_of_type_wasm"];
              Module["_ts_node_is_named_wasm"] = _ts_node_is_named_wasm = wasmExports2["ts_node_is_named_wasm"];
              Module["_ts_node_has_changes_wasm"] = _ts_node_has_changes_wasm = wasmExports2["ts_node_has_changes_wasm"];
              Module["_ts_node_has_error_wasm"] = _ts_node_has_error_wasm = wasmExports2["ts_node_has_error_wasm"];
              Module["_ts_node_is_error_wasm"] = _ts_node_is_error_wasm = wasmExports2["ts_node_is_error_wasm"];
              Module["_ts_node_is_missing_wasm"] = _ts_node_is_missing_wasm = wasmExports2["ts_node_is_missing_wasm"];
              Module["_ts_node_is_extra_wasm"] = _ts_node_is_extra_wasm = wasmExports2["ts_node_is_extra_wasm"];
              Module["_ts_node_parse_state_wasm"] = _ts_node_parse_state_wasm = wasmExports2["ts_node_parse_state_wasm"];
              Module["_ts_node_next_parse_state_wasm"] = _ts_node_next_parse_state_wasm = wasmExports2["ts_node_next_parse_state_wasm"];
              Module["_ts_query_matches_wasm"] = _ts_query_matches_wasm = wasmExports2["ts_query_matches_wasm"];
              Module["_ts_query_captures_wasm"] = _ts_query_captures_wasm = wasmExports2["ts_query_captures_wasm"];
              Module["_memset"] = _memset = wasmExports2["memset"];
              Module["_memcpy"] = _memcpy = wasmExports2["memcpy"];
              Module["_memmove"] = _memmove = wasmExports2["memmove"];
              Module["_iswalpha"] = _iswalpha = wasmExports2["iswalpha"];
              Module["_iswblank"] = _iswblank = wasmExports2["iswblank"];
              Module["_iswdigit"] = _iswdigit = wasmExports2["iswdigit"];
              Module["_iswlower"] = _iswlower = wasmExports2["iswlower"];
              Module["_iswupper"] = _iswupper = wasmExports2["iswupper"];
              Module["_iswxdigit"] = _iswxdigit = wasmExports2["iswxdigit"];
              Module["_memchr"] = _memchr = wasmExports2["memchr"];
              Module["_strlen"] = _strlen = wasmExports2["strlen"];
              Module["_strcmp"] = _strcmp = wasmExports2["strcmp"];
              Module["_strncat"] = _strncat = wasmExports2["strncat"];
              Module["_strncpy"] = _strncpy = wasmExports2["strncpy"];
              Module["_towlower"] = _towlower = wasmExports2["towlower"];
              Module["_towupper"] = _towupper = wasmExports2["towupper"];
              _setThrew = wasmExports2["setThrew"];
              __emscripten_stack_restore = wasmExports2["_emscripten_stack_restore"];
              __emscripten_stack_alloc = wasmExports2["_emscripten_stack_alloc"];
              _emscripten_stack_get_current = wasmExports2["emscripten_stack_get_current"];
              ___wasm_apply_data_relocs = wasmExports2["__wasm_apply_data_relocs"];
            }
            __name(assignWasmExports, "assignWasmExports");
            var wasmImports = {
              /** @export */
              __heap_base: ___heap_base,
              /** @export */
              __indirect_function_table: wasmTable,
              /** @export */
              __memory_base: ___memory_base,
              /** @export */
              __stack_high: ___stack_high,
              /** @export */
              __stack_low: ___stack_low,
              /** @export */
              __stack_pointer: ___stack_pointer,
              /** @export */
              __table_base: ___table_base,
              /** @export */
              _abort_js: __abort_js,
              /** @export */
              emscripten_resize_heap: _emscripten_resize_heap,
              /** @export */
              fd_close: _fd_close,
              /** @export */
              fd_seek: _fd_seek,
              /** @export */
              fd_write: _fd_write,
              /** @export */
              memory: wasmMemory,
              /** @export */
              tree_sitter_log_callback: _tree_sitter_log_callback,
              /** @export */
              tree_sitter_parse_callback: _tree_sitter_parse_callback,
              /** @export */
              tree_sitter_progress_callback: _tree_sitter_progress_callback,
              /** @export */
              tree_sitter_query_progress_callback: _tree_sitter_query_progress_callback
            };
            function callMain(args2 = []) {
              var entryFunction = resolveGlobalSymbol("main").sym;
              if (!entryFunction) return;
              args2.unshift(thisProgram);
              var argc = args2.length;
              var argv = stackAlloc((argc + 1) * 4);
              var argv_ptr = argv;
              args2.forEach((arg) => {
                LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, stringToUTF8OnStack(arg));
                argv_ptr += 4;
              });
              LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, 0);
              try {
                var ret = entryFunction(argc, argv);
                exitJS(
                  ret,
                  /* implicit = */
                  true
                );
                return ret;
              } catch (e) {
                return handleException(e);
              }
            }
            __name(callMain, "callMain");
            function run(args2 = arguments_) {
              if (runDependencies > 0) {
                dependenciesFulfilled = run;
                return;
              }
              preRun();
              if (runDependencies > 0) {
                dependenciesFulfilled = run;
                return;
              }
              function doRun() {
                Module["calledRun"] = true;
                if (ABORT) return;
                initRuntime();
                preMain();
                readyPromiseResolve?.(Module);
                Module["onRuntimeInitialized"]?.();
                var noInitialRun = Module["noInitialRun"] || false;
                if (!noInitialRun) callMain(args2);
                postRun();
              }
              __name(doRun, "doRun");
              if (Module["setStatus"]) {
                Module["setStatus"]("Running...");
                setTimeout(() => {
                  setTimeout(() => Module["setStatus"](""), 1);
                  doRun();
                }, 1);
              } else {
                doRun();
              }
            }
            __name(run, "run");
            var wasmExports;
            wasmExports = await createWasm();
            run();
            if (runtimeInitialized) {
              moduleRtn = Module;
            } else {
              moduleRtn = new Promise((resolve, reject) => {
                readyPromiseResolve = resolve;
                readyPromiseReject = reject;
              });
            }
            return moduleRtn;
          };
        })();
        if (typeof exports === "object" && typeof module === "object") {
          module.exports = Module;
          module.exports.default = Module;
        } else if (typeof define === "function" && define["amd"])
          define([], () => Module);
      }
    });
    var index_exports = {};
    __export(index_exports, {
      CaptureQuantifier: () => CaptureQuantifier,
      Edit: () => Edit,
      LANGUAGE_VERSION: () => LANGUAGE_VERSION,
      Language: () => Language,
      LookaheadIterator: () => LookaheadIterator,
      MIN_COMPATIBLE_VERSION: () => MIN_COMPATIBLE_VERSION,
      Node: () => Node,
      Parser: () => Parser,
      Query: () => Query,
      Tree: () => Tree,
      TreeCursor: () => TreeCursor
    });
    module.exports = __toCommonJS(index_exports);
    var Edit = class {
      static {
        __name(this, "Edit");
      }
      /** The start position of the change. */
      startPosition;
      /** The end position of the change before the edit. */
      oldEndPosition;
      /** The end position of the change after the edit. */
      newEndPosition;
      /** The start index of the change. */
      startIndex;
      /** The end index of the change before the edit. */
      oldEndIndex;
      /** The end index of the change after the edit. */
      newEndIndex;
      constructor({
        startIndex,
        oldEndIndex,
        newEndIndex,
        startPosition,
        oldEndPosition,
        newEndPosition
      }) {
        this.startIndex = startIndex >>> 0;
        this.oldEndIndex = oldEndIndex >>> 0;
        this.newEndIndex = newEndIndex >>> 0;
        this.startPosition = startPosition;
        this.oldEndPosition = oldEndPosition;
        this.newEndPosition = newEndPosition;
      }
      /**
       * Edit a point and index to keep it in-sync with source code that has been edited.
       *
       * This function updates a single point's byte offset and row/column position
       * based on an edit operation. This is useful for editing points without
       * requiring a tree or node instance.
       */
      editPoint(point, index) {
        let newIndex = index;
        const newPoint = { ...point };
        if (index >= this.oldEndIndex) {
          newIndex = this.newEndIndex + (index - this.oldEndIndex);
          const originalRow = point.row;
          newPoint.row = this.newEndPosition.row + (point.row - this.oldEndPosition.row);
          newPoint.column = originalRow === this.oldEndPosition.row ? this.newEndPosition.column + (point.column - this.oldEndPosition.column) : point.column;
        } else if (index > this.startIndex) {
          newIndex = this.newEndIndex;
          newPoint.row = this.newEndPosition.row;
          newPoint.column = this.newEndPosition.column;
        }
        return { point: newPoint, index: newIndex };
      }
      /**
       * Edit a range to keep it in-sync with source code that has been edited.
       *
       * This function updates a range's start and end positions based on an edit
       * operation. This is useful for editing ranges without requiring a tree
       * or node instance.
       */
      editRange(range) {
        const newRange = {
          startIndex: range.startIndex,
          startPosition: { ...range.startPosition },
          endIndex: range.endIndex,
          endPosition: { ...range.endPosition }
        };
        if (range.endIndex >= this.oldEndIndex) {
          if (range.endIndex !== Number.MAX_SAFE_INTEGER) {
            newRange.endIndex = this.newEndIndex + (range.endIndex - this.oldEndIndex);
            newRange.endPosition = {
              row: this.newEndPosition.row + (range.endPosition.row - this.oldEndPosition.row),
              column: range.endPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (range.endPosition.column - this.oldEndPosition.column) : range.endPosition.column
            };
            if (newRange.endIndex < this.newEndIndex) {
              newRange.endIndex = Number.MAX_SAFE_INTEGER;
              newRange.endPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER };
            }
          }
        } else if (range.endIndex > this.startIndex) {
          newRange.endIndex = this.startIndex;
          newRange.endPosition = { ...this.startPosition };
        }
        if (range.startIndex >= this.oldEndIndex) {
          newRange.startIndex = this.newEndIndex + (range.startIndex - this.oldEndIndex);
          newRange.startPosition = {
            row: this.newEndPosition.row + (range.startPosition.row - this.oldEndPosition.row),
            column: range.startPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (range.startPosition.column - this.oldEndPosition.column) : range.startPosition.column
          };
          if (newRange.startIndex < this.newEndIndex) {
            newRange.startIndex = Number.MAX_SAFE_INTEGER;
            newRange.startPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER };
          }
        } else if (range.startIndex > this.startIndex) {
          newRange.startIndex = this.startIndex;
          newRange.startPosition = { ...this.startPosition };
        }
        return newRange;
      }
    };
    var SIZE_OF_SHORT = 2;
    var SIZE_OF_INT = 4;
    var SIZE_OF_CURSOR = 4 * SIZE_OF_INT;
    var SIZE_OF_NODE = 5 * SIZE_OF_INT;
    var SIZE_OF_POINT = 2 * SIZE_OF_INT;
    var SIZE_OF_RANGE = 2 * SIZE_OF_INT + 2 * SIZE_OF_POINT;
    var ZERO_POINT = { row: 0, column: 0 };
    var INTERNAL = /* @__PURE__ */ Symbol("INTERNAL");
    function assertInternal(x) {
      if (x !== INTERNAL) throw new Error("Illegal constructor");
    }
    __name(assertInternal, "assertInternal");
    function isPoint(point) {
      return !!point && typeof point.row === "number" && typeof point.column === "number";
    }
    __name(isPoint, "isPoint");
    function setModule(module2) {
      C = module2;
    }
    __name(setModule, "setModule");
    var C;
    var LookaheadIterator = class {
      static {
        __name(this, "LookaheadIterator");
      }
      /** @internal */
      [0] = 0;
      // Internal handle for Wasm
      /** @internal */
      language;
      /** @internal */
      constructor(internal, address, language) {
        assertInternal(internal);
        this[0] = address;
        this.language = language;
      }
      /** Get the current symbol of the lookahead iterator. */
      get currentTypeId() {
        return C._ts_lookahead_iterator_current_symbol(this[0]);
      }
      /** Get the current symbol name of the lookahead iterator. */
      get currentType() {
        return this.language.types[this.currentTypeId] || "ERROR";
      }
      /** Delete the lookahead iterator, freeing its resources. */
      delete() {
        C._ts_lookahead_iterator_delete(this[0]);
        this[0] = 0;
      }
      /**
       * Reset the lookahead iterator.
       *
       * This returns `true` if the language was set successfully and `false`
       * otherwise.
       */
      reset(language, stateId) {
        if (C._ts_lookahead_iterator_reset(this[0], language[0], stateId)) {
          this.language = language;
          return true;
        }
        return false;
      }
      /**
       * Reset the lookahead iterator to another state.
       *
       * This returns `true` if the iterator was reset to the given state and
       * `false` otherwise.
       */
      resetState(stateId) {
        return Boolean(C._ts_lookahead_iterator_reset_state(this[0], stateId));
      }
      /**
       * Returns an iterator that iterates over the symbols of the lookahead iterator.
       *
       * The iterator will yield the current symbol name as a string for each step
       * until there are no more symbols to iterate over.
       */
      [Symbol.iterator]() {
        return {
          next: /* @__PURE__ */ __name(() => {
            if (C._ts_lookahead_iterator_next(this[0])) {
              return { done: false, value: this.currentType };
            }
            return { done: true, value: "" };
          }, "next")
        };
      }
    };
    function getText(tree, startIndex, endIndex, startPosition) {
      const length = endIndex - startIndex;
      let result = tree.textCallback(startIndex, startPosition);
      if (result) {
        startIndex += result.length;
        while (startIndex < endIndex) {
          const string = tree.textCallback(startIndex, startPosition);
          if (string && string.length > 0) {
            startIndex += string.length;
            result += string;
          } else {
            break;
          }
        }
        if (startIndex > endIndex) {
          result = result.slice(0, length);
        }
      }
      return result ?? "";
    }
    __name(getText, "getText");
    var Tree = class _Tree {
      static {
        __name(this, "Tree");
      }
      /** @internal */
      [0] = 0;
      // Internal handle for Wasm
      /** @internal */
      textCallback;
      /** The language that was used to parse the syntax tree. */
      language;
      /** @internal */
      constructor(internal, address, language, textCallback) {
        assertInternal(internal);
        this[0] = address;
        this.language = language;
        this.textCallback = textCallback;
      }
      /** Create a shallow copy of the syntax tree. This is very fast. */
      copy() {
        const address = C._ts_tree_copy(this[0]);
        return new _Tree(INTERNAL, address, this.language, this.textCallback);
      }
      /** Delete the syntax tree, freeing its resources. */
      delete() {
        C._ts_tree_delete(this[0]);
        this[0] = 0;
      }
      /** Get the root node of the syntax tree. */
      get rootNode() {
        C._ts_tree_root_node_wasm(this[0]);
        return unmarshalNode(this);
      }
      /**
       * Get the root node of the syntax tree, but with its position shifted
       * forward by the given offset.
       */
      rootNodeWithOffset(offsetBytes, offsetExtent) {
        const address = TRANSFER_BUFFER + SIZE_OF_NODE;
        C.setValue(address, offsetBytes, "i32");
        marshalPoint(address + SIZE_OF_INT, offsetExtent);
        C._ts_tree_root_node_with_offset_wasm(this[0]);
        return unmarshalNode(this);
      }
      /**
       * Edit the syntax tree to keep it in sync with source code that has been
       * edited.
       *
       * You must describe the edit both in terms of byte offsets and in terms of
       * row/column coordinates.
       */
      edit(edit) {
        marshalEdit(edit);
        C._ts_tree_edit_wasm(this[0]);
      }
      /** Create a new {@link TreeCursor} starting from the root of the tree. */
      walk() {
        return this.rootNode.walk();
      }
      /**
       * Compare this old edited syntax tree to a new syntax tree representing
       * the same document, returning a sequence of ranges whose syntactic
       * structure has changed.
       *
       * For this to work correctly, this syntax tree must have been edited such
       * that its ranges match up to the new tree. Generally, you'll want to
       * call this method right after calling one of the [`Parser::parse`]
       * functions. Call it on the old tree that was passed to parse, and
       * pass the new tree that was returned from `parse`.
       */
      getChangedRanges(other) {
        if (!(other instanceof _Tree)) {
          throw new TypeError("Argument must be a Tree");
        }
        C._ts_tree_get_changed_ranges_wasm(this[0], other[0]);
        const count = C.getValue(TRANSFER_BUFFER, "i32");
        const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const result = new Array(count);
        if (count > 0) {
          let address = buffer;
          for (let i2 = 0; i2 < count; i2++) {
            result[i2] = unmarshalRange(address);
            address += SIZE_OF_RANGE;
          }
          C._free(buffer);
        }
        return result;
      }
      /** Get the included ranges that were used to parse the syntax tree. */
      getIncludedRanges() {
        C._ts_tree_included_ranges_wasm(this[0]);
        const count = C.getValue(TRANSFER_BUFFER, "i32");
        const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const result = new Array(count);
        if (count > 0) {
          let address = buffer;
          for (let i2 = 0; i2 < count; i2++) {
            result[i2] = unmarshalRange(address);
            address += SIZE_OF_RANGE;
          }
          C._free(buffer);
        }
        return result;
      }
    };
    var TreeCursor = class _TreeCursor {
      static {
        __name(this, "TreeCursor");
      }
      /** @internal */
      // @ts-expect-error: never read
      [0] = 0;
      // Internal handle for Wasm
      /** @internal */
      // @ts-expect-error: never read
      [1] = 0;
      // Internal handle for Wasm
      /** @internal */
      // @ts-expect-error: never read
      [2] = 0;
      // Internal handle for Wasm
      /** @internal */
      // @ts-expect-error: never read
      [3] = 0;
      // Internal handle for Wasm
      /** @internal */
      tree;
      /** @internal */
      constructor(internal, tree) {
        assertInternal(internal);
        this.tree = tree;
        unmarshalTreeCursor(this);
      }
      /** Creates a deep copy of the tree cursor. This allocates new memory. */
      copy() {
        const copy = new _TreeCursor(INTERNAL, this.tree);
        C._ts_tree_cursor_copy_wasm(this.tree[0]);
        unmarshalTreeCursor(copy);
        return copy;
      }
      /** Delete the tree cursor, freeing its resources. */
      delete() {
        marshalTreeCursor(this);
        C._ts_tree_cursor_delete_wasm(this.tree[0]);
        this[0] = this[1] = this[2] = 0;
      }
      /** Get the tree cursor's current {@link Node}. */
      get currentNode() {
        marshalTreeCursor(this);
        C._ts_tree_cursor_current_node_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /**
       * Get the numerical field id of this tree cursor's current node.
       *
       * See also {@link TreeCursor#currentFieldName}.
       */
      get currentFieldId() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_current_field_id_wasm(this.tree[0]);
      }
      /** Get the field name of this tree cursor's current node. */
      get currentFieldName() {
        return this.tree.language.fields[this.currentFieldId];
      }
      /**
       * Get the depth of the cursor's current node relative to the original
       * node that the cursor was constructed with.
       */
      get currentDepth() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_current_depth_wasm(this.tree[0]);
      }
      /**
       * Get the index of the cursor's current node out of all of the
       * descendants of the original node that the cursor was constructed with.
       */
      get currentDescendantIndex() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_current_descendant_index_wasm(this.tree[0]);
      }
      /** Get the type of the cursor's current node. */
      get nodeType() {
        return this.tree.language.types[this.nodeTypeId] || "ERROR";
      }
      /** Get the type id of the cursor's current node. */
      get nodeTypeId() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_current_node_type_id_wasm(this.tree[0]);
      }
      /** Get the state id of the cursor's current node. */
      get nodeStateId() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_current_node_state_id_wasm(this.tree[0]);
      }
      /** Get the id of the cursor's current node. */
      get nodeId() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_current_node_id_wasm(this.tree[0]);
      }
      /**
       * Check if the cursor's current node is *named*.
       *
       * Named nodes correspond to named rules in the grammar, whereas
       * *anonymous* nodes correspond to string literals in the grammar.
       */
      get nodeIsNamed() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_current_node_is_named_wasm(this.tree[0]) === 1;
      }
      /**
       * Check if the cursor's current node is *missing*.
       *
       * Missing nodes are inserted by the parser in order to recover from
       * certain kinds of syntax errors.
       */
      get nodeIsMissing() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_current_node_is_missing_wasm(this.tree[0]) === 1;
      }
      /** Get the string content of the cursor's current node. */
      get nodeText() {
        marshalTreeCursor(this);
        const startIndex = C._ts_tree_cursor_start_index_wasm(this.tree[0]);
        const endIndex = C._ts_tree_cursor_end_index_wasm(this.tree[0]);
        C._ts_tree_cursor_start_position_wasm(this.tree[0]);
        const startPosition = unmarshalPoint(TRANSFER_BUFFER);
        return getText(this.tree, startIndex, endIndex, startPosition);
      }
      /** Get the start position of the cursor's current node. */
      get startPosition() {
        marshalTreeCursor(this);
        C._ts_tree_cursor_start_position_wasm(this.tree[0]);
        return unmarshalPoint(TRANSFER_BUFFER);
      }
      /** Get the end position of the cursor's current node. */
      get endPosition() {
        marshalTreeCursor(this);
        C._ts_tree_cursor_end_position_wasm(this.tree[0]);
        return unmarshalPoint(TRANSFER_BUFFER);
      }
      /** Get the start index of the cursor's current node. */
      get startIndex() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_start_index_wasm(this.tree[0]);
      }
      /** Get the end index of the cursor's current node. */
      get endIndex() {
        marshalTreeCursor(this);
        return C._ts_tree_cursor_end_index_wasm(this.tree[0]);
      }
      /**
       * Move this cursor to the first child of its current node.
       *
       * This returns `true` if the cursor successfully moved, and returns
       * `false` if there were no children.
       */
      gotoFirstChild() {
        marshalTreeCursor(this);
        const result = C._ts_tree_cursor_goto_first_child_wasm(this.tree[0]);
        unmarshalTreeCursor(this);
        return result === 1;
      }
      /**
       * Move this cursor to the last child of its current node.
       *
       * This returns `true` if the cursor successfully moved, and returns
       * `false` if there were no children.
       *
       * Note that this function may be slower than
       * {@link TreeCursor#gotoFirstChild} because it needs to
       * iterate through all the children to compute the child's position.
       */
      gotoLastChild() {
        marshalTreeCursor(this);
        const result = C._ts_tree_cursor_goto_last_child_wasm(this.tree[0]);
        unmarshalTreeCursor(this);
        return result === 1;
      }
      /**
       * Move this cursor to the parent of its current node.
       *
       * This returns `true` if the cursor successfully moved, and returns
       * `false` if there was no parent node (the cursor was already on the
       * root node).
       *
       * Note that the node the cursor was constructed with is considered the root
       * of the cursor, and the cursor cannot walk outside this node.
       */
      gotoParent() {
        marshalTreeCursor(this);
        const result = C._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
        unmarshalTreeCursor(this);
        return result === 1;
      }
      /**
       * Move this cursor to the next sibling of its current node.
       *
       * This returns `true` if the cursor successfully moved, and returns
       * `false` if there was no next sibling node.
       *
       * Note that the node the cursor was constructed with is considered the root
       * of the cursor, and the cursor cannot walk outside this node.
       */
      gotoNextSibling() {
        marshalTreeCursor(this);
        const result = C._ts_tree_cursor_goto_next_sibling_wasm(this.tree[0]);
        unmarshalTreeCursor(this);
        return result === 1;
      }
      /**
       * Move this cursor to the previous sibling of its current node.
       *
       * This returns `true` if the cursor successfully moved, and returns
       * `false` if there was no previous sibling node.
       *
       * Note that this function may be slower than
       * {@link TreeCursor#gotoNextSibling} due to how node
       * positions are stored. In the worst case, this will need to iterate
       * through all the children up to the previous sibling node to recalculate
       * its position. Also note that the node the cursor was constructed with is
       * considered the root of the cursor, and the cursor cannot walk outside this node.
       */
      gotoPreviousSibling() {
        marshalTreeCursor(this);
        const result = C._ts_tree_cursor_goto_previous_sibling_wasm(this.tree[0]);
        unmarshalTreeCursor(this);
        return result === 1;
      }
      /**
       * Move the cursor to the node that is the nth descendant of
       * the original node that the cursor was constructed with, where
       * zero represents the original node itself.
       */
      gotoDescendant(goalDescendantIndex) {
        marshalTreeCursor(this);
        C._ts_tree_cursor_goto_descendant_wasm(this.tree[0], goalDescendantIndex);
        unmarshalTreeCursor(this);
      }
      /**
       * Move this cursor to the first child of its current node that contains or
       * starts after the given byte offset.
       *
       * This returns `true` if the cursor successfully moved to a child node, and returns
       * `false` if no such child was found.
       */
      gotoFirstChildForIndex(goalIndex) {
        marshalTreeCursor(this);
        C.setValue(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalIndex, "i32");
        const result = C._ts_tree_cursor_goto_first_child_for_index_wasm(this.tree[0]);
        unmarshalTreeCursor(this);
        return result === 1;
      }
      /**
       * Move this cursor to the first child of its current node that contains or
       * starts after the given byte offset.
       *
       * This returns the index of the child node if one was found, and returns
       * `null` if no such child was found.
       */
      gotoFirstChildForPosition(goalPosition) {
        marshalTreeCursor(this);
        marshalPoint(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalPosition);
        const result = C._ts_tree_cursor_goto_first_child_for_position_wasm(this.tree[0]);
        unmarshalTreeCursor(this);
        return result === 1;
      }
      /**
       * Re-initialize this tree cursor to start at the original node that the
       * cursor was constructed with.
       */
      reset(node) {
        marshalNode(node);
        marshalTreeCursor(this, TRANSFER_BUFFER + SIZE_OF_NODE);
        C._ts_tree_cursor_reset_wasm(this.tree[0]);
        unmarshalTreeCursor(this);
      }
      /**
       * Re-initialize a tree cursor to the same position as another cursor.
       *
       * Unlike {@link TreeCursor#reset}, this will not lose parent
       * information and allows reusing already created cursors.
       */
      resetTo(cursor) {
        marshalTreeCursor(this, TRANSFER_BUFFER);
        marshalTreeCursor(cursor, TRANSFER_BUFFER + SIZE_OF_CURSOR);
        C._ts_tree_cursor_reset_to_wasm(this.tree[0], cursor.tree[0]);
        unmarshalTreeCursor(this);
      }
    };
    var Node = class {
      static {
        __name(this, "Node");
      }
      /** @internal */
      // @ts-expect-error: never read
      [0] = 0;
      // Internal handle for Wasm
      /** @internal */
      _children;
      /** @internal */
      _namedChildren;
      /** @internal */
      constructor(internal, {
        id,
        tree,
        startIndex,
        startPosition,
        other
      }) {
        assertInternal(internal);
        this[0] = other;
        this.id = id;
        this.tree = tree;
        this.startIndex = startIndex;
        this.startPosition = startPosition;
      }
      /**
       * The numeric id for this node that is unique.
       *
       * Within a given syntax tree, no two nodes have the same id. However:
       *
       * * If a new tree is created based on an older tree, and a node from the old tree is reused in
       *   the process, then that node will have the same id in both trees.
       *
       * * A node not marked as having changes does not guarantee it was reused.
       *
       * * If a node is marked as having changed in the old tree, it will not be reused.
       */
      id;
      /** The byte index where this node starts. */
      startIndex;
      /** The position where this node starts. */
      startPosition;
      /** The tree that this node belongs to. */
      tree;
      /** Get this node's type as a numerical id. */
      get typeId() {
        marshalNode(this);
        return C._ts_node_symbol_wasm(this.tree[0]);
      }
      /**
       * Get the node's type as a numerical id as it appears in the grammar,
       * ignoring aliases.
       */
      get grammarId() {
        marshalNode(this);
        return C._ts_node_grammar_symbol_wasm(this.tree[0]);
      }
      /** Get this node's type as a string. */
      get type() {
        return this.tree.language.types[this.typeId] || "ERROR";
      }
      /**
       * Get this node's symbol name as it appears in the grammar, ignoring
       * aliases as a string.
       */
      get grammarType() {
        return this.tree.language.types[this.grammarId] || "ERROR";
      }
      /**
       * Check if this node is *named*.
       *
       * Named nodes correspond to named rules in the grammar, whereas
       * *anonymous* nodes correspond to string literals in the grammar.
       */
      get isNamed() {
        marshalNode(this);
        return C._ts_node_is_named_wasm(this.tree[0]) === 1;
      }
      /**
       * Check if this node is *extra*.
       *
       * Extra nodes represent things like comments, which are not required
       * by the grammar, but can appear anywhere.
       */
      get isExtra() {
        marshalNode(this);
        return C._ts_node_is_extra_wasm(this.tree[0]) === 1;
      }
      /**
       * Check if this node represents a syntax error.
       *
       * Syntax errors represent parts of the code that could not be incorporated
       * into a valid syntax tree.
       */
      get isError() {
        marshalNode(this);
        return C._ts_node_is_error_wasm(this.tree[0]) === 1;
      }
      /**
       * Check if this node is *missing*.
       *
       * Missing nodes are inserted by the parser in order to recover from
       * certain kinds of syntax errors.
       */
      get isMissing() {
        marshalNode(this);
        return C._ts_node_is_missing_wasm(this.tree[0]) === 1;
      }
      /** Check if this node has been edited. */
      get hasChanges() {
        marshalNode(this);
        return C._ts_node_has_changes_wasm(this.tree[0]) === 1;
      }
      /**
       * Check if this node represents a syntax error or contains any syntax
       * errors anywhere within it.
       */
      get hasError() {
        marshalNode(this);
        return C._ts_node_has_error_wasm(this.tree[0]) === 1;
      }
      /** Get the byte index where this node ends. */
      get endIndex() {
        marshalNode(this);
        return C._ts_node_end_index_wasm(this.tree[0]);
      }
      /** Get the position where this node ends. */
      get endPosition() {
        marshalNode(this);
        C._ts_node_end_point_wasm(this.tree[0]);
        return unmarshalPoint(TRANSFER_BUFFER);
      }
      /** Get the string content of this node. */
      get text() {
        return getText(this.tree, this.startIndex, this.endIndex, this.startPosition);
      }
      /** Get this node's parse state. */
      get parseState() {
        marshalNode(this);
        return C._ts_node_parse_state_wasm(this.tree[0]);
      }
      /** Get the parse state after this node. */
      get nextParseState() {
        marshalNode(this);
        return C._ts_node_next_parse_state_wasm(this.tree[0]);
      }
      /** Check if this node is equal to another node. */
      equals(other) {
        return this.tree === other.tree && this.id === other.id;
      }
      /**
       * Get the node's child at the given index, where zero represents the first child.
       *
       * This method is fairly fast, but its cost is technically log(n), so if
       * you might be iterating over a long list of children, you should use
       * {@link Node#children} instead.
       */
      child(index) {
        marshalNode(this);
        C._ts_node_child_wasm(this.tree[0], index);
        return unmarshalNode(this.tree);
      }
      /**
       * Get this node's *named* child at the given index.
       *
       * See also {@link Node#isNamed}.
       * This method is fairly fast, but its cost is technically log(n), so if
       * you might be iterating over a long list of children, you should use
       * {@link Node#namedChildren} instead.
       */
      namedChild(index) {
        marshalNode(this);
        C._ts_node_named_child_wasm(this.tree[0], index);
        return unmarshalNode(this.tree);
      }
      /**
       * Get this node's child with the given numerical field id.
       *
       * See also {@link Node#childForFieldName}. You can
       * convert a field name to an id using {@link Language#fieldIdForName}.
       */
      childForFieldId(fieldId) {
        marshalNode(this);
        C._ts_node_child_by_field_id_wasm(this.tree[0], fieldId);
        return unmarshalNode(this.tree);
      }
      /**
       * Get the first child with the given field name.
       *
       * If multiple children may have the same field name, access them using
       * {@link Node#childrenForFieldName}.
       */
      childForFieldName(fieldName) {
        const fieldId = this.tree.language.fields.indexOf(fieldName);
        if (fieldId !== -1) return this.childForFieldId(fieldId);
        return null;
      }
      /** Get the field name of this node's child at the given index. */
      fieldNameForChild(index) {
        marshalNode(this);
        const address = C._ts_node_field_name_for_child_wasm(this.tree[0], index);
        if (!address) return null;
        return C.AsciiToString(address);
      }
      /** Get the field name of this node's named child at the given index. */
      fieldNameForNamedChild(index) {
        marshalNode(this);
        const address = C._ts_node_field_name_for_named_child_wasm(this.tree[0], index);
        if (!address) return null;
        return C.AsciiToString(address);
      }
      /**
       * Get an array of this node's children with a given field name.
       *
       * See also {@link Node#children}.
       */
      childrenForFieldName(fieldName) {
        const fieldId = this.tree.language.fields.indexOf(fieldName);
        if (fieldId !== -1 && fieldId !== 0) return this.childrenForFieldId(fieldId);
        return [];
      }
      /**
        * Get an array of this node's children with a given field id.
        *
        * See also {@link Node#childrenForFieldName}.
        */
      childrenForFieldId(fieldId) {
        marshalNode(this);
        C._ts_node_children_by_field_id_wasm(this.tree[0], fieldId);
        const count = C.getValue(TRANSFER_BUFFER, "i32");
        const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const result = new Array(count);
        if (count > 0) {
          let address = buffer;
          for (let i2 = 0; i2 < count; i2++) {
            result[i2] = unmarshalNode(this.tree, address);
            address += SIZE_OF_NODE;
          }
          C._free(buffer);
        }
        return result;
      }
      /** Get the node's first child that contains or starts after the given byte offset. */
      firstChildForIndex(index) {
        marshalNode(this);
        const address = TRANSFER_BUFFER + SIZE_OF_NODE;
        C.setValue(address, index, "i32");
        C._ts_node_first_child_for_byte_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /** Get the node's first named child that contains or starts after the given byte offset. */
      firstNamedChildForIndex(index) {
        marshalNode(this);
        const address = TRANSFER_BUFFER + SIZE_OF_NODE;
        C.setValue(address, index, "i32");
        C._ts_node_first_named_child_for_byte_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /** Get this node's number of children. */
      get childCount() {
        marshalNode(this);
        return C._ts_node_child_count_wasm(this.tree[0]);
      }
      /**
       * Get this node's number of *named* children.
       *
       * See also {@link Node#isNamed}.
       */
      get namedChildCount() {
        marshalNode(this);
        return C._ts_node_named_child_count_wasm(this.tree[0]);
      }
      /** Get this node's first child. */
      get firstChild() {
        return this.child(0);
      }
      /**
       * Get this node's first named child.
       *
       * See also {@link Node#isNamed}.
       */
      get firstNamedChild() {
        return this.namedChild(0);
      }
      /** Get this node's last child. */
      get lastChild() {
        return this.child(this.childCount - 1);
      }
      /**
       * Get this node's last named child.
       *
       * See also {@link Node#isNamed}.
       */
      get lastNamedChild() {
        return this.namedChild(this.namedChildCount - 1);
      }
      /**
       * Iterate over this node's children.
       *
       * If you're walking the tree recursively, you may want to use the
       * {@link TreeCursor} APIs directly instead.
       */
      get children() {
        if (!this._children) {
          marshalNode(this);
          C._ts_node_children_wasm(this.tree[0]);
          const count = C.getValue(TRANSFER_BUFFER, "i32");
          const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
          this._children = new Array(count);
          if (count > 0) {
            let address = buffer;
            for (let i2 = 0; i2 < count; i2++) {
              this._children[i2] = unmarshalNode(this.tree, address);
              address += SIZE_OF_NODE;
            }
            C._free(buffer);
          }
        }
        return this._children;
      }
      /**
       * Iterate over this node's named children.
       *
       * See also {@link Node#children}.
       */
      get namedChildren() {
        if (!this._namedChildren) {
          marshalNode(this);
          C._ts_node_named_children_wasm(this.tree[0]);
          const count = C.getValue(TRANSFER_BUFFER, "i32");
          const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
          this._namedChildren = new Array(count);
          if (count > 0) {
            let address = buffer;
            for (let i2 = 0; i2 < count; i2++) {
              this._namedChildren[i2] = unmarshalNode(this.tree, address);
              address += SIZE_OF_NODE;
            }
            C._free(buffer);
          }
        }
        return this._namedChildren;
      }
      /**
       * Get the descendants of this node that are the given type, or in the given types array.
       *
       * The types array should contain node type strings, which can be retrieved from {@link Language#types}.
       *
       * Additionally, a `startPosition` and `endPosition` can be passed in to restrict the search to a byte range.
       */
      descendantsOfType(types, startPosition = ZERO_POINT, endPosition = ZERO_POINT) {
        if (!Array.isArray(types)) types = [types];
        const symbols = [];
        const typesBySymbol = this.tree.language.types;
        for (const node_type of types) {
          if (node_type == "ERROR") {
            symbols.push(65535);
          }
        }
        for (let i2 = 0, n = typesBySymbol.length; i2 < n; i2++) {
          if (types.includes(typesBySymbol[i2])) {
            symbols.push(i2);
          }
        }
        const symbolsAddress = C._malloc(SIZE_OF_INT * symbols.length);
        for (let i2 = 0, n = symbols.length; i2 < n; i2++) {
          C.setValue(symbolsAddress + i2 * SIZE_OF_INT, symbols[i2], "i32");
        }
        marshalNode(this);
        C._ts_node_descendants_of_type_wasm(
          this.tree[0],
          symbolsAddress,
          symbols.length,
          startPosition.row,
          startPosition.column,
          endPosition.row,
          endPosition.column
        );
        const descendantCount = C.getValue(TRANSFER_BUFFER, "i32");
        const descendantAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const result = new Array(descendantCount);
        if (descendantCount > 0) {
          let address = descendantAddress;
          for (let i2 = 0; i2 < descendantCount; i2++) {
            result[i2] = unmarshalNode(this.tree, address);
            address += SIZE_OF_NODE;
          }
        }
        C._free(descendantAddress);
        C._free(symbolsAddress);
        return result;
      }
      /** Get this node's next sibling. */
      get nextSibling() {
        marshalNode(this);
        C._ts_node_next_sibling_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /** Get this node's previous sibling. */
      get previousSibling() {
        marshalNode(this);
        C._ts_node_prev_sibling_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /**
       * Get this node's next *named* sibling.
       *
       * See also {@link Node#isNamed}.
       */
      get nextNamedSibling() {
        marshalNode(this);
        C._ts_node_next_named_sibling_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /**
       * Get this node's previous *named* sibling.
       *
       * See also {@link Node#isNamed}.
       */
      get previousNamedSibling() {
        marshalNode(this);
        C._ts_node_prev_named_sibling_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /** Get the node's number of descendants, including one for the node itself. */
      get descendantCount() {
        marshalNode(this);
        return C._ts_node_descendant_count_wasm(this.tree[0]);
      }
      /**
       * Get this node's immediate parent.
       * Prefer {@link Node#childWithDescendant} for iterating over this node's ancestors.
       */
      get parent() {
        marshalNode(this);
        C._ts_node_parent_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /**
       * Get the node that contains `descendant`.
       *
       * Note that this can return `descendant` itself.
       */
      childWithDescendant(descendant) {
        marshalNode(this);
        marshalNode(descendant, 1);
        C._ts_node_child_with_descendant_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /** Get the smallest node within this node that spans the given byte range. */
      descendantForIndex(start2, end = start2) {
        if (typeof start2 !== "number" || typeof end !== "number") {
          throw new Error("Arguments must be numbers");
        }
        marshalNode(this);
        const address = TRANSFER_BUFFER + SIZE_OF_NODE;
        C.setValue(address, start2, "i32");
        C.setValue(address + SIZE_OF_INT, end, "i32");
        C._ts_node_descendant_for_index_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /** Get the smallest named node within this node that spans the given byte range. */
      namedDescendantForIndex(start2, end = start2) {
        if (typeof start2 !== "number" || typeof end !== "number") {
          throw new Error("Arguments must be numbers");
        }
        marshalNode(this);
        const address = TRANSFER_BUFFER + SIZE_OF_NODE;
        C.setValue(address, start2, "i32");
        C.setValue(address + SIZE_OF_INT, end, "i32");
        C._ts_node_named_descendant_for_index_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /** Get the smallest node within this node that spans the given point range. */
      descendantForPosition(start2, end = start2) {
        if (!isPoint(start2) || !isPoint(end)) {
          throw new Error("Arguments must be {row, column} objects");
        }
        marshalNode(this);
        const address = TRANSFER_BUFFER + SIZE_OF_NODE;
        marshalPoint(address, start2);
        marshalPoint(address + SIZE_OF_POINT, end);
        C._ts_node_descendant_for_position_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /** Get the smallest named node within this node that spans the given point range. */
      namedDescendantForPosition(start2, end = start2) {
        if (!isPoint(start2) || !isPoint(end)) {
          throw new Error("Arguments must be {row, column} objects");
        }
        marshalNode(this);
        const address = TRANSFER_BUFFER + SIZE_OF_NODE;
        marshalPoint(address, start2);
        marshalPoint(address + SIZE_OF_POINT, end);
        C._ts_node_named_descendant_for_position_wasm(this.tree[0]);
        return unmarshalNode(this.tree);
      }
      /**
       * Create a new {@link TreeCursor} starting from this node.
       *
       * Note that the given node is considered the root of the cursor,
       * and the cursor cannot walk outside this node.
       */
      walk() {
        marshalNode(this);
        C._ts_tree_cursor_new_wasm(this.tree[0]);
        return new TreeCursor(INTERNAL, this.tree);
      }
      /**
       * Edit this node to keep it in-sync with source code that has been edited.
       *
       * This function is only rarely needed. When you edit a syntax tree with
       * the {@link Tree#edit} method, all of the nodes that you retrieve from
       * the tree afterward will already reflect the edit. You only need to
       * use {@link Node#edit} when you have a specific {@link Node} instance that
       * you want to keep and continue to use after an edit.
       */
      edit(edit) {
        if (this.startIndex >= edit.oldEndIndex) {
          this.startIndex = edit.newEndIndex + (this.startIndex - edit.oldEndIndex);
          let subbedPointRow;
          let subbedPointColumn;
          if (this.startPosition.row > edit.oldEndPosition.row) {
            subbedPointRow = this.startPosition.row - edit.oldEndPosition.row;
            subbedPointColumn = this.startPosition.column;
          } else {
            subbedPointRow = 0;
            subbedPointColumn = this.startPosition.column;
            if (this.startPosition.column >= edit.oldEndPosition.column) {
              subbedPointColumn = this.startPosition.column - edit.oldEndPosition.column;
            }
          }
          if (subbedPointRow > 0) {
            this.startPosition.row += subbedPointRow;
            this.startPosition.column = subbedPointColumn;
          } else {
            this.startPosition.column += subbedPointColumn;
          }
        } else if (this.startIndex > edit.startIndex) {
          this.startIndex = edit.newEndIndex;
          this.startPosition.row = edit.newEndPosition.row;
          this.startPosition.column = edit.newEndPosition.column;
        }
      }
      /** Get the S-expression representation of this node. */
      toString() {
        marshalNode(this);
        const address = C._ts_node_to_string_wasm(this.tree[0]);
        const result = C.AsciiToString(address);
        C._free(address);
        return result;
      }
    };
    function unmarshalCaptures(query, tree, address, patternIndex, result) {
      for (let i2 = 0, n = result.length; i2 < n; i2++) {
        const captureIndex = C.getValue(address, "i32");
        address += SIZE_OF_INT;
        const node = unmarshalNode(tree, address);
        address += SIZE_OF_NODE;
        result[i2] = { patternIndex, name: query.captureNames[captureIndex], node };
      }
      return address;
    }
    __name(unmarshalCaptures, "unmarshalCaptures");
    function marshalNode(node, index = 0) {
      let address = TRANSFER_BUFFER + index * SIZE_OF_NODE;
      C.setValue(address, node.id, "i32");
      address += SIZE_OF_INT;
      C.setValue(address, node.startIndex, "i32");
      address += SIZE_OF_INT;
      C.setValue(address, node.startPosition.row, "i32");
      address += SIZE_OF_INT;
      C.setValue(address, node.startPosition.column, "i32");
      address += SIZE_OF_INT;
      C.setValue(address, node[0], "i32");
    }
    __name(marshalNode, "marshalNode");
    function unmarshalNode(tree, address = TRANSFER_BUFFER) {
      const id = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      if (id === 0) return null;
      const index = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const row = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const column = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const other = C.getValue(address, "i32");
      const result = new Node(INTERNAL, {
        id,
        tree,
        startIndex: index,
        startPosition: { row, column },
        other
      });
      return result;
    }
    __name(unmarshalNode, "unmarshalNode");
    function marshalTreeCursor(cursor, address = TRANSFER_BUFFER) {
      C.setValue(address + 0 * SIZE_OF_INT, cursor[0], "i32");
      C.setValue(address + 1 * SIZE_OF_INT, cursor[1], "i32");
      C.setValue(address + 2 * SIZE_OF_INT, cursor[2], "i32");
      C.setValue(address + 3 * SIZE_OF_INT, cursor[3], "i32");
    }
    __name(marshalTreeCursor, "marshalTreeCursor");
    function unmarshalTreeCursor(cursor) {
      cursor[0] = C.getValue(TRANSFER_BUFFER + 0 * SIZE_OF_INT, "i32");
      cursor[1] = C.getValue(TRANSFER_BUFFER + 1 * SIZE_OF_INT, "i32");
      cursor[2] = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
      cursor[3] = C.getValue(TRANSFER_BUFFER + 3 * SIZE_OF_INT, "i32");
    }
    __name(unmarshalTreeCursor, "unmarshalTreeCursor");
    function marshalPoint(address, point) {
      C.setValue(address, point.row, "i32");
      C.setValue(address + SIZE_OF_INT, point.column, "i32");
    }
    __name(marshalPoint, "marshalPoint");
    function unmarshalPoint(address) {
      const result = {
        row: C.getValue(address, "i32") >>> 0,
        column: C.getValue(address + SIZE_OF_INT, "i32") >>> 0
      };
      return result;
    }
    __name(unmarshalPoint, "unmarshalPoint");
    function marshalRange(address, range) {
      marshalPoint(address, range.startPosition);
      address += SIZE_OF_POINT;
      marshalPoint(address, range.endPosition);
      address += SIZE_OF_POINT;
      C.setValue(address, range.startIndex, "i32");
      address += SIZE_OF_INT;
      C.setValue(address, range.endIndex, "i32");
      address += SIZE_OF_INT;
    }
    __name(marshalRange, "marshalRange");
    function unmarshalRange(address) {
      const result = {};
      result.startPosition = unmarshalPoint(address);
      address += SIZE_OF_POINT;
      result.endPosition = unmarshalPoint(address);
      address += SIZE_OF_POINT;
      result.startIndex = C.getValue(address, "i32") >>> 0;
      address += SIZE_OF_INT;
      result.endIndex = C.getValue(address, "i32") >>> 0;
      return result;
    }
    __name(unmarshalRange, "unmarshalRange");
    function marshalEdit(edit, address = TRANSFER_BUFFER) {
      marshalPoint(address, edit.startPosition);
      address += SIZE_OF_POINT;
      marshalPoint(address, edit.oldEndPosition);
      address += SIZE_OF_POINT;
      marshalPoint(address, edit.newEndPosition);
      address += SIZE_OF_POINT;
      C.setValue(address, edit.startIndex, "i32");
      address += SIZE_OF_INT;
      C.setValue(address, edit.oldEndIndex, "i32");
      address += SIZE_OF_INT;
      C.setValue(address, edit.newEndIndex, "i32");
      address += SIZE_OF_INT;
    }
    __name(marshalEdit, "marshalEdit");
    function unmarshalLanguageMetadata(address) {
      const major_version = C.getValue(address, "i32");
      const minor_version = C.getValue(address += SIZE_OF_INT, "i32");
      const patch_version = C.getValue(address += SIZE_OF_INT, "i32");
      return { major_version, minor_version, patch_version };
    }
    __name(unmarshalLanguageMetadata, "unmarshalLanguageMetadata");
    var LANGUAGE_FUNCTION_REGEX = /^tree_sitter_\w+$/;
    var Language = class _Language {
      static {
        __name(this, "Language");
      }
      /** @internal */
      [0] = 0;
      // Internal handle for Wasm
      /**
       * A list of all node types in the language. The index of each type in this
       * array is its node type id.
       */
      types;
      /**
       * A list of all field names in the language. The index of each field name in
       * this array is its field id.
       */
      fields;
      /** @internal */
      constructor(internal, address) {
        assertInternal(internal);
        this[0] = address;
        this.types = new Array(C._ts_language_symbol_count(this[0]));
        for (let i2 = 0, n = this.types.length; i2 < n; i2++) {
          if (C._ts_language_symbol_type(this[0], i2) < 2) {
            this.types[i2] = C.UTF8ToString(C._ts_language_symbol_name(this[0], i2));
          }
        }
        this.fields = new Array(C._ts_language_field_count(this[0]) + 1);
        for (let i2 = 0, n = this.fields.length; i2 < n; i2++) {
          const fieldName = C._ts_language_field_name_for_id(this[0], i2);
          if (fieldName !== 0) {
            this.fields[i2] = C.UTF8ToString(fieldName);
          } else {
            this.fields[i2] = null;
          }
        }
      }
      /**
       * Gets the name of the language.
       */
      get name() {
        const ptr = C._ts_language_name(this[0]);
        if (ptr === 0) return null;
        return C.UTF8ToString(ptr);
      }
      /**
       * Gets the ABI version of the language.
       */
      get abiVersion() {
        return C._ts_language_abi_version(this[0]);
      }
      /**
      * Get the metadata for this language. This information is generated by the
      * CLI, and relies on the language author providing the correct metadata in
      * the language's `tree-sitter.json` file.
      */
      get metadata() {
        C._ts_language_metadata_wasm(this[0]);
        const length = C.getValue(TRANSFER_BUFFER, "i32");
        if (length === 0) return null;
        return unmarshalLanguageMetadata(TRANSFER_BUFFER + SIZE_OF_INT);
      }
      /**
       * Gets the number of fields in the language.
       */
      get fieldCount() {
        return this.fields.length - 1;
      }
      /**
       * Gets the number of states in the language.
       */
      get stateCount() {
        return C._ts_language_state_count(this[0]);
      }
      /**
       * Get the field id for a field name.
       */
      fieldIdForName(fieldName) {
        const result = this.fields.indexOf(fieldName);
        return result !== -1 ? result : null;
      }
      /**
       * Get the field name for a field id.
       */
      fieldNameForId(fieldId) {
        return this.fields[fieldId] ?? null;
      }
      /**
       * Get the node type id for a node type name.
       */
      idForNodeType(type, named) {
        const typeLength = C.lengthBytesUTF8(type);
        const typeAddress = C._malloc(typeLength + 1);
        C.stringToUTF8(type, typeAddress, typeLength + 1);
        const result = C._ts_language_symbol_for_name(this[0], typeAddress, typeLength, named ? 1 : 0);
        C._free(typeAddress);
        return result || null;
      }
      /**
       * Gets the number of node types in the language.
       */
      get nodeTypeCount() {
        return C._ts_language_symbol_count(this[0]);
      }
      /**
       * Get the node type name for a node type id.
       */
      nodeTypeForId(typeId) {
        const name2 = C._ts_language_symbol_name(this[0], typeId);
        return name2 ? C.UTF8ToString(name2) : null;
      }
      /**
       * Check if a node type is named.
       *
       * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/2-basic-parsing.html#named-vs-anonymous-nodes}
       */
      nodeTypeIsNamed(typeId) {
        return C._ts_language_type_is_named_wasm(this[0], typeId) ? true : false;
      }
      /**
       * Check if a node type is visible.
       */
      nodeTypeIsVisible(typeId) {
        return C._ts_language_type_is_visible_wasm(this[0], typeId) ? true : false;
      }
      /**
       * Get the supertypes ids of this language.
       *
       * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types.html?highlight=supertype#supertype-nodes}
       */
      get supertypes() {
        C._ts_language_supertypes_wasm(this[0]);
        const count = C.getValue(TRANSFER_BUFFER, "i32");
        const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const result = new Array(count);
        if (count > 0) {
          let address = buffer;
          for (let i2 = 0; i2 < count; i2++) {
            result[i2] = C.getValue(address, "i16");
            address += SIZE_OF_SHORT;
          }
        }
        return result;
      }
      /**
       * Get the subtype ids for a given supertype node id.
       */
      subtypes(supertype) {
        C._ts_language_subtypes_wasm(this[0], supertype);
        const count = C.getValue(TRANSFER_BUFFER, "i32");
        const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const result = new Array(count);
        if (count > 0) {
          let address = buffer;
          for (let i2 = 0; i2 < count; i2++) {
            result[i2] = C.getValue(address, "i16");
            address += SIZE_OF_SHORT;
          }
        }
        return result;
      }
      /**
       * Get the next state id for a given state id and node type id.
       */
      nextState(stateId, typeId) {
        return C._ts_language_next_state(this[0], stateId, typeId);
      }
      /**
       * Create a new lookahead iterator for this language and parse state.
       *
       * This returns `null` if state is invalid for this language.
       *
       * Iterating {@link LookaheadIterator} will yield valid symbols in the given
       * parse state. Newly created lookahead iterators will return the `ERROR`
       * symbol from {@link LookaheadIterator#currentType}.
       *
       * Lookahead iterators can be useful for generating suggestions and improving
       * syntax error diagnostics. To get symbols valid in an `ERROR` node, use the
       * lookahead iterator on its first leaf node state. For `MISSING` nodes, a
       * lookahead iterator created on the previous non-extra leaf node may be
       * appropriate.
       */
      lookaheadIterator(stateId) {
        const address = C._ts_lookahead_iterator_new(this[0], stateId);
        if (address) return new LookaheadIterator(INTERNAL, address, this);
        return null;
      }
      /**
       * Load a language from a WebAssembly module.
       * The module can be provided as a path to a file or as a buffer.
       */
      static async load(input) {
        let binary2;
        if (input instanceof Uint8Array) {
          binary2 = input;
        } else if (globalThis.process?.versions.node) {
          const fs2 = await import("fs/promises");
          binary2 = await fs2.readFile(input);
        } else {
          const response = await fetch(input);
          if (!response.ok) {
            const body2 = await response.text();
            throw new Error(`Language.load failed with status ${response.status}.

${body2}`);
          }
          const retryResp = response.clone();
          try {
            binary2 = await WebAssembly.compileStreaming(response);
          } catch (reason) {
            console.error("wasm streaming compile failed:", reason);
            console.error("falling back to ArrayBuffer instantiation");
            binary2 = new Uint8Array(await retryResp.arrayBuffer());
          }
        }
        const mod = await C.loadWebAssemblyModule(binary2, { loadAsync: true });
        const symbolNames = Object.keys(mod);
        const functionName = symbolNames.find((key) => LANGUAGE_FUNCTION_REGEX.test(key) && !key.includes("external_scanner_"));
        if (!functionName) {
          console.log(`Couldn't find language function in Wasm file. Symbols:
${JSON.stringify(symbolNames, null, 2)}`);
          throw new Error("Language.load failed: no language function found in Wasm file");
        }
        const languageAddress = mod[functionName]();
        return new _Language(INTERNAL, languageAddress);
      }
    };
    var import_web_tree_sitter = __toESM(require_web_tree_sitter(), 1);
    var Module2 = null;
    async function initializeBinding(moduleOptions) {
      return Module2 ??= await (0, import_web_tree_sitter.default)(moduleOptions);
    }
    __name(initializeBinding, "initializeBinding");
    function checkModule() {
      return !!Module2;
    }
    __name(checkModule, "checkModule");
    var TRANSFER_BUFFER;
    var LANGUAGE_VERSION;
    var MIN_COMPATIBLE_VERSION;
    var Parser = class {
      static {
        __name(this, "Parser");
      }
      /** @internal */
      [0] = 0;
      // Internal handle for Wasm
      /** @internal */
      [1] = 0;
      // Internal handle for Wasm
      /** @internal */
      logCallback = null;
      /** The parser's current language. */
      language = null;
      /**
       * This must always be called before creating a Parser.
       *
       * You can optionally pass in options to configure the Wasm module, the most common
       * one being `locateFile` to help the module find the `.wasm` file.
       */
      static async init(moduleOptions) {
        setModule(await initializeBinding(moduleOptions));
        TRANSFER_BUFFER = C._ts_init();
        LANGUAGE_VERSION = C.getValue(TRANSFER_BUFFER, "i32");
        MIN_COMPATIBLE_VERSION = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      }
      /**
       * Create a new parser.
       */
      constructor() {
        this.initialize();
      }
      /** @internal */
      initialize() {
        if (!checkModule()) {
          throw new Error("cannot construct a Parser before calling `init()`");
        }
        C._ts_parser_new_wasm();
        this[0] = C.getValue(TRANSFER_BUFFER, "i32");
        this[1] = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      }
      /** Delete the parser, freeing its resources. */
      delete() {
        C._ts_parser_delete(this[0]);
        C._free(this[1]);
        this[0] = 0;
        this[1] = 0;
      }
      /**
       * Set the language that the parser should use for parsing.
       *
       * If the language was not successfully assigned, an error will be thrown.
       * This happens if the language was generated with an incompatible
       * version of the Tree-sitter CLI. Check the language's version using
       * {@link Language#version} and compare it to this library's
       * {@link LANGUAGE_VERSION} and {@link MIN_COMPATIBLE_VERSION} constants.
       */
      setLanguage(language) {
        let address;
        if (!language) {
          address = 0;
          this.language = null;
        } else if (language.constructor === Language) {
          address = language[0];
          const version = C._ts_language_abi_version(address);
          if (version < MIN_COMPATIBLE_VERSION || LANGUAGE_VERSION < version) {
            throw new Error(
              `Incompatible language version ${version}. Compatibility range ${MIN_COMPATIBLE_VERSION} through ${LANGUAGE_VERSION}.`
            );
          }
          this.language = language;
        } else {
          throw new Error("Argument must be a Language");
        }
        C._ts_parser_set_language(this[0], address);
        return this;
      }
      /**
       * Parse a slice of UTF8 text.
       *
       * @param {string | ParseCallback} callback - The UTF8-encoded text to parse or a callback function.
       *
       * @param {Tree | null} [oldTree] - A previous syntax tree parsed from the same document. If the text of the
       *   document has changed since `oldTree` was created, then you must edit `oldTree` to match
       *   the new text using {@link Tree#edit}.
       *
       * @param {ParseOptions} [options] - Options for parsing the text.
       *  This can be used to set the included ranges, or a progress callback.
       *
       * @returns {Tree | null} A {@link Tree} if parsing succeeded, or `null` if:
       *  - The parser has not yet had a language assigned with {@link Parser#setLanguage}.
       *  - The progress callback returned true.
       */
      parse(callback, oldTree, options) {
        if (typeof callback === "string") {
          C.currentParseCallback = (index) => callback.slice(index);
        } else if (typeof callback === "function") {
          C.currentParseCallback = callback;
        } else {
          throw new Error("Argument must be a string or a function");
        }
        if (options?.progressCallback) {
          C.currentProgressCallback = options.progressCallback;
        } else {
          C.currentProgressCallback = null;
        }
        if (this.logCallback) {
          C.currentLogCallback = this.logCallback;
          C._ts_parser_enable_logger_wasm(this[0], 1);
        } else {
          C.currentLogCallback = null;
          C._ts_parser_enable_logger_wasm(this[0], 0);
        }
        let rangeCount = 0;
        let rangeAddress = 0;
        if (options?.includedRanges) {
          rangeCount = options.includedRanges.length;
          rangeAddress = C._calloc(rangeCount, SIZE_OF_RANGE);
          let address = rangeAddress;
          for (let i2 = 0; i2 < rangeCount; i2++) {
            marshalRange(address, options.includedRanges[i2]);
            address += SIZE_OF_RANGE;
          }
        }
        const treeAddress = C._ts_parser_parse_wasm(
          this[0],
          this[1],
          oldTree ? oldTree[0] : 0,
          rangeAddress,
          rangeCount
        );
        if (!treeAddress) {
          C.currentParseCallback = null;
          C.currentLogCallback = null;
          C.currentProgressCallback = null;
          return null;
        }
        if (!this.language) {
          throw new Error("Parser must have a language to parse");
        }
        const result = new Tree(INTERNAL, treeAddress, this.language, C.currentParseCallback);
        C.currentParseCallback = null;
        C.currentLogCallback = null;
        C.currentProgressCallback = null;
        return result;
      }
      /**
       * Instruct the parser to start the next parse from the beginning.
       *
       * If the parser previously failed because of a callback, 
       * then by default, it will resume where it left off on the
       * next call to {@link Parser#parse} or other parsing functions.
       * If you don't want to resume, and instead intend to use this parser to
       * parse some other document, you must call `reset` first.
       */
      reset() {
        C._ts_parser_reset(this[0]);
      }
      /** Get the ranges of text that the parser will include when parsing. */
      getIncludedRanges() {
        C._ts_parser_included_ranges_wasm(this[0]);
        const count = C.getValue(TRANSFER_BUFFER, "i32");
        const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const result = new Array(count);
        if (count > 0) {
          let address = buffer;
          for (let i2 = 0; i2 < count; i2++) {
            result[i2] = unmarshalRange(address);
            address += SIZE_OF_RANGE;
          }
          C._free(buffer);
        }
        return result;
      }
      /** Set the logging callback that a parser should use during parsing. */
      setLogger(callback) {
        if (!callback) {
          this.logCallback = null;
        } else if (typeof callback !== "function") {
          throw new Error("Logger callback must be a function");
        } else {
          this.logCallback = callback;
        }
        return this;
      }
      /** Get the parser's current logger. */
      getLogger() {
        return this.logCallback;
      }
    };
    var PREDICATE_STEP_TYPE_CAPTURE = 1;
    var PREDICATE_STEP_TYPE_STRING = 2;
    var QUERY_WORD_REGEX = /[\w-]+/g;
    var CaptureQuantifier = {
      Zero: 0,
      ZeroOrOne: 1,
      ZeroOrMore: 2,
      One: 3,
      OneOrMore: 4
    };
    var isCaptureStep = /* @__PURE__ */ __name((step) => step.type === "capture", "isCaptureStep");
    var isStringStep = /* @__PURE__ */ __name((step) => step.type === "string", "isStringStep");
    var QueryErrorKind = {
      Syntax: 1,
      NodeName: 2,
      FieldName: 3,
      CaptureName: 4,
      PatternStructure: 5
    };
    var QueryError = class _QueryError extends Error {
      constructor(kind, info2, index, length) {
        super(_QueryError.formatMessage(kind, info2));
        this.kind = kind;
        this.info = info2;
        this.index = index;
        this.length = length;
        this.name = "QueryError";
      }
      static {
        __name(this, "QueryError");
      }
      /** Formats an error message based on the error kind and info */
      static formatMessage(kind, info2) {
        switch (kind) {
          case QueryErrorKind.NodeName:
            return `Bad node name '${info2.word}'`;
          case QueryErrorKind.FieldName:
            return `Bad field name '${info2.word}'`;
          case QueryErrorKind.CaptureName:
            return `Bad capture name @${info2.word}`;
          case QueryErrorKind.PatternStructure:
            return `Bad pattern structure at offset ${info2.suffix}`;
          case QueryErrorKind.Syntax:
            return `Bad syntax at offset ${info2.suffix}`;
        }
      }
    };
    function parseAnyPredicate(steps, index, operator, textPredicates) {
      if (steps.length !== 3) {
        throw new Error(
          `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}`
        );
      }
      if (!isCaptureStep(steps[1])) {
        throw new Error(
          `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}"`
        );
      }
      const isPositive = operator === "eq?" || operator === "any-eq?";
      const matchAll = !operator.startsWith("any-");
      if (isCaptureStep(steps[2])) {
        const captureName1 = steps[1].name;
        const captureName2 = steps[2].name;
        textPredicates[index].push((captures) => {
          const nodes1 = [];
          const nodes2 = [];
          for (const c of captures) {
            if (c.name === captureName1) nodes1.push(c.node);
            if (c.name === captureName2) nodes2.push(c.node);
          }
          const compare = /* @__PURE__ */ __name((n1, n2, positive) => {
            return positive ? n1.text === n2.text : n1.text !== n2.text;
          }, "compare");
          return matchAll ? nodes1.every((n1) => nodes2.some((n2) => compare(n1, n2, isPositive))) : nodes1.some((n1) => nodes2.some((n2) => compare(n1, n2, isPositive)));
        });
      } else {
        const captureName = steps[1].name;
        const stringValue = steps[2].value;
        const matches = /* @__PURE__ */ __name((n) => n.text === stringValue, "matches");
        const doesNotMatch = /* @__PURE__ */ __name((n) => n.text !== stringValue, "doesNotMatch");
        textPredicates[index].push((captures) => {
          const nodes = [];
          for (const c of captures) {
            if (c.name === captureName) nodes.push(c.node);
          }
          const test = isPositive ? matches : doesNotMatch;
          return matchAll ? nodes.every(test) : nodes.some(test);
        });
      }
    }
    __name(parseAnyPredicate, "parseAnyPredicate");
    function parseMatchPredicate(steps, index, operator, textPredicates) {
      if (steps.length !== 3) {
        throw new Error(
          `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}.`
        );
      }
      if (steps[1].type !== "capture") {
        throw new Error(
          `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
        );
      }
      if (steps[2].type !== "string") {
        throw new Error(
          `Second argument of \`#${operator}\` predicate must be a string. Got @${steps[2].name}.`
        );
      }
      const isPositive = operator === "match?" || operator === "any-match?";
      const matchAll = !operator.startsWith("any-");
      const captureName = steps[1].name;
      const regex = new RegExp(steps[2].value);
      textPredicates[index].push((captures) => {
        const nodes = [];
        for (const c of captures) {
          if (c.name === captureName) nodes.push(c.node.text);
        }
        const test = /* @__PURE__ */ __name((text, positive) => {
          return positive ? regex.test(text) : !regex.test(text);
        }, "test");
        if (nodes.length === 0) return !isPositive;
        return matchAll ? nodes.every((text) => test(text, isPositive)) : nodes.some((text) => test(text, isPositive));
      });
    }
    __name(parseMatchPredicate, "parseMatchPredicate");
    function parseAnyOfPredicate(steps, index, operator, textPredicates) {
      if (steps.length < 2) {
        throw new Error(
          `Wrong number of arguments to \`#${operator}\` predicate. Expected at least 1. Got ${steps.length - 1}.`
        );
      }
      if (steps[1].type !== "capture") {
        throw new Error(
          `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
        );
      }
      const isPositive = operator === "any-of?";
      const captureName = steps[1].name;
      const stringSteps = steps.slice(2);
      if (!stringSteps.every(isStringStep)) {
        throw new Error(
          `Arguments to \`#${operator}\` predicate must be strings.".`
        );
      }
      const values = stringSteps.map((s) => s.value);
      textPredicates[index].push((captures) => {
        const nodes = [];
        for (const c of captures) {
          if (c.name === captureName) nodes.push(c.node.text);
        }
        if (nodes.length === 0) return !isPositive;
        return nodes.every((text) => values.includes(text)) === isPositive;
      });
    }
    __name(parseAnyOfPredicate, "parseAnyOfPredicate");
    function parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties) {
      if (steps.length < 2 || steps.length > 3) {
        throw new Error(
          `Wrong number of arguments to \`#${operator}\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`
        );
      }
      if (!steps.every(isStringStep)) {
        throw new Error(
          `Arguments to \`#${operator}\` predicate must be strings.".`
        );
      }
      const properties = operator === "is?" ? assertedProperties : refutedProperties;
      if (!properties[index]) properties[index] = {};
      properties[index][steps[1].value] = steps[2]?.value ?? null;
    }
    __name(parseIsPredicate, "parseIsPredicate");
    function parseSetDirective(steps, index, setProperties) {
      if (steps.length < 2 || steps.length > 3) {
        throw new Error(`Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`);
      }
      if (!steps.every(isStringStep)) {
        throw new Error(`Arguments to \`#set!\` predicate must be strings.".`);
      }
      if (!setProperties[index]) setProperties[index] = {};
      setProperties[index][steps[1].value] = steps[2]?.value ?? null;
    }
    __name(parseSetDirective, "parseSetDirective");
    function parsePattern(index, stepType, stepValueId, captureNames, stringValues, steps, textPredicates, predicates, setProperties, assertedProperties, refutedProperties) {
      if (stepType === PREDICATE_STEP_TYPE_CAPTURE) {
        const name2 = captureNames[stepValueId];
        steps.push({ type: "capture", name: name2 });
      } else if (stepType === PREDICATE_STEP_TYPE_STRING) {
        steps.push({ type: "string", value: stringValues[stepValueId] });
      } else if (steps.length > 0) {
        if (steps[0].type !== "string") {
          throw new Error("Predicates must begin with a literal value");
        }
        const operator = steps[0].value;
        switch (operator) {
          case "any-not-eq?":
          case "not-eq?":
          case "any-eq?":
          case "eq?":
            parseAnyPredicate(steps, index, operator, textPredicates);
            break;
          case "any-not-match?":
          case "not-match?":
          case "any-match?":
          case "match?":
            parseMatchPredicate(steps, index, operator, textPredicates);
            break;
          case "not-any-of?":
          case "any-of?":
            parseAnyOfPredicate(steps, index, operator, textPredicates);
            break;
          case "is?":
          case "is-not?":
            parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties);
            break;
          case "set!":
            parseSetDirective(steps, index, setProperties);
            break;
          default:
            predicates[index].push({ operator, operands: steps.slice(1) });
        }
        steps.length = 0;
      }
    }
    __name(parsePattern, "parsePattern");
    var Query = class {
      static {
        __name(this, "Query");
      }
      /** @internal */
      [0] = 0;
      // Internal handle for Wasm
      /** @internal */
      exceededMatchLimit;
      /** @internal */
      textPredicates;
      /** The names of the captures used in the query. */
      captureNames;
      /** The quantifiers of the captures used in the query. */
      captureQuantifiers;
      /**
       * The other user-defined predicates associated with the given index.
       *
       * This includes predicates with operators other than:
       * - `match?`
       * - `eq?` and `not-eq?`
       * - `any-of?` and `not-any-of?`
       * - `is?` and `is-not?`
       * - `set!`
       */
      predicates;
      /** The properties for predicates with the operator `set!`. */
      setProperties;
      /** The properties for predicates with the operator `is?`. */
      assertedProperties;
      /** The properties for predicates with the operator `is-not?`. */
      refutedProperties;
      /** The maximum number of in-progress matches for this cursor. */
      matchLimit;
      /**
       * Create a new query from a string containing one or more S-expression
       * patterns.
       *
       * The query is associated with a particular language, and can only be run
       * on syntax nodes parsed with that language. References to Queries can be
       * shared between multiple threads.
       *
       * @link {@see https://tree-sitter.github.io/tree-sitter/using-parsers/queries}
       */
      constructor(language, source) {
        const sourceLength = C.lengthBytesUTF8(source);
        const sourceAddress = C._malloc(sourceLength + 1);
        C.stringToUTF8(source, sourceAddress, sourceLength + 1);
        const address = C._ts_query_new(
          language[0],
          sourceAddress,
          sourceLength,
          TRANSFER_BUFFER,
          TRANSFER_BUFFER + SIZE_OF_INT
        );
        if (!address) {
          const errorId = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
          const errorByte = C.getValue(TRANSFER_BUFFER, "i32");
          const errorIndex = C.UTF8ToString(sourceAddress, errorByte).length;
          const suffix = source.slice(errorIndex, errorIndex + 100).split("\n")[0];
          const word = suffix.match(QUERY_WORD_REGEX)?.[0] ?? "";
          C._free(sourceAddress);
          switch (errorId) {
            case QueryErrorKind.Syntax:
              throw new QueryError(QueryErrorKind.Syntax, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
            case QueryErrorKind.NodeName:
              throw new QueryError(errorId, { word }, errorIndex, word.length);
            case QueryErrorKind.FieldName:
              throw new QueryError(errorId, { word }, errorIndex, word.length);
            case QueryErrorKind.CaptureName:
              throw new QueryError(errorId, { word }, errorIndex, word.length);
            case QueryErrorKind.PatternStructure:
              throw new QueryError(errorId, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
          }
        }
        const stringCount = C._ts_query_string_count(address);
        const captureCount = C._ts_query_capture_count(address);
        const patternCount = C._ts_query_pattern_count(address);
        const captureNames = new Array(captureCount);
        const captureQuantifiers = new Array(patternCount);
        const stringValues = new Array(stringCount);
        for (let i2 = 0; i2 < captureCount; i2++) {
          const nameAddress = C._ts_query_capture_name_for_id(
            address,
            i2,
            TRANSFER_BUFFER
          );
          const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
          captureNames[i2] = C.UTF8ToString(nameAddress, nameLength);
        }
        for (let i2 = 0; i2 < patternCount; i2++) {
          const captureQuantifiersArray = new Array(captureCount);
          for (let j = 0; j < captureCount; j++) {
            const quantifier = C._ts_query_capture_quantifier_for_id(address, i2, j);
            captureQuantifiersArray[j] = quantifier;
          }
          captureQuantifiers[i2] = captureQuantifiersArray;
        }
        for (let i2 = 0; i2 < stringCount; i2++) {
          const valueAddress = C._ts_query_string_value_for_id(
            address,
            i2,
            TRANSFER_BUFFER
          );
          const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
          stringValues[i2] = C.UTF8ToString(valueAddress, nameLength);
        }
        const setProperties = new Array(patternCount);
        const assertedProperties = new Array(patternCount);
        const refutedProperties = new Array(patternCount);
        const predicates = new Array(patternCount);
        const textPredicates = new Array(patternCount);
        for (let i2 = 0; i2 < patternCount; i2++) {
          const predicatesAddress = C._ts_query_predicates_for_pattern(address, i2, TRANSFER_BUFFER);
          const stepCount = C.getValue(TRANSFER_BUFFER, "i32");
          predicates[i2] = [];
          textPredicates[i2] = [];
          const steps = new Array();
          let stepAddress = predicatesAddress;
          for (let j = 0; j < stepCount; j++) {
            const stepType = C.getValue(stepAddress, "i32");
            stepAddress += SIZE_OF_INT;
            const stepValueId = C.getValue(stepAddress, "i32");
            stepAddress += SIZE_OF_INT;
            parsePattern(
              i2,
              stepType,
              stepValueId,
              captureNames,
              stringValues,
              steps,
              textPredicates,
              predicates,
              setProperties,
              assertedProperties,
              refutedProperties
            );
          }
          Object.freeze(textPredicates[i2]);
          Object.freeze(predicates[i2]);
          Object.freeze(setProperties[i2]);
          Object.freeze(assertedProperties[i2]);
          Object.freeze(refutedProperties[i2]);
        }
        C._free(sourceAddress);
        this[0] = address;
        this.captureNames = captureNames;
        this.captureQuantifiers = captureQuantifiers;
        this.textPredicates = textPredicates;
        this.predicates = predicates;
        this.setProperties = setProperties;
        this.assertedProperties = assertedProperties;
        this.refutedProperties = refutedProperties;
        this.exceededMatchLimit = false;
      }
      /** Delete the query, freeing its resources. */
      delete() {
        C._ts_query_delete(this[0]);
        this[0] = 0;
      }
      /**
       * Iterate over all of the matches in the order that they were found.
       *
       * Each match contains the index of the pattern that matched, and a list of
       * captures. Because multiple patterns can match the same set of nodes,
       * one match may contain captures that appear *before* some of the
       * captures from a previous match.
       *
       * @param {Node} node - The node to execute the query on.
       *
       * @param {QueryOptions} options - Options for query execution.
       */
      matches(node, options = {}) {
        const startPosition = options.startPosition ?? ZERO_POINT;
        const endPosition = options.endPosition ?? ZERO_POINT;
        const startIndex = options.startIndex ?? 0;
        const endIndex = options.endIndex ?? 0;
        const startContainingPosition = options.startContainingPosition ?? ZERO_POINT;
        const endContainingPosition = options.endContainingPosition ?? ZERO_POINT;
        const startContainingIndex = options.startContainingIndex ?? 0;
        const endContainingIndex = options.endContainingIndex ?? 0;
        const matchLimit = options.matchLimit ?? 4294967295;
        const maxStartDepth = options.maxStartDepth ?? 4294967295;
        const progressCallback = options.progressCallback;
        if (typeof matchLimit !== "number") {
          throw new Error("Arguments must be numbers");
        }
        this.matchLimit = matchLimit;
        if (endIndex !== 0 && startIndex > endIndex) {
          throw new Error("`startIndex` cannot be greater than `endIndex`");
        }
        if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
          throw new Error("`startPosition` cannot be greater than `endPosition`");
        }
        if (endContainingIndex !== 0 && startContainingIndex > endContainingIndex) {
          throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
        }
        if (endContainingPosition !== ZERO_POINT && (startContainingPosition.row > endContainingPosition.row || startContainingPosition.row === endContainingPosition.row && startContainingPosition.column > endContainingPosition.column)) {
          throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
        }
        if (progressCallback) {
          C.currentQueryProgressCallback = progressCallback;
        }
        marshalNode(node);
        C._ts_query_matches_wasm(
          this[0],
          node.tree[0],
          startPosition.row,
          startPosition.column,
          endPosition.row,
          endPosition.column,
          startIndex,
          endIndex,
          startContainingPosition.row,
          startContainingPosition.column,
          endContainingPosition.row,
          endContainingPosition.column,
          startContainingIndex,
          endContainingIndex,
          matchLimit,
          maxStartDepth
        );
        const rawCount = C.getValue(TRANSFER_BUFFER, "i32");
        const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
        const result = new Array(rawCount);
        this.exceededMatchLimit = Boolean(didExceedMatchLimit);
        let filteredCount = 0;
        let address = startAddress;
        for (let i2 = 0; i2 < rawCount; i2++) {
          const patternIndex = C.getValue(address, "i32");
          address += SIZE_OF_INT;
          const captureCount = C.getValue(address, "i32");
          address += SIZE_OF_INT;
          const captures = new Array(captureCount);
          address = unmarshalCaptures(this, node.tree, address, patternIndex, captures);
          if (this.textPredicates[patternIndex].every((p) => p(captures))) {
            result[filteredCount] = { patternIndex, captures };
            const setProperties = this.setProperties[patternIndex];
            result[filteredCount].setProperties = setProperties;
            const assertedProperties = this.assertedProperties[patternIndex];
            result[filteredCount].assertedProperties = assertedProperties;
            const refutedProperties = this.refutedProperties[patternIndex];
            result[filteredCount].refutedProperties = refutedProperties;
            filteredCount++;
          }
        }
        result.length = filteredCount;
        C._free(startAddress);
        C.currentQueryProgressCallback = null;
        return result;
      }
      /**
       * Iterate over all of the individual captures in the order that they
       * appear.
       *
       * This is useful if you don't care about which pattern matched, and just
       * want a single, ordered sequence of captures.
       *
       * @param {Node} node - The node to execute the query on.
       *
       * @param {QueryOptions} options - Options for query execution.
       */
      captures(node, options = {}) {
        const startPosition = options.startPosition ?? ZERO_POINT;
        const endPosition = options.endPosition ?? ZERO_POINT;
        const startIndex = options.startIndex ?? 0;
        const endIndex = options.endIndex ?? 0;
        const startContainingPosition = options.startContainingPosition ?? ZERO_POINT;
        const endContainingPosition = options.endContainingPosition ?? ZERO_POINT;
        const startContainingIndex = options.startContainingIndex ?? 0;
        const endContainingIndex = options.endContainingIndex ?? 0;
        const matchLimit = options.matchLimit ?? 4294967295;
        const maxStartDepth = options.maxStartDepth ?? 4294967295;
        const progressCallback = options.progressCallback;
        if (typeof matchLimit !== "number") {
          throw new Error("Arguments must be numbers");
        }
        this.matchLimit = matchLimit;
        if (endIndex !== 0 && startIndex > endIndex) {
          throw new Error("`startIndex` cannot be greater than `endIndex`");
        }
        if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
          throw new Error("`startPosition` cannot be greater than `endPosition`");
        }
        if (endContainingIndex !== 0 && startContainingIndex > endContainingIndex) {
          throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
        }
        if (endContainingPosition !== ZERO_POINT && (startContainingPosition.row > endContainingPosition.row || startContainingPosition.row === endContainingPosition.row && startContainingPosition.column > endContainingPosition.column)) {
          throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
        }
        if (progressCallback) {
          C.currentQueryProgressCallback = progressCallback;
        }
        marshalNode(node);
        C._ts_query_captures_wasm(
          this[0],
          node.tree[0],
          startPosition.row,
          startPosition.column,
          endPosition.row,
          endPosition.column,
          startIndex,
          endIndex,
          startContainingPosition.row,
          startContainingPosition.column,
          endContainingPosition.row,
          endContainingPosition.column,
          startContainingIndex,
          endContainingIndex,
          matchLimit,
          maxStartDepth
        );
        const count = C.getValue(TRANSFER_BUFFER, "i32");
        const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
        const result = new Array();
        this.exceededMatchLimit = Boolean(didExceedMatchLimit);
        const captures = new Array();
        let address = startAddress;
        for (let i2 = 0; i2 < count; i2++) {
          const patternIndex = C.getValue(address, "i32");
          address += SIZE_OF_INT;
          const captureCount = C.getValue(address, "i32");
          address += SIZE_OF_INT;
          const captureIndex = C.getValue(address, "i32");
          address += SIZE_OF_INT;
          captures.length = captureCount;
          address = unmarshalCaptures(this, node.tree, address, patternIndex, captures);
          if (this.textPredicates[patternIndex].every((p) => p(captures))) {
            const capture = captures[captureIndex];
            const setProperties = this.setProperties[patternIndex];
            capture.setProperties = setProperties;
            const assertedProperties = this.assertedProperties[patternIndex];
            capture.assertedProperties = assertedProperties;
            const refutedProperties = this.refutedProperties[patternIndex];
            capture.refutedProperties = refutedProperties;
            result.push(capture);
          }
        }
        C._free(startAddress);
        C.currentQueryProgressCallback = null;
        return result;
      }
      /** Get the predicates for a given pattern. */
      predicatesForPattern(patternIndex) {
        return this.predicates[patternIndex];
      }
      /**
       * Disable a certain capture within a query.
       *
       * This prevents the capture from being returned in matches, and also
       * avoids any resource usage associated with recording the capture.
       */
      disableCapture(captureName) {
        const captureNameLength = C.lengthBytesUTF8(captureName);
        const captureNameAddress = C._malloc(captureNameLength + 1);
        C.stringToUTF8(captureName, captureNameAddress, captureNameLength + 1);
        C._ts_query_disable_capture(this[0], captureNameAddress, captureNameLength);
        C._free(captureNameAddress);
      }
      /**
       * Disable a certain pattern within a query.
       *
       * This prevents the pattern from matching, and also avoids any resource
       * usage associated with the pattern. This throws an error if the pattern
       * index is out of bounds.
       */
      disablePattern(patternIndex) {
        if (patternIndex >= this.predicates.length) {
          throw new Error(
            `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
          );
        }
        C._ts_query_disable_pattern(this[0], patternIndex);
      }
      /**
       * Check if, on its last execution, this cursor exceeded its maximum number
       * of in-progress matches.
       */
      didExceedMatchLimit() {
        return this.exceededMatchLimit;
      }
      /** Get the byte offset where the given pattern starts in the query's source. */
      startIndexForPattern(patternIndex) {
        if (patternIndex >= this.predicates.length) {
          throw new Error(
            `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
          );
        }
        return C._ts_query_start_byte_for_pattern(this[0], patternIndex);
      }
      /** Get the byte offset where the given pattern ends in the query's source. */
      endIndexForPattern(patternIndex) {
        if (patternIndex >= this.predicates.length) {
          throw new Error(
            `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
          );
        }
        return C._ts_query_end_byte_for_pattern(this[0], patternIndex);
      }
      /** Get the number of patterns in the query. */
      patternCount() {
        return C._ts_query_pattern_count(this[0]);
      }
      /** Get the index for a given capture name. */
      captureIndexForName(captureName) {
        return this.captureNames.indexOf(captureName);
      }
      /** Check if a given pattern within a query has a single root node. */
      isPatternRooted(patternIndex) {
        return C._ts_query_is_pattern_rooted(this[0], patternIndex) === 1;
      }
      /** Check if a given pattern within a query has a single root node. */
      isPatternNonLocal(patternIndex) {
        return C._ts_query_is_pattern_non_local(this[0], patternIndex) === 1;
      }
      /**
       * Check if a given step in a query is 'definite'.
       *
       * A query step is 'definite' if its parent pattern will be guaranteed to
       * match successfully once it reaches the step.
       */
      isPatternGuaranteedAtStep(byteIndex) {
        return C._ts_query_is_pattern_guaranteed_at_step(this[0], byteIndex) === 1;
      }
    };
    module.exports.default = module.exports;
  }
});

// ../typed-mind/dist/pipeline/spans.js
var require_spans = __commonJS2({
  "../typed-mind/dist/pipeline/spans.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.typeSpanOf = exports2.spanCoversLine = exports2.tokenSpanOf = void 0;
    var tokenSpanOf = (syntaxNode) => {
      const text = syntaxNode.text;
      const leadingMatch = /^[ \t]*/.exec(text);
      const leadingLength = leadingMatch === null ? 0 : leadingMatch[0].length;
      const startLine = syntaxNode.startPosition.row + 1;
      const startColumn = syntaxNode.startPosition.column + 1 + leadingLength;
      const trimmedText = text.trimEnd();
      if (trimmedText.length === 0) {
        return {
          start: { line: startLine, column: syntaxNode.startPosition.column + 1 },
          end: { line: startLine, column: syntaxNode.startPosition.column + 1 }
        };
      }
      const lines = trimmedText.split("\n");
      if (lines.length === 1) {
        return {
          start: { line: startLine, column: startColumn },
          end: { line: startLine, column: syntaxNode.startPosition.column + 1 + trimmedText.length }
        };
      }
      const lastLine = (lines[lines.length - 1] ?? "").replace(/\r$/, "");
      return {
        start: { line: startLine, column: startColumn },
        end: { line: startLine + lines.length - 1, column: lastLine.length + 1 }
      };
    };
    exports2.tokenSpanOf = tokenSpanOf;
    var spanCoversLine = (span, line) => {
      return span.start.line <= line && line <= span.end.line;
    };
    exports2.spanCoversLine = spanCoversLine;
    exports2.typeSpanOf = exports2.tokenSpanOf;
  }
});

// ../typed-mind/dist/pipeline/type-expr-from-cst.js
var require_type_expr_from_cst = __commonJS2({
  "../typed-mind/dist/pipeline/type-expr-from-cst.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.typeExprFromCst = void 0;
    var spans_ts_1 = require_spans();
    var type_expr_from_text_ts_1 = require_type_expr_from_text();
    var typeNamedFromCst = (wrapped) => {
      return {
        kind: "named",
        name: wrapped.text.trim(),
        span: (0, spans_ts_1.typeSpanOf)(wrapped.syntaxNode)
      };
    };
    var typeAtomFromCst = (wrapped) => {
      const generic = wrapped.typeGenericChildren().at(0);
      if (generic !== void 0) {
        return typeGenericFromCst(generic);
      }
      const readonlyArray = wrapped.typeReadonlyArrayChildren().at(0);
      if (readonlyArray !== void 0) {
        return typeReadonlyArrayFromCst(readonlyArray);
      }
      const named = wrapped.typeNamedChildren().at(0);
      if (named !== void 0) {
        return typeNamedFromCst(named);
      }
      const literalString = wrapped.typeLiteralStringChildren().at(0);
      if (literalString !== void 0) {
        const stringNode = literalString.stringChildren().at(0);
        const rawText = stringNode?.text ?? '""';
        return {
          kind: "literal",
          literalKind: "string",
          value: rawText.replace(/^"/, "").replace(/"$/, ""),
          span: (0, spans_ts_1.typeSpanOf)(literalString.syntaxNode)
        };
      }
      const literalNumber = wrapped.typeLiteralNumberChildren().at(0);
      if (literalNumber !== void 0) {
        return {
          kind: "literal",
          literalKind: "number",
          value: literalNumber.text,
          span: (0, spans_ts_1.typeSpanOf)(literalNumber.syntaxNode)
        };
      }
      const parenthesizedExpr = wrapped.typeExprChildren().at(0);
      if (parenthesizedExpr !== void 0) {
        return (0, exports2.typeExprFromCst)(parenthesizedExpr);
      }
      const opaque = wrapped.typeOpaqueChildren().at(0);
      if (opaque !== void 0) {
        return {
          kind: "opaque",
          text: opaque.text.trim(),
          span: (0, spans_ts_1.typeSpanOf)(opaque.syntaxNode)
        };
      }
      throw new Error(`type_atom: no recognized child in "${wrapped.text}"`);
    };
    var normalizeArrayGeneric = (baseName, args2, span) => {
      if (baseName !== "Array" || args2.length !== 1) {
        return void 0;
      }
      const [element] = args2;
      if (element === void 0) {
        return void 0;
      }
      return { kind: "array", element, readonly: false, spelling: "generic", span };
    };
    var typeGenericFromCst = (wrapped) => {
      const base = wrapped.baseField();
      const args2 = wrapped.typeExprChildren().map((child) => (0, exports2.typeExprFromCst)(child));
      const baseNode = base === void 0 ? { kind: "named", name: "", span: (0, spans_ts_1.typeSpanOf)(wrapped.syntaxNode) } : typeNamedFromCst(base);
      const span = (0, spans_ts_1.typeSpanOf)(wrapped.syntaxNode);
      const normalized = normalizeArrayGeneric(baseNode.name, args2, span);
      if (normalized !== void 0) {
        return normalized;
      }
      return {
        kind: "generic",
        base: baseNode,
        args: args2,
        span
      };
    };
    var typeReadonlyArrayFromCst = (wrapped) => {
      const syntaxNode = wrapped.syntaxNode;
      const readonlyKw = syntaxNode.children.find((child) => child !== null && child.type === "readonly_kw");
      const elementField = syntaxNode.childForFieldName("element");
      const keywordText = readonlyKw?.text ?? "";
      const lastKeywordCharacter = keywordText.slice(-1);
      const restText = elementField?.text ?? "";
      const elementText = lastKeywordCharacter + restText;
      const readonlyKwEnd = readonlyKw?.endPosition;
      const baseLine = readonlyKwEnd !== void 0 ? readonlyKwEnd.row + 1 : 1;
      const baseColumn = readonlyKwEnd !== void 0 ? readonlyKwEnd.column : 1;
      const elementExpr = (0, type_expr_from_text_ts_1.parseTypeExprText)(elementText, { baseLine, baseColumn }).typeExpr;
      return {
        kind: "array",
        element: elementExpr,
        readonly: true,
        spelling: "suffix",
        span: (0, spans_ts_1.typeSpanOf)(syntaxNode)
      };
    };
    var typePostfixFromCst = (wrapped) => {
      const atom = wrapped.typeAtomChildren().at(0);
      if (atom === void 0) {
        throw new Error(`type_postfix: no type_atom child in "${wrapped.text}"`);
      }
      const element = typeAtomFromCst(atom);
      const elementStart = element.span.start;
      const closingPositions = [];
      for (let childIndex = 0; childIndex < wrapped.syntaxNode.childCount; childIndex++) {
        const child = wrapped.syntaxNode.child(childIndex);
        if (child !== null && !child.isNamed && child.type === "]") {
          closingPositions.push({ line: child.endPosition.row + 1, column: child.endPosition.column });
        }
      }
      let result = element;
      for (const closingPosition of closingPositions) {
        result = {
          kind: "array",
          element: result,
          readonly: false,
          spelling: "suffix",
          span: { start: elementStart, end: closingPosition }
        };
      }
      return result;
    };
    var typeIntersectionFromCst = (wrapped) => {
      const members = wrapped.typePostfixChildren().map((child) => typePostfixFromCst(child));
      if (members.length === 1) {
        const [only] = members;
        if (only !== void 0) {
          return only;
        }
      }
      return { kind: "intersection", members, span: (0, spans_ts_1.typeSpanOf)(wrapped.syntaxNode) };
    };
    var typeUnionFromCst = (wrapped) => {
      const members = wrapped.typeIntersectionChildren().map((child) => typeIntersectionFromCst(child));
      if (members.length === 1) {
        const [only] = members;
        if (only !== void 0) {
          return only;
        }
      }
      return { kind: "union", members, span: (0, spans_ts_1.typeSpanOf)(wrapped.syntaxNode) };
    };
    var typeExprFromCst = (wrapped) => {
      const union = wrapped.typeUnionChildren().at(0);
      if (union === void 0) {
        throw new Error(`type_expr: no type_union child in "${wrapped.text}"`);
      }
      return typeUnionFromCst(union);
    };
    exports2.typeExprFromCst = typeExprFromCst;
  }
});

// ../typed-mind/dist/pipeline/attachment-rules.js
var require_attachment_rules = __commonJS2({
  "../typed-mind/dist/pipeline/attachment-rules.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.illegalContinuationDiagnostic = exports2.orphanContinuationDiagnostic = exports2.attachmentRules = exports2.dtoFieldFromCst = void 0;
    var dto_field_node_ts_1 = require_dto_field_node();
    var cst_nodes_ts_1 = require_cst_nodes();
    var type_expr_from_cst_ts_1 = require_type_expr_from_cst();
    var namesOf = (wrapped) => {
      const nameList = wrapped.nameListChildren().at(0);
      if (nameList === void 0) {
        return [];
      }
      return nameList.listEntryChildren().map((entry) => entry.text);
    };
    var unquote = (text) => {
      return text.replace(/^"/, "").replace(/"$/, "");
    };
    var hasQuestionSigil = (wrapped) => {
      const { syntaxNode } = wrapped;
      for (let childIndex = 0; childIndex < syntaxNode.childCount; childIndex++) {
        const child = syntaxNode.child(childIndex);
        if (child !== null && !child.isNamed && child.type === "?") {
          return true;
        }
      }
      return false;
    };
    var typeExprOf = (wrapped, span) => {
      const fieldType = wrapped.fieldTypeChildren().at(0);
      const typeExprCst = fieldType?.typeExprChildren().at(0);
      if (typeExprCst === void 0) {
        return { kind: "opaque", text: "", span };
      }
      return (0, type_expr_from_cst_ts_1.typeExprFromCst)(typeExprCst);
    };
    var dtoFieldFromCst = (wrapped, span) => {
      const description = wrapped.stringChildren().at(0)?.text;
      const parenthesized = wrapped.optionalMarkerChildren().length > 0;
      const question = hasQuestionSigil(wrapped);
      const optionalityMarker = question ? "question" : parenthesized ? "parenthesized" : "none";
      return new dto_field_node_ts_1.DtoFieldNode({
        name: wrapped.fieldNameChildren().at(0)?.text ?? "",
        type: (wrapped.fieldTypeChildren().at(0)?.text ?? "").trim(),
        typeExpr: typeExprOf(wrapped, span),
        optionalityMarker,
        ...description !== void 0 ? { description: unquote(description) } : {},
        span
      });
    };
    exports2.dtoFieldFromCst = dtoFieldFromCst;
    exports2.attachmentRules = {
      import_list: {
        group: "imports",
        label: "imports list (`<- [...]`)",
        accepts: (target) => target.kind === "File" || target.kind === "ClassFile" || target.kind === "Function",
        apply: (target, syntaxNode) => {
          const names = namesOf(new cst_nodes_ts_1.CstImportList(syntaxNode));
          if (target.kind === "Function") {
            target.slots.pendingDependencies = names;
            return;
          }
          target.slots.imports = names;
        }
      },
      export_list: {
        group: "exports",
        label: "exports list (`-> [...]`)",
        accepts: (target) => target.kind === "File" || target.kind === "ClassFile" || target.kind === "Dependency",
        apply: (target, syntaxNode) => {
          target.slots.exports = namesOf(new cst_nodes_ts_1.CstExportList(syntaxNode));
        }
      },
      calls_list: {
        group: "calls",
        label: "calls list (`~> [...]`)",
        accepts: (target) => target.kind === "Function",
        apply: (target, syntaxNode) => {
          target.slots.calls = namesOf(new cst_nodes_ts_1.CstCallsList(syntaxNode));
        }
      },
      input_name: {
        group: "input",
        label: "input (`<- Name`)",
        accepts: (target) => target.kind === "Function",
        apply: (target, syntaxNode) => {
          target.slots.input = new cst_nodes_ts_1.CstInputName(syntaxNode).entityNameChildren().at(0)?.text ?? "";
        }
      },
      output_name: {
        group: "output",
        label: "output (`-> Name`)",
        accepts: (target) => target.kind === "Function",
        apply: (target, syntaxNode) => {
          target.slots.output = new cst_nodes_ts_1.CstOutputName(syntaxNode).entityNameChildren().at(0)?.text ?? "";
        }
      },
      methods_list: {
        group: "methods",
        label: "methods list (`=> [...]`)",
        accepts: (target) => target.kind === "Class" || target.kind === "ClassFile",
        apply: (target, syntaxNode) => {
          target.slots.methods = namesOf(new cst_nodes_ts_1.CstMethodsList(syntaxNode));
        }
      },
      affects_list: {
        group: "affects",
        label: "affects list (`~ [...]`)",
        accepts: (target) => target.kind === "Function",
        apply: (target, syntaxNode) => {
          target.slots.affects = namesOf(new cst_nodes_ts_1.CstAffectsList(syntaxNode));
        }
      },
      contains_list: {
        group: "contains",
        label: "contains list (`> [...]`)",
        accepts: (target) => target.kind === "UIComponent",
        apply: (target, syntaxNode) => {
          target.slots.contains = namesOf(new cst_nodes_ts_1.CstContainsList(syntaxNode));
        }
      },
      contained_by_list: {
        group: "containedBy",
        label: "containedBy list (`< [...]`)",
        accepts: (target) => target.kind === "UIComponent",
        apply: (target, syntaxNode) => {
          target.slots.declaredContainedBy = namesOf(new cst_nodes_ts_1.CstContainedByList(syntaxNode));
        }
      },
      contains_program: {
        group: "containsProgram",
        label: "containsProgram (`>> Name`)",
        accepts: (target) => target.kind === "Asset",
        apply: (target, syntaxNode) => {
          target.slots.containsProgram = new cst_nodes_ts_1.CstContainsProgram(syntaxNode).entityNameChildren().at(0)?.text ?? "";
        }
      },
      default_value: {
        group: "defaultValue",
        label: 'default value (`= "..."`)',
        accepts: (target) => target.kind === "RunParameter",
        apply: (target, syntaxNode) => {
          const value = new cst_nodes_ts_1.CstDefaultValue(syntaxNode).stringChildren().at(0)?.text;
          target.slots.defaultValue = value === void 0 ? "" : unquote(value);
        }
      },
      consumes_list: {
        group: "consumes",
        label: "consumes list (`$< [...]`)",
        accepts: (target) => target.kind === "Function",
        apply: (target, syntaxNode) => {
          target.slots.consumes = namesOf(new cst_nodes_ts_1.CstConsumesList(syntaxNode));
        }
      },
      description_line: {
        group: "description",
        label: 'description line (`"..."`)',
        accepts: (target) => {
          if (target.kind === "Function" || target.kind === "Program" || target.kind === "File" || target.kind === "Class") {
            return true;
          }
          if (target.kind === "Constants") {
            return true;
          }
          return target.kind === "ClassFile" && target.viaLookahead;
        },
        apply: (target, syntaxNode) => {
          const text = new cst_nodes_ts_1.CstDescriptionLine(syntaxNode).stringChildren().at(0)?.text;
          const value = text === void 0 ? "" : unquote(text);
          if (target.kind === "Function") {
            target.slots.description = value;
            return;
          }
          target.slots.purpose = value;
        }
      },
      dto_field: {
        group: "field",
        label: "DTO field (`- name: type`)",
        accepts: (target) => target.kind === "DTO",
        apply: (target, syntaxNode, span) => {
          const field = (0, exports2.dtoFieldFromCst)(new cst_nodes_ts_1.CstDtoField(syntaxNode), span);
          const fields = target.slots.fields ?? [];
          fields.push(field);
          target.slots.fields = fields;
        }
      }
    };
    var orphanContinuationDiagnostic = (label, span) => {
      return {
        code: "semantics/orphan-continuation",
        severity: "warning",
        span,
        message: `orphan continuation: ${label} has no open entity declaration to attach to`
      };
    };
    exports2.orphanContinuationDiagnostic = orphanContinuationDiagnostic;
    var illegalContinuationDiagnostic = (label, kind, span) => {
      return {
        code: "semantics/illegal-continuation",
        severity: "warning",
        span,
        message: `illegal continuation: ${label} cannot attach to a ${kind} entity`
      };
    };
    exports2.illegalContinuationDiagnostic = illegalContinuationDiagnostic;
  }
});

// ../typed-mind/dist/pipeline/entity-accumulator.js
var require_entity_accumulator = __commonJS2({
  "../typed-mind/dist/pipeline/entity-accumulator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EntityAccumulator = void 0;
    var asset_node_ts_1 = require_asset_node();
    var class_file_node_ts_1 = require_class_file_node();
    var class_node_ts_1 = require_class_node();
    var constants_node_ts_1 = require_constants_node();
    var dependency_node_ts_1 = require_dependency_node();
    var dto_node_ts_1 = require_dto_node();
    var file_node_ts_1 = require_file_node();
    var function_node_ts_1 = require_function_node();
    var program_node_ts_1 = require_program_node();
    var run_parameter_node_ts_1 = require_run_parameter_node();
    var type_def_node_ts_1 = require_type_def_node();
    var ui_component_node_ts_1 = require_ui_component_node();
    var EntityAccumulator = class {
      kind;
      name;
      span;
      raw;
      comment;
      viaLookahead;
      sourceForm;
      slots = {};
      constructor(args2) {
        this.kind = args2.kind;
        this.name = args2.name;
        this.span = args2.span;
        this.raw = args2.raw;
        this.comment = args2.comment;
        this.viaLookahead = args2.viaLookahead ?? false;
        this.sourceForm = args2.sourceForm;
      }
      baseArgs() {
        return {
          name: this.name,
          span: this.span,
          raw: this.raw,
          sourceForm: this.sourceForm,
          ...this.comment !== void 0 ? { comment: this.comment } : {}
        };
      }
      finalize() {
        const finalizer = FINALIZERS[this.kind];
        return finalizer(this);
      }
    };
    exports2.EntityAccumulator = EntityAccumulator;
    var FINALIZERS = {
      Program: (accumulator) => {
        const { slots } = accumulator;
        return new program_node_ts_1.ProgramNode({
          ...accumulator.baseArgs(),
          entry: slots.entry ?? "",
          ...slots.purpose !== void 0 ? { purpose: slots.purpose } : {},
          ...slots.version !== void 0 ? { version: slots.version } : {},
          ...slots.exports !== void 0 ? { exports: slots.exports } : {}
        });
      },
      File: (accumulator) => {
        const { slots } = accumulator;
        return new file_node_ts_1.FileNode({
          ...accumulator.baseArgs(),
          path: slots.path ?? "",
          imports: slots.imports ?? [],
          exports: slots.exports ?? [],
          ...slots.purpose !== void 0 ? { purpose: slots.purpose } : {}
        });
      },
      Function: (accumulator) => {
        const { slots } = accumulator;
        return new function_node_ts_1.FunctionNode({
          ...accumulator.baseArgs(),
          signature: slots.signature ?? "",
          calls: slots.calls ?? [],
          pendingDependencies: slots.pendingDependencies ?? [],
          ...slots.description !== void 0 ? { description: slots.description } : {},
          ...slots.input !== void 0 ? { input: slots.input } : {},
          ...slots.output !== void 0 ? { output: slots.output } : {},
          ...slots.affects !== void 0 ? { affects: slots.affects } : {},
          ...slots.consumes !== void 0 ? { consumes: slots.consumes } : {}
        });
      },
      Class: (accumulator) => {
        const { slots } = accumulator;
        return new class_node_ts_1.ClassNode({
          ...accumulator.baseArgs(),
          implements: slots.implementsList ?? [],
          methods: slots.methods ?? [],
          ...slots.extendsName !== void 0 ? { extends: slots.extendsName } : {},
          ...slots.purpose !== void 0 ? { purpose: slots.purpose } : {}
        });
      },
      ClassFile: (accumulator) => {
        const { slots } = accumulator;
        return new class_file_node_ts_1.ClassFileNode({
          ...accumulator.baseArgs(),
          path: slots.path ?? "",
          implements: slots.implementsList ?? [],
          methods: slots.methods ?? [],
          imports: slots.imports ?? [],
          // Auto-self-export lives in the ClassFileNode constructor (parser.ts:287).
          exports: slots.exports ?? [],
          ...slots.extendsName !== void 0 ? { extends: slots.extendsName } : {},
          ...slots.purpose !== void 0 ? { purpose: slots.purpose } : {}
        });
      },
      Constants: (accumulator) => {
        const { slots } = accumulator;
        return new constants_node_ts_1.ConstantsNode({
          ...accumulator.baseArgs(),
          path: slots.path ?? "",
          ...slots.schema !== void 0 ? { schema: slots.schema } : {},
          ...slots.purpose !== void 0 ? { purpose: slots.purpose } : {}
        });
      },
      DTO: (accumulator) => {
        const { slots } = accumulator;
        return new dto_node_ts_1.DtoNode({
          ...accumulator.baseArgs(),
          fields: slots.fields ?? [],
          ...slots.purpose !== void 0 ? { purpose: slots.purpose } : {}
        });
      },
      Asset: (accumulator) => {
        const { slots } = accumulator;
        return new asset_node_ts_1.AssetNode({
          ...accumulator.baseArgs(),
          description: slots.description ?? "",
          ...slots.containsProgram !== void 0 ? { containsProgram: slots.containsProgram } : {}
        });
      },
      UIComponent: (accumulator) => {
        const { slots } = accumulator;
        return new ui_component_node_ts_1.UiComponentNode({
          ...accumulator.baseArgs(),
          purpose: slots.purpose ?? "",
          root: slots.root ?? false,
          ...slots.contains !== void 0 ? { contains: slots.contains } : {},
          ...slots.declaredContainedBy !== void 0 ? { declaredContainedBy: slots.declaredContainedBy } : {},
          ...slots.declaredAffectedBy !== void 0 ? { declaredAffectedBy: slots.declaredAffectedBy } : {}
        });
      },
      RunParameter: (accumulator) => {
        const { slots } = accumulator;
        return new run_parameter_node_ts_1.RunParameterNode({
          ...accumulator.baseArgs(),
          // Replicates the legacy blind narrowing at parser.ts:397 (any `$word`
          // sigil is carried as-is; paramType legality is TM-4 validator scope).
          paramType: slots.paramType ?? "env",
          description: slots.description ?? "",
          ...slots.defaultValue !== void 0 ? { defaultValue: slots.defaultValue } : {},
          ...slots.required !== void 0 ? { required: slots.required } : {}
        });
      },
      Dependency: (accumulator) => {
        const { slots } = accumulator;
        return new dependency_node_ts_1.DependencyNode({
          ...accumulator.baseArgs(),
          purpose: slots.purpose ?? "",
          ...slots.version !== void 0 ? { version: slots.version } : {},
          ...slots.exports !== void 0 ? { exports: slots.exports } : {}
        });
      },
      TypeDef: (accumulator) => {
        const { slots } = accumulator;
        const purposeArgs = slots.purpose !== void 0 ? { purpose: slots.purpose } : {};
        if (slots.typeDefVariant === "enum") {
          return new type_def_node_ts_1.TypeDefNode({
            ...accumulator.baseArgs(),
            variant: "enum",
            members: slots.members ?? [],
            ...purposeArgs
          });
        }
        return new type_def_node_ts_1.TypeDefNode({
          ...accumulator.baseArgs(),
          variant: "alias",
          aliasType: slots.aliasType ?? { kind: "opaque", text: "", span: accumulator.span },
          ...purposeArgs
        });
      }
    };
  }
});

// ../typed-mind/dist/pipeline/declaration-openers.js
var require_declaration_openers = __commonJS2({
  "../typed-mind/dist/pipeline/declaration-openers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.openTypeDef = exports2.openDependency = exports2.openRunParameter = exports2.openUiComponent = exports2.openAsset = exports2.openDto = exports2.openConstants = exports2.openClassFile = exports2.openClass = exports2.openFunction = exports2.openFileOrClassFile = exports2.openProgram = exports2.fileDeclarationOpensClassFile = void 0;
    var cst_nodes_ts_1 = require_cst_nodes();
    var entity_accumulator_ts_1 = require_entity_accumulator();
    var spans_ts_1 = require_spans();
    var type_expr_from_cst_ts_1 = require_type_expr_from_cst();
    var unquote = (text) => {
      return text.replace(/^"/, "").replace(/"$/, "");
    };
    var stripVersionPrefix = (text) => {
      return text.replace(/^v/, "");
    };
    var inlineCommentTextOf = (wrapped) => {
      const commentText = wrapped.inlineCommentChildren().at(0)?.text;
      if (commentText === void 0) {
        return void 0;
      }
      return commentText.replace(/^#[ \t]*/, "").trim();
    };
    var baseArgs = (kind, name2, syntaxNode, comment, viaLookahead = false) => {
      return {
        kind,
        name: name2,
        span: (0, spans_ts_1.tokenSpanOf)(syntaxNode),
        raw: syntaxNode.text.trimEnd(),
        comment,
        viaLookahead,
        // RFC-TM-4 §2 (rfc-tm-4-diamond.md): every declaration opener here
        // corresponds to a line-declaration CST production => 'shortform'.
        sourceForm: "shortform"
      };
    };
    var LEGACY_ENTITY_DECLARATION_PATTERN = /^[@\w\-/]+\s*(->|@|<:|#:|!|::|%|~|&|\$|\^|\s*:)/;
    var fileDeclarationOpensClassFile = (sourceLines, declarationLineIndex) => {
      const scanEnd = Math.min(declarationLineIndex + 6, sourceLines.length);
      for (let lineIndex = declarationLineIndex + 1; lineIndex < scanEnd; lineIndex++) {
        const trimmedLine = (sourceLines[lineIndex] ?? "").trim();
        if (trimmedLine.startsWith("=>")) {
          return true;
        }
        if (trimmedLine.length > 0 && LEGACY_ENTITY_DECLARATION_PATTERN.test(trimmedLine)) {
          return false;
        }
      }
      return false;
    };
    exports2.fileDeclarationOpensClassFile = fileDeclarationOpensClassFile;
    var inheritanceOf = (inheritList) => {
      const names = inheritList === void 0 ? [] : inheritList.entityNameChildren().map((entityName) => entityName.text);
      const [extendsName, ...implementsList] = names;
      return extendsName === void 0 ? { implementsList: [] } : { extendsName, implementsList };
    };
    var openProgram = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstProgramDeclaration(syntaxNode);
      const names = declaration.entityNameChildren();
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("Program", names.at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      accumulator.slots.entry = names.at(1)?.text ?? "";
      const purposeText = declaration.stringChildren().at(0)?.text;
      if (purposeText !== void 0) {
        accumulator.slots.purpose = unquote(purposeText);
      }
      const versionText = declaration.versionChildren().at(0)?.text;
      if (versionText !== void 0) {
        accumulator.slots.version = stripVersionPrefix(versionText);
      }
      return accumulator;
    };
    exports2.openProgram = openProgram;
    var openFileOrClassFile = (syntaxNode, sourceLines) => {
      const declaration = new cst_nodes_ts_1.CstFileDeclaration(syntaxNode);
      const viaLookahead = (0, exports2.fileDeclarationOpensClassFile)(sourceLines, syntaxNode.startPosition.row);
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs(viaLookahead ? "ClassFile" : "File", declaration.entityNameChildren().at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration), viaLookahead));
      accumulator.slots.path = (declaration.pathChildren().at(0)?.text ?? "").trim();
      return accumulator;
    };
    exports2.openFileOrClassFile = openFileOrClassFile;
    var openFunction = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstFunctionDeclaration(syntaxNode);
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("Function", declaration.entityNameChildren().at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      accumulator.slots.signature = (declaration.signatureChildren().at(0)?.text ?? "").trim();
      return accumulator;
    };
    exports2.openFunction = openFunction;
    var openClass = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstClassDeclaration(syntaxNode);
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("Class", declaration.entityNameChildren().at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      const inheritance = inheritanceOf(declaration.inheritListChildren().at(0));
      if (inheritance.extendsName !== void 0) {
        accumulator.slots.extendsName = inheritance.extendsName;
      }
      accumulator.slots.implementsList = inheritance.implementsList;
      return accumulator;
    };
    exports2.openClass = openClass;
    var openClassFile = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstClassfileDeclaration(syntaxNode);
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("ClassFile", declaration.entityNameChildren().at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      accumulator.slots.path = (declaration.pathChildren().at(0)?.text ?? "").trim();
      const inheritance = inheritanceOf(declaration.inheritListChildren().at(0));
      if (inheritance.extendsName !== void 0) {
        accumulator.slots.extendsName = inheritance.extendsName;
      }
      accumulator.slots.implementsList = inheritance.implementsList;
      return accumulator;
    };
    exports2.openClassFile = openClassFile;
    var openConstants = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstConstantsDeclaration(syntaxNode);
      const names = declaration.entityNameChildren();
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("Constants", names.at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      accumulator.slots.path = (declaration.pathChildren().at(0)?.text ?? "").trim();
      const schemaName = names.at(1)?.text;
      if (schemaName !== void 0) {
        accumulator.slots.schema = schemaName;
      }
      return accumulator;
    };
    exports2.openConstants = openConstants;
    var openDto = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstDtoDeclaration(syntaxNode);
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("DTO", declaration.entityNameChildren().at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      const purposeText = declaration.stringChildren().at(0)?.text;
      if (purposeText !== void 0) {
        accumulator.slots.purpose = unquote(purposeText);
      }
      return accumulator;
    };
    exports2.openDto = openDto;
    var openAsset = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstAssetDeclaration(syntaxNode);
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("Asset", declaration.entityNameChildren().at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      accumulator.slots.description = unquote(declaration.stringChildren().at(0)?.text ?? '""');
      return accumulator;
    };
    exports2.openAsset = openAsset;
    var openUiComponent = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstUicomponentDeclaration(syntaxNode);
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("UIComponent", declaration.entityNameChildren().at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      accumulator.slots.purpose = unquote(declaration.stringChildren().at(0)?.text ?? '""');
      let root = false;
      for (let childIndex = 0; childIndex < syntaxNode.childCount; childIndex++) {
        const child = syntaxNode.child(childIndex);
        if (child !== null && !child.isNamed && child.type === "&!") {
          root = true;
          break;
        }
      }
      accumulator.slots.root = root;
      return accumulator;
    };
    exports2.openUiComponent = openUiComponent;
    var openRunParameter = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstRunparameterDeclaration(syntaxNode);
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("RunParameter", declaration.entityNameChildren().at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      accumulator.slots.paramType = (declaration.paramTypeChildren().at(0)?.text ?? "$env").slice(1);
      accumulator.slots.description = unquote(declaration.stringChildren().at(0)?.text ?? '""');
      const marker = declaration.paramMarkerChildren().at(0)?.text;
      if (marker === "(required)") {
        accumulator.slots.required = true;
      }
      return accumulator;
    };
    exports2.openRunParameter = openRunParameter;
    var openDependency = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstDependencyDeclaration(syntaxNode);
      const name2 = declaration.entityNameChildren().at(0)?.text ?? declaration.dependencyNameChildren().at(0)?.text ?? "";
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("Dependency", name2, syntaxNode, inlineCommentTextOf(declaration)));
      accumulator.slots.purpose = unquote(declaration.stringChildren().at(0)?.text ?? '""');
      const versionText = declaration.versionChildren().at(0)?.text;
      if (versionText !== void 0) {
        accumulator.slots.version = stripVersionPrefix(versionText);
      }
      return accumulator;
    };
    exports2.openDependency = openDependency;
    var openTypeDef = (syntaxNode) => {
      const declaration = new cst_nodes_ts_1.CstTypedefDeclaration(syntaxNode);
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator(baseArgs("TypeDef", declaration.entityNameChildren().at(0)?.text ?? "", syntaxNode, inlineCommentTextOf(declaration)));
      const enumVariant = declaration.typedefEnumVariantChildren().at(0);
      if (enumVariant !== void 0) {
        accumulator.slots.typeDefVariant = "enum";
        accumulator.slots.members = enumVariant.listEntryChildren().map((entry) => entry.text);
        return accumulator;
      }
      accumulator.slots.typeDefVariant = "alias";
      const typeExprCst = declaration.typeExprChildren().at(0);
      accumulator.slots.aliasType = typeExprCst === void 0 ? { kind: "opaque", text: "", span: accumulator.span } : (0, type_expr_from_cst_ts_1.typeExprFromCst)(typeExprCst);
      return accumulator;
    };
    exports2.openTypeDef = openTypeDef;
  }
});

// ../typed-mind/dist/pipeline/longform-builder.js
var require_longform_builder = __commonJS2({
  "../typed-mind/dist/pipeline/longform-builder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.buildFromClassfileBlockSigil = exports2.buildFromLongformBlock = void 0;
    var dto_field_node_ts_1 = require_dto_field_node();
    var attachment_rules_ts_1 = require_attachment_rules();
    var entity_accumulator_ts_1 = require_entity_accumulator();
    var spans_ts_1 = require_spans();
    var type_expr_from_text_ts_1 = require_type_expr_from_text();
    var LONGFORM_KIND_BY_KEYWORD = {
      program: "Program",
      file: "File",
      function: "Function",
      class: "Class",
      classfile: "ClassFile",
      dto: "DTO",
      component: "UIComponent",
      asset: "Asset",
      constants: "Constants",
      parameter: "RunParameter",
      dependency: "Dependency",
      // X-TYPE-7 (rfc-tm-8-diamond.md §5): `typedef Name { ... }` longform.
      typedef: "TypeDef"
    };
    var unquote = (text) => {
      return text.replace(/^"/, "").replace(/"$/, "");
    };
    var fieldPropsOf = (properties) => {
      let typeText;
      let typeSpan;
      let descriptionText;
      let optional = false;
      for (const property of properties) {
        if (property.key === "type" && property.kind === "scalar") {
          typeText = property.value;
          typeSpan = property.span;
        }
        if (property.key === "description" && property.kind === "scalar") {
          descriptionText = property.value;
        }
        if (property.key === "optional") {
          optional = property.kind === "bool" ? property.value : property.kind === "scalar" && property.value === "true";
        }
      }
      return {
        ...typeText !== void 0 ? { type: typeText } : {},
        ...typeSpan !== void 0 ? { typeSpan } : {},
        ...descriptionText !== void 0 ? { description: descriptionText } : {},
        optional
      };
    };
    var dtoFieldsOf = (fieldsBlock) => {
      const fields = [];
      for (const fieldBlock of fieldsBlock.dtoFieldBlockChildren()) {
        fields.push(dtoFieldOf(fieldBlock));
      }
      return fields;
    };
    var dtoFieldOf = (fieldBlock) => {
      const span = (0, spans_ts_1.tokenSpanOf)(fieldBlock.syntaxNode);
      const inline = fieldBlock.dtoFieldInlineChildren().at(0);
      let fieldName;
      let properties;
      if (inline !== void 0) {
        fieldName = inline.propertyKeyChildren().at(0)?.text ?? "";
        properties = inline.inlineFieldPairChildren().map((pair) => {
          const pairSpan = (0, spans_ts_1.tokenSpanOf)(pair.syntaxNode);
          const key = pair.propertyKeyChildren().at(0)?.text ?? "";
          const stringValue = pair.stringChildren().at(0)?.text;
          if (stringValue !== void 0) {
            return { kind: "scalar", key, value: unquote(stringValue), span: pairSpan };
          }
          const boolValue = pair.boolLiteralChildren().at(0)?.text;
          if (boolValue !== void 0) {
            return { kind: "bool", key, value: boolValue === "true", span: pairSpan };
          }
          return { kind: "scalar", key, value: pair.entityNameChildren().at(0)?.text ?? "", span: pairSpan };
        });
      } else {
        fieldName = fieldBlock.propertyKeyChildren().at(0)?.text ?? "";
        properties = fieldBlock.blockPropertyChildren().map(classifyBlockProperty).filter((property) => property !== void 0);
      }
      const props = fieldPropsOf(properties);
      const typeText = props.type ?? "any";
      const typeSpanStart = (props.typeSpan ?? span).start;
      const typeExpr = (0, type_expr_from_text_ts_1.parseTypeExprText)(typeText, { baseLine: typeSpanStart.line, baseColumn: typeSpanStart.column }).typeExpr;
      return new dto_field_node_ts_1.DtoFieldNode({
        name: fieldName,
        // 'any' is the legacy default for a longform field with no type key
        // (longform-parser.ts:249) — a data value, not a TypeScript type.
        type: typeText,
        typeExpr,
        // Longform spells optionality as `optional: true`; the marker maps to the
        // 'parenthesized' variant (both spell the word `optional` explicitly; the
        // 'question' variant is reserved for the shortform `?` sigil, doc §2.2).
        optionalityMarker: props.optional ? "parenthesized" : "none",
        ...props.description !== void 0 ? { description: props.description } : {},
        span
      });
    };
    var classifyBlockProperty = (property) => {
      const span = (0, spans_ts_1.tokenSpanOf)(property.syntaxNode);
      const stringProperty = property.propertyStringChildren().at(0);
      if (stringProperty !== void 0) {
        return {
          kind: "scalar",
          key: stringProperty.propertyKeyChildren().at(0)?.text ?? "",
          value: unquote(stringProperty.stringChildren().at(0)?.text ?? '""'),
          span
        };
      }
      const identifierProperty = property.propertyIdentifierChildren().at(0);
      if (identifierProperty !== void 0) {
        return {
          kind: "scalar",
          key: identifierProperty.propertyKeyChildren().at(0)?.text ?? "",
          value: identifierProperty.entityNameChildren().at(0)?.text ?? "",
          span
        };
      }
      const freetextProperty = property.propertyFreetextChildren().at(0);
      if (freetextProperty !== void 0) {
        return {
          kind: "scalar",
          key: freetextProperty.propertyKeyChildren().at(0)?.text ?? "",
          value: (freetextProperty.freetextValueChildren().at(0)?.text ?? "").trim(),
          span
        };
      }
      const boolProperty = property.propertyBoolChildren().at(0);
      if (boolProperty !== void 0) {
        return {
          kind: "bool",
          key: boolProperty.propertyKeyChildren().at(0)?.text ?? "",
          value: boolProperty.boolLiteralChildren().at(0)?.text === "true",
          span
        };
      }
      const listProperty = property.propertyListChildren().at(0);
      if (listProperty !== void 0) {
        const entries = listProperty.nameListChildren().at(0)?.listEntryChildren() ?? [];
        return {
          kind: "list",
          key: listProperty.propertyKeyChildren().at(0)?.text ?? "",
          names: entries.map((entry) => entry.text),
          span
        };
      }
      const fieldsBlock = property.dtoFieldsBlockChildren().at(0);
      if (fieldsBlock !== void 0) {
        return { kind: "fields", key: "fields", fields: dtoFieldsOf(fieldsBlock), span };
      }
      return void 0;
    };
    var collectProperties = (blockProperties) => {
      const collected = { scalars: /* @__PURE__ */ new Map(), lists: /* @__PURE__ */ new Map(), bools: /* @__PURE__ */ new Map(), fields: void 0, all: [] };
      for (const blockProperty of blockProperties) {
        const property = classifyBlockProperty(blockProperty);
        if (property === void 0) {
          continue;
        }
        collected.all.push(property);
        if (property.kind === "scalar") {
          collected.scalars.set(property.key, property.value);
        } else if (property.kind === "bool") {
          collected.bools.set(property.key, property.value);
        } else if (property.kind === "list") {
          collected.lists.set(property.key, { names: property.names, span: property.span });
        } else {
          collected.fields = property.fields;
        }
      }
      return collected;
    };
    var applyProperties = (accumulator, collected, diagnostics) => {
      const { slots } = accumulator;
      const scalar = (key) => collected.scalars.get(key);
      const list = (key) => collected.lists.get(key)?.names;
      const description = scalar("description");
      const purposeOrDescription = scalar("purpose") ?? description;
      switch (accumulator.kind) {
        case "Program": {
          slots.entry = scalar("entry") ?? "";
          const version = scalar("version");
          if (version !== void 0) {
            slots.version = version;
          }
          if (purposeOrDescription !== void 0) {
            slots.purpose = purposeOrDescription;
          }
          const exports3 = list("exports");
          if (exports3 !== void 0) {
            slots.exports = exports3;
          }
          break;
        }
        case "File": {
          slots.path = scalar("path") ?? "";
          slots.imports = list("imports") ?? [];
          slots.exports = list("exports") ?? [];
          if (purposeOrDescription !== void 0) {
            slots.purpose = purposeOrDescription;
          }
          break;
        }
        case "Function": {
          slots.signature = scalar("signature") ?? "";
          slots.calls = list("calls") ?? [];
          if (description !== void 0) {
            slots.description = description;
          }
          const input = scalar("input");
          if (input !== void 0) {
            slots.input = input;
          }
          const output = scalar("output");
          if (output !== void 0) {
            slots.output = output;
          }
          const affects = list("affects");
          if (affects !== void 0) {
            slots.affects = affects;
          }
          const consumes = list("consumes");
          if (consumes !== void 0) {
            slots.consumes = consumes;
          }
          break;
        }
        case "Class": {
          const extendsName = scalar("extends");
          if (extendsName !== void 0) {
            slots.extendsName = extendsName;
          }
          slots.implementsList = list("implements") ?? [];
          slots.methods = list("methods") ?? [];
          if (purposeOrDescription !== void 0) {
            slots.purpose = purposeOrDescription;
          }
          const importsProperty = collected.lists.get("imports");
          if (importsProperty !== void 0) {
            diagnostics.push((0, attachment_rules_ts_1.illegalContinuationDiagnostic)("imports property (`imports: [...]`)", "Class", importsProperty.span));
          }
          break;
        }
        case "ClassFile": {
          const path = scalar("path");
          if (path !== void 0) {
            slots.path = path;
          }
          const extendsName = scalar("extends");
          if (extendsName !== void 0) {
            slots.extendsName = extendsName;
          }
          slots.implementsList = list("implements") ?? slots.implementsList ?? [];
          slots.methods = list("methods") ?? [];
          slots.imports = list("imports") ?? [];
          slots.exports = list("exports") ?? [];
          if (purposeOrDescription !== void 0) {
            slots.purpose = purposeOrDescription;
          }
          break;
        }
        case "Constants": {
          slots.path = scalar("path") ?? "";
          const schema = scalar("schema");
          if (schema !== void 0) {
            slots.schema = schema;
          }
          if (purposeOrDescription !== void 0) {
            slots.purpose = purposeOrDescription;
          }
          break;
        }
        case "DTO": {
          slots.fields = collected.fields ?? [];
          if (purposeOrDescription !== void 0) {
            slots.purpose = purposeOrDescription;
          }
          break;
        }
        case "Asset": {
          slots.description = description ?? "";
          const containsProgram = scalar("containsProgram");
          if (containsProgram !== void 0) {
            slots.containsProgram = containsProgram;
          }
          break;
        }
        case "UIComponent": {
          slots.purpose = description ?? "";
          slots.root = collected.bools.get("root") ?? false;
          const contains = list("contains");
          if (contains !== void 0) {
            slots.contains = contains;
          }
          const containedBy = list("containedBy");
          if (containedBy !== void 0) {
            slots.declaredContainedBy = containedBy;
          }
          const affectedBy = list("affectedBy");
          if (affectedBy !== void 0) {
            slots.declaredAffectedBy = affectedBy;
          }
          break;
        }
        case "RunParameter": {
          slots.paramType = scalar("type") ?? "env";
          slots.description = description ?? "";
          const defaultValue = scalar("default");
          if (defaultValue !== void 0) {
            slots.defaultValue = defaultValue;
          }
          const required = collected.bools.get("required");
          if (required !== void 0) {
            slots.required = required;
          }
          break;
        }
        case "Dependency": {
          slots.purpose = purposeOrDescription ?? "";
          const version = scalar("version");
          if (version !== void 0) {
            slots.version = version;
          }
          const exports3 = list("exports");
          if (exports3 !== void 0) {
            slots.exports = exports3;
          }
          break;
        }
        case "TypeDef": {
          const variant = scalar("variant") === "enum" ? "enum" : "alias";
          slots.typeDefVariant = variant;
          if (variant === "enum") {
            slots.members = list("members") ?? [];
          } else {
            const aliasTypeProperty = collected.scalars.get("type");
            const aliasTypeSpanStart = collected.all.find((property) => property.key === "type")?.span.start ?? accumulator.span.start;
            const typeText = aliasTypeProperty ?? "any";
            slots.aliasType = (0, type_expr_from_text_ts_1.parseTypeExprText)(typeText, {
              baseLine: aliasTypeSpanStart.line,
              baseColumn: aliasTypeSpanStart.column
            }).typeExpr;
          }
          if (purposeOrDescription !== void 0) {
            slots.purpose = purposeOrDescription;
          }
          break;
        }
      }
    };
    var buildResult = (accumulator, collected) => {
      const diagnostics = [];
      applyProperties(accumulator, collected, diagnostics);
      const attachments = collected.all.map((property) => ({
        entityName: accumulator.name,
        group: property.key,
        span: property.span
      }));
      return { accumulator, diagnostics, attachments };
    };
    var buildFromLongformBlock = (block) => {
      const header = block.blockHeaderChildren().at(0);
      if (header === void 0) {
        return void 0;
      }
      const keywordText = (header.blockKwChildren().at(0)?.text ?? "").split(/[ \t]/)[0] ?? "";
      const kind = LONGFORM_KIND_BY_KEYWORD[keywordText];
      if (kind === void 0) {
        return void 0;
      }
      const collected = collectProperties(block.blockPropertyChildren());
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator({
        kind,
        name: header.headerName(),
        span: (0, spans_ts_1.tokenSpanOf)(block.syntaxNode),
        raw: block.syntaxNode.text.trimEnd(),
        // Legacy longform comment = the description property (longform-parser.ts:183).
        comment: collected.scalars.get("description"),
        // RFC-TM-4 §2 (rfc-tm-4-diamond.md): a brace-block header is 'longform'.
        sourceForm: "longform"
      });
      return buildResult(accumulator, collected);
    };
    exports2.buildFromLongformBlock = buildFromLongformBlock;
    var buildFromClassfileBlockSigil = (block) => {
      const collected = collectProperties(block.blockPropertyChildren());
      const accumulator = new entity_accumulator_ts_1.EntityAccumulator({
        kind: "ClassFile",
        name: block.entityNameChildren().at(0)?.text ?? "",
        span: (0, spans_ts_1.tokenSpanOf)(block.syntaxNode),
        raw: block.syntaxNode.text.trimEnd(),
        comment: collected.scalars.get("description"),
        // RFC-TM-4 §2 (rfc-tm-4-diamond.md, FID-6): the sigil-with-brace ClassFile
        // header `Name #: path {` is a brace-block header => 'longform'.
        sourceForm: "longform"
      });
      accumulator.slots.path = (block.pathChildren().at(0)?.text ?? "").trim();
      const inheritNames = block.inheritListChildren().at(0)?.entityNameChildren().map((entityName) => entityName.text) ?? [];
      const [extendsName, ...implementsList] = inheritNames;
      if (extendsName !== void 0) {
        accumulator.slots.extendsName = extendsName;
        accumulator.slots.implementsList = implementsList;
      }
      return buildResult(accumulator, collected);
    };
    exports2.buildFromClassfileBlockSigil = buildFromClassfileBlockSigil;
  }
});

// ../typed-mind/dist/pipeline/syntax-diagnostics.js
var require_syntax_diagnostics = __commonJS2({
  "../typed-mind/dist/pipeline/syntax-diagnostics.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.collectSyntaxDiagnostics = void 0;
    var spans_ts_1 = require_spans();
    var SNIPPET_LIMIT = 60;
    var errorSnippet = (syntaxNode) => {
      const firstLine = (syntaxNode.text.split("\n")[0] ?? "").trim();
      if (firstLine.length <= SNIPPET_LIMIT) {
        return firstLine;
      }
      return `${firstLine.slice(0, SNIPPET_LIMIT)}\u2026`;
    };
    var visit = (syntaxNode, diagnostics) => {
      if (syntaxNode.type === "ERROR") {
        diagnostics.push({
          code: "syntax/error",
          severity: "error",
          span: (0, spans_ts_1.tokenSpanOf)(syntaxNode),
          message: `unparsable text: \`${errorSnippet(syntaxNode)}\``
        });
        return;
      }
      if (syntaxNode.isMissing) {
        diagnostics.push({
          code: "syntax/missing",
          severity: "error",
          span: (0, spans_ts_1.tokenSpanOf)(syntaxNode),
          message: `missing ${syntaxNode.type}`
        });
        return;
      }
      if (!syntaxNode.hasError) {
        return;
      }
      for (const child of syntaxNode.children) {
        visit(child, diagnostics);
      }
    };
    var collectSyntaxDiagnostics = (rootSyntaxNode) => {
      const diagnostics = [];
      visit(rootSyntaxNode, diagnostics);
      return diagnostics;
    };
    exports2.collectSyntaxDiagnostics = collectSyntaxDiagnostics;
  }
});

// ../typed-mind/dist/pipeline/cst-to-ast.js
var require_cst_to_ast = __commonJS2({
  "../typed-mind/dist/pipeline/cst-to-ast.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.walkCstToAst = exports2.CstToAstWalker = exports2.compareDiagnosticsBySpan = void 0;
    var cst_nodes_ts_1 = require_cst_nodes();
    var import_statement_node_ts_1 = require_import_statement_node();
    var suppression_node_ts_1 = require_suppression_node();
    var attachment_rules_ts_1 = require_attachment_rules();
    var declaration_openers_ts_1 = require_declaration_openers();
    var longform_builder_ts_1 = require_longform_builder();
    var spans_ts_1 = require_spans();
    var syntax_diagnostics_ts_1 = require_syntax_diagnostics();
    var LEGACY_CONTINUATION_PATTERN = /^\s+(->|<-|~>|=>|>>|>|<|~|"|#|-|=|\$<)/;
    var logicalTypeOf = (concreteType) => {
      return concreteType.endsWith("_final") ? concreteType.slice(0, -"_final".length) : concreteType;
    };
    var compareDiagnosticsBySpan = (left, right) => {
      if (left.span.start.line !== right.span.start.line) {
        return left.span.start.line - right.span.start.line;
      }
      return left.span.start.column - right.span.start.column;
    };
    exports2.compareDiagnosticsBySpan = compareDiagnosticsBySpan;
    var DECLARATION_OPENERS = {
      program_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openProgram)(syntaxNode),
      file_declaration: (syntaxNode, sourceLines) => (0, declaration_openers_ts_1.openFileOrClassFile)(syntaxNode, sourceLines),
      function_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openFunction)(syntaxNode),
      class_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openClass)(syntaxNode),
      classfile_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openClassFile)(syntaxNode),
      constants_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openConstants)(syntaxNode),
      dto_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openDto)(syntaxNode),
      asset_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openAsset)(syntaxNode),
      uicomponent_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openUiComponent)(syntaxNode),
      runparameter_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openRunParameter)(syntaxNode),
      dependency_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openDependency)(syntaxNode),
      typedef_declaration: (syntaxNode) => (0, declaration_openers_ts_1.openTypeDef)(syntaxNode)
    };
    var CstToAstWalker = class {
      #root;
      #sourceLines;
      #entities = [];
      #imports = [];
      #suppressions = [];
      #diagnostics = [];
      #attachments = [];
      #open = null;
      constructor(root, source) {
        this.#root = root;
        this.#sourceLines = source.split("\n");
      }
      walk() {
        for (const lineNode of this.#root.syntaxNode.namedChildren) {
          this.#dispatch(lineNode);
        }
        this.#closeOpenEntity();
        const diagnostics = [...(0, syntax_diagnostics_ts_1.collectSyntaxDiagnostics)(this.#root.syntaxNode), ...this.#diagnostics].sort(exports2.compareDiagnosticsBySpan);
        return {
          outcome: { entities: this.#entities, imports: this.#imports, suppressions: this.#suppressions, diagnostics },
          attachments: this.#attachments
        };
      }
      #dispatch(lineNode) {
        if (lineNode.type === "ERROR") {
          this.#handleErrorRegion(lineNode);
          return;
        }
        const logicalType = logicalTypeOf(lineNode.type);
        if (logicalType === "comment_line" || logicalType === "entity_comment") {
          return;
        }
        if (logicalType === "import_statement") {
          this.#handleImport(lineNode);
          return;
        }
        if (logicalType === "suppress_line") {
          this.#handleSuppressLine(lineNode);
          return;
        }
        if (logicalType === "suppression_block") {
          this.#handleSuppressionBlock(lineNode);
          return;
        }
        if (logicalType === "longform_block") {
          this.#handleLongform(lineNode);
          return;
        }
        if (logicalType === "classfile_block_sigil") {
          this.#handleClassfileSigil(lineNode);
          return;
        }
        const opener = DECLARATION_OPENERS[logicalType];
        if (opener !== void 0) {
          this.#closeOpenEntity();
          this.#open = opener(lineNode, this.#sourceLines);
          return;
        }
        const rule = attachment_rules_ts_1.attachmentRules[logicalType];
        if (rule !== void 0) {
          this.#handleContinuation(logicalType, lineNode);
          return;
        }
      }
      #handleContinuation(logicalType, lineNode) {
        const rule = attachment_rules_ts_1.attachmentRules[logicalType];
        if (rule === void 0) {
          return;
        }
        if (lineNode.hasError) {
          return;
        }
        const span = (0, spans_ts_1.tokenSpanOf)(lineNode);
        if (this.#open === null) {
          this.#diagnostics.push((0, attachment_rules_ts_1.orphanContinuationDiagnostic)(rule.label, span));
          return;
        }
        if (!rule.accepts(this.#open)) {
          this.#diagnostics.push((0, attachment_rules_ts_1.illegalContinuationDiagnostic)(rule.label, this.#open.kind, span));
          return;
        }
        rule.apply(this.#open, lineNode, span);
        this.#attachments.push({ entityName: this.#open.name, group: rule.group, span });
      }
      #handleImport(lineNode) {
        const statement = new cst_nodes_ts_1.CstImportStatement(lineNode);
        const headText = statement.importHeadChildren().at(0)?.text ?? "";
        const pathMatch = /"([^"\n]*)"/.exec(headText);
        const alias = statement.entityNameChildren().at(0)?.text;
        this.#imports.push(new import_statement_node_ts_1.ImportStatementNode({
          path: pathMatch?.[1] ?? "",
          ...alias !== void 0 ? { alias } : {},
          span: (0, spans_ts_1.tokenSpanOf)(lineNode),
          raw: lineNode.text.trimEnd()
        }));
      }
      // RFC-TM-8 §7 (rfc-tm-8-diamond.md) — suppression is document-level like
      // import_statement: it does NOT close the open entity (a suppress line has
      // no attachment relationship to whatever entity happens to be under
      // construction — mirroring #handleImport's precedent, not #handleLongform's
      // close-on-block precedent, since a suppression is not itself a
      // declaration).
      #handleSuppressLine(lineNode) {
        const suppress = new cst_nodes_ts_1.CstSuppressLine(lineNode);
        const keywordText = suppress.suppressKwChildren().at(0)?.text ?? "";
        const lastKeywordCharacter = keywordText.slice(-1);
        const restText = suppress.targetField()?.text ?? "";
        const target = lastKeywordCharacter + restText;
        const code = suppress.codeField()?.text ?? "";
        const reason = suppress.reasonField()?.text ?? "";
        this.#suppressions.push(new suppression_node_ts_1.SuppressionNode({
          target,
          code,
          // Strip the surrounding quotes the same way every other consumer of
          // $.string does (the token's raw text includes them).
          reason: reason.length >= 2 ? reason.slice(1, -1) : reason,
          span: (0, spans_ts_1.tokenSpanOf)(lineNode),
          raw: lineNode.text.trimEnd()
        }));
      }
      // Longform `suppress { ... }` — one SuppressionNode PER ENTRY (the grain
      // ruling, doc §7): a block with N entries produces N flat SuppressionNode
      // values, not one node holding N entries, so each entry's staleness is
      // independently checkable.
      #handleSuppressionBlock(lineNode) {
        const block = new cst_nodes_ts_1.CstSuppressionBlock(lineNode);
        for (const entry of block.suppressionEntryChildren()) {
          const target = entry.targetField()?.text ?? "";
          const code = entry.codeField()?.text ?? "";
          const reason = entry.reasonField()?.text ?? "";
          this.#suppressions.push(new suppression_node_ts_1.SuppressionNode({
            target,
            code,
            reason: reason.length >= 2 ? reason.slice(1, -1) : reason,
            span: entry.span(),
            raw: entry.syntaxNode.text.trimEnd()
          }));
        }
      }
      #handleLongform(lineNode) {
        this.#closeOpenEntity();
        const result = (0, longform_builder_ts_1.buildFromLongformBlock)(new cst_nodes_ts_1.CstLongformBlock(lineNode));
        if (result !== void 0) {
          this.#entities.push(result.accumulator.finalize());
          this.#diagnostics.push(...result.diagnostics);
          this.#attachments.push(...result.attachments);
        }
        this.#open = null;
      }
      #handleClassfileSigil(lineNode) {
        this.#closeOpenEntity();
        const result = (0, longform_builder_ts_1.buildFromClassfileBlockSigil)(new cst_nodes_ts_1.CstClassfileBlockSigil(lineNode));
        this.#entities.push(result.accumulator.finalize());
        this.#diagnostics.push(...result.diagnostics);
        this.#attachments.push(...result.attachments);
        this.#open = null;
      }
      #handleErrorRegion(errorNode) {
        const startLineIndex = errorNode.startPosition.row;
        const endLineIndex = errorNode.endPosition.column === 0 ? errorNode.endPosition.row - 1 : errorNode.endPosition.row;
        const coveredLines = [];
        for (let lineIndex = startLineIndex; lineIndex <= endLineIndex && lineIndex < this.#sourceLines.length; lineIndex++) {
          coveredLines.push(this.#sourceLines[lineIndex] ?? "");
        }
        const meaningfulLines = coveredLines.filter((line) => line.trim().length > 0 && !line.trim().startsWith("#"));
        const allContinuationShaped = meaningfulLines.every((line) => LEGACY_CONTINUATION_PATTERN.test(line));
        if (!allContinuationShaped) {
          this.#closeOpenEntity();
        }
      }
      #closeOpenEntity() {
        if (this.#open !== null) {
          this.#entities.push(this.#open.finalize());
          this.#open = null;
        }
      }
    };
    exports2.CstToAstWalker = CstToAstWalker;
    var walkCstToAst = (root, source) => {
      return new CstToAstWalker(root, source).walk();
    };
    exports2.walkCstToAst = walkCstToAst;
  }
});

// ../typed-mind/dist/pipeline/forward-semantics.js
var require_forward_semantics = __commonJS2({
  "../typed-mind/dist/pipeline/forward-semantics.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.distributeForwardSemantics = void 0;
    var function_node_ts_1 = require_function_node();
    var CALL_KINDS = ["Function", "Class", "ClassFile"];
    var CONSUMED_KINDS = ["Asset", "RunParameter", "Constants"];
    var pushUnique = (list, name2) => {
      if (!list.includes(name2)) {
        list.push(name2);
      }
    };
    var dependencyDirectConsumptionDiagnostic = (fn, dependencyName) => {
      return {
        code: "semantics/dependency-direct-consumption",
        severity: "warning",
        span: fn.span,
        message: `Function '${fn.name}' lists Dependency '${dependencyName}' in its \`<- [...]\` dependency list; Dependencies cannot be consumed directly \u2014 a File must import '${dependencyName}' first`
      };
    };
    var extraInputDtoDiagnostic = (fn, extraDto, firstDto) => {
      return {
        code: "semantics/extra-input-dto",
        severity: "warning",
        span: fn.span,
        message: `Function '${fn.name}' lists extra input DTO '${extraDto}' beyond the first ('${firstDto}') in its \`<- [...]\` dependency list; it is ignored \u2014 a Function takes one input DTO (\`<- Name\`)`
      };
    };
    var distributeOne = (fn, byName, diagnostics) => {
      const unresolved = [];
      const dtos = [];
      const calls = [...fn.calls];
      let affects = fn.affects === void 0 ? void 0 : [...fn.affects];
      let consumes = fn.consumes === void 0 ? void 0 : [...fn.consumes];
      let input = fn.input;
      for (const dependencyName of fn.pendingDependencies) {
        const target = byName.get(dependencyName);
        if (target === void 0) {
          unresolved.push(dependencyName);
        } else if (target.kind === "DTO") {
          dtos.push(dependencyName);
        } else if (CALL_KINDS.includes(target.kind)) {
          pushUnique(calls, dependencyName);
        } else if (target.kind === "UIComponent") {
          affects = affects ?? [];
          pushUnique(affects, dependencyName);
        } else if (target.kind === "Dependency") {
          diagnostics.push(dependencyDirectConsumptionDiagnostic(fn, dependencyName));
          unresolved.push(dependencyName);
        } else if (CONSUMED_KINDS.includes(target.kind)) {
          consumes = consumes ?? [];
          pushUnique(consumes, dependencyName);
        } else {
          unresolved.push(dependencyName);
        }
      }
      const firstDto = dtos.at(0);
      if (firstDto !== void 0) {
        if (input === void 0) {
          input = firstDto;
        }
        for (const extraDto of dtos.slice(1)) {
          diagnostics.push(extraInputDtoDiagnostic(fn, extraDto, firstDto));
        }
      }
      return new function_node_ts_1.FunctionNode({
        name: fn.name,
        span: fn.span,
        raw: fn.raw,
        sourceForm: fn.sourceForm,
        ...fn.comment !== void 0 ? { comment: fn.comment } : {},
        signature: fn.signature,
        calls,
        pendingDependencies: unresolved,
        ...fn.description !== void 0 ? { description: fn.description } : {},
        ...input !== void 0 ? { input } : {},
        ...fn.output !== void 0 ? { output: fn.output } : {},
        ...affects !== void 0 ? { affects } : {},
        ...consumes !== void 0 ? { consumes } : {}
      });
    };
    var distributeForwardSemantics = (entities) => {
      const byName = /* @__PURE__ */ new Map();
      for (const entity of entities) {
        byName.set(entity.name, entity);
      }
      const diagnostics = [];
      for (const [index, entity] of entities.entries()) {
        if (entity instanceof function_node_ts_1.FunctionNode && entity.pendingDependencies.length > 0) {
          entities[index] = distributeOne(entity, byName, diagnostics);
        }
      }
      return diagnostics;
    };
    exports2.distributeForwardSemantics = distributeForwardSemantics;
  }
});

// ../typed-mind/dist/pipeline/typed-mind-parser.js
var require_typed_mind_parser = __commonJS2({
  "../typed-mind/dist/pipeline/typed-mind-parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypedMindParser = void 0;
    var web_tree_sitter_1 = require_web_tree_sitter2();
    var cst_nodes_ts_1 = require_cst_nodes();
    var cst_to_ast_ts_1 = require_cst_to_ast();
    var forward_semantics_ts_1 = require_forward_semantics();
    var resolveDefaultWasmPath = () => {
      if (typeof __dirname !== "string" || typeof require !== "function") {
        throw new Error("TypedMindParser.create(): default grammar.wasm resolution is __dirname-relative and only works from the compiled CommonJS output; pass { wasmPath } or { wasmBytes }");
      }
      const nodePath = require("path");
      const nodeFs = require("fs");
      const candidates = [
        nodePath.join(__dirname, "..", "..", "grammar", "grammar.wasm"),
        nodePath.join(__dirname, "..", "..", "grammar.wasm")
      ];
      for (const candidate of candidates) {
        if (nodeFs.existsSync(candidate)) {
          return candidate;
        }
      }
      throw new Error(`TypedMindParser.create(): grammar.wasm not found at ${candidates.join(" or ")} \u2014 run the package's pretest wasm build (pnpm test) or pass { wasmPath }/{ wasmBytes }`);
    };
    var TypedMindParser = class _TypedMindParser {
      // Explicit field assignment: parameter properties are non-erasable syntax
      // and break Node's strip-only execution of the src tree.
      #parser;
      constructor(parser) {
        this.#parser = parser;
      }
      static async create(options = {}) {
        if (options.runtimeWasmPath === void 0) {
          await web_tree_sitter_1.Parser.init();
        } else {
          const runtimeWasmPath = options.runtimeWasmPath;
          await web_tree_sitter_1.Parser.init({ locateFile: () => runtimeWasmPath });
        }
        const wasmSource = options.wasmBytes ?? options.wasmPath ?? resolveDefaultWasmPath();
        const language = await web_tree_sitter_1.Language.load(wasmSource);
        const parser = new web_tree_sitter_1.Parser();
        parser.setLanguage(language);
        return new _TypedMindParser(parser);
      }
      // The CST-level entry: the wrapped tree root, no semantic interpretation.
      parseCst(source) {
        const tree = this.#parser.parse(source);
        if (tree === null) {
          throw new Error("TypedMindParser.parseCst(): tree-sitter returned no tree");
        }
        return new cst_nodes_ts_1.CstSourceFile(tree.rootNode);
      }
      // §3.1: the pipeline entry. Always tolerant — parse problems land in
      // ParseOutcome.diagnostics, never as throws (§3.3). The Q4 forward-semantics
      // phase (§3.4) runs here, per document and BEFORE any import merge — the
      // pinned legacy ordering quirk (index.ts:104-127): an import-satisfied
      // dependency is never distributed yet never errored.
      parse(source) {
        return this.#parseFromCst(this.parseCst(source), source);
      }
      // RFC-TM-5 §1 (rfc-tm-5-diamond.md) — the `parseWithCst` facade extension.
      // Parses the CST exactly once and walks it exactly once, sharing that single
      // tree between the AST outcome and the returned CST — the Rejected
      // Alternatives entry this doc names ("a second TypedMindParser instance or a
      // re-parse") is exactly what this shared-tree shape avoids: one wasm-backed
      // parse per document version, not two. ParseOutcome's frozen shape is
      // untouched; this is a new method with a widened return on a new surface.
      parseWithCst(source) {
        const cst = this.parseCst(source);
        const outcome = this.#parseFromCst(cst, source);
        return { ...outcome, cst };
      }
      // Shared parse-CST-once-then-walk core: both parse() and parseWithCst() walk
      // the SAME already-produced CstSourceFile rather than each re-parsing.
      #parseFromCst(cst, source) {
        const walked = (0, cst_to_ast_ts_1.walkCstToAst)(cst, source).outcome;
        const entities = [...walked.entities];
        const semanticDiagnostics = (0, forward_semantics_ts_1.distributeForwardSemantics)(entities);
        const diagnostics = [...walked.diagnostics, ...semanticDiagnostics].sort(cst_to_ast_ts_1.compareDiagnosticsBySpan);
        return { entities, imports: walked.imports, suppressions: walked.suppressions, diagnostics };
      }
    };
    exports2.TypedMindParser = TypedMindParser;
  }
});

// ../typed-mind/dist/typed-mind.js
var require_typed_mind = __commonJS2({
  "../typed-mind/dist/typed-mind.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypedMind = void 0;
    var node_path_1 = require("path");
    var apply_suppressions_ts_1 = require_apply_suppressions();
    var ast_validator_ts_1 = require_ast_validator();
    var finding_ts_1 = require_finding();
    var detect_format_ts_1 = require_detect_format();
    var syntax_emitter_ts_1 = require_syntax_emitter();
    var import_resolver_ts_1 = require_import_resolver();
    var link_index_ts_1 = require_link_index();
    var typed_mind_parser_ts_1 = require_typed_mind_parser();
    var resolveImportsInto = (parser, outcome, filePath) => {
      if (filePath === void 0 || outcome.imports.length === 0) {
        return outcome;
      }
      const resolver = new import_resolver_ts_1.ImportResolver(parser);
      const { resolvedEntities, diagnostics: importDiagnostics } = resolver.resolveImports(outcome.imports, (0, node_path_1.dirname)(filePath));
      const entities = [...outcome.entities, ...resolvedEntities.values()];
      const diagnostics = [...outcome.diagnostics, ...importDiagnostics];
      return { entities, imports: outcome.imports, suppressions: outcome.suppressions, diagnostics };
    };
    var TypedMind2 = class _TypedMind {
      #parser;
      #validator;
      #emitter = new syntax_emitter_ts_1.SyntaxEmitter();
      constructor(parser, validator) {
        this.#parser = parser;
        this.#validator = validator;
      }
      static async create(options = {}) {
        const parser = await typed_mind_parser_ts_1.TypedMindParser.create(options);
        const validator = new ast_validator_ts_1.AstValidator(options.skipOrphanCheck === void 0 ? {} : { skipOrphanCheck: options.skipOrphanCheck });
        return new _TypedMind(parser, validator);
      }
      parse(source, filePath) {
        const outcome = resolveImportsInto(this.#parser, this.#parser.parse(source), filePath);
        const links = (0, link_index_ts_1.computeLinks)(outcome.entities);
        return { ...outcome, links };
      }
      // RFC-TM-5 §1 (rfc-tm-5-diamond.md) — the `parseWithCst` facade extension.
      // Consumers that need the CST (the LSP's NameOccurrenceIndex) get it plus
      // the same links every other new-surface consumer sees, from ONE parse: the
      // TypedMindParser shares its single walked tree between the AST outcome and
      // the returned CST (see typed-mind-parser.ts#parseWithCst). Import
      // resolution merges entities/diagnostics the same way as parse()/check();
      // the returned `cst` stays THIS document's own tree (imported documents are
      // parsed by the resolver via the plain `parse()` DocumentParser contract,
      // never via parseWithCst, so no imported CST exists to attach here).
      parseWithCst(source, filePath) {
        const outcome = this.#parser.parseWithCst(source);
        const merged = resolveImportsInto(this.#parser, outcome, filePath);
        const links = (0, link_index_ts_1.computeLinks)(merged.entities);
        return { ...merged, links, cst: outcome.cst };
      }
      check(source, filePath) {
        const outcome = resolveImportsInto(this.#parser, this.#parser.parse(source), filePath);
        const links = (0, link_index_ts_1.computeLinks)(outcome.entities);
        const { findings } = this.#validator.validate(outcome, links);
        const rawDiagnostics = [...outcome.diagnostics, ...(0, finding_ts_1.toDiagnostics)(findings)];
        const byName = /* @__PURE__ */ new Map();
        for (const entity of outcome.entities) {
          byName.set(entity.name, entity);
        }
        const { diagnostics, suppressedCount } = (0, apply_suppressions_ts_1.applySuppressions)(rawDiagnostics, outcome.suppressions, byName);
        const valid = diagnostics.every((diagnostic) => diagnostic.severity !== "error" || diagnostic.suppression !== void 0);
        return { valid, diagnostics, suppressedCount };
      }
      // RFC-TM-10 §13 (rfc-tm-10-diamond.md, D-LEG-13) — the parse-before-check
      // gate. `check()` above runs the checker unconditionally against whatever
      // the parser produced, even when the parse itself failed (`syntax/error`/
      // `syntax/missing` in `outcome.diagnostics`, syntax-diagnostics.ts). A
      // malformed emission then cascades into a checker-diagnostic storm that
      // has nothing to do with the root parse defect (I-16: the checker never
      // runs against extractor output that fails to parse). `checkWithParseGate`
      // is the thin wrapper: it re-parses via `this.parse()` first, inspects the
      // result for a `syntax/*` code, and skips the checker phase entirely on a
      // parse failure — returning ONLY the syntax diagnostics with `valid:
      // false`. On a parse success it delegates to `check()` unchanged. Disclosed
      // cost: `check()` independently re-runs `resolveImportsInto`/`computeLinks`
      // rather than calling `this.parse()` internally, so a successful gated call
      // parses and resolves imports twice — accepted for the CLI's
      // single-invocation-per-run usage pattern, not a hot path.
      checkWithParseGate(source, filePath) {
        const { diagnostics } = this.parse(source, filePath);
        const syntaxDiagnostics = diagnostics.filter((diagnostic) => diagnostic.code.startsWith("syntax/"));
        if (syntaxDiagnostics.length > 0) {
          return { valid: false, diagnostics: syntaxDiagnostics, suppressedCount: 0 };
        }
        return this.check(source, filePath);
      }
      emitShortform(source) {
        const outcome = this.#parser.parse(source);
        return this.#emitter.emitShortform(outcome);
      }
      emitLongform(source) {
        const outcome = this.#parser.parse(source);
        return this.#emitter.emitLongform(outcome);
      }
      toggleFormat(source) {
        const outcome = this.#parser.parse(source);
        const { format } = (0, detect_format_ts_1.detectFormat)(source);
        return this.#emitter.toggleFormat(outcome, format);
      }
      detectFormat(source) {
        return (0, detect_format_ts_1.detectFormat)(source);
      }
    };
    exports2.TypedMind = TypedMind2;
  }
});

// ../typed-mind/dist/index.js
var require_dist = __commonJS2({
  "../typed-mind/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypedMind = exports2.parseTypeExprText = exports2.LinkIndex = exports2.SyntaxEmitter = exports2.UiComponentNode = exports2.TypeDefNode = exports2.SuppressionNode = exports2.RunParameterNode = exports2.ProgramNode = exports2.ImportStatementNode = exports2.CstSourceFile = exports2.CstNode = exports2.FunctionNode = exports2.FileNode = exports2.EntityNode = exports2.DtoNode = exports2.DtoFieldNode = exports2.DependencyNode = exports2.ConstantsNode = exports2.ClassNode = exports2.ClassFileNode = exports2.AssetNode = void 0;
    var asset_node_ts_1 = require_asset_node();
    Object.defineProperty(exports2, "AssetNode", { enumerable: true, get: function() {
      return asset_node_ts_1.AssetNode;
    } });
    var class_file_node_ts_1 = require_class_file_node();
    Object.defineProperty(exports2, "ClassFileNode", { enumerable: true, get: function() {
      return class_file_node_ts_1.ClassFileNode;
    } });
    var class_node_ts_1 = require_class_node();
    Object.defineProperty(exports2, "ClassNode", { enumerable: true, get: function() {
      return class_node_ts_1.ClassNode;
    } });
    var constants_node_ts_1 = require_constants_node();
    Object.defineProperty(exports2, "ConstantsNode", { enumerable: true, get: function() {
      return constants_node_ts_1.ConstantsNode;
    } });
    var dependency_node_ts_1 = require_dependency_node();
    Object.defineProperty(exports2, "DependencyNode", { enumerable: true, get: function() {
      return dependency_node_ts_1.DependencyNode;
    } });
    var dto_field_node_ts_1 = require_dto_field_node();
    Object.defineProperty(exports2, "DtoFieldNode", { enumerable: true, get: function() {
      return dto_field_node_ts_1.DtoFieldNode;
    } });
    var dto_node_ts_1 = require_dto_node();
    Object.defineProperty(exports2, "DtoNode", { enumerable: true, get: function() {
      return dto_node_ts_1.DtoNode;
    } });
    var entity_node_ts_1 = require_entity_node();
    Object.defineProperty(exports2, "EntityNode", { enumerable: true, get: function() {
      return entity_node_ts_1.EntityNode;
    } });
    var file_node_ts_1 = require_file_node();
    Object.defineProperty(exports2, "FileNode", { enumerable: true, get: function() {
      return file_node_ts_1.FileNode;
    } });
    var function_node_ts_1 = require_function_node();
    Object.defineProperty(exports2, "FunctionNode", { enumerable: true, get: function() {
      return function_node_ts_1.FunctionNode;
    } });
    var cst_nodes_ts_1 = require_cst_nodes();
    Object.defineProperty(exports2, "CstNode", { enumerable: true, get: function() {
      return cst_nodes_ts_1.CstNode;
    } });
    Object.defineProperty(exports2, "CstSourceFile", { enumerable: true, get: function() {
      return cst_nodes_ts_1.CstSourceFile;
    } });
    var import_statement_node_ts_1 = require_import_statement_node();
    Object.defineProperty(exports2, "ImportStatementNode", { enumerable: true, get: function() {
      return import_statement_node_ts_1.ImportStatementNode;
    } });
    var program_node_ts_1 = require_program_node();
    Object.defineProperty(exports2, "ProgramNode", { enumerable: true, get: function() {
      return program_node_ts_1.ProgramNode;
    } });
    var run_parameter_node_ts_1 = require_run_parameter_node();
    Object.defineProperty(exports2, "RunParameterNode", { enumerable: true, get: function() {
      return run_parameter_node_ts_1.RunParameterNode;
    } });
    var suppression_node_ts_1 = require_suppression_node();
    Object.defineProperty(exports2, "SuppressionNode", { enumerable: true, get: function() {
      return suppression_node_ts_1.SuppressionNode;
    } });
    var type_def_node_ts_1 = require_type_def_node();
    Object.defineProperty(exports2, "TypeDefNode", { enumerable: true, get: function() {
      return type_def_node_ts_1.TypeDefNode;
    } });
    var ui_component_node_ts_1 = require_ui_component_node();
    Object.defineProperty(exports2, "UiComponentNode", { enumerable: true, get: function() {
      return ui_component_node_ts_1.UiComponentNode;
    } });
    var syntax_emitter_ts_1 = require_syntax_emitter();
    Object.defineProperty(exports2, "SyntaxEmitter", { enumerable: true, get: function() {
      return syntax_emitter_ts_1.SyntaxEmitter;
    } });
    var link_index_ts_1 = require_link_index();
    Object.defineProperty(exports2, "LinkIndex", { enumerable: true, get: function() {
      return link_index_ts_1.LinkIndex;
    } });
    var type_expr_from_text_ts_1 = require_type_expr_from_text();
    Object.defineProperty(exports2, "parseTypeExprText", { enumerable: true, get: function() {
      return type_expr_from_text_ts_1.parseTypeExprText;
    } });
    var typed_mind_ts_1 = require_typed_mind();
    Object.defineProperty(exports2, "TypedMind", { enumerable: true, get: function() {
      return typed_mind_ts_1.TypedMind;
    } });
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/utils/is.js
var require_is = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/utils/is.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.thenable = exports2.typedArray = exports2.stringArray = exports2.array = exports2.func = exports2.error = exports2.number = exports2.string = exports2.boolean = void 0;
    function boolean(value) {
      return value === true || value === false;
    }
    exports2.boolean = boolean;
    function string(value) {
      return typeof value === "string" || value instanceof String;
    }
    exports2.string = string;
    function number(value) {
      return typeof value === "number" || value instanceof Number;
    }
    exports2.number = number;
    function error(value) {
      return value instanceof Error;
    }
    exports2.error = error;
    function func2(value) {
      return typeof value === "function";
    }
    exports2.func = func2;
    function array(value) {
      return Array.isArray(value);
    }
    exports2.array = array;
    function stringArray(value) {
      return array(value) && value.every((elem) => string(elem));
    }
    exports2.stringArray = stringArray;
    function typedArray(value, check) {
      return Array.isArray(value) && value.every(check);
    }
    exports2.typedArray = typedArray;
    function thenable(value) {
      return value && func2(value.then);
    }
    exports2.thenable = thenable;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/is.js
var require_is2 = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/is.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.stringArray = exports2.array = exports2.func = exports2.error = exports2.number = exports2.string = exports2.boolean = void 0;
    function boolean(value) {
      return value === true || value === false;
    }
    exports2.boolean = boolean;
    function string(value) {
      return typeof value === "string" || value instanceof String;
    }
    exports2.string = string;
    function number(value) {
      return typeof value === "number" || value instanceof Number;
    }
    exports2.number = number;
    function error(value) {
      return value instanceof Error;
    }
    exports2.error = error;
    function func2(value) {
      return typeof value === "function";
    }
    exports2.func = func2;
    function array(value) {
      return Array.isArray(value);
    }
    exports2.array = array;
    function stringArray(value) {
      return array(value) && value.every((elem) => string(elem));
    }
    exports2.stringArray = stringArray;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messages.js
var require_messages = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Message = exports2.NotificationType9 = exports2.NotificationType8 = exports2.NotificationType7 = exports2.NotificationType6 = exports2.NotificationType5 = exports2.NotificationType4 = exports2.NotificationType3 = exports2.NotificationType2 = exports2.NotificationType1 = exports2.NotificationType0 = exports2.NotificationType = exports2.RequestType9 = exports2.RequestType8 = exports2.RequestType7 = exports2.RequestType6 = exports2.RequestType5 = exports2.RequestType4 = exports2.RequestType3 = exports2.RequestType2 = exports2.RequestType1 = exports2.RequestType = exports2.RequestType0 = exports2.AbstractMessageSignature = exports2.ParameterStructures = exports2.ResponseError = exports2.ErrorCodes = void 0;
    var is = require_is2();
    var ErrorCodes;
    (function(ErrorCodes2) {
      ErrorCodes2.ParseError = -32700;
      ErrorCodes2.InvalidRequest = -32600;
      ErrorCodes2.MethodNotFound = -32601;
      ErrorCodes2.InvalidParams = -32602;
      ErrorCodes2.InternalError = -32603;
      ErrorCodes2.jsonrpcReservedErrorRangeStart = -32099;
      ErrorCodes2.serverErrorStart = -32099;
      ErrorCodes2.MessageWriteError = -32099;
      ErrorCodes2.MessageReadError = -32098;
      ErrorCodes2.PendingResponseRejected = -32097;
      ErrorCodes2.ConnectionInactive = -32096;
      ErrorCodes2.ServerNotInitialized = -32002;
      ErrorCodes2.UnknownErrorCode = -32001;
      ErrorCodes2.jsonrpcReservedErrorRangeEnd = -32e3;
      ErrorCodes2.serverErrorEnd = -32e3;
    })(ErrorCodes || (exports2.ErrorCodes = ErrorCodes = {}));
    var ResponseError = class _ResponseError extends Error {
      constructor(code, message, data) {
        super(message);
        this.code = is.number(code) ? code : ErrorCodes.UnknownErrorCode;
        this.data = data;
        Object.setPrototypeOf(this, _ResponseError.prototype);
      }
      toJson() {
        const result = {
          code: this.code,
          message: this.message
        };
        if (this.data !== void 0) {
          result.data = this.data;
        }
        return result;
      }
    };
    exports2.ResponseError = ResponseError;
    var ParameterStructures = class _ParameterStructures {
      constructor(kind) {
        this.kind = kind;
      }
      static is(value) {
        return value === _ParameterStructures.auto || value === _ParameterStructures.byName || value === _ParameterStructures.byPosition;
      }
      toString() {
        return this.kind;
      }
    };
    exports2.ParameterStructures = ParameterStructures;
    ParameterStructures.auto = new ParameterStructures("auto");
    ParameterStructures.byPosition = new ParameterStructures("byPosition");
    ParameterStructures.byName = new ParameterStructures("byName");
    var AbstractMessageSignature = class {
      constructor(method, numberOfParams) {
        this.method = method;
        this.numberOfParams = numberOfParams;
      }
      get parameterStructures() {
        return ParameterStructures.auto;
      }
    };
    exports2.AbstractMessageSignature = AbstractMessageSignature;
    var RequestType0 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 0);
      }
    };
    exports2.RequestType0 = RequestType0;
    var RequestType = class extends AbstractMessageSignature {
      constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
      }
      get parameterStructures() {
        return this._parameterStructures;
      }
    };
    exports2.RequestType = RequestType;
    var RequestType1 = class extends AbstractMessageSignature {
      constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
      }
      get parameterStructures() {
        return this._parameterStructures;
      }
    };
    exports2.RequestType1 = RequestType1;
    var RequestType2 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 2);
      }
    };
    exports2.RequestType2 = RequestType2;
    var RequestType3 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 3);
      }
    };
    exports2.RequestType3 = RequestType3;
    var RequestType4 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 4);
      }
    };
    exports2.RequestType4 = RequestType4;
    var RequestType5 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 5);
      }
    };
    exports2.RequestType5 = RequestType5;
    var RequestType6 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 6);
      }
    };
    exports2.RequestType6 = RequestType6;
    var RequestType7 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 7);
      }
    };
    exports2.RequestType7 = RequestType7;
    var RequestType8 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 8);
      }
    };
    exports2.RequestType8 = RequestType8;
    var RequestType9 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 9);
      }
    };
    exports2.RequestType9 = RequestType9;
    var NotificationType = class extends AbstractMessageSignature {
      constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
      }
      get parameterStructures() {
        return this._parameterStructures;
      }
    };
    exports2.NotificationType = NotificationType;
    var NotificationType0 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 0);
      }
    };
    exports2.NotificationType0 = NotificationType0;
    var NotificationType1 = class extends AbstractMessageSignature {
      constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
      }
      get parameterStructures() {
        return this._parameterStructures;
      }
    };
    exports2.NotificationType1 = NotificationType1;
    var NotificationType2 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 2);
      }
    };
    exports2.NotificationType2 = NotificationType2;
    var NotificationType3 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 3);
      }
    };
    exports2.NotificationType3 = NotificationType3;
    var NotificationType4 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 4);
      }
    };
    exports2.NotificationType4 = NotificationType4;
    var NotificationType5 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 5);
      }
    };
    exports2.NotificationType5 = NotificationType5;
    var NotificationType6 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 6);
      }
    };
    exports2.NotificationType6 = NotificationType6;
    var NotificationType7 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 7);
      }
    };
    exports2.NotificationType7 = NotificationType7;
    var NotificationType8 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 8);
      }
    };
    exports2.NotificationType8 = NotificationType8;
    var NotificationType9 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 9);
      }
    };
    exports2.NotificationType9 = NotificationType9;
    var Message;
    (function(Message2) {
      function isRequest(message) {
        const candidate = message;
        return candidate && is.string(candidate.method) && (is.string(candidate.id) || is.number(candidate.id));
      }
      Message2.isRequest = isRequest;
      function isNotification(message) {
        const candidate = message;
        return candidate && is.string(candidate.method) && message.id === void 0;
      }
      Message2.isNotification = isNotification;
      function isResponse(message) {
        const candidate = message;
        return candidate && (candidate.result !== void 0 || !!candidate.error) && (is.string(candidate.id) || is.number(candidate.id) || candidate.id === null);
      }
      Message2.isResponse = isResponse;
    })(Message || (exports2.Message = Message = {}));
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/linkedMap.js
var require_linkedMap = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/linkedMap.js"(exports2) {
    "use strict";
    var _a;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LRUCache = exports2.LinkedMap = exports2.Touch = void 0;
    var Touch;
    (function(Touch2) {
      Touch2.None = 0;
      Touch2.First = 1;
      Touch2.AsOld = Touch2.First;
      Touch2.Last = 2;
      Touch2.AsNew = Touch2.Last;
    })(Touch || (exports2.Touch = Touch = {}));
    var LinkedMap = class {
      constructor() {
        this[_a] = "LinkedMap";
        this._map = /* @__PURE__ */ new Map();
        this._head = void 0;
        this._tail = void 0;
        this._size = 0;
        this._state = 0;
      }
      clear() {
        this._map.clear();
        this._head = void 0;
        this._tail = void 0;
        this._size = 0;
        this._state++;
      }
      isEmpty() {
        return !this._head && !this._tail;
      }
      get size() {
        return this._size;
      }
      get first() {
        return this._head?.value;
      }
      get last() {
        return this._tail?.value;
      }
      has(key) {
        return this._map.has(key);
      }
      get(key, touch = Touch.None) {
        const item = this._map.get(key);
        if (!item) {
          return void 0;
        }
        if (touch !== Touch.None) {
          this.touch(item, touch);
        }
        return item.value;
      }
      set(key, value, touch = Touch.None) {
        let item = this._map.get(key);
        if (item) {
          item.value = value;
          if (touch !== Touch.None) {
            this.touch(item, touch);
          }
        } else {
          item = { key, value, next: void 0, previous: void 0 };
          switch (touch) {
            case Touch.None:
              this.addItemLast(item);
              break;
            case Touch.First:
              this.addItemFirst(item);
              break;
            case Touch.Last:
              this.addItemLast(item);
              break;
            default:
              this.addItemLast(item);
              break;
          }
          this._map.set(key, item);
          this._size++;
        }
        return this;
      }
      delete(key) {
        return !!this.remove(key);
      }
      remove(key) {
        const item = this._map.get(key);
        if (!item) {
          return void 0;
        }
        this._map.delete(key);
        this.removeItem(item);
        this._size--;
        return item.value;
      }
      shift() {
        if (!this._head && !this._tail) {
          return void 0;
        }
        if (!this._head || !this._tail) {
          throw new Error("Invalid list");
        }
        const item = this._head;
        this._map.delete(item.key);
        this.removeItem(item);
        this._size--;
        return item.value;
      }
      forEach(callbackfn, thisArg) {
        const state = this._state;
        let current = this._head;
        while (current) {
          if (thisArg) {
            callbackfn.bind(thisArg)(current.value, current.key, this);
          } else {
            callbackfn(current.value, current.key, this);
          }
          if (this._state !== state) {
            throw new Error(`LinkedMap got modified during iteration.`);
          }
          current = current.next;
        }
      }
      keys() {
        const state = this._state;
        let current = this._head;
        const iterator = {
          [Symbol.iterator]: () => {
            return iterator;
          },
          next: () => {
            if (this._state !== state) {
              throw new Error(`LinkedMap got modified during iteration.`);
            }
            if (current) {
              const result = { value: current.key, done: false };
              current = current.next;
              return result;
            } else {
              return { value: void 0, done: true };
            }
          }
        };
        return iterator;
      }
      values() {
        const state = this._state;
        let current = this._head;
        const iterator = {
          [Symbol.iterator]: () => {
            return iterator;
          },
          next: () => {
            if (this._state !== state) {
              throw new Error(`LinkedMap got modified during iteration.`);
            }
            if (current) {
              const result = { value: current.value, done: false };
              current = current.next;
              return result;
            } else {
              return { value: void 0, done: true };
            }
          }
        };
        return iterator;
      }
      entries() {
        const state = this._state;
        let current = this._head;
        const iterator = {
          [Symbol.iterator]: () => {
            return iterator;
          },
          next: () => {
            if (this._state !== state) {
              throw new Error(`LinkedMap got modified during iteration.`);
            }
            if (current) {
              const result = { value: [current.key, current.value], done: false };
              current = current.next;
              return result;
            } else {
              return { value: void 0, done: true };
            }
          }
        };
        return iterator;
      }
      [(_a = Symbol.toStringTag, Symbol.iterator)]() {
        return this.entries();
      }
      trimOld(newSize) {
        if (newSize >= this.size) {
          return;
        }
        if (newSize === 0) {
          this.clear();
          return;
        }
        let current = this._head;
        let currentSize = this.size;
        while (current && currentSize > newSize) {
          this._map.delete(current.key);
          current = current.next;
          currentSize--;
        }
        this._head = current;
        this._size = currentSize;
        if (current) {
          current.previous = void 0;
        }
        this._state++;
      }
      addItemFirst(item) {
        if (!this._head && !this._tail) {
          this._tail = item;
        } else if (!this._head) {
          throw new Error("Invalid list");
        } else {
          item.next = this._head;
          this._head.previous = item;
        }
        this._head = item;
        this._state++;
      }
      addItemLast(item) {
        if (!this._head && !this._tail) {
          this._head = item;
        } else if (!this._tail) {
          throw new Error("Invalid list");
        } else {
          item.previous = this._tail;
          this._tail.next = item;
        }
        this._tail = item;
        this._state++;
      }
      removeItem(item) {
        if (item === this._head && item === this._tail) {
          this._head = void 0;
          this._tail = void 0;
        } else if (item === this._head) {
          if (!item.next) {
            throw new Error("Invalid list");
          }
          item.next.previous = void 0;
          this._head = item.next;
        } else if (item === this._tail) {
          if (!item.previous) {
            throw new Error("Invalid list");
          }
          item.previous.next = void 0;
          this._tail = item.previous;
        } else {
          const next = item.next;
          const previous = item.previous;
          if (!next || !previous) {
            throw new Error("Invalid list");
          }
          next.previous = previous;
          previous.next = next;
        }
        item.next = void 0;
        item.previous = void 0;
        this._state++;
      }
      touch(item, touch) {
        if (!this._head || !this._tail) {
          throw new Error("Invalid list");
        }
        if (touch !== Touch.First && touch !== Touch.Last) {
          return;
        }
        if (touch === Touch.First) {
          if (item === this._head) {
            return;
          }
          const next = item.next;
          const previous = item.previous;
          if (item === this._tail) {
            previous.next = void 0;
            this._tail = previous;
          } else {
            next.previous = previous;
            previous.next = next;
          }
          item.previous = void 0;
          item.next = this._head;
          this._head.previous = item;
          this._head = item;
          this._state++;
        } else if (touch === Touch.Last) {
          if (item === this._tail) {
            return;
          }
          const next = item.next;
          const previous = item.previous;
          if (item === this._head) {
            next.previous = void 0;
            this._head = next;
          } else {
            next.previous = previous;
            previous.next = next;
          }
          item.next = void 0;
          item.previous = this._tail;
          this._tail.next = item;
          this._tail = item;
          this._state++;
        }
      }
      toJSON() {
        const data = [];
        this.forEach((value, key) => {
          data.push([key, value]);
        });
        return data;
      }
      fromJSON(data) {
        this.clear();
        for (const [key, value] of data) {
          this.set(key, value);
        }
      }
    };
    exports2.LinkedMap = LinkedMap;
    var LRUCache = class extends LinkedMap {
      constructor(limit, ratio = 1) {
        super();
        this._limit = limit;
        this._ratio = Math.min(Math.max(0, ratio), 1);
      }
      get limit() {
        return this._limit;
      }
      set limit(limit) {
        this._limit = limit;
        this.checkTrim();
      }
      get ratio() {
        return this._ratio;
      }
      set ratio(ratio) {
        this._ratio = Math.min(Math.max(0, ratio), 1);
        this.checkTrim();
      }
      get(key, touch = Touch.AsNew) {
        return super.get(key, touch);
      }
      peek(key) {
        return super.get(key, Touch.None);
      }
      set(key, value) {
        super.set(key, value, Touch.Last);
        this.checkTrim();
        return this;
      }
      checkTrim() {
        if (this.size > this._limit) {
          this.trimOld(Math.round(this._limit * this._ratio));
        }
      }
    };
    exports2.LRUCache = LRUCache;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/disposable.js
var require_disposable = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/disposable.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Disposable = void 0;
    var Disposable;
    (function(Disposable2) {
      function create(func2) {
        return {
          dispose: func2
        };
      }
      Disposable2.create = create;
    })(Disposable || (exports2.Disposable = Disposable = {}));
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/ral.js
var require_ral = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/ral.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _ral;
    function RAL() {
      if (_ral === void 0) {
        throw new Error(`No runtime abstraction layer installed`);
      }
      return _ral;
    }
    (function(RAL2) {
      function install(ral) {
        if (ral === void 0) {
          throw new Error(`No runtime abstraction layer provided`);
        }
        _ral = ral;
      }
      RAL2.install = install;
    })(RAL || (RAL = {}));
    exports2.default = RAL;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/events.js
var require_events = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/events.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Emitter = exports2.Event = void 0;
    var ral_1 = require_ral();
    var Event;
    (function(Event2) {
      const _disposable = { dispose() {
      } };
      Event2.None = function() {
        return _disposable;
      };
    })(Event || (exports2.Event = Event = {}));
    var CallbackList = class {
      add(callback, context = null, bucket) {
        if (!this._callbacks) {
          this._callbacks = [];
          this._contexts = [];
        }
        this._callbacks.push(callback);
        this._contexts.push(context);
        if (Array.isArray(bucket)) {
          bucket.push({ dispose: () => this.remove(callback, context) });
        }
      }
      remove(callback, context = null) {
        if (!this._callbacks) {
          return;
        }
        let foundCallbackWithDifferentContext = false;
        for (let i2 = 0, len = this._callbacks.length; i2 < len; i2++) {
          if (this._callbacks[i2] === callback) {
            if (this._contexts[i2] === context) {
              this._callbacks.splice(i2, 1);
              this._contexts.splice(i2, 1);
              return;
            } else {
              foundCallbackWithDifferentContext = true;
            }
          }
        }
        if (foundCallbackWithDifferentContext) {
          throw new Error("When adding a listener with a context, you should remove it with the same context");
        }
      }
      invoke(...args2) {
        if (!this._callbacks) {
          return [];
        }
        const ret = [], callbacks = this._callbacks.slice(0), contexts = this._contexts.slice(0);
        for (let i2 = 0, len = callbacks.length; i2 < len; i2++) {
          try {
            ret.push(callbacks[i2].apply(contexts[i2], args2));
          } catch (e) {
            (0, ral_1.default)().console.error(e);
          }
        }
        return ret;
      }
      isEmpty() {
        return !this._callbacks || this._callbacks.length === 0;
      }
      dispose() {
        this._callbacks = void 0;
        this._contexts = void 0;
      }
    };
    var Emitter = class _Emitter {
      constructor(_options) {
        this._options = _options;
      }
      /**
       * For the public to allow to subscribe
       * to events from this Emitter
       */
      get event() {
        if (!this._event) {
          this._event = (listener, thisArgs, disposables) => {
            if (!this._callbacks) {
              this._callbacks = new CallbackList();
            }
            if (this._options && this._options.onFirstListenerAdd && this._callbacks.isEmpty()) {
              this._options.onFirstListenerAdd(this);
            }
            this._callbacks.add(listener, thisArgs);
            const result = {
              dispose: () => {
                if (!this._callbacks) {
                  return;
                }
                this._callbacks.remove(listener, thisArgs);
                result.dispose = _Emitter._noop;
                if (this._options && this._options.onLastListenerRemove && this._callbacks.isEmpty()) {
                  this._options.onLastListenerRemove(this);
                }
              }
            };
            if (Array.isArray(disposables)) {
              disposables.push(result);
            }
            return result;
          };
        }
        return this._event;
      }
      /**
       * To be kept private to fire an event to
       * subscribers
       */
      fire(event) {
        if (this._callbacks) {
          this._callbacks.invoke.call(this._callbacks, event);
        }
      }
      dispose() {
        if (this._callbacks) {
          this._callbacks.dispose();
          this._callbacks = void 0;
        }
      }
    };
    exports2.Emitter = Emitter;
    Emitter._noop = function() {
    };
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/cancellation.js
var require_cancellation = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/cancellation.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CancellationTokenSource = exports2.CancellationToken = void 0;
    var ral_1 = require_ral();
    var Is = require_is2();
    var events_1 = require_events();
    var CancellationToken;
    (function(CancellationToken2) {
      CancellationToken2.None = Object.freeze({
        isCancellationRequested: false,
        onCancellationRequested: events_1.Event.None
      });
      CancellationToken2.Cancelled = Object.freeze({
        isCancellationRequested: true,
        onCancellationRequested: events_1.Event.None
      });
      function is(value) {
        const candidate = value;
        return candidate && (candidate === CancellationToken2.None || candidate === CancellationToken2.Cancelled || Is.boolean(candidate.isCancellationRequested) && !!candidate.onCancellationRequested);
      }
      CancellationToken2.is = is;
    })(CancellationToken || (exports2.CancellationToken = CancellationToken = {}));
    var shortcutEvent = Object.freeze(function(callback, context) {
      const handle2 = (0, ral_1.default)().timer.setTimeout(callback.bind(context), 0);
      return { dispose() {
        handle2.dispose();
      } };
    });
    var MutableToken = class {
      constructor() {
        this._isCancelled = false;
      }
      cancel() {
        if (!this._isCancelled) {
          this._isCancelled = true;
          if (this._emitter) {
            this._emitter.fire(void 0);
            this.dispose();
          }
        }
      }
      get isCancellationRequested() {
        return this._isCancelled;
      }
      get onCancellationRequested() {
        if (this._isCancelled) {
          return shortcutEvent;
        }
        if (!this._emitter) {
          this._emitter = new events_1.Emitter();
        }
        return this._emitter.event;
      }
      dispose() {
        if (this._emitter) {
          this._emitter.dispose();
          this._emitter = void 0;
        }
      }
    };
    var CancellationTokenSource = class {
      get token() {
        if (!this._token) {
          this._token = new MutableToken();
        }
        return this._token;
      }
      cancel() {
        if (!this._token) {
          this._token = CancellationToken.Cancelled;
        } else {
          this._token.cancel();
        }
      }
      dispose() {
        if (!this._token) {
          this._token = CancellationToken.None;
        } else if (this._token instanceof MutableToken) {
          this._token.dispose();
        }
      }
    };
    exports2.CancellationTokenSource = CancellationTokenSource;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/sharedArrayCancellation.js
var require_sharedArrayCancellation = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/sharedArrayCancellation.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SharedArrayReceiverStrategy = exports2.SharedArraySenderStrategy = void 0;
    var cancellation_1 = require_cancellation();
    var CancellationState;
    (function(CancellationState2) {
      CancellationState2.Continue = 0;
      CancellationState2.Cancelled = 1;
    })(CancellationState || (CancellationState = {}));
    var SharedArraySenderStrategy = class {
      constructor() {
        this.buffers = /* @__PURE__ */ new Map();
      }
      enableCancellation(request) {
        if (request.id === null) {
          return;
        }
        const buffer = new SharedArrayBuffer(4);
        const data = new Int32Array(buffer, 0, 1);
        data[0] = CancellationState.Continue;
        this.buffers.set(request.id, buffer);
        request.$cancellationData = buffer;
      }
      async sendCancellation(_conn, id) {
        const buffer = this.buffers.get(id);
        if (buffer === void 0) {
          return;
        }
        const data = new Int32Array(buffer, 0, 1);
        Atomics.store(data, 0, CancellationState.Cancelled);
      }
      cleanup(id) {
        this.buffers.delete(id);
      }
      dispose() {
        this.buffers.clear();
      }
    };
    exports2.SharedArraySenderStrategy = SharedArraySenderStrategy;
    var SharedArrayBufferCancellationToken = class {
      constructor(buffer) {
        this.data = new Int32Array(buffer, 0, 1);
      }
      get isCancellationRequested() {
        return Atomics.load(this.data, 0) === CancellationState.Cancelled;
      }
      get onCancellationRequested() {
        throw new Error(`Cancellation over SharedArrayBuffer doesn't support cancellation events`);
      }
    };
    var SharedArrayBufferCancellationTokenSource = class {
      constructor(buffer) {
        this.token = new SharedArrayBufferCancellationToken(buffer);
      }
      cancel() {
      }
      dispose() {
      }
    };
    var SharedArrayReceiverStrategy = class {
      constructor() {
        this.kind = "request";
      }
      createCancellationTokenSource(request) {
        const buffer = request.$cancellationData;
        if (buffer === void 0) {
          return new cancellation_1.CancellationTokenSource();
        }
        return new SharedArrayBufferCancellationTokenSource(buffer);
      }
    };
    exports2.SharedArrayReceiverStrategy = SharedArrayReceiverStrategy;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/semaphore.js
var require_semaphore = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/semaphore.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Semaphore = void 0;
    var ral_1 = require_ral();
    var Semaphore = class {
      constructor(capacity = 1) {
        if (capacity <= 0) {
          throw new Error("Capacity must be greater than 0");
        }
        this._capacity = capacity;
        this._active = 0;
        this._waiting = [];
      }
      lock(thunk) {
        return new Promise((resolve, reject) => {
          this._waiting.push({ thunk, resolve, reject });
          this.runNext();
        });
      }
      get active() {
        return this._active;
      }
      runNext() {
        if (this._waiting.length === 0 || this._active === this._capacity) {
          return;
        }
        (0, ral_1.default)().timer.setImmediate(() => this.doRunNext());
      }
      doRunNext() {
        if (this._waiting.length === 0 || this._active === this._capacity) {
          return;
        }
        const next = this._waiting.shift();
        this._active++;
        if (this._active > this._capacity) {
          throw new Error(`To many thunks active`);
        }
        try {
          const result = next.thunk();
          if (result instanceof Promise) {
            result.then((value) => {
              this._active--;
              next.resolve(value);
              this.runNext();
            }, (err2) => {
              this._active--;
              next.reject(err2);
              this.runNext();
            });
          } else {
            this._active--;
            next.resolve(result);
            this.runNext();
          }
        } catch (err2) {
          this._active--;
          next.reject(err2);
          this.runNext();
        }
      }
    };
    exports2.Semaphore = Semaphore;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messageReader.js
var require_messageReader = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messageReader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReadableStreamMessageReader = exports2.AbstractMessageReader = exports2.MessageReader = void 0;
    var ral_1 = require_ral();
    var Is = require_is2();
    var events_1 = require_events();
    var semaphore_1 = require_semaphore();
    var MessageReader;
    (function(MessageReader2) {
      function is(value) {
        let candidate = value;
        return candidate && Is.func(candidate.listen) && Is.func(candidate.dispose) && Is.func(candidate.onError) && Is.func(candidate.onClose) && Is.func(candidate.onPartialMessage);
      }
      MessageReader2.is = is;
    })(MessageReader || (exports2.MessageReader = MessageReader = {}));
    var AbstractMessageReader = class {
      constructor() {
        this.errorEmitter = new events_1.Emitter();
        this.closeEmitter = new events_1.Emitter();
        this.partialMessageEmitter = new events_1.Emitter();
      }
      dispose() {
        this.errorEmitter.dispose();
        this.closeEmitter.dispose();
      }
      get onError() {
        return this.errorEmitter.event;
      }
      fireError(error) {
        this.errorEmitter.fire(this.asError(error));
      }
      get onClose() {
        return this.closeEmitter.event;
      }
      fireClose() {
        this.closeEmitter.fire(void 0);
      }
      get onPartialMessage() {
        return this.partialMessageEmitter.event;
      }
      firePartialMessage(info2) {
        this.partialMessageEmitter.fire(info2);
      }
      asError(error) {
        if (error instanceof Error) {
          return error;
        } else {
          return new Error(`Reader received error. Reason: ${Is.string(error.message) ? error.message : "unknown"}`);
        }
      }
    };
    exports2.AbstractMessageReader = AbstractMessageReader;
    var ResolvedMessageReaderOptions;
    (function(ResolvedMessageReaderOptions2) {
      function fromOptions(options) {
        let charset;
        let result;
        let contentDecoder;
        const contentDecoders = /* @__PURE__ */ new Map();
        let contentTypeDecoder;
        const contentTypeDecoders = /* @__PURE__ */ new Map();
        if (options === void 0 || typeof options === "string") {
          charset = options ?? "utf-8";
        } else {
          charset = options.charset ?? "utf-8";
          if (options.contentDecoder !== void 0) {
            contentDecoder = options.contentDecoder;
            contentDecoders.set(contentDecoder.name, contentDecoder);
          }
          if (options.contentDecoders !== void 0) {
            for (const decoder of options.contentDecoders) {
              contentDecoders.set(decoder.name, decoder);
            }
          }
          if (options.contentTypeDecoder !== void 0) {
            contentTypeDecoder = options.contentTypeDecoder;
            contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
          }
          if (options.contentTypeDecoders !== void 0) {
            for (const decoder of options.contentTypeDecoders) {
              contentTypeDecoders.set(decoder.name, decoder);
            }
          }
        }
        if (contentTypeDecoder === void 0) {
          contentTypeDecoder = (0, ral_1.default)().applicationJson.decoder;
          contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
        }
        return { charset, contentDecoder, contentDecoders, contentTypeDecoder, contentTypeDecoders };
      }
      ResolvedMessageReaderOptions2.fromOptions = fromOptions;
    })(ResolvedMessageReaderOptions || (ResolvedMessageReaderOptions = {}));
    var ReadableStreamMessageReader = class extends AbstractMessageReader {
      constructor(readable, options) {
        super();
        this.readable = readable;
        this.options = ResolvedMessageReaderOptions.fromOptions(options);
        this.buffer = (0, ral_1.default)().messageBuffer.create(this.options.charset);
        this._partialMessageTimeout = 1e4;
        this.nextMessageLength = -1;
        this.messageToken = 0;
        this.readSemaphore = new semaphore_1.Semaphore(1);
      }
      set partialMessageTimeout(timeout) {
        this._partialMessageTimeout = timeout;
      }
      get partialMessageTimeout() {
        return this._partialMessageTimeout;
      }
      listen(callback) {
        this.nextMessageLength = -1;
        this.messageToken = 0;
        this.partialMessageTimer = void 0;
        this.callback = callback;
        const result = this.readable.onData((data) => {
          this.onData(data);
        });
        this.readable.onError((error) => this.fireError(error));
        this.readable.onClose(() => this.fireClose());
        return result;
      }
      onData(data) {
        try {
          this.buffer.append(data);
          while (true) {
            if (this.nextMessageLength === -1) {
              const headers = this.buffer.tryReadHeaders(true);
              if (!headers) {
                return;
              }
              const contentLength = headers.get("content-length");
              if (!contentLength) {
                this.fireError(new Error(`Header must provide a Content-Length property.
${JSON.stringify(Object.fromEntries(headers))}`));
                return;
              }
              const length = parseInt(contentLength);
              if (isNaN(length)) {
                this.fireError(new Error(`Content-Length value must be a number. Got ${contentLength}`));
                return;
              }
              this.nextMessageLength = length;
            }
            const body2 = this.buffer.tryReadBody(this.nextMessageLength);
            if (body2 === void 0) {
              this.setPartialMessageTimer();
              return;
            }
            this.clearPartialMessageTimer();
            this.nextMessageLength = -1;
            this.readSemaphore.lock(async () => {
              const bytes = this.options.contentDecoder !== void 0 ? await this.options.contentDecoder.decode(body2) : body2;
              const message = await this.options.contentTypeDecoder.decode(bytes, this.options);
              this.callback(message);
            }).catch((error) => {
              this.fireError(error);
            });
          }
        } catch (error) {
          this.fireError(error);
        }
      }
      clearPartialMessageTimer() {
        if (this.partialMessageTimer) {
          this.partialMessageTimer.dispose();
          this.partialMessageTimer = void 0;
        }
      }
      setPartialMessageTimer() {
        this.clearPartialMessageTimer();
        if (this._partialMessageTimeout <= 0) {
          return;
        }
        this.partialMessageTimer = (0, ral_1.default)().timer.setTimeout((token, timeout) => {
          this.partialMessageTimer = void 0;
          if (token === this.messageToken) {
            this.firePartialMessage({ messageToken: token, waitingTime: timeout });
            this.setPartialMessageTimer();
          }
        }, this._partialMessageTimeout, this.messageToken, this._partialMessageTimeout);
      }
    };
    exports2.ReadableStreamMessageReader = ReadableStreamMessageReader;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messageWriter.js
var require_messageWriter = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messageWriter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WriteableStreamMessageWriter = exports2.AbstractMessageWriter = exports2.MessageWriter = void 0;
    var ral_1 = require_ral();
    var Is = require_is2();
    var semaphore_1 = require_semaphore();
    var events_1 = require_events();
    var ContentLength = "Content-Length: ";
    var CRLF = "\r\n";
    var MessageWriter;
    (function(MessageWriter2) {
      function is(value) {
        let candidate = value;
        return candidate && Is.func(candidate.dispose) && Is.func(candidate.onClose) && Is.func(candidate.onError) && Is.func(candidate.write);
      }
      MessageWriter2.is = is;
    })(MessageWriter || (exports2.MessageWriter = MessageWriter = {}));
    var AbstractMessageWriter = class {
      constructor() {
        this.errorEmitter = new events_1.Emitter();
        this.closeEmitter = new events_1.Emitter();
      }
      dispose() {
        this.errorEmitter.dispose();
        this.closeEmitter.dispose();
      }
      get onError() {
        return this.errorEmitter.event;
      }
      fireError(error, message, count) {
        this.errorEmitter.fire([this.asError(error), message, count]);
      }
      get onClose() {
        return this.closeEmitter.event;
      }
      fireClose() {
        this.closeEmitter.fire(void 0);
      }
      asError(error) {
        if (error instanceof Error) {
          return error;
        } else {
          return new Error(`Writer received error. Reason: ${Is.string(error.message) ? error.message : "unknown"}`);
        }
      }
    };
    exports2.AbstractMessageWriter = AbstractMessageWriter;
    var ResolvedMessageWriterOptions;
    (function(ResolvedMessageWriterOptions2) {
      function fromOptions(options) {
        if (options === void 0 || typeof options === "string") {
          return { charset: options ?? "utf-8", contentTypeEncoder: (0, ral_1.default)().applicationJson.encoder };
        } else {
          return { charset: options.charset ?? "utf-8", contentEncoder: options.contentEncoder, contentTypeEncoder: options.contentTypeEncoder ?? (0, ral_1.default)().applicationJson.encoder };
        }
      }
      ResolvedMessageWriterOptions2.fromOptions = fromOptions;
    })(ResolvedMessageWriterOptions || (ResolvedMessageWriterOptions = {}));
    var WriteableStreamMessageWriter = class extends AbstractMessageWriter {
      constructor(writable, options) {
        super();
        this.writable = writable;
        this.options = ResolvedMessageWriterOptions.fromOptions(options);
        this.errorCount = 0;
        this.writeSemaphore = new semaphore_1.Semaphore(1);
        this.writable.onError((error) => this.fireError(error));
        this.writable.onClose(() => this.fireClose());
      }
      async write(msg) {
        return this.writeSemaphore.lock(async () => {
          const payload = this.options.contentTypeEncoder.encode(msg, this.options).then((buffer) => {
            if (this.options.contentEncoder !== void 0) {
              return this.options.contentEncoder.encode(buffer);
            } else {
              return buffer;
            }
          });
          return payload.then((buffer) => {
            const headers = [];
            headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
            headers.push(CRLF);
            return this.doWrite(msg, headers, buffer);
          }, (error) => {
            this.fireError(error);
            throw error;
          });
        });
      }
      async doWrite(msg, headers, data) {
        try {
          await this.writable.write(headers.join(""), "ascii");
          return this.writable.write(data);
        } catch (error) {
          this.handleError(error, msg);
          return Promise.reject(error);
        }
      }
      handleError(error, msg) {
        this.errorCount++;
        this.fireError(error, msg, this.errorCount);
      }
      end() {
        this.writable.end();
      }
    };
    exports2.WriteableStreamMessageWriter = WriteableStreamMessageWriter;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messageBuffer.js
var require_messageBuffer = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messageBuffer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AbstractMessageBuffer = void 0;
    var CR = 13;
    var LF = 10;
    var CRLF = "\r\n";
    var AbstractMessageBuffer = class {
      constructor(encoding = "utf-8") {
        this._encoding = encoding;
        this._chunks = [];
        this._totalLength = 0;
      }
      get encoding() {
        return this._encoding;
      }
      append(chunk) {
        const toAppend = typeof chunk === "string" ? this.fromString(chunk, this._encoding) : chunk;
        this._chunks.push(toAppend);
        this._totalLength += toAppend.byteLength;
      }
      tryReadHeaders(lowerCaseKeys = false) {
        if (this._chunks.length === 0) {
          return void 0;
        }
        let state = 0;
        let chunkIndex = 0;
        let offset = 0;
        let chunkBytesRead = 0;
        row: while (chunkIndex < this._chunks.length) {
          const chunk = this._chunks[chunkIndex];
          offset = 0;
          column: while (offset < chunk.length) {
            const value = chunk[offset];
            switch (value) {
              case CR:
                switch (state) {
                  case 0:
                    state = 1;
                    break;
                  case 2:
                    state = 3;
                    break;
                  default:
                    state = 0;
                }
                break;
              case LF:
                switch (state) {
                  case 1:
                    state = 2;
                    break;
                  case 3:
                    state = 4;
                    offset++;
                    break row;
                  default:
                    state = 0;
                }
                break;
              default:
                state = 0;
            }
            offset++;
          }
          chunkBytesRead += chunk.byteLength;
          chunkIndex++;
        }
        if (state !== 4) {
          return void 0;
        }
        const buffer = this._read(chunkBytesRead + offset);
        const result = /* @__PURE__ */ new Map();
        const headers = this.toString(buffer, "ascii").split(CRLF);
        if (headers.length < 2) {
          return result;
        }
        for (let i2 = 0; i2 < headers.length - 2; i2++) {
          const header = headers[i2];
          const index = header.indexOf(":");
          if (index === -1) {
            throw new Error(`Message header must separate key and value using ':'
${header}`);
          }
          const key = header.substr(0, index);
          const value = header.substr(index + 1).trim();
          result.set(lowerCaseKeys ? key.toLowerCase() : key, value);
        }
        return result;
      }
      tryReadBody(length) {
        if (this._totalLength < length) {
          return void 0;
        }
        return this._read(length);
      }
      get numberOfBytes() {
        return this._totalLength;
      }
      _read(byteCount) {
        if (byteCount === 0) {
          return this.emptyBuffer();
        }
        if (byteCount > this._totalLength) {
          throw new Error(`Cannot read so many bytes!`);
        }
        if (this._chunks[0].byteLength === byteCount) {
          const chunk = this._chunks[0];
          this._chunks.shift();
          this._totalLength -= byteCount;
          return this.asNative(chunk);
        }
        if (this._chunks[0].byteLength > byteCount) {
          const chunk = this._chunks[0];
          const result2 = this.asNative(chunk, byteCount);
          this._chunks[0] = chunk.slice(byteCount);
          this._totalLength -= byteCount;
          return result2;
        }
        const result = this.allocNative(byteCount);
        let resultOffset = 0;
        let chunkIndex = 0;
        while (byteCount > 0) {
          const chunk = this._chunks[chunkIndex];
          if (chunk.byteLength > byteCount) {
            const chunkPart = chunk.slice(0, byteCount);
            result.set(chunkPart, resultOffset);
            resultOffset += byteCount;
            this._chunks[chunkIndex] = chunk.slice(byteCount);
            this._totalLength -= byteCount;
            byteCount -= byteCount;
          } else {
            result.set(chunk, resultOffset);
            resultOffset += chunk.byteLength;
            this._chunks.shift();
            this._totalLength -= chunk.byteLength;
            byteCount -= chunk.byteLength;
          }
        }
        return result;
      }
    };
    exports2.AbstractMessageBuffer = AbstractMessageBuffer;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/connection.js
var require_connection = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/connection.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createMessageConnection = exports2.ConnectionOptions = exports2.MessageStrategy = exports2.CancellationStrategy = exports2.CancellationSenderStrategy = exports2.CancellationReceiverStrategy = exports2.RequestCancellationReceiverStrategy = exports2.IdCancellationReceiverStrategy = exports2.ConnectionStrategy = exports2.ConnectionError = exports2.ConnectionErrors = exports2.LogTraceNotification = exports2.SetTraceNotification = exports2.TraceFormat = exports2.TraceValues = exports2.Trace = exports2.NullLogger = exports2.ProgressType = exports2.ProgressToken = void 0;
    var ral_1 = require_ral();
    var Is = require_is2();
    var messages_1 = require_messages();
    var linkedMap_1 = require_linkedMap();
    var events_1 = require_events();
    var cancellation_1 = require_cancellation();
    var CancelNotification;
    (function(CancelNotification2) {
      CancelNotification2.type = new messages_1.NotificationType("$/cancelRequest");
    })(CancelNotification || (CancelNotification = {}));
    var ProgressToken;
    (function(ProgressToken2) {
      function is(value) {
        return typeof value === "string" || typeof value === "number";
      }
      ProgressToken2.is = is;
    })(ProgressToken || (exports2.ProgressToken = ProgressToken = {}));
    var ProgressNotification;
    (function(ProgressNotification2) {
      ProgressNotification2.type = new messages_1.NotificationType("$/progress");
    })(ProgressNotification || (ProgressNotification = {}));
    var ProgressType = class {
      constructor() {
      }
    };
    exports2.ProgressType = ProgressType;
    var StarRequestHandler;
    (function(StarRequestHandler2) {
      function is(value) {
        return Is.func(value);
      }
      StarRequestHandler2.is = is;
    })(StarRequestHandler || (StarRequestHandler = {}));
    exports2.NullLogger = Object.freeze({
      error: () => {
      },
      warn: () => {
      },
      info: () => {
      },
      log: () => {
      }
    });
    var Trace;
    (function(Trace2) {
      Trace2[Trace2["Off"] = 0] = "Off";
      Trace2[Trace2["Messages"] = 1] = "Messages";
      Trace2[Trace2["Compact"] = 2] = "Compact";
      Trace2[Trace2["Verbose"] = 3] = "Verbose";
    })(Trace || (exports2.Trace = Trace = {}));
    var TraceValues;
    (function(TraceValues2) {
      TraceValues2.Off = "off";
      TraceValues2.Messages = "messages";
      TraceValues2.Compact = "compact";
      TraceValues2.Verbose = "verbose";
    })(TraceValues || (exports2.TraceValues = TraceValues = {}));
    (function(Trace2) {
      function fromString(value) {
        if (!Is.string(value)) {
          return Trace2.Off;
        }
        value = value.toLowerCase();
        switch (value) {
          case "off":
            return Trace2.Off;
          case "messages":
            return Trace2.Messages;
          case "compact":
            return Trace2.Compact;
          case "verbose":
            return Trace2.Verbose;
          default:
            return Trace2.Off;
        }
      }
      Trace2.fromString = fromString;
      function toString(value) {
        switch (value) {
          case Trace2.Off:
            return "off";
          case Trace2.Messages:
            return "messages";
          case Trace2.Compact:
            return "compact";
          case Trace2.Verbose:
            return "verbose";
          default:
            return "off";
        }
      }
      Trace2.toString = toString;
    })(Trace || (exports2.Trace = Trace = {}));
    var TraceFormat;
    (function(TraceFormat2) {
      TraceFormat2["Text"] = "text";
      TraceFormat2["JSON"] = "json";
    })(TraceFormat || (exports2.TraceFormat = TraceFormat = {}));
    (function(TraceFormat2) {
      function fromString(value) {
        if (!Is.string(value)) {
          return TraceFormat2.Text;
        }
        value = value.toLowerCase();
        if (value === "json") {
          return TraceFormat2.JSON;
        } else {
          return TraceFormat2.Text;
        }
      }
      TraceFormat2.fromString = fromString;
    })(TraceFormat || (exports2.TraceFormat = TraceFormat = {}));
    var SetTraceNotification;
    (function(SetTraceNotification2) {
      SetTraceNotification2.type = new messages_1.NotificationType("$/setTrace");
    })(SetTraceNotification || (exports2.SetTraceNotification = SetTraceNotification = {}));
    var LogTraceNotification;
    (function(LogTraceNotification2) {
      LogTraceNotification2.type = new messages_1.NotificationType("$/logTrace");
    })(LogTraceNotification || (exports2.LogTraceNotification = LogTraceNotification = {}));
    var ConnectionErrors;
    (function(ConnectionErrors2) {
      ConnectionErrors2[ConnectionErrors2["Closed"] = 1] = "Closed";
      ConnectionErrors2[ConnectionErrors2["Disposed"] = 2] = "Disposed";
      ConnectionErrors2[ConnectionErrors2["AlreadyListening"] = 3] = "AlreadyListening";
    })(ConnectionErrors || (exports2.ConnectionErrors = ConnectionErrors = {}));
    var ConnectionError = class _ConnectionError extends Error {
      constructor(code, message) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, _ConnectionError.prototype);
      }
    };
    exports2.ConnectionError = ConnectionError;
    var ConnectionStrategy;
    (function(ConnectionStrategy2) {
      function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.cancelUndispatched);
      }
      ConnectionStrategy2.is = is;
    })(ConnectionStrategy || (exports2.ConnectionStrategy = ConnectionStrategy = {}));
    var IdCancellationReceiverStrategy;
    (function(IdCancellationReceiverStrategy2) {
      function is(value) {
        const candidate = value;
        return candidate && (candidate.kind === void 0 || candidate.kind === "id") && Is.func(candidate.createCancellationTokenSource) && (candidate.dispose === void 0 || Is.func(candidate.dispose));
      }
      IdCancellationReceiverStrategy2.is = is;
    })(IdCancellationReceiverStrategy || (exports2.IdCancellationReceiverStrategy = IdCancellationReceiverStrategy = {}));
    var RequestCancellationReceiverStrategy;
    (function(RequestCancellationReceiverStrategy2) {
      function is(value) {
        const candidate = value;
        return candidate && candidate.kind === "request" && Is.func(candidate.createCancellationTokenSource) && (candidate.dispose === void 0 || Is.func(candidate.dispose));
      }
      RequestCancellationReceiverStrategy2.is = is;
    })(RequestCancellationReceiverStrategy || (exports2.RequestCancellationReceiverStrategy = RequestCancellationReceiverStrategy = {}));
    var CancellationReceiverStrategy;
    (function(CancellationReceiverStrategy2) {
      CancellationReceiverStrategy2.Message = Object.freeze({
        createCancellationTokenSource(_) {
          return new cancellation_1.CancellationTokenSource();
        }
      });
      function is(value) {
        return IdCancellationReceiverStrategy.is(value) || RequestCancellationReceiverStrategy.is(value);
      }
      CancellationReceiverStrategy2.is = is;
    })(CancellationReceiverStrategy || (exports2.CancellationReceiverStrategy = CancellationReceiverStrategy = {}));
    var CancellationSenderStrategy;
    (function(CancellationSenderStrategy2) {
      CancellationSenderStrategy2.Message = Object.freeze({
        sendCancellation(conn, id) {
          return conn.sendNotification(CancelNotification.type, { id });
        },
        cleanup(_) {
        }
      });
      function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.sendCancellation) && Is.func(candidate.cleanup);
      }
      CancellationSenderStrategy2.is = is;
    })(CancellationSenderStrategy || (exports2.CancellationSenderStrategy = CancellationSenderStrategy = {}));
    var CancellationStrategy;
    (function(CancellationStrategy2) {
      CancellationStrategy2.Message = Object.freeze({
        receiver: CancellationReceiverStrategy.Message,
        sender: CancellationSenderStrategy.Message
      });
      function is(value) {
        const candidate = value;
        return candidate && CancellationReceiverStrategy.is(candidate.receiver) && CancellationSenderStrategy.is(candidate.sender);
      }
      CancellationStrategy2.is = is;
    })(CancellationStrategy || (exports2.CancellationStrategy = CancellationStrategy = {}));
    var MessageStrategy;
    (function(MessageStrategy2) {
      function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.handleMessage);
      }
      MessageStrategy2.is = is;
    })(MessageStrategy || (exports2.MessageStrategy = MessageStrategy = {}));
    var ConnectionOptions;
    (function(ConnectionOptions2) {
      function is(value) {
        const candidate = value;
        return candidate && (CancellationStrategy.is(candidate.cancellationStrategy) || ConnectionStrategy.is(candidate.connectionStrategy) || MessageStrategy.is(candidate.messageStrategy));
      }
      ConnectionOptions2.is = is;
    })(ConnectionOptions || (exports2.ConnectionOptions = ConnectionOptions = {}));
    var ConnectionState;
    (function(ConnectionState2) {
      ConnectionState2[ConnectionState2["New"] = 1] = "New";
      ConnectionState2[ConnectionState2["Listening"] = 2] = "Listening";
      ConnectionState2[ConnectionState2["Closed"] = 3] = "Closed";
      ConnectionState2[ConnectionState2["Disposed"] = 4] = "Disposed";
    })(ConnectionState || (ConnectionState = {}));
    function createMessageConnection(messageReader, messageWriter, _logger, options) {
      const logger = _logger !== void 0 ? _logger : exports2.NullLogger;
      let sequenceNumber = 0;
      let notificationSequenceNumber = 0;
      let unknownResponseSequenceNumber = 0;
      const version = "2.0";
      let starRequestHandler = void 0;
      const requestHandlers = /* @__PURE__ */ new Map();
      let starNotificationHandler = void 0;
      const notificationHandlers = /* @__PURE__ */ new Map();
      const progressHandlers = /* @__PURE__ */ new Map();
      let timer;
      let messageQueue = new linkedMap_1.LinkedMap();
      let responsePromises = /* @__PURE__ */ new Map();
      let knownCanceledRequests = /* @__PURE__ */ new Set();
      let requestTokens = /* @__PURE__ */ new Map();
      let trace = Trace.Off;
      let traceFormat = TraceFormat.Text;
      let tracer;
      let state = ConnectionState.New;
      const errorEmitter = new events_1.Emitter();
      const closeEmitter = new events_1.Emitter();
      const unhandledNotificationEmitter = new events_1.Emitter();
      const unhandledProgressEmitter = new events_1.Emitter();
      const disposeEmitter = new events_1.Emitter();
      const cancellationStrategy = options && options.cancellationStrategy ? options.cancellationStrategy : CancellationStrategy.Message;
      function createRequestQueueKey(id) {
        if (id === null) {
          throw new Error(`Can't send requests with id null since the response can't be correlated.`);
        }
        return "req-" + id.toString();
      }
      function createResponseQueueKey(id) {
        if (id === null) {
          return "res-unknown-" + (++unknownResponseSequenceNumber).toString();
        } else {
          return "res-" + id.toString();
        }
      }
      function createNotificationQueueKey() {
        return "not-" + (++notificationSequenceNumber).toString();
      }
      function addMessageToQueue(queue, message) {
        if (messages_1.Message.isRequest(message)) {
          queue.set(createRequestQueueKey(message.id), message);
        } else if (messages_1.Message.isResponse(message)) {
          queue.set(createResponseQueueKey(message.id), message);
        } else {
          queue.set(createNotificationQueueKey(), message);
        }
      }
      function cancelUndispatched(_message) {
        return void 0;
      }
      function isListening() {
        return state === ConnectionState.Listening;
      }
      function isClosed() {
        return state === ConnectionState.Closed;
      }
      function isDisposed() {
        return state === ConnectionState.Disposed;
      }
      function closeHandler() {
        if (state === ConnectionState.New || state === ConnectionState.Listening) {
          state = ConnectionState.Closed;
          closeEmitter.fire(void 0);
        }
      }
      function readErrorHandler(error) {
        errorEmitter.fire([error, void 0, void 0]);
      }
      function writeErrorHandler(data) {
        errorEmitter.fire(data);
      }
      messageReader.onClose(closeHandler);
      messageReader.onError(readErrorHandler);
      messageWriter.onClose(closeHandler);
      messageWriter.onError(writeErrorHandler);
      function triggerMessageQueue() {
        if (timer || messageQueue.size === 0) {
          return;
        }
        timer = (0, ral_1.default)().timer.setImmediate(() => {
          timer = void 0;
          processMessageQueue();
        });
      }
      function handleMessage(message) {
        if (messages_1.Message.isRequest(message)) {
          handleRequest(message);
        } else if (messages_1.Message.isNotification(message)) {
          handleNotification(message);
        } else if (messages_1.Message.isResponse(message)) {
          handleResponse(message);
        } else {
          handleInvalidMessage(message);
        }
      }
      function processMessageQueue() {
        if (messageQueue.size === 0) {
          return;
        }
        const message = messageQueue.shift();
        try {
          const messageStrategy = options?.messageStrategy;
          if (MessageStrategy.is(messageStrategy)) {
            messageStrategy.handleMessage(message, handleMessage);
          } else {
            handleMessage(message);
          }
        } finally {
          triggerMessageQueue();
        }
      }
      const callback = (message) => {
        try {
          if (messages_1.Message.isNotification(message) && message.method === CancelNotification.type.method) {
            const cancelId = message.params.id;
            const key = createRequestQueueKey(cancelId);
            const toCancel = messageQueue.get(key);
            if (messages_1.Message.isRequest(toCancel)) {
              const strategy = options?.connectionStrategy;
              const response = strategy && strategy.cancelUndispatched ? strategy.cancelUndispatched(toCancel, cancelUndispatched) : cancelUndispatched(toCancel);
              if (response && (response.error !== void 0 || response.result !== void 0)) {
                messageQueue.delete(key);
                requestTokens.delete(cancelId);
                response.id = toCancel.id;
                traceSendingResponse(response, message.method, Date.now());
                messageWriter.write(response).catch(() => logger.error(`Sending response for canceled message failed.`));
                return;
              }
            }
            const cancellationToken = requestTokens.get(cancelId);
            if (cancellationToken !== void 0) {
              cancellationToken.cancel();
              traceReceivedNotification(message);
              return;
            } else {
              knownCanceledRequests.add(cancelId);
            }
          }
          addMessageToQueue(messageQueue, message);
        } finally {
          triggerMessageQueue();
        }
      };
      function handleRequest(requestMessage) {
        if (isDisposed()) {
          return;
        }
        function reply(resultOrError, method, startTime2) {
          const message = {
            jsonrpc: version,
            id: requestMessage.id
          };
          if (resultOrError instanceof messages_1.ResponseError) {
            message.error = resultOrError.toJson();
          } else {
            message.result = resultOrError === void 0 ? null : resultOrError;
          }
          traceSendingResponse(message, method, startTime2);
          messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
        }
        function replyError(error, method, startTime2) {
          const message = {
            jsonrpc: version,
            id: requestMessage.id,
            error: error.toJson()
          };
          traceSendingResponse(message, method, startTime2);
          messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
        }
        function replySuccess(result, method, startTime2) {
          if (result === void 0) {
            result = null;
          }
          const message = {
            jsonrpc: version,
            id: requestMessage.id,
            result
          };
          traceSendingResponse(message, method, startTime2);
          messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
        }
        traceReceivedRequest(requestMessage);
        const element = requestHandlers.get(requestMessage.method);
        let type;
        let requestHandler;
        if (element) {
          type = element.type;
          requestHandler = element.handler;
        }
        const startTime = Date.now();
        if (requestHandler || starRequestHandler) {
          const tokenKey = requestMessage.id ?? String(Date.now());
          const cancellationSource = IdCancellationReceiverStrategy.is(cancellationStrategy.receiver) ? cancellationStrategy.receiver.createCancellationTokenSource(tokenKey) : cancellationStrategy.receiver.createCancellationTokenSource(requestMessage);
          if (requestMessage.id !== null && knownCanceledRequests.has(requestMessage.id)) {
            cancellationSource.cancel();
          }
          if (requestMessage.id !== null) {
            requestTokens.set(tokenKey, cancellationSource);
          }
          try {
            let handlerResult;
            if (requestHandler) {
              if (requestMessage.params === void 0) {
                if (type !== void 0 && type.numberOfParams !== 0) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines ${type.numberOfParams} params but received none.`), requestMessage.method, startTime);
                  return;
                }
                handlerResult = requestHandler(cancellationSource.token);
              } else if (Array.isArray(requestMessage.params)) {
                if (type !== void 0 && type.parameterStructures === messages_1.ParameterStructures.byName) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by name but received parameters by position`), requestMessage.method, startTime);
                  return;
                }
                handlerResult = requestHandler(...requestMessage.params, cancellationSource.token);
              } else {
                if (type !== void 0 && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by position but received parameters by name`), requestMessage.method, startTime);
                  return;
                }
                handlerResult = requestHandler(requestMessage.params, cancellationSource.token);
              }
            } else if (starRequestHandler) {
              handlerResult = starRequestHandler(requestMessage.method, requestMessage.params, cancellationSource.token);
            }
            const promise = handlerResult;
            if (!handlerResult) {
              requestTokens.delete(tokenKey);
              replySuccess(handlerResult, requestMessage.method, startTime);
            } else if (promise.then) {
              promise.then((resultOrError) => {
                requestTokens.delete(tokenKey);
                reply(resultOrError, requestMessage.method, startTime);
              }, (error) => {
                requestTokens.delete(tokenKey);
                if (error instanceof messages_1.ResponseError) {
                  replyError(error, requestMessage.method, startTime);
                } else if (error && Is.string(error.message)) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
                } else {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
                }
              });
            } else {
              requestTokens.delete(tokenKey);
              reply(handlerResult, requestMessage.method, startTime);
            }
          } catch (error) {
            requestTokens.delete(tokenKey);
            if (error instanceof messages_1.ResponseError) {
              reply(error, requestMessage.method, startTime);
            } else if (error && Is.string(error.message)) {
              replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
            } else {
              replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
            }
          }
        } else {
          replyError(new messages_1.ResponseError(messages_1.ErrorCodes.MethodNotFound, `Unhandled method ${requestMessage.method}`), requestMessage.method, startTime);
        }
      }
      function handleResponse(responseMessage) {
        if (isDisposed()) {
          return;
        }
        if (responseMessage.id === null) {
          if (responseMessage.error) {
            logger.error(`Received response message without id: Error is: 
${JSON.stringify(responseMessage.error, void 0, 4)}`);
          } else {
            logger.error(`Received response message without id. No further error information provided.`);
          }
        } else {
          const key = responseMessage.id;
          const responsePromise = responsePromises.get(key);
          traceReceivedResponse(responseMessage, responsePromise);
          if (responsePromise !== void 0) {
            responsePromises.delete(key);
            try {
              if (responseMessage.error) {
                const error = responseMessage.error;
                responsePromise.reject(new messages_1.ResponseError(error.code, error.message, error.data));
              } else if (responseMessage.result !== void 0) {
                responsePromise.resolve(responseMessage.result);
              } else {
                throw new Error("Should never happen.");
              }
            } catch (error) {
              if (error.message) {
                logger.error(`Response handler '${responsePromise.method}' failed with message: ${error.message}`);
              } else {
                logger.error(`Response handler '${responsePromise.method}' failed unexpectedly.`);
              }
            }
          }
        }
      }
      function handleNotification(message) {
        if (isDisposed()) {
          return;
        }
        let type = void 0;
        let notificationHandler;
        if (message.method === CancelNotification.type.method) {
          const cancelId = message.params.id;
          knownCanceledRequests.delete(cancelId);
          traceReceivedNotification(message);
          return;
        } else {
          const element = notificationHandlers.get(message.method);
          if (element) {
            notificationHandler = element.handler;
            type = element.type;
          }
        }
        if (notificationHandler || starNotificationHandler) {
          try {
            traceReceivedNotification(message);
            if (notificationHandler) {
              if (message.params === void 0) {
                if (type !== void 0) {
                  if (type.numberOfParams !== 0 && type.parameterStructures !== messages_1.ParameterStructures.byName) {
                    logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received none.`);
                  }
                }
                notificationHandler();
              } else if (Array.isArray(message.params)) {
                const params = message.params;
                if (message.method === ProgressNotification.type.method && params.length === 2 && ProgressToken.is(params[0])) {
                  notificationHandler({ token: params[0], value: params[1] });
                } else {
                  if (type !== void 0) {
                    if (type.parameterStructures === messages_1.ParameterStructures.byName) {
                      logger.error(`Notification ${message.method} defines parameters by name but received parameters by position`);
                    }
                    if (type.numberOfParams !== message.params.length) {
                      logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received ${params.length} arguments`);
                    }
                  }
                  notificationHandler(...params);
                }
              } else {
                if (type !== void 0 && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                  logger.error(`Notification ${message.method} defines parameters by position but received parameters by name`);
                }
                notificationHandler(message.params);
              }
            } else if (starNotificationHandler) {
              starNotificationHandler(message.method, message.params);
            }
          } catch (error) {
            if (error.message) {
              logger.error(`Notification handler '${message.method}' failed with message: ${error.message}`);
            } else {
              logger.error(`Notification handler '${message.method}' failed unexpectedly.`);
            }
          }
        } else {
          unhandledNotificationEmitter.fire(message);
        }
      }
      function handleInvalidMessage(message) {
        if (!message) {
          logger.error("Received empty message.");
          return;
        }
        logger.error(`Received message which is neither a response nor a notification message:
${JSON.stringify(message, null, 4)}`);
        const responseMessage = message;
        if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
          const key = responseMessage.id;
          const responseHandler = responsePromises.get(key);
          if (responseHandler) {
            responseHandler.reject(new Error("The received response has neither a result nor an error property."));
          }
        }
      }
      function stringifyTrace(params) {
        if (params === void 0 || params === null) {
          return void 0;
        }
        switch (trace) {
          case Trace.Verbose:
            return JSON.stringify(params, null, 4);
          case Trace.Compact:
            return JSON.stringify(params);
          default:
            return void 0;
        }
      }
      function traceSendingRequest(message) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
            data = `Params: ${stringifyTrace(message.params)}

`;
          }
          tracer.log(`Sending request '${message.method} - (${message.id})'.`, data);
        } else {
          logLSPMessage("send-request", message);
        }
      }
      function traceSendingNotification(message) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.params) {
              data = `Params: ${stringifyTrace(message.params)}

`;
            } else {
              data = "No parameters provided.\n\n";
            }
          }
          tracer.log(`Sending notification '${message.method}'.`, data);
        } else {
          logLSPMessage("send-notification", message);
        }
      }
      function traceSendingResponse(message, method, startTime) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.error && message.error.data) {
              data = `Error data: ${stringifyTrace(message.error.data)}

`;
            } else {
              if (message.result) {
                data = `Result: ${stringifyTrace(message.result)}

`;
              } else if (message.error === void 0) {
                data = "No result returned.\n\n";
              }
            }
          }
          tracer.log(`Sending response '${method} - (${message.id})'. Processing request took ${Date.now() - startTime}ms`, data);
        } else {
          logLSPMessage("send-response", message);
        }
      }
      function traceReceivedRequest(message) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
            data = `Params: ${stringifyTrace(message.params)}

`;
          }
          tracer.log(`Received request '${message.method} - (${message.id})'.`, data);
        } else {
          logLSPMessage("receive-request", message);
        }
      }
      function traceReceivedNotification(message) {
        if (trace === Trace.Off || !tracer || message.method === LogTraceNotification.type.method) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.params) {
              data = `Params: ${stringifyTrace(message.params)}

`;
            } else {
              data = "No parameters provided.\n\n";
            }
          }
          tracer.log(`Received notification '${message.method}'.`, data);
        } else {
          logLSPMessage("receive-notification", message);
        }
      }
      function traceReceivedResponse(message, responsePromise) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.error && message.error.data) {
              data = `Error data: ${stringifyTrace(message.error.data)}

`;
            } else {
              if (message.result) {
                data = `Result: ${stringifyTrace(message.result)}

`;
              } else if (message.error === void 0) {
                data = "No result returned.\n\n";
              }
            }
          }
          if (responsePromise) {
            const error = message.error ? ` Request failed: ${message.error.message} (${message.error.code}).` : "";
            tracer.log(`Received response '${responsePromise.method} - (${message.id})' in ${Date.now() - responsePromise.timerStart}ms.${error}`, data);
          } else {
            tracer.log(`Received response ${message.id} without active response promise.`, data);
          }
        } else {
          logLSPMessage("receive-response", message);
        }
      }
      function logLSPMessage(type, message) {
        if (!tracer || trace === Trace.Off) {
          return;
        }
        const lspMessage = {
          isLSPMessage: true,
          type,
          message,
          timestamp: Date.now()
        };
        tracer.log(lspMessage);
      }
      function throwIfClosedOrDisposed() {
        if (isClosed()) {
          throw new ConnectionError(ConnectionErrors.Closed, "Connection is closed.");
        }
        if (isDisposed()) {
          throw new ConnectionError(ConnectionErrors.Disposed, "Connection is disposed.");
        }
      }
      function throwIfListening() {
        if (isListening()) {
          throw new ConnectionError(ConnectionErrors.AlreadyListening, "Connection is already listening");
        }
      }
      function throwIfNotListening() {
        if (!isListening()) {
          throw new Error("Call listen() first.");
        }
      }
      function undefinedToNull(param) {
        if (param === void 0) {
          return null;
        } else {
          return param;
        }
      }
      function nullToUndefined(param) {
        if (param === null) {
          return void 0;
        } else {
          return param;
        }
      }
      function isNamedParam(param) {
        return param !== void 0 && param !== null && !Array.isArray(param) && typeof param === "object";
      }
      function computeSingleParam(parameterStructures, param) {
        switch (parameterStructures) {
          case messages_1.ParameterStructures.auto:
            if (isNamedParam(param)) {
              return nullToUndefined(param);
            } else {
              return [undefinedToNull(param)];
            }
          case messages_1.ParameterStructures.byName:
            if (!isNamedParam(param)) {
              throw new Error(`Received parameters by name but param is not an object literal.`);
            }
            return nullToUndefined(param);
          case messages_1.ParameterStructures.byPosition:
            return [undefinedToNull(param)];
          default:
            throw new Error(`Unknown parameter structure ${parameterStructures.toString()}`);
        }
      }
      function computeMessageParams(type, params) {
        let result;
        const numberOfParams = type.numberOfParams;
        switch (numberOfParams) {
          case 0:
            result = void 0;
            break;
          case 1:
            result = computeSingleParam(type.parameterStructures, params[0]);
            break;
          default:
            result = [];
            for (let i2 = 0; i2 < params.length && i2 < numberOfParams; i2++) {
              result.push(undefinedToNull(params[i2]));
            }
            if (params.length < numberOfParams) {
              for (let i2 = params.length; i2 < numberOfParams; i2++) {
                result.push(null);
              }
            }
            break;
        }
        return result;
      }
      const connection = {
        sendNotification: (type, ...args2) => {
          throwIfClosedOrDisposed();
          let method;
          let messageParams;
          if (Is.string(type)) {
            method = type;
            const first = args2[0];
            let paramStart = 0;
            let parameterStructures = messages_1.ParameterStructures.auto;
            if (messages_1.ParameterStructures.is(first)) {
              paramStart = 1;
              parameterStructures = first;
            }
            let paramEnd = args2.length;
            const numberOfParams = paramEnd - paramStart;
            switch (numberOfParams) {
              case 0:
                messageParams = void 0;
                break;
              case 1:
                messageParams = computeSingleParam(parameterStructures, args2[paramStart]);
                break;
              default:
                if (parameterStructures === messages_1.ParameterStructures.byName) {
                  throw new Error(`Received ${numberOfParams} parameters for 'by Name' notification parameter structure.`);
                }
                messageParams = args2.slice(paramStart, paramEnd).map((value) => undefinedToNull(value));
                break;
            }
          } else {
            const params = args2;
            method = type.method;
            messageParams = computeMessageParams(type, params);
          }
          const notificationMessage = {
            jsonrpc: version,
            method,
            params: messageParams
          };
          traceSendingNotification(notificationMessage);
          return messageWriter.write(notificationMessage).catch((error) => {
            logger.error(`Sending notification failed.`);
            throw error;
          });
        },
        onNotification: (type, handler) => {
          throwIfClosedOrDisposed();
          let method;
          if (Is.func(type)) {
            starNotificationHandler = type;
          } else if (handler) {
            if (Is.string(type)) {
              method = type;
              notificationHandlers.set(type, { type: void 0, handler });
            } else {
              method = type.method;
              notificationHandlers.set(type.method, { type, handler });
            }
          }
          return {
            dispose: () => {
              if (method !== void 0) {
                notificationHandlers.delete(method);
              } else {
                starNotificationHandler = void 0;
              }
            }
          };
        },
        onProgress: (_type, token, handler) => {
          if (progressHandlers.has(token)) {
            throw new Error(`Progress handler for token ${token} already registered`);
          }
          progressHandlers.set(token, handler);
          return {
            dispose: () => {
              progressHandlers.delete(token);
            }
          };
        },
        sendProgress: (_type, token, value) => {
          return connection.sendNotification(ProgressNotification.type, { token, value });
        },
        onUnhandledProgress: unhandledProgressEmitter.event,
        sendRequest: (type, ...args2) => {
          throwIfClosedOrDisposed();
          throwIfNotListening();
          let method;
          let messageParams;
          let token = void 0;
          if (Is.string(type)) {
            method = type;
            const first = args2[0];
            const last = args2[args2.length - 1];
            let paramStart = 0;
            let parameterStructures = messages_1.ParameterStructures.auto;
            if (messages_1.ParameterStructures.is(first)) {
              paramStart = 1;
              parameterStructures = first;
            }
            let paramEnd = args2.length;
            if (cancellation_1.CancellationToken.is(last)) {
              paramEnd = paramEnd - 1;
              token = last;
            }
            const numberOfParams = paramEnd - paramStart;
            switch (numberOfParams) {
              case 0:
                messageParams = void 0;
                break;
              case 1:
                messageParams = computeSingleParam(parameterStructures, args2[paramStart]);
                break;
              default:
                if (parameterStructures === messages_1.ParameterStructures.byName) {
                  throw new Error(`Received ${numberOfParams} parameters for 'by Name' request parameter structure.`);
                }
                messageParams = args2.slice(paramStart, paramEnd).map((value) => undefinedToNull(value));
                break;
            }
          } else {
            const params = args2;
            method = type.method;
            messageParams = computeMessageParams(type, params);
            const numberOfParams = type.numberOfParams;
            token = cancellation_1.CancellationToken.is(params[numberOfParams]) ? params[numberOfParams] : void 0;
          }
          const id = sequenceNumber++;
          let disposable;
          if (token) {
            disposable = token.onCancellationRequested(() => {
              const p = cancellationStrategy.sender.sendCancellation(connection, id);
              if (p === void 0) {
                logger.log(`Received no promise from cancellation strategy when cancelling id ${id}`);
                return Promise.resolve();
              } else {
                return p.catch(() => {
                  logger.log(`Sending cancellation messages for id ${id} failed`);
                });
              }
            });
          }
          const requestMessage = {
            jsonrpc: version,
            id,
            method,
            params: messageParams
          };
          traceSendingRequest(requestMessage);
          if (typeof cancellationStrategy.sender.enableCancellation === "function") {
            cancellationStrategy.sender.enableCancellation(requestMessage);
          }
          return new Promise(async (resolve, reject) => {
            const resolveWithCleanup = (r) => {
              resolve(r);
              cancellationStrategy.sender.cleanup(id);
              disposable?.dispose();
            };
            const rejectWithCleanup = (r) => {
              reject(r);
              cancellationStrategy.sender.cleanup(id);
              disposable?.dispose();
            };
            const responsePromise = { method, timerStart: Date.now(), resolve: resolveWithCleanup, reject: rejectWithCleanup };
            try {
              await messageWriter.write(requestMessage);
              responsePromises.set(id, responsePromise);
            } catch (error) {
              logger.error(`Sending request failed.`);
              responsePromise.reject(new messages_1.ResponseError(messages_1.ErrorCodes.MessageWriteError, error.message ? error.message : "Unknown reason"));
              throw error;
            }
          });
        },
        onRequest: (type, handler) => {
          throwIfClosedOrDisposed();
          let method = null;
          if (StarRequestHandler.is(type)) {
            method = void 0;
            starRequestHandler = type;
          } else if (Is.string(type)) {
            method = null;
            if (handler !== void 0) {
              method = type;
              requestHandlers.set(type, { handler, type: void 0 });
            }
          } else {
            if (handler !== void 0) {
              method = type.method;
              requestHandlers.set(type.method, { type, handler });
            }
          }
          return {
            dispose: () => {
              if (method === null) {
                return;
              }
              if (method !== void 0) {
                requestHandlers.delete(method);
              } else {
                starRequestHandler = void 0;
              }
            }
          };
        },
        hasPendingResponse: () => {
          return responsePromises.size > 0;
        },
        trace: async (_value, _tracer, sendNotificationOrTraceOptions) => {
          let _sendNotification = false;
          let _traceFormat = TraceFormat.Text;
          if (sendNotificationOrTraceOptions !== void 0) {
            if (Is.boolean(sendNotificationOrTraceOptions)) {
              _sendNotification = sendNotificationOrTraceOptions;
            } else {
              _sendNotification = sendNotificationOrTraceOptions.sendNotification || false;
              _traceFormat = sendNotificationOrTraceOptions.traceFormat || TraceFormat.Text;
            }
          }
          trace = _value;
          traceFormat = _traceFormat;
          if (trace === Trace.Off) {
            tracer = void 0;
          } else {
            tracer = _tracer;
          }
          if (_sendNotification && !isClosed() && !isDisposed()) {
            await connection.sendNotification(SetTraceNotification.type, { value: Trace.toString(_value) });
          }
        },
        onError: errorEmitter.event,
        onClose: closeEmitter.event,
        onUnhandledNotification: unhandledNotificationEmitter.event,
        onDispose: disposeEmitter.event,
        end: () => {
          messageWriter.end();
        },
        dispose: () => {
          if (isDisposed()) {
            return;
          }
          state = ConnectionState.Disposed;
          disposeEmitter.fire(void 0);
          const error = new messages_1.ResponseError(messages_1.ErrorCodes.PendingResponseRejected, "Pending response rejected since connection got disposed");
          for (const promise of responsePromises.values()) {
            promise.reject(error);
          }
          responsePromises = /* @__PURE__ */ new Map();
          requestTokens = /* @__PURE__ */ new Map();
          knownCanceledRequests = /* @__PURE__ */ new Set();
          messageQueue = new linkedMap_1.LinkedMap();
          if (Is.func(messageWriter.dispose)) {
            messageWriter.dispose();
          }
          if (Is.func(messageReader.dispose)) {
            messageReader.dispose();
          }
        },
        listen: () => {
          throwIfClosedOrDisposed();
          throwIfListening();
          state = ConnectionState.Listening;
          messageReader.listen(callback);
        },
        inspect: () => {
          (0, ral_1.default)().console.log("inspect");
        }
      };
      connection.onNotification(LogTraceNotification.type, (params) => {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        const verbose = trace === Trace.Verbose || trace === Trace.Compact;
        tracer.log(params.message, verbose ? params.verbose : void 0);
      });
      connection.onNotification(ProgressNotification.type, (params) => {
        const handler = progressHandlers.get(params.token);
        if (handler) {
          handler(params.value);
        } else {
          unhandledProgressEmitter.fire(params);
        }
      });
      return connection;
    }
    exports2.createMessageConnection = createMessageConnection;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/api.js
var require_api = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/api.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProgressType = exports2.ProgressToken = exports2.createMessageConnection = exports2.NullLogger = exports2.ConnectionOptions = exports2.ConnectionStrategy = exports2.AbstractMessageBuffer = exports2.WriteableStreamMessageWriter = exports2.AbstractMessageWriter = exports2.MessageWriter = exports2.ReadableStreamMessageReader = exports2.AbstractMessageReader = exports2.MessageReader = exports2.SharedArrayReceiverStrategy = exports2.SharedArraySenderStrategy = exports2.CancellationToken = exports2.CancellationTokenSource = exports2.Emitter = exports2.Event = exports2.Disposable = exports2.LRUCache = exports2.Touch = exports2.LinkedMap = exports2.ParameterStructures = exports2.NotificationType9 = exports2.NotificationType8 = exports2.NotificationType7 = exports2.NotificationType6 = exports2.NotificationType5 = exports2.NotificationType4 = exports2.NotificationType3 = exports2.NotificationType2 = exports2.NotificationType1 = exports2.NotificationType0 = exports2.NotificationType = exports2.ErrorCodes = exports2.ResponseError = exports2.RequestType9 = exports2.RequestType8 = exports2.RequestType7 = exports2.RequestType6 = exports2.RequestType5 = exports2.RequestType4 = exports2.RequestType3 = exports2.RequestType2 = exports2.RequestType1 = exports2.RequestType0 = exports2.RequestType = exports2.Message = exports2.RAL = void 0;
    exports2.MessageStrategy = exports2.CancellationStrategy = exports2.CancellationSenderStrategy = exports2.CancellationReceiverStrategy = exports2.ConnectionError = exports2.ConnectionErrors = exports2.LogTraceNotification = exports2.SetTraceNotification = exports2.TraceFormat = exports2.TraceValues = exports2.Trace = void 0;
    var messages_1 = require_messages();
    Object.defineProperty(exports2, "Message", { enumerable: true, get: function() {
      return messages_1.Message;
    } });
    Object.defineProperty(exports2, "RequestType", { enumerable: true, get: function() {
      return messages_1.RequestType;
    } });
    Object.defineProperty(exports2, "RequestType0", { enumerable: true, get: function() {
      return messages_1.RequestType0;
    } });
    Object.defineProperty(exports2, "RequestType1", { enumerable: true, get: function() {
      return messages_1.RequestType1;
    } });
    Object.defineProperty(exports2, "RequestType2", { enumerable: true, get: function() {
      return messages_1.RequestType2;
    } });
    Object.defineProperty(exports2, "RequestType3", { enumerable: true, get: function() {
      return messages_1.RequestType3;
    } });
    Object.defineProperty(exports2, "RequestType4", { enumerable: true, get: function() {
      return messages_1.RequestType4;
    } });
    Object.defineProperty(exports2, "RequestType5", { enumerable: true, get: function() {
      return messages_1.RequestType5;
    } });
    Object.defineProperty(exports2, "RequestType6", { enumerable: true, get: function() {
      return messages_1.RequestType6;
    } });
    Object.defineProperty(exports2, "RequestType7", { enumerable: true, get: function() {
      return messages_1.RequestType7;
    } });
    Object.defineProperty(exports2, "RequestType8", { enumerable: true, get: function() {
      return messages_1.RequestType8;
    } });
    Object.defineProperty(exports2, "RequestType9", { enumerable: true, get: function() {
      return messages_1.RequestType9;
    } });
    Object.defineProperty(exports2, "ResponseError", { enumerable: true, get: function() {
      return messages_1.ResponseError;
    } });
    Object.defineProperty(exports2, "ErrorCodes", { enumerable: true, get: function() {
      return messages_1.ErrorCodes;
    } });
    Object.defineProperty(exports2, "NotificationType", { enumerable: true, get: function() {
      return messages_1.NotificationType;
    } });
    Object.defineProperty(exports2, "NotificationType0", { enumerable: true, get: function() {
      return messages_1.NotificationType0;
    } });
    Object.defineProperty(exports2, "NotificationType1", { enumerable: true, get: function() {
      return messages_1.NotificationType1;
    } });
    Object.defineProperty(exports2, "NotificationType2", { enumerable: true, get: function() {
      return messages_1.NotificationType2;
    } });
    Object.defineProperty(exports2, "NotificationType3", { enumerable: true, get: function() {
      return messages_1.NotificationType3;
    } });
    Object.defineProperty(exports2, "NotificationType4", { enumerable: true, get: function() {
      return messages_1.NotificationType4;
    } });
    Object.defineProperty(exports2, "NotificationType5", { enumerable: true, get: function() {
      return messages_1.NotificationType5;
    } });
    Object.defineProperty(exports2, "NotificationType6", { enumerable: true, get: function() {
      return messages_1.NotificationType6;
    } });
    Object.defineProperty(exports2, "NotificationType7", { enumerable: true, get: function() {
      return messages_1.NotificationType7;
    } });
    Object.defineProperty(exports2, "NotificationType8", { enumerable: true, get: function() {
      return messages_1.NotificationType8;
    } });
    Object.defineProperty(exports2, "NotificationType9", { enumerable: true, get: function() {
      return messages_1.NotificationType9;
    } });
    Object.defineProperty(exports2, "ParameterStructures", { enumerable: true, get: function() {
      return messages_1.ParameterStructures;
    } });
    var linkedMap_1 = require_linkedMap();
    Object.defineProperty(exports2, "LinkedMap", { enumerable: true, get: function() {
      return linkedMap_1.LinkedMap;
    } });
    Object.defineProperty(exports2, "LRUCache", { enumerable: true, get: function() {
      return linkedMap_1.LRUCache;
    } });
    Object.defineProperty(exports2, "Touch", { enumerable: true, get: function() {
      return linkedMap_1.Touch;
    } });
    var disposable_1 = require_disposable();
    Object.defineProperty(exports2, "Disposable", { enumerable: true, get: function() {
      return disposable_1.Disposable;
    } });
    var events_1 = require_events();
    Object.defineProperty(exports2, "Event", { enumerable: true, get: function() {
      return events_1.Event;
    } });
    Object.defineProperty(exports2, "Emitter", { enumerable: true, get: function() {
      return events_1.Emitter;
    } });
    var cancellation_1 = require_cancellation();
    Object.defineProperty(exports2, "CancellationTokenSource", { enumerable: true, get: function() {
      return cancellation_1.CancellationTokenSource;
    } });
    Object.defineProperty(exports2, "CancellationToken", { enumerable: true, get: function() {
      return cancellation_1.CancellationToken;
    } });
    var sharedArrayCancellation_1 = require_sharedArrayCancellation();
    Object.defineProperty(exports2, "SharedArraySenderStrategy", { enumerable: true, get: function() {
      return sharedArrayCancellation_1.SharedArraySenderStrategy;
    } });
    Object.defineProperty(exports2, "SharedArrayReceiverStrategy", { enumerable: true, get: function() {
      return sharedArrayCancellation_1.SharedArrayReceiverStrategy;
    } });
    var messageReader_1 = require_messageReader();
    Object.defineProperty(exports2, "MessageReader", { enumerable: true, get: function() {
      return messageReader_1.MessageReader;
    } });
    Object.defineProperty(exports2, "AbstractMessageReader", { enumerable: true, get: function() {
      return messageReader_1.AbstractMessageReader;
    } });
    Object.defineProperty(exports2, "ReadableStreamMessageReader", { enumerable: true, get: function() {
      return messageReader_1.ReadableStreamMessageReader;
    } });
    var messageWriter_1 = require_messageWriter();
    Object.defineProperty(exports2, "MessageWriter", { enumerable: true, get: function() {
      return messageWriter_1.MessageWriter;
    } });
    Object.defineProperty(exports2, "AbstractMessageWriter", { enumerable: true, get: function() {
      return messageWriter_1.AbstractMessageWriter;
    } });
    Object.defineProperty(exports2, "WriteableStreamMessageWriter", { enumerable: true, get: function() {
      return messageWriter_1.WriteableStreamMessageWriter;
    } });
    var messageBuffer_1 = require_messageBuffer();
    Object.defineProperty(exports2, "AbstractMessageBuffer", { enumerable: true, get: function() {
      return messageBuffer_1.AbstractMessageBuffer;
    } });
    var connection_1 = require_connection();
    Object.defineProperty(exports2, "ConnectionStrategy", { enumerable: true, get: function() {
      return connection_1.ConnectionStrategy;
    } });
    Object.defineProperty(exports2, "ConnectionOptions", { enumerable: true, get: function() {
      return connection_1.ConnectionOptions;
    } });
    Object.defineProperty(exports2, "NullLogger", { enumerable: true, get: function() {
      return connection_1.NullLogger;
    } });
    Object.defineProperty(exports2, "createMessageConnection", { enumerable: true, get: function() {
      return connection_1.createMessageConnection;
    } });
    Object.defineProperty(exports2, "ProgressToken", { enumerable: true, get: function() {
      return connection_1.ProgressToken;
    } });
    Object.defineProperty(exports2, "ProgressType", { enumerable: true, get: function() {
      return connection_1.ProgressType;
    } });
    Object.defineProperty(exports2, "Trace", { enumerable: true, get: function() {
      return connection_1.Trace;
    } });
    Object.defineProperty(exports2, "TraceValues", { enumerable: true, get: function() {
      return connection_1.TraceValues;
    } });
    Object.defineProperty(exports2, "TraceFormat", { enumerable: true, get: function() {
      return connection_1.TraceFormat;
    } });
    Object.defineProperty(exports2, "SetTraceNotification", { enumerable: true, get: function() {
      return connection_1.SetTraceNotification;
    } });
    Object.defineProperty(exports2, "LogTraceNotification", { enumerable: true, get: function() {
      return connection_1.LogTraceNotification;
    } });
    Object.defineProperty(exports2, "ConnectionErrors", { enumerable: true, get: function() {
      return connection_1.ConnectionErrors;
    } });
    Object.defineProperty(exports2, "ConnectionError", { enumerable: true, get: function() {
      return connection_1.ConnectionError;
    } });
    Object.defineProperty(exports2, "CancellationReceiverStrategy", { enumerable: true, get: function() {
      return connection_1.CancellationReceiverStrategy;
    } });
    Object.defineProperty(exports2, "CancellationSenderStrategy", { enumerable: true, get: function() {
      return connection_1.CancellationSenderStrategy;
    } });
    Object.defineProperty(exports2, "CancellationStrategy", { enumerable: true, get: function() {
      return connection_1.CancellationStrategy;
    } });
    Object.defineProperty(exports2, "MessageStrategy", { enumerable: true, get: function() {
      return connection_1.MessageStrategy;
    } });
    var ral_1 = require_ral();
    exports2.RAL = ral_1.default;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/node/ril.js
var require_ril = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/node/ril.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require("util");
    var api_1 = require_api();
    var MessageBuffer = class _MessageBuffer extends api_1.AbstractMessageBuffer {
      constructor(encoding = "utf-8") {
        super(encoding);
      }
      emptyBuffer() {
        return _MessageBuffer.emptyBuffer;
      }
      fromString(value, encoding) {
        return Buffer.from(value, encoding);
      }
      toString(value, encoding) {
        if (value instanceof Buffer) {
          return value.toString(encoding);
        } else {
          return new util_1.TextDecoder(encoding).decode(value);
        }
      }
      asNative(buffer, length) {
        if (length === void 0) {
          return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
        } else {
          return buffer instanceof Buffer ? buffer.slice(0, length) : Buffer.from(buffer, 0, length);
        }
      }
      allocNative(length) {
        return Buffer.allocUnsafe(length);
      }
    };
    MessageBuffer.emptyBuffer = Buffer.allocUnsafe(0);
    var ReadableStreamWrapper = class {
      constructor(stream) {
        this.stream = stream;
      }
      onClose(listener) {
        this.stream.on("close", listener);
        return api_1.Disposable.create(() => this.stream.off("close", listener));
      }
      onError(listener) {
        this.stream.on("error", listener);
        return api_1.Disposable.create(() => this.stream.off("error", listener));
      }
      onEnd(listener) {
        this.stream.on("end", listener);
        return api_1.Disposable.create(() => this.stream.off("end", listener));
      }
      onData(listener) {
        this.stream.on("data", listener);
        return api_1.Disposable.create(() => this.stream.off("data", listener));
      }
    };
    var WritableStreamWrapper = class {
      constructor(stream) {
        this.stream = stream;
      }
      onClose(listener) {
        this.stream.on("close", listener);
        return api_1.Disposable.create(() => this.stream.off("close", listener));
      }
      onError(listener) {
        this.stream.on("error", listener);
        return api_1.Disposable.create(() => this.stream.off("error", listener));
      }
      onEnd(listener) {
        this.stream.on("end", listener);
        return api_1.Disposable.create(() => this.stream.off("end", listener));
      }
      write(data, encoding) {
        return new Promise((resolve, reject) => {
          const callback = (error) => {
            if (error === void 0 || error === null) {
              resolve();
            } else {
              reject(error);
            }
          };
          if (typeof data === "string") {
            this.stream.write(data, encoding, callback);
          } else {
            this.stream.write(data, callback);
          }
        });
      }
      end() {
        this.stream.end();
      }
    };
    var _ril = Object.freeze({
      messageBuffer: Object.freeze({
        create: (encoding) => new MessageBuffer(encoding)
      }),
      applicationJson: Object.freeze({
        encoder: Object.freeze({
          name: "application/json",
          encode: (msg, options) => {
            try {
              return Promise.resolve(Buffer.from(JSON.stringify(msg, void 0, 0), options.charset));
            } catch (err2) {
              return Promise.reject(err2);
            }
          }
        }),
        decoder: Object.freeze({
          name: "application/json",
          decode: (buffer, options) => {
            try {
              if (buffer instanceof Buffer) {
                return Promise.resolve(JSON.parse(buffer.toString(options.charset)));
              } else {
                return Promise.resolve(JSON.parse(new util_1.TextDecoder(options.charset).decode(buffer)));
              }
            } catch (err2) {
              return Promise.reject(err2);
            }
          }
        })
      }),
      stream: Object.freeze({
        asReadableStream: (stream) => new ReadableStreamWrapper(stream),
        asWritableStream: (stream) => new WritableStreamWrapper(stream)
      }),
      console,
      timer: Object.freeze({
        setTimeout(callback, ms, ...args2) {
          const handle2 = setTimeout(callback, ms, ...args2);
          return { dispose: () => clearTimeout(handle2) };
        },
        setImmediate(callback, ...args2) {
          const handle2 = setImmediate(callback, ...args2);
          return { dispose: () => clearImmediate(handle2) };
        },
        setInterval(callback, ms, ...args2) {
          const handle2 = setInterval(callback, ms, ...args2);
          return { dispose: () => clearInterval(handle2) };
        }
      })
    });
    function RIL() {
      return _ril;
    }
    (function(RIL2) {
      function install() {
        api_1.RAL.install(_ril);
      }
      RIL2.install = install;
    })(RIL || (RIL = {}));
    exports2.default = RIL;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/node/main.js
var require_main = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/node/main.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createMessageConnection = exports2.createServerSocketTransport = exports2.createClientSocketTransport = exports2.createServerPipeTransport = exports2.createClientPipeTransport = exports2.generateRandomPipeName = exports2.StreamMessageWriter = exports2.StreamMessageReader = exports2.SocketMessageWriter = exports2.SocketMessageReader = exports2.PortMessageWriter = exports2.PortMessageReader = exports2.IPCMessageWriter = exports2.IPCMessageReader = void 0;
    var ril_1 = require_ril();
    ril_1.default.install();
    var path = require("path");
    var os = require("os");
    var crypto_1 = require("crypto");
    var net_1 = require("net");
    var api_1 = require_api();
    __exportStar(require_api(), exports2);
    var IPCMessageReader = class extends api_1.AbstractMessageReader {
      constructor(process2) {
        super();
        this.process = process2;
        let eventEmitter = this.process;
        eventEmitter.on("error", (error) => this.fireError(error));
        eventEmitter.on("close", () => this.fireClose());
      }
      listen(callback) {
        this.process.on("message", callback);
        return api_1.Disposable.create(() => this.process.off("message", callback));
      }
    };
    exports2.IPCMessageReader = IPCMessageReader;
    var IPCMessageWriter = class extends api_1.AbstractMessageWriter {
      constructor(process2) {
        super();
        this.process = process2;
        this.errorCount = 0;
        const eventEmitter = this.process;
        eventEmitter.on("error", (error) => this.fireError(error));
        eventEmitter.on("close", () => this.fireClose);
      }
      write(msg) {
        try {
          if (typeof this.process.send === "function") {
            this.process.send(msg, void 0, void 0, (error) => {
              if (error) {
                this.errorCount++;
                this.handleError(error, msg);
              } else {
                this.errorCount = 0;
              }
            });
          }
          return Promise.resolve();
        } catch (error) {
          this.handleError(error, msg);
          return Promise.reject(error);
        }
      }
      handleError(error, msg) {
        this.errorCount++;
        this.fireError(error, msg, this.errorCount);
      }
      end() {
      }
    };
    exports2.IPCMessageWriter = IPCMessageWriter;
    var PortMessageReader = class extends api_1.AbstractMessageReader {
      constructor(port) {
        super();
        this.onData = new api_1.Emitter();
        port.on("close", () => this.fireClose);
        port.on("error", (error) => this.fireError(error));
        port.on("message", (message) => {
          this.onData.fire(message);
        });
      }
      listen(callback) {
        return this.onData.event(callback);
      }
    };
    exports2.PortMessageReader = PortMessageReader;
    var PortMessageWriter = class extends api_1.AbstractMessageWriter {
      constructor(port) {
        super();
        this.port = port;
        this.errorCount = 0;
        port.on("close", () => this.fireClose());
        port.on("error", (error) => this.fireError(error));
      }
      write(msg) {
        try {
          this.port.postMessage(msg);
          return Promise.resolve();
        } catch (error) {
          this.handleError(error, msg);
          return Promise.reject(error);
        }
      }
      handleError(error, msg) {
        this.errorCount++;
        this.fireError(error, msg, this.errorCount);
      }
      end() {
      }
    };
    exports2.PortMessageWriter = PortMessageWriter;
    var SocketMessageReader = class extends api_1.ReadableStreamMessageReader {
      constructor(socket, encoding = "utf-8") {
        super((0, ril_1.default)().stream.asReadableStream(socket), encoding);
      }
    };
    exports2.SocketMessageReader = SocketMessageReader;
    var SocketMessageWriter = class extends api_1.WriteableStreamMessageWriter {
      constructor(socket, options) {
        super((0, ril_1.default)().stream.asWritableStream(socket), options);
        this.socket = socket;
      }
      dispose() {
        super.dispose();
        this.socket.destroy();
      }
    };
    exports2.SocketMessageWriter = SocketMessageWriter;
    var StreamMessageReader = class extends api_1.ReadableStreamMessageReader {
      constructor(readable, encoding) {
        super((0, ril_1.default)().stream.asReadableStream(readable), encoding);
      }
    };
    exports2.StreamMessageReader = StreamMessageReader;
    var StreamMessageWriter = class extends api_1.WriteableStreamMessageWriter {
      constructor(writable, options) {
        super((0, ril_1.default)().stream.asWritableStream(writable), options);
      }
    };
    exports2.StreamMessageWriter = StreamMessageWriter;
    var XDG_RUNTIME_DIR = process.env["XDG_RUNTIME_DIR"];
    var safeIpcPathLengths = /* @__PURE__ */ new Map([
      ["linux", 107],
      ["darwin", 103]
    ]);
    function generateRandomPipeName() {
      const randomSuffix = (0, crypto_1.randomBytes)(21).toString("hex");
      if (process.platform === "win32") {
        return `\\\\.\\pipe\\vscode-jsonrpc-${randomSuffix}-sock`;
      }
      let result;
      if (XDG_RUNTIME_DIR) {
        result = path.join(XDG_RUNTIME_DIR, `vscode-ipc-${randomSuffix}.sock`);
      } else {
        result = path.join(os.tmpdir(), `vscode-${randomSuffix}.sock`);
      }
      const limit = safeIpcPathLengths.get(process.platform);
      if (limit !== void 0 && result.length > limit) {
        (0, ril_1.default)().console.warn(`WARNING: IPC handle "${result}" is longer than ${limit} characters.`);
      }
      return result;
    }
    exports2.generateRandomPipeName = generateRandomPipeName;
    function createClientPipeTransport(pipeName, encoding = "utf-8") {
      let connectResolve;
      const connected = new Promise((resolve, _reject) => {
        connectResolve = resolve;
      });
      return new Promise((resolve, reject) => {
        let server = (0, net_1.createServer)((socket) => {
          server.close();
          connectResolve([
            new SocketMessageReader(socket, encoding),
            new SocketMessageWriter(socket, encoding)
          ]);
        });
        server.on("error", reject);
        server.listen(pipeName, () => {
          server.removeListener("error", reject);
          resolve({
            onConnected: () => {
              return connected;
            }
          });
        });
      });
    }
    exports2.createClientPipeTransport = createClientPipeTransport;
    function createServerPipeTransport(pipeName, encoding = "utf-8") {
      const socket = (0, net_1.createConnection)(pipeName);
      return [
        new SocketMessageReader(socket, encoding),
        new SocketMessageWriter(socket, encoding)
      ];
    }
    exports2.createServerPipeTransport = createServerPipeTransport;
    function createClientSocketTransport(port, encoding = "utf-8") {
      let connectResolve;
      const connected = new Promise((resolve, _reject) => {
        connectResolve = resolve;
      });
      return new Promise((resolve, reject) => {
        const server = (0, net_1.createServer)((socket) => {
          server.close();
          connectResolve([
            new SocketMessageReader(socket, encoding),
            new SocketMessageWriter(socket, encoding)
          ]);
        });
        server.on("error", reject);
        server.listen(port, "127.0.0.1", () => {
          server.removeListener("error", reject);
          resolve({
            onConnected: () => {
              return connected;
            }
          });
        });
      });
    }
    exports2.createClientSocketTransport = createClientSocketTransport;
    function createServerSocketTransport(port, encoding = "utf-8") {
      const socket = (0, net_1.createConnection)(port, "127.0.0.1");
      return [
        new SocketMessageReader(socket, encoding),
        new SocketMessageWriter(socket, encoding)
      ];
    }
    exports2.createServerSocketTransport = createServerSocketTransport;
    function isReadableStream(value) {
      const candidate = value;
      return candidate.read !== void 0 && candidate.addListener !== void 0;
    }
    function isWritableStream(value) {
      const candidate = value;
      return candidate.write !== void 0 && candidate.addListener !== void 0;
    }
    function createMessageConnection(input, output, logger, options) {
      if (!logger) {
        logger = api_1.NullLogger;
      }
      const reader = isReadableStream(input) ? new StreamMessageReader(input) : input;
      const writer = isWritableStream(output) ? new StreamMessageWriter(output) : output;
      if (api_1.ConnectionStrategy.is(options)) {
        options = { connectionStrategy: options };
      }
      return (0, api_1.createMessageConnection)(reader, writer, logger, options);
    }
    exports2.createMessageConnection = createMessageConnection;
  }
});

// ../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/node.js
var require_node = __commonJS2({
  "../../node_modules/.pnpm/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/node.js"(exports2, module2) {
    "use strict";
    module2.exports = require_main();
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-types@3.17.5/node_modules/vscode-languageserver-types/lib/umd/main.js
var require_main2 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-types@3.17.5/node_modules/vscode-languageserver-types/lib/umd/main.js"(exports2, module2) {
    "use strict";
    (function(factory) {
      if (typeof module2 === "object" && typeof module2.exports === "object") {
        var v = factory(require, exports2);
        if (v !== void 0) module2.exports = v;
      } else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
      }
    })(function(require2, exports3) {
      "use strict";
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.TextDocument = exports3.EOL = exports3.WorkspaceFolder = exports3.InlineCompletionContext = exports3.SelectedCompletionInfo = exports3.InlineCompletionTriggerKind = exports3.InlineCompletionList = exports3.InlineCompletionItem = exports3.StringValue = exports3.InlayHint = exports3.InlayHintLabelPart = exports3.InlayHintKind = exports3.InlineValueContext = exports3.InlineValueEvaluatableExpression = exports3.InlineValueVariableLookup = exports3.InlineValueText = exports3.SemanticTokens = exports3.SemanticTokenModifiers = exports3.SemanticTokenTypes = exports3.SelectionRange = exports3.DocumentLink = exports3.FormattingOptions = exports3.CodeLens = exports3.CodeAction = exports3.CodeActionContext = exports3.CodeActionTriggerKind = exports3.CodeActionKind = exports3.DocumentSymbol = exports3.WorkspaceSymbol = exports3.SymbolInformation = exports3.SymbolTag = exports3.SymbolKind = exports3.DocumentHighlight = exports3.DocumentHighlightKind = exports3.SignatureInformation = exports3.ParameterInformation = exports3.Hover = exports3.MarkedString = exports3.CompletionList = exports3.CompletionItem = exports3.CompletionItemLabelDetails = exports3.InsertTextMode = exports3.InsertReplaceEdit = exports3.CompletionItemTag = exports3.InsertTextFormat = exports3.CompletionItemKind = exports3.MarkupContent = exports3.MarkupKind = exports3.TextDocumentItem = exports3.OptionalVersionedTextDocumentIdentifier = exports3.VersionedTextDocumentIdentifier = exports3.TextDocumentIdentifier = exports3.WorkspaceChange = exports3.WorkspaceEdit = exports3.DeleteFile = exports3.RenameFile = exports3.CreateFile = exports3.TextDocumentEdit = exports3.AnnotatedTextEdit = exports3.ChangeAnnotationIdentifier = exports3.ChangeAnnotation = exports3.TextEdit = exports3.Command = exports3.Diagnostic = exports3.CodeDescription = exports3.DiagnosticTag = exports3.DiagnosticSeverity = exports3.DiagnosticRelatedInformation = exports3.FoldingRange = exports3.FoldingRangeKind = exports3.ColorPresentation = exports3.ColorInformation = exports3.Color = exports3.LocationLink = exports3.Location = exports3.Range = exports3.Position = exports3.uinteger = exports3.integer = exports3.URI = exports3.DocumentUri = void 0;
      var DocumentUri;
      (function(DocumentUri2) {
        function is(value) {
          return typeof value === "string";
        }
        DocumentUri2.is = is;
      })(DocumentUri || (exports3.DocumentUri = DocumentUri = {}));
      var URI;
      (function(URI2) {
        function is(value) {
          return typeof value === "string";
        }
        URI2.is = is;
      })(URI || (exports3.URI = URI = {}));
      var integer;
      (function(integer2) {
        integer2.MIN_VALUE = -2147483648;
        integer2.MAX_VALUE = 2147483647;
        function is(value) {
          return typeof value === "number" && integer2.MIN_VALUE <= value && value <= integer2.MAX_VALUE;
        }
        integer2.is = is;
      })(integer || (exports3.integer = integer = {}));
      var uinteger;
      (function(uinteger2) {
        uinteger2.MIN_VALUE = 0;
        uinteger2.MAX_VALUE = 2147483647;
        function is(value) {
          return typeof value === "number" && uinteger2.MIN_VALUE <= value && value <= uinteger2.MAX_VALUE;
        }
        uinteger2.is = is;
      })(uinteger || (exports3.uinteger = uinteger = {}));
      var Position;
      (function(Position2) {
        function create(line, character) {
          if (line === Number.MAX_VALUE) {
            line = uinteger.MAX_VALUE;
          }
          if (character === Number.MAX_VALUE) {
            character = uinteger.MAX_VALUE;
          }
          return { line, character };
        }
        Position2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.uinteger(candidate.line) && Is.uinteger(candidate.character);
        }
        Position2.is = is;
      })(Position || (exports3.Position = Position = {}));
      var Range;
      (function(Range2) {
        function create(one, two, three, four) {
          if (Is.uinteger(one) && Is.uinteger(two) && Is.uinteger(three) && Is.uinteger(four)) {
            return { start: Position.create(one, two), end: Position.create(three, four) };
          } else if (Position.is(one) && Position.is(two)) {
            return { start: one, end: two };
          } else {
            throw new Error("Range#create called with invalid arguments[".concat(one, ", ").concat(two, ", ").concat(three, ", ").concat(four, "]"));
          }
        }
        Range2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Position.is(candidate.start) && Position.is(candidate.end);
        }
        Range2.is = is;
      })(Range || (exports3.Range = Range = {}));
      var Location;
      (function(Location2) {
        function create(uri, range) {
          return { uri, range };
        }
        Location2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Range.is(candidate.range) && (Is.string(candidate.uri) || Is.undefined(candidate.uri));
        }
        Location2.is = is;
      })(Location || (exports3.Location = Location = {}));
      var LocationLink;
      (function(LocationLink2) {
        function create(targetUri, targetRange, targetSelectionRange, originSelectionRange) {
          return { targetUri, targetRange, targetSelectionRange, originSelectionRange };
        }
        LocationLink2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Range.is(candidate.targetRange) && Is.string(candidate.targetUri) && Range.is(candidate.targetSelectionRange) && (Range.is(candidate.originSelectionRange) || Is.undefined(candidate.originSelectionRange));
        }
        LocationLink2.is = is;
      })(LocationLink || (exports3.LocationLink = LocationLink = {}));
      var Color;
      (function(Color2) {
        function create(red, green, blue, alpha) {
          return {
            red,
            green,
            blue,
            alpha
          };
        }
        Color2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.numberRange(candidate.red, 0, 1) && Is.numberRange(candidate.green, 0, 1) && Is.numberRange(candidate.blue, 0, 1) && Is.numberRange(candidate.alpha, 0, 1);
        }
        Color2.is = is;
      })(Color || (exports3.Color = Color = {}));
      var ColorInformation;
      (function(ColorInformation2) {
        function create(range, color) {
          return {
            range,
            color
          };
        }
        ColorInformation2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Range.is(candidate.range) && Color.is(candidate.color);
        }
        ColorInformation2.is = is;
      })(ColorInformation || (exports3.ColorInformation = ColorInformation = {}));
      var ColorPresentation;
      (function(ColorPresentation2) {
        function create(label, textEdit, additionalTextEdits) {
          return {
            label,
            textEdit,
            additionalTextEdits
          };
        }
        ColorPresentation2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.undefined(candidate.textEdit) || TextEdit.is(candidate)) && (Is.undefined(candidate.additionalTextEdits) || Is.typedArray(candidate.additionalTextEdits, TextEdit.is));
        }
        ColorPresentation2.is = is;
      })(ColorPresentation || (exports3.ColorPresentation = ColorPresentation = {}));
      var FoldingRangeKind;
      (function(FoldingRangeKind2) {
        FoldingRangeKind2.Comment = "comment";
        FoldingRangeKind2.Imports = "imports";
        FoldingRangeKind2.Region = "region";
      })(FoldingRangeKind || (exports3.FoldingRangeKind = FoldingRangeKind = {}));
      var FoldingRange;
      (function(FoldingRange2) {
        function create(startLine, endLine, startCharacter, endCharacter, kind, collapsedText) {
          var result = {
            startLine,
            endLine
          };
          if (Is.defined(startCharacter)) {
            result.startCharacter = startCharacter;
          }
          if (Is.defined(endCharacter)) {
            result.endCharacter = endCharacter;
          }
          if (Is.defined(kind)) {
            result.kind = kind;
          }
          if (Is.defined(collapsedText)) {
            result.collapsedText = collapsedText;
          }
          return result;
        }
        FoldingRange2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.uinteger(candidate.startLine) && Is.uinteger(candidate.startLine) && (Is.undefined(candidate.startCharacter) || Is.uinteger(candidate.startCharacter)) && (Is.undefined(candidate.endCharacter) || Is.uinteger(candidate.endCharacter)) && (Is.undefined(candidate.kind) || Is.string(candidate.kind));
        }
        FoldingRange2.is = is;
      })(FoldingRange || (exports3.FoldingRange = FoldingRange = {}));
      var DiagnosticRelatedInformation;
      (function(DiagnosticRelatedInformation2) {
        function create(location, message) {
          return {
            location,
            message
          };
        }
        DiagnosticRelatedInformation2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Location.is(candidate.location) && Is.string(candidate.message);
        }
        DiagnosticRelatedInformation2.is = is;
      })(DiagnosticRelatedInformation || (exports3.DiagnosticRelatedInformation = DiagnosticRelatedInformation = {}));
      var DiagnosticSeverity2;
      (function(DiagnosticSeverity3) {
        DiagnosticSeverity3.Error = 1;
        DiagnosticSeverity3.Warning = 2;
        DiagnosticSeverity3.Information = 3;
        DiagnosticSeverity3.Hint = 4;
      })(DiagnosticSeverity2 || (exports3.DiagnosticSeverity = DiagnosticSeverity2 = {}));
      var DiagnosticTag;
      (function(DiagnosticTag2) {
        DiagnosticTag2.Unnecessary = 1;
        DiagnosticTag2.Deprecated = 2;
      })(DiagnosticTag || (exports3.DiagnosticTag = DiagnosticTag = {}));
      var CodeDescription;
      (function(CodeDescription2) {
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.string(candidate.href);
        }
        CodeDescription2.is = is;
      })(CodeDescription || (exports3.CodeDescription = CodeDescription = {}));
      var Diagnostic;
      (function(Diagnostic2) {
        function create(range, message, severity, code, source, relatedInformation) {
          var result = { range, message };
          if (Is.defined(severity)) {
            result.severity = severity;
          }
          if (Is.defined(code)) {
            result.code = code;
          }
          if (Is.defined(source)) {
            result.source = source;
          }
          if (Is.defined(relatedInformation)) {
            result.relatedInformation = relatedInformation;
          }
          return result;
        }
        Diagnostic2.create = create;
        function is(value) {
          var _a;
          var candidate = value;
          return Is.defined(candidate) && Range.is(candidate.range) && Is.string(candidate.message) && (Is.number(candidate.severity) || Is.undefined(candidate.severity)) && (Is.integer(candidate.code) || Is.string(candidate.code) || Is.undefined(candidate.code)) && (Is.undefined(candidate.codeDescription) || Is.string((_a = candidate.codeDescription) === null || _a === void 0 ? void 0 : _a.href)) && (Is.string(candidate.source) || Is.undefined(candidate.source)) && (Is.undefined(candidate.relatedInformation) || Is.typedArray(candidate.relatedInformation, DiagnosticRelatedInformation.is));
        }
        Diagnostic2.is = is;
      })(Diagnostic || (exports3.Diagnostic = Diagnostic = {}));
      var Command;
      (function(Command2) {
        function create(title, command) {
          var args2 = [];
          for (var _i = 2; _i < arguments.length; _i++) {
            args2[_i - 2] = arguments[_i];
          }
          var result = { title, command };
          if (Is.defined(args2) && args2.length > 0) {
            result.arguments = args2;
          }
          return result;
        }
        Command2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.title) && Is.string(candidate.command);
        }
        Command2.is = is;
      })(Command || (exports3.Command = Command = {}));
      var TextEdit;
      (function(TextEdit2) {
        function replace(range, newText) {
          return { range, newText };
        }
        TextEdit2.replace = replace;
        function insert(position, newText) {
          return { range: { start: position, end: position }, newText };
        }
        TextEdit2.insert = insert;
        function del(range) {
          return { range, newText: "" };
        }
        TextEdit2.del = del;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.string(candidate.newText) && Range.is(candidate.range);
        }
        TextEdit2.is = is;
      })(TextEdit || (exports3.TextEdit = TextEdit = {}));
      var ChangeAnnotation;
      (function(ChangeAnnotation2) {
        function create(label, needsConfirmation, description) {
          var result = { label };
          if (needsConfirmation !== void 0) {
            result.needsConfirmation = needsConfirmation;
          }
          if (description !== void 0) {
            result.description = description;
          }
          return result;
        }
        ChangeAnnotation2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.boolean(candidate.needsConfirmation) || candidate.needsConfirmation === void 0) && (Is.string(candidate.description) || candidate.description === void 0);
        }
        ChangeAnnotation2.is = is;
      })(ChangeAnnotation || (exports3.ChangeAnnotation = ChangeAnnotation = {}));
      var ChangeAnnotationIdentifier;
      (function(ChangeAnnotationIdentifier2) {
        function is(value) {
          var candidate = value;
          return Is.string(candidate);
        }
        ChangeAnnotationIdentifier2.is = is;
      })(ChangeAnnotationIdentifier || (exports3.ChangeAnnotationIdentifier = ChangeAnnotationIdentifier = {}));
      var AnnotatedTextEdit;
      (function(AnnotatedTextEdit2) {
        function replace(range, newText, annotation) {
          return { range, newText, annotationId: annotation };
        }
        AnnotatedTextEdit2.replace = replace;
        function insert(position, newText, annotation) {
          return { range: { start: position, end: position }, newText, annotationId: annotation };
        }
        AnnotatedTextEdit2.insert = insert;
        function del(range, annotation) {
          return { range, newText: "", annotationId: annotation };
        }
        AnnotatedTextEdit2.del = del;
        function is(value) {
          var candidate = value;
          return TextEdit.is(candidate) && (ChangeAnnotation.is(candidate.annotationId) || ChangeAnnotationIdentifier.is(candidate.annotationId));
        }
        AnnotatedTextEdit2.is = is;
      })(AnnotatedTextEdit || (exports3.AnnotatedTextEdit = AnnotatedTextEdit = {}));
      var TextDocumentEdit;
      (function(TextDocumentEdit2) {
        function create(textDocument, edits) {
          return { textDocument, edits };
        }
        TextDocumentEdit2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && OptionalVersionedTextDocumentIdentifier.is(candidate.textDocument) && Array.isArray(candidate.edits);
        }
        TextDocumentEdit2.is = is;
      })(TextDocumentEdit || (exports3.TextDocumentEdit = TextDocumentEdit = {}));
      var CreateFile;
      (function(CreateFile2) {
        function create(uri, options, annotation) {
          var result = {
            kind: "create",
            uri
          };
          if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) {
            result.options = options;
          }
          if (annotation !== void 0) {
            result.annotationId = annotation;
          }
          return result;
        }
        CreateFile2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && candidate.kind === "create" && Is.string(candidate.uri) && (candidate.options === void 0 || (candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
        }
        CreateFile2.is = is;
      })(CreateFile || (exports3.CreateFile = CreateFile = {}));
      var RenameFile;
      (function(RenameFile2) {
        function create(oldUri, newUri, options, annotation) {
          var result = {
            kind: "rename",
            oldUri,
            newUri
          };
          if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) {
            result.options = options;
          }
          if (annotation !== void 0) {
            result.annotationId = annotation;
          }
          return result;
        }
        RenameFile2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && candidate.kind === "rename" && Is.string(candidate.oldUri) && Is.string(candidate.newUri) && (candidate.options === void 0 || (candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
        }
        RenameFile2.is = is;
      })(RenameFile || (exports3.RenameFile = RenameFile = {}));
      var DeleteFile;
      (function(DeleteFile2) {
        function create(uri, options, annotation) {
          var result = {
            kind: "delete",
            uri
          };
          if (options !== void 0 && (options.recursive !== void 0 || options.ignoreIfNotExists !== void 0)) {
            result.options = options;
          }
          if (annotation !== void 0) {
            result.annotationId = annotation;
          }
          return result;
        }
        DeleteFile2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && candidate.kind === "delete" && Is.string(candidate.uri) && (candidate.options === void 0 || (candidate.options.recursive === void 0 || Is.boolean(candidate.options.recursive)) && (candidate.options.ignoreIfNotExists === void 0 || Is.boolean(candidate.options.ignoreIfNotExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
        }
        DeleteFile2.is = is;
      })(DeleteFile || (exports3.DeleteFile = DeleteFile = {}));
      var WorkspaceEdit;
      (function(WorkspaceEdit2) {
        function is(value) {
          var candidate = value;
          return candidate && (candidate.changes !== void 0 || candidate.documentChanges !== void 0) && (candidate.documentChanges === void 0 || candidate.documentChanges.every(function(change) {
            if (Is.string(change.kind)) {
              return CreateFile.is(change) || RenameFile.is(change) || DeleteFile.is(change);
            } else {
              return TextDocumentEdit.is(change);
            }
          }));
        }
        WorkspaceEdit2.is = is;
      })(WorkspaceEdit || (exports3.WorkspaceEdit = WorkspaceEdit = {}));
      var TextEditChangeImpl = (
        /** @class */
        function() {
          function TextEditChangeImpl2(edits, changeAnnotations) {
            this.edits = edits;
            this.changeAnnotations = changeAnnotations;
          }
          TextEditChangeImpl2.prototype.insert = function(position, newText, annotation) {
            var edit;
            var id;
            if (annotation === void 0) {
              edit = TextEdit.insert(position, newText);
            } else if (ChangeAnnotationIdentifier.is(annotation)) {
              id = annotation;
              edit = AnnotatedTextEdit.insert(position, newText, annotation);
            } else {
              this.assertChangeAnnotations(this.changeAnnotations);
              id = this.changeAnnotations.manage(annotation);
              edit = AnnotatedTextEdit.insert(position, newText, id);
            }
            this.edits.push(edit);
            if (id !== void 0) {
              return id;
            }
          };
          TextEditChangeImpl2.prototype.replace = function(range, newText, annotation) {
            var edit;
            var id;
            if (annotation === void 0) {
              edit = TextEdit.replace(range, newText);
            } else if (ChangeAnnotationIdentifier.is(annotation)) {
              id = annotation;
              edit = AnnotatedTextEdit.replace(range, newText, annotation);
            } else {
              this.assertChangeAnnotations(this.changeAnnotations);
              id = this.changeAnnotations.manage(annotation);
              edit = AnnotatedTextEdit.replace(range, newText, id);
            }
            this.edits.push(edit);
            if (id !== void 0) {
              return id;
            }
          };
          TextEditChangeImpl2.prototype.delete = function(range, annotation) {
            var edit;
            var id;
            if (annotation === void 0) {
              edit = TextEdit.del(range);
            } else if (ChangeAnnotationIdentifier.is(annotation)) {
              id = annotation;
              edit = AnnotatedTextEdit.del(range, annotation);
            } else {
              this.assertChangeAnnotations(this.changeAnnotations);
              id = this.changeAnnotations.manage(annotation);
              edit = AnnotatedTextEdit.del(range, id);
            }
            this.edits.push(edit);
            if (id !== void 0) {
              return id;
            }
          };
          TextEditChangeImpl2.prototype.add = function(edit) {
            this.edits.push(edit);
          };
          TextEditChangeImpl2.prototype.all = function() {
            return this.edits;
          };
          TextEditChangeImpl2.prototype.clear = function() {
            this.edits.splice(0, this.edits.length);
          };
          TextEditChangeImpl2.prototype.assertChangeAnnotations = function(value) {
            if (value === void 0) {
              throw new Error("Text edit change is not configured to manage change annotations.");
            }
          };
          return TextEditChangeImpl2;
        }()
      );
      var ChangeAnnotations = (
        /** @class */
        function() {
          function ChangeAnnotations2(annotations) {
            this._annotations = annotations === void 0 ? /* @__PURE__ */ Object.create(null) : annotations;
            this._counter = 0;
            this._size = 0;
          }
          ChangeAnnotations2.prototype.all = function() {
            return this._annotations;
          };
          Object.defineProperty(ChangeAnnotations2.prototype, "size", {
            get: function() {
              return this._size;
            },
            enumerable: false,
            configurable: true
          });
          ChangeAnnotations2.prototype.manage = function(idOrAnnotation, annotation) {
            var id;
            if (ChangeAnnotationIdentifier.is(idOrAnnotation)) {
              id = idOrAnnotation;
            } else {
              id = this.nextId();
              annotation = idOrAnnotation;
            }
            if (this._annotations[id] !== void 0) {
              throw new Error("Id ".concat(id, " is already in use."));
            }
            if (annotation === void 0) {
              throw new Error("No annotation provided for id ".concat(id));
            }
            this._annotations[id] = annotation;
            this._size++;
            return id;
          };
          ChangeAnnotations2.prototype.nextId = function() {
            this._counter++;
            return this._counter.toString();
          };
          return ChangeAnnotations2;
        }()
      );
      var WorkspaceChange = (
        /** @class */
        function() {
          function WorkspaceChange2(workspaceEdit) {
            var _this = this;
            this._textEditChanges = /* @__PURE__ */ Object.create(null);
            if (workspaceEdit !== void 0) {
              this._workspaceEdit = workspaceEdit;
              if (workspaceEdit.documentChanges) {
                this._changeAnnotations = new ChangeAnnotations(workspaceEdit.changeAnnotations);
                workspaceEdit.changeAnnotations = this._changeAnnotations.all();
                workspaceEdit.documentChanges.forEach(function(change) {
                  if (TextDocumentEdit.is(change)) {
                    var textEditChange = new TextEditChangeImpl(change.edits, _this._changeAnnotations);
                    _this._textEditChanges[change.textDocument.uri] = textEditChange;
                  }
                });
              } else if (workspaceEdit.changes) {
                Object.keys(workspaceEdit.changes).forEach(function(key) {
                  var textEditChange = new TextEditChangeImpl(workspaceEdit.changes[key]);
                  _this._textEditChanges[key] = textEditChange;
                });
              }
            } else {
              this._workspaceEdit = {};
            }
          }
          Object.defineProperty(WorkspaceChange2.prototype, "edit", {
            /**
             * Returns the underlying {@link WorkspaceEdit} literal
             * use to be returned from a workspace edit operation like rename.
             */
            get: function() {
              this.initDocumentChanges();
              if (this._changeAnnotations !== void 0) {
                if (this._changeAnnotations.size === 0) {
                  this._workspaceEdit.changeAnnotations = void 0;
                } else {
                  this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
                }
              }
              return this._workspaceEdit;
            },
            enumerable: false,
            configurable: true
          });
          WorkspaceChange2.prototype.getTextEditChange = function(key) {
            if (OptionalVersionedTextDocumentIdentifier.is(key)) {
              this.initDocumentChanges();
              if (this._workspaceEdit.documentChanges === void 0) {
                throw new Error("Workspace edit is not configured for document changes.");
              }
              var textDocument = { uri: key.uri, version: key.version };
              var result = this._textEditChanges[textDocument.uri];
              if (!result) {
                var edits = [];
                var textDocumentEdit = {
                  textDocument,
                  edits
                };
                this._workspaceEdit.documentChanges.push(textDocumentEdit);
                result = new TextEditChangeImpl(edits, this._changeAnnotations);
                this._textEditChanges[textDocument.uri] = result;
              }
              return result;
            } else {
              this.initChanges();
              if (this._workspaceEdit.changes === void 0) {
                throw new Error("Workspace edit is not configured for normal text edit changes.");
              }
              var result = this._textEditChanges[key];
              if (!result) {
                var edits = [];
                this._workspaceEdit.changes[key] = edits;
                result = new TextEditChangeImpl(edits);
                this._textEditChanges[key] = result;
              }
              return result;
            }
          };
          WorkspaceChange2.prototype.initDocumentChanges = function() {
            if (this._workspaceEdit.documentChanges === void 0 && this._workspaceEdit.changes === void 0) {
              this._changeAnnotations = new ChangeAnnotations();
              this._workspaceEdit.documentChanges = [];
              this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
            }
          };
          WorkspaceChange2.prototype.initChanges = function() {
            if (this._workspaceEdit.documentChanges === void 0 && this._workspaceEdit.changes === void 0) {
              this._workspaceEdit.changes = /* @__PURE__ */ Object.create(null);
            }
          };
          WorkspaceChange2.prototype.createFile = function(uri, optionsOrAnnotation, options) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === void 0) {
              throw new Error("Workspace edit is not configured for document changes.");
            }
            var annotation;
            if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
              annotation = optionsOrAnnotation;
            } else {
              options = optionsOrAnnotation;
            }
            var operation;
            var id;
            if (annotation === void 0) {
              operation = CreateFile.create(uri, options);
            } else {
              id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
              operation = CreateFile.create(uri, options, id);
            }
            this._workspaceEdit.documentChanges.push(operation);
            if (id !== void 0) {
              return id;
            }
          };
          WorkspaceChange2.prototype.renameFile = function(oldUri, newUri, optionsOrAnnotation, options) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === void 0) {
              throw new Error("Workspace edit is not configured for document changes.");
            }
            var annotation;
            if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
              annotation = optionsOrAnnotation;
            } else {
              options = optionsOrAnnotation;
            }
            var operation;
            var id;
            if (annotation === void 0) {
              operation = RenameFile.create(oldUri, newUri, options);
            } else {
              id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
              operation = RenameFile.create(oldUri, newUri, options, id);
            }
            this._workspaceEdit.documentChanges.push(operation);
            if (id !== void 0) {
              return id;
            }
          };
          WorkspaceChange2.prototype.deleteFile = function(uri, optionsOrAnnotation, options) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === void 0) {
              throw new Error("Workspace edit is not configured for document changes.");
            }
            var annotation;
            if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
              annotation = optionsOrAnnotation;
            } else {
              options = optionsOrAnnotation;
            }
            var operation;
            var id;
            if (annotation === void 0) {
              operation = DeleteFile.create(uri, options);
            } else {
              id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
              operation = DeleteFile.create(uri, options, id);
            }
            this._workspaceEdit.documentChanges.push(operation);
            if (id !== void 0) {
              return id;
            }
          };
          return WorkspaceChange2;
        }()
      );
      exports3.WorkspaceChange = WorkspaceChange;
      var TextDocumentIdentifier;
      (function(TextDocumentIdentifier2) {
        function create(uri) {
          return { uri };
        }
        TextDocumentIdentifier2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri);
        }
        TextDocumentIdentifier2.is = is;
      })(TextDocumentIdentifier || (exports3.TextDocumentIdentifier = TextDocumentIdentifier = {}));
      var VersionedTextDocumentIdentifier;
      (function(VersionedTextDocumentIdentifier2) {
        function create(uri, version) {
          return { uri, version };
        }
        VersionedTextDocumentIdentifier2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri) && Is.integer(candidate.version);
        }
        VersionedTextDocumentIdentifier2.is = is;
      })(VersionedTextDocumentIdentifier || (exports3.VersionedTextDocumentIdentifier = VersionedTextDocumentIdentifier = {}));
      var OptionalVersionedTextDocumentIdentifier;
      (function(OptionalVersionedTextDocumentIdentifier2) {
        function create(uri, version) {
          return { uri, version };
        }
        OptionalVersionedTextDocumentIdentifier2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri) && (candidate.version === null || Is.integer(candidate.version));
        }
        OptionalVersionedTextDocumentIdentifier2.is = is;
      })(OptionalVersionedTextDocumentIdentifier || (exports3.OptionalVersionedTextDocumentIdentifier = OptionalVersionedTextDocumentIdentifier = {}));
      var TextDocumentItem;
      (function(TextDocumentItem2) {
        function create(uri, languageId, version, text) {
          return { uri, languageId, version, text };
        }
        TextDocumentItem2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri) && Is.string(candidate.languageId) && Is.integer(candidate.version) && Is.string(candidate.text);
        }
        TextDocumentItem2.is = is;
      })(TextDocumentItem || (exports3.TextDocumentItem = TextDocumentItem = {}));
      var MarkupKind2;
      (function(MarkupKind3) {
        MarkupKind3.PlainText = "plaintext";
        MarkupKind3.Markdown = "markdown";
        function is(value) {
          var candidate = value;
          return candidate === MarkupKind3.PlainText || candidate === MarkupKind3.Markdown;
        }
        MarkupKind3.is = is;
      })(MarkupKind2 || (exports3.MarkupKind = MarkupKind2 = {}));
      var MarkupContent;
      (function(MarkupContent2) {
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(value) && MarkupKind2.is(candidate.kind) && Is.string(candidate.value);
        }
        MarkupContent2.is = is;
      })(MarkupContent || (exports3.MarkupContent = MarkupContent = {}));
      var CompletionItemKind3;
      (function(CompletionItemKind4) {
        CompletionItemKind4.Text = 1;
        CompletionItemKind4.Method = 2;
        CompletionItemKind4.Function = 3;
        CompletionItemKind4.Constructor = 4;
        CompletionItemKind4.Field = 5;
        CompletionItemKind4.Variable = 6;
        CompletionItemKind4.Class = 7;
        CompletionItemKind4.Interface = 8;
        CompletionItemKind4.Module = 9;
        CompletionItemKind4.Property = 10;
        CompletionItemKind4.Unit = 11;
        CompletionItemKind4.Value = 12;
        CompletionItemKind4.Enum = 13;
        CompletionItemKind4.Keyword = 14;
        CompletionItemKind4.Snippet = 15;
        CompletionItemKind4.Color = 16;
        CompletionItemKind4.File = 17;
        CompletionItemKind4.Reference = 18;
        CompletionItemKind4.Folder = 19;
        CompletionItemKind4.EnumMember = 20;
        CompletionItemKind4.Constant = 21;
        CompletionItemKind4.Struct = 22;
        CompletionItemKind4.Event = 23;
        CompletionItemKind4.Operator = 24;
        CompletionItemKind4.TypeParameter = 25;
      })(CompletionItemKind3 || (exports3.CompletionItemKind = CompletionItemKind3 = {}));
      var InsertTextFormat;
      (function(InsertTextFormat2) {
        InsertTextFormat2.PlainText = 1;
        InsertTextFormat2.Snippet = 2;
      })(InsertTextFormat || (exports3.InsertTextFormat = InsertTextFormat = {}));
      var CompletionItemTag;
      (function(CompletionItemTag2) {
        CompletionItemTag2.Deprecated = 1;
      })(CompletionItemTag || (exports3.CompletionItemTag = CompletionItemTag = {}));
      var InsertReplaceEdit;
      (function(InsertReplaceEdit2) {
        function create(newText, insert, replace) {
          return { newText, insert, replace };
        }
        InsertReplaceEdit2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && Is.string(candidate.newText) && Range.is(candidate.insert) && Range.is(candidate.replace);
        }
        InsertReplaceEdit2.is = is;
      })(InsertReplaceEdit || (exports3.InsertReplaceEdit = InsertReplaceEdit = {}));
      var InsertTextMode;
      (function(InsertTextMode2) {
        InsertTextMode2.asIs = 1;
        InsertTextMode2.adjustIndentation = 2;
      })(InsertTextMode || (exports3.InsertTextMode = InsertTextMode = {}));
      var CompletionItemLabelDetails;
      (function(CompletionItemLabelDetails2) {
        function is(value) {
          var candidate = value;
          return candidate && (Is.string(candidate.detail) || candidate.detail === void 0) && (Is.string(candidate.description) || candidate.description === void 0);
        }
        CompletionItemLabelDetails2.is = is;
      })(CompletionItemLabelDetails || (exports3.CompletionItemLabelDetails = CompletionItemLabelDetails = {}));
      var CompletionItem;
      (function(CompletionItem2) {
        function create(label) {
          return { label };
        }
        CompletionItem2.create = create;
      })(CompletionItem || (exports3.CompletionItem = CompletionItem = {}));
      var CompletionList;
      (function(CompletionList2) {
        function create(items, isIncomplete) {
          return { items: items ? items : [], isIncomplete: !!isIncomplete };
        }
        CompletionList2.create = create;
      })(CompletionList || (exports3.CompletionList = CompletionList = {}));
      var MarkedString;
      (function(MarkedString2) {
        function fromPlainText(plainText) {
          return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
        }
        MarkedString2.fromPlainText = fromPlainText;
        function is(value) {
          var candidate = value;
          return Is.string(candidate) || Is.objectLiteral(candidate) && Is.string(candidate.language) && Is.string(candidate.value);
        }
        MarkedString2.is = is;
      })(MarkedString || (exports3.MarkedString = MarkedString = {}));
      var Hover;
      (function(Hover2) {
        function is(value) {
          var candidate = value;
          return !!candidate && Is.objectLiteral(candidate) && (MarkupContent.is(candidate.contents) || MarkedString.is(candidate.contents) || Is.typedArray(candidate.contents, MarkedString.is)) && (value.range === void 0 || Range.is(value.range));
        }
        Hover2.is = is;
      })(Hover || (exports3.Hover = Hover = {}));
      var ParameterInformation;
      (function(ParameterInformation2) {
        function create(label, documentation) {
          return documentation ? { label, documentation } : { label };
        }
        ParameterInformation2.create = create;
      })(ParameterInformation || (exports3.ParameterInformation = ParameterInformation = {}));
      var SignatureInformation;
      (function(SignatureInformation2) {
        function create(label, documentation) {
          var parameters = [];
          for (var _i = 2; _i < arguments.length; _i++) {
            parameters[_i - 2] = arguments[_i];
          }
          var result = { label };
          if (Is.defined(documentation)) {
            result.documentation = documentation;
          }
          if (Is.defined(parameters)) {
            result.parameters = parameters;
          } else {
            result.parameters = [];
          }
          return result;
        }
        SignatureInformation2.create = create;
      })(SignatureInformation || (exports3.SignatureInformation = SignatureInformation = {}));
      var DocumentHighlightKind;
      (function(DocumentHighlightKind2) {
        DocumentHighlightKind2.Text = 1;
        DocumentHighlightKind2.Read = 2;
        DocumentHighlightKind2.Write = 3;
      })(DocumentHighlightKind || (exports3.DocumentHighlightKind = DocumentHighlightKind = {}));
      var DocumentHighlight;
      (function(DocumentHighlight2) {
        function create(range, kind) {
          var result = { range };
          if (Is.number(kind)) {
            result.kind = kind;
          }
          return result;
        }
        DocumentHighlight2.create = create;
      })(DocumentHighlight || (exports3.DocumentHighlight = DocumentHighlight = {}));
      var SymbolKind;
      (function(SymbolKind2) {
        SymbolKind2.File = 1;
        SymbolKind2.Module = 2;
        SymbolKind2.Namespace = 3;
        SymbolKind2.Package = 4;
        SymbolKind2.Class = 5;
        SymbolKind2.Method = 6;
        SymbolKind2.Property = 7;
        SymbolKind2.Field = 8;
        SymbolKind2.Constructor = 9;
        SymbolKind2.Enum = 10;
        SymbolKind2.Interface = 11;
        SymbolKind2.Function = 12;
        SymbolKind2.Variable = 13;
        SymbolKind2.Constant = 14;
        SymbolKind2.String = 15;
        SymbolKind2.Number = 16;
        SymbolKind2.Boolean = 17;
        SymbolKind2.Array = 18;
        SymbolKind2.Object = 19;
        SymbolKind2.Key = 20;
        SymbolKind2.Null = 21;
        SymbolKind2.EnumMember = 22;
        SymbolKind2.Struct = 23;
        SymbolKind2.Event = 24;
        SymbolKind2.Operator = 25;
        SymbolKind2.TypeParameter = 26;
      })(SymbolKind || (exports3.SymbolKind = SymbolKind = {}));
      var SymbolTag;
      (function(SymbolTag2) {
        SymbolTag2.Deprecated = 1;
      })(SymbolTag || (exports3.SymbolTag = SymbolTag = {}));
      var SymbolInformation;
      (function(SymbolInformation2) {
        function create(name2, kind, range, uri, containerName) {
          var result = {
            name: name2,
            kind,
            location: { uri, range }
          };
          if (containerName) {
            result.containerName = containerName;
          }
          return result;
        }
        SymbolInformation2.create = create;
      })(SymbolInformation || (exports3.SymbolInformation = SymbolInformation = {}));
      var WorkspaceSymbol;
      (function(WorkspaceSymbol2) {
        function create(name2, kind, uri, range) {
          return range !== void 0 ? { name: name2, kind, location: { uri, range } } : { name: name2, kind, location: { uri } };
        }
        WorkspaceSymbol2.create = create;
      })(WorkspaceSymbol || (exports3.WorkspaceSymbol = WorkspaceSymbol = {}));
      var DocumentSymbol;
      (function(DocumentSymbol2) {
        function create(name2, detail, kind, range, selectionRange, children) {
          var result = {
            name: name2,
            detail,
            kind,
            range,
            selectionRange
          };
          if (children !== void 0) {
            result.children = children;
          }
          return result;
        }
        DocumentSymbol2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && Is.string(candidate.name) && Is.number(candidate.kind) && Range.is(candidate.range) && Range.is(candidate.selectionRange) && (candidate.detail === void 0 || Is.string(candidate.detail)) && (candidate.deprecated === void 0 || Is.boolean(candidate.deprecated)) && (candidate.children === void 0 || Array.isArray(candidate.children)) && (candidate.tags === void 0 || Array.isArray(candidate.tags));
        }
        DocumentSymbol2.is = is;
      })(DocumentSymbol || (exports3.DocumentSymbol = DocumentSymbol = {}));
      var CodeActionKind;
      (function(CodeActionKind2) {
        CodeActionKind2.Empty = "";
        CodeActionKind2.QuickFix = "quickfix";
        CodeActionKind2.Refactor = "refactor";
        CodeActionKind2.RefactorExtract = "refactor.extract";
        CodeActionKind2.RefactorInline = "refactor.inline";
        CodeActionKind2.RefactorRewrite = "refactor.rewrite";
        CodeActionKind2.Source = "source";
        CodeActionKind2.SourceOrganizeImports = "source.organizeImports";
        CodeActionKind2.SourceFixAll = "source.fixAll";
      })(CodeActionKind || (exports3.CodeActionKind = CodeActionKind = {}));
      var CodeActionTriggerKind;
      (function(CodeActionTriggerKind2) {
        CodeActionTriggerKind2.Invoked = 1;
        CodeActionTriggerKind2.Automatic = 2;
      })(CodeActionTriggerKind || (exports3.CodeActionTriggerKind = CodeActionTriggerKind = {}));
      var CodeActionContext;
      (function(CodeActionContext2) {
        function create(diagnostics, only, triggerKind) {
          var result = { diagnostics };
          if (only !== void 0 && only !== null) {
            result.only = only;
          }
          if (triggerKind !== void 0 && triggerKind !== null) {
            result.triggerKind = triggerKind;
          }
          return result;
        }
        CodeActionContext2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.typedArray(candidate.diagnostics, Diagnostic.is) && (candidate.only === void 0 || Is.typedArray(candidate.only, Is.string)) && (candidate.triggerKind === void 0 || candidate.triggerKind === CodeActionTriggerKind.Invoked || candidate.triggerKind === CodeActionTriggerKind.Automatic);
        }
        CodeActionContext2.is = is;
      })(CodeActionContext || (exports3.CodeActionContext = CodeActionContext = {}));
      var CodeAction;
      (function(CodeAction2) {
        function create(title, kindOrCommandOrEdit, kind) {
          var result = { title };
          var checkKind = true;
          if (typeof kindOrCommandOrEdit === "string") {
            checkKind = false;
            result.kind = kindOrCommandOrEdit;
          } else if (Command.is(kindOrCommandOrEdit)) {
            result.command = kindOrCommandOrEdit;
          } else {
            result.edit = kindOrCommandOrEdit;
          }
          if (checkKind && kind !== void 0) {
            result.kind = kind;
          }
          return result;
        }
        CodeAction2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && Is.string(candidate.title) && (candidate.diagnostics === void 0 || Is.typedArray(candidate.diagnostics, Diagnostic.is)) && (candidate.kind === void 0 || Is.string(candidate.kind)) && (candidate.edit !== void 0 || candidate.command !== void 0) && (candidate.command === void 0 || Command.is(candidate.command)) && (candidate.isPreferred === void 0 || Is.boolean(candidate.isPreferred)) && (candidate.edit === void 0 || WorkspaceEdit.is(candidate.edit));
        }
        CodeAction2.is = is;
      })(CodeAction || (exports3.CodeAction = CodeAction = {}));
      var CodeLens;
      (function(CodeLens2) {
        function create(range, data) {
          var result = { range };
          if (Is.defined(data)) {
            result.data = data;
          }
          return result;
        }
        CodeLens2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.command) || Command.is(candidate.command));
        }
        CodeLens2.is = is;
      })(CodeLens || (exports3.CodeLens = CodeLens = {}));
      var FormattingOptions;
      (function(FormattingOptions2) {
        function create(tabSize, insertSpaces) {
          return { tabSize, insertSpaces };
        }
        FormattingOptions2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.uinteger(candidate.tabSize) && Is.boolean(candidate.insertSpaces);
        }
        FormattingOptions2.is = is;
      })(FormattingOptions || (exports3.FormattingOptions = FormattingOptions = {}));
      var DocumentLink;
      (function(DocumentLink2) {
        function create(range, target, data) {
          return { range, target, data };
        }
        DocumentLink2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.target) || Is.string(candidate.target));
        }
        DocumentLink2.is = is;
      })(DocumentLink || (exports3.DocumentLink = DocumentLink = {}));
      var SelectionRange;
      (function(SelectionRange2) {
        function create(range, parent) {
          return { range, parent };
        }
        SelectionRange2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Range.is(candidate.range) && (candidate.parent === void 0 || SelectionRange2.is(candidate.parent));
        }
        SelectionRange2.is = is;
      })(SelectionRange || (exports3.SelectionRange = SelectionRange = {}));
      var SemanticTokenTypes2;
      (function(SemanticTokenTypes3) {
        SemanticTokenTypes3["namespace"] = "namespace";
        SemanticTokenTypes3["type"] = "type";
        SemanticTokenTypes3["class"] = "class";
        SemanticTokenTypes3["enum"] = "enum";
        SemanticTokenTypes3["interface"] = "interface";
        SemanticTokenTypes3["struct"] = "struct";
        SemanticTokenTypes3["typeParameter"] = "typeParameter";
        SemanticTokenTypes3["parameter"] = "parameter";
        SemanticTokenTypes3["variable"] = "variable";
        SemanticTokenTypes3["property"] = "property";
        SemanticTokenTypes3["enumMember"] = "enumMember";
        SemanticTokenTypes3["event"] = "event";
        SemanticTokenTypes3["function"] = "function";
        SemanticTokenTypes3["method"] = "method";
        SemanticTokenTypes3["macro"] = "macro";
        SemanticTokenTypes3["keyword"] = "keyword";
        SemanticTokenTypes3["modifier"] = "modifier";
        SemanticTokenTypes3["comment"] = "comment";
        SemanticTokenTypes3["string"] = "string";
        SemanticTokenTypes3["number"] = "number";
        SemanticTokenTypes3["regexp"] = "regexp";
        SemanticTokenTypes3["operator"] = "operator";
        SemanticTokenTypes3["decorator"] = "decorator";
      })(SemanticTokenTypes2 || (exports3.SemanticTokenTypes = SemanticTokenTypes2 = {}));
      var SemanticTokenModifiers2;
      (function(SemanticTokenModifiers3) {
        SemanticTokenModifiers3["declaration"] = "declaration";
        SemanticTokenModifiers3["definition"] = "definition";
        SemanticTokenModifiers3["readonly"] = "readonly";
        SemanticTokenModifiers3["static"] = "static";
        SemanticTokenModifiers3["deprecated"] = "deprecated";
        SemanticTokenModifiers3["abstract"] = "abstract";
        SemanticTokenModifiers3["async"] = "async";
        SemanticTokenModifiers3["modification"] = "modification";
        SemanticTokenModifiers3["documentation"] = "documentation";
        SemanticTokenModifiers3["defaultLibrary"] = "defaultLibrary";
      })(SemanticTokenModifiers2 || (exports3.SemanticTokenModifiers = SemanticTokenModifiers2 = {}));
      var SemanticTokens;
      (function(SemanticTokens2) {
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && (candidate.resultId === void 0 || typeof candidate.resultId === "string") && Array.isArray(candidate.data) && (candidate.data.length === 0 || typeof candidate.data[0] === "number");
        }
        SemanticTokens2.is = is;
      })(SemanticTokens || (exports3.SemanticTokens = SemanticTokens = {}));
      var InlineValueText;
      (function(InlineValueText2) {
        function create(range, text) {
          return { range, text };
        }
        InlineValueText2.create = create;
        function is(value) {
          var candidate = value;
          return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && Is.string(candidate.text);
        }
        InlineValueText2.is = is;
      })(InlineValueText || (exports3.InlineValueText = InlineValueText = {}));
      var InlineValueVariableLookup;
      (function(InlineValueVariableLookup2) {
        function create(range, variableName, caseSensitiveLookup) {
          return { range, variableName, caseSensitiveLookup };
        }
        InlineValueVariableLookup2.create = create;
        function is(value) {
          var candidate = value;
          return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && Is.boolean(candidate.caseSensitiveLookup) && (Is.string(candidate.variableName) || candidate.variableName === void 0);
        }
        InlineValueVariableLookup2.is = is;
      })(InlineValueVariableLookup || (exports3.InlineValueVariableLookup = InlineValueVariableLookup = {}));
      var InlineValueEvaluatableExpression;
      (function(InlineValueEvaluatableExpression2) {
        function create(range, expression) {
          return { range, expression };
        }
        InlineValueEvaluatableExpression2.create = create;
        function is(value) {
          var candidate = value;
          return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && (Is.string(candidate.expression) || candidate.expression === void 0);
        }
        InlineValueEvaluatableExpression2.is = is;
      })(InlineValueEvaluatableExpression || (exports3.InlineValueEvaluatableExpression = InlineValueEvaluatableExpression = {}));
      var InlineValueContext;
      (function(InlineValueContext2) {
        function create(frameId, stoppedLocation) {
          return { frameId, stoppedLocation };
        }
        InlineValueContext2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Range.is(value.stoppedLocation);
        }
        InlineValueContext2.is = is;
      })(InlineValueContext || (exports3.InlineValueContext = InlineValueContext = {}));
      var InlayHintKind;
      (function(InlayHintKind2) {
        InlayHintKind2.Type = 1;
        InlayHintKind2.Parameter = 2;
        function is(value) {
          return value === 1 || value === 2;
        }
        InlayHintKind2.is = is;
      })(InlayHintKind || (exports3.InlayHintKind = InlayHintKind = {}));
      var InlayHintLabelPart;
      (function(InlayHintLabelPart2) {
        function create(value) {
          return { value };
        }
        InlayHintLabelPart2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && (candidate.tooltip === void 0 || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.location === void 0 || Location.is(candidate.location)) && (candidate.command === void 0 || Command.is(candidate.command));
        }
        InlayHintLabelPart2.is = is;
      })(InlayHintLabelPart || (exports3.InlayHintLabelPart = InlayHintLabelPart = {}));
      var InlayHint;
      (function(InlayHint2) {
        function create(position, label, kind) {
          var result = { position, label };
          if (kind !== void 0) {
            result.kind = kind;
          }
          return result;
        }
        InlayHint2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Position.is(candidate.position) && (Is.string(candidate.label) || Is.typedArray(candidate.label, InlayHintLabelPart.is)) && (candidate.kind === void 0 || InlayHintKind.is(candidate.kind)) && candidate.textEdits === void 0 || Is.typedArray(candidate.textEdits, TextEdit.is) && (candidate.tooltip === void 0 || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.paddingLeft === void 0 || Is.boolean(candidate.paddingLeft)) && (candidate.paddingRight === void 0 || Is.boolean(candidate.paddingRight));
        }
        InlayHint2.is = is;
      })(InlayHint || (exports3.InlayHint = InlayHint = {}));
      var StringValue;
      (function(StringValue2) {
        function createSnippet(value) {
          return { kind: "snippet", value };
        }
        StringValue2.createSnippet = createSnippet;
      })(StringValue || (exports3.StringValue = StringValue = {}));
      var InlineCompletionItem;
      (function(InlineCompletionItem2) {
        function create(insertText, filterText, range, command) {
          return { insertText, filterText, range, command };
        }
        InlineCompletionItem2.create = create;
      })(InlineCompletionItem || (exports3.InlineCompletionItem = InlineCompletionItem = {}));
      var InlineCompletionList;
      (function(InlineCompletionList2) {
        function create(items) {
          return { items };
        }
        InlineCompletionList2.create = create;
      })(InlineCompletionList || (exports3.InlineCompletionList = InlineCompletionList = {}));
      var InlineCompletionTriggerKind;
      (function(InlineCompletionTriggerKind2) {
        InlineCompletionTriggerKind2.Invoked = 0;
        InlineCompletionTriggerKind2.Automatic = 1;
      })(InlineCompletionTriggerKind || (exports3.InlineCompletionTriggerKind = InlineCompletionTriggerKind = {}));
      var SelectedCompletionInfo;
      (function(SelectedCompletionInfo2) {
        function create(range, text) {
          return { range, text };
        }
        SelectedCompletionInfo2.create = create;
      })(SelectedCompletionInfo || (exports3.SelectedCompletionInfo = SelectedCompletionInfo = {}));
      var InlineCompletionContext;
      (function(InlineCompletionContext2) {
        function create(triggerKind, selectedCompletionInfo) {
          return { triggerKind, selectedCompletionInfo };
        }
        InlineCompletionContext2.create = create;
      })(InlineCompletionContext || (exports3.InlineCompletionContext = InlineCompletionContext = {}));
      var WorkspaceFolder;
      (function(WorkspaceFolder2) {
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && URI.is(candidate.uri) && Is.string(candidate.name);
        }
        WorkspaceFolder2.is = is;
      })(WorkspaceFolder || (exports3.WorkspaceFolder = WorkspaceFolder = {}));
      exports3.EOL = ["\n", "\r\n", "\r"];
      var TextDocument2;
      (function(TextDocument3) {
        function create(uri, languageId, version, content) {
          return new FullTextDocument2(uri, languageId, version, content);
        }
        TextDocument3.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.uinteger(candidate.lineCount) && Is.func(candidate.getText) && Is.func(candidate.positionAt) && Is.func(candidate.offsetAt) ? true : false;
        }
        TextDocument3.is = is;
        function applyEdits(document2, edits) {
          var text = document2.getText();
          var sortedEdits = mergeSort2(edits, function(a, b) {
            var diff = a.range.start.line - b.range.start.line;
            if (diff === 0) {
              return a.range.start.character - b.range.start.character;
            }
            return diff;
          });
          var lastModifiedOffset = text.length;
          for (var i2 = sortedEdits.length - 1; i2 >= 0; i2--) {
            var e = sortedEdits[i2];
            var startOffset = document2.offsetAt(e.range.start);
            var endOffset = document2.offsetAt(e.range.end);
            if (endOffset <= lastModifiedOffset) {
              text = text.substring(0, startOffset) + e.newText + text.substring(endOffset, text.length);
            } else {
              throw new Error("Overlapping edit");
            }
            lastModifiedOffset = startOffset;
          }
          return text;
        }
        TextDocument3.applyEdits = applyEdits;
        function mergeSort2(data, compare) {
          if (data.length <= 1) {
            return data;
          }
          var p = data.length / 2 | 0;
          var left = data.slice(0, p);
          var right = data.slice(p);
          mergeSort2(left, compare);
          mergeSort2(right, compare);
          var leftIdx = 0;
          var rightIdx = 0;
          var i2 = 0;
          while (leftIdx < left.length && rightIdx < right.length) {
            var ret = compare(left[leftIdx], right[rightIdx]);
            if (ret <= 0) {
              data[i2++] = left[leftIdx++];
            } else {
              data[i2++] = right[rightIdx++];
            }
          }
          while (leftIdx < left.length) {
            data[i2++] = left[leftIdx++];
          }
          while (rightIdx < right.length) {
            data[i2++] = right[rightIdx++];
          }
          return data;
        }
      })(TextDocument2 || (exports3.TextDocument = TextDocument2 = {}));
      var FullTextDocument2 = (
        /** @class */
        function() {
          function FullTextDocument3(uri, languageId, version, content) {
            this._uri = uri;
            this._languageId = languageId;
            this._version = version;
            this._content = content;
            this._lineOffsets = void 0;
          }
          Object.defineProperty(FullTextDocument3.prototype, "uri", {
            get: function() {
              return this._uri;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(FullTextDocument3.prototype, "languageId", {
            get: function() {
              return this._languageId;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(FullTextDocument3.prototype, "version", {
            get: function() {
              return this._version;
            },
            enumerable: false,
            configurable: true
          });
          FullTextDocument3.prototype.getText = function(range) {
            if (range) {
              var start2 = this.offsetAt(range.start);
              var end = this.offsetAt(range.end);
              return this._content.substring(start2, end);
            }
            return this._content;
          };
          FullTextDocument3.prototype.update = function(event, version) {
            this._content = event.text;
            this._version = version;
            this._lineOffsets = void 0;
          };
          FullTextDocument3.prototype.getLineOffsets = function() {
            if (this._lineOffsets === void 0) {
              var lineOffsets = [];
              var text = this._content;
              var isLineStart = true;
              for (var i2 = 0; i2 < text.length; i2++) {
                if (isLineStart) {
                  lineOffsets.push(i2);
                  isLineStart = false;
                }
                var ch = text.charAt(i2);
                isLineStart = ch === "\r" || ch === "\n";
                if (ch === "\r" && i2 + 1 < text.length && text.charAt(i2 + 1) === "\n") {
                  i2++;
                }
              }
              if (isLineStart && text.length > 0) {
                lineOffsets.push(text.length);
              }
              this._lineOffsets = lineOffsets;
            }
            return this._lineOffsets;
          };
          FullTextDocument3.prototype.positionAt = function(offset) {
            offset = Math.max(Math.min(offset, this._content.length), 0);
            var lineOffsets = this.getLineOffsets();
            var low = 0, high = lineOffsets.length;
            if (high === 0) {
              return Position.create(0, offset);
            }
            while (low < high) {
              var mid = Math.floor((low + high) / 2);
              if (lineOffsets[mid] > offset) {
                high = mid;
              } else {
                low = mid + 1;
              }
            }
            var line = low - 1;
            return Position.create(line, offset - lineOffsets[line]);
          };
          FullTextDocument3.prototype.offsetAt = function(position) {
            var lineOffsets = this.getLineOffsets();
            if (position.line >= lineOffsets.length) {
              return this._content.length;
            } else if (position.line < 0) {
              return 0;
            }
            var lineOffset = lineOffsets[position.line];
            var nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
            return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
          };
          Object.defineProperty(FullTextDocument3.prototype, "lineCount", {
            get: function() {
              return this.getLineOffsets().length;
            },
            enumerable: false,
            configurable: true
          });
          return FullTextDocument3;
        }()
      );
      var Is;
      (function(Is2) {
        var toString = Object.prototype.toString;
        function defined(value) {
          return typeof value !== "undefined";
        }
        Is2.defined = defined;
        function undefined2(value) {
          return typeof value === "undefined";
        }
        Is2.undefined = undefined2;
        function boolean(value) {
          return value === true || value === false;
        }
        Is2.boolean = boolean;
        function string(value) {
          return toString.call(value) === "[object String]";
        }
        Is2.string = string;
        function number(value) {
          return toString.call(value) === "[object Number]";
        }
        Is2.number = number;
        function numberRange(value, min, max) {
          return toString.call(value) === "[object Number]" && min <= value && value <= max;
        }
        Is2.numberRange = numberRange;
        function integer2(value) {
          return toString.call(value) === "[object Number]" && -2147483648 <= value && value <= 2147483647;
        }
        Is2.integer = integer2;
        function uinteger2(value) {
          return toString.call(value) === "[object Number]" && 0 <= value && value <= 2147483647;
        }
        Is2.uinteger = uinteger2;
        function func2(value) {
          return toString.call(value) === "[object Function]";
        }
        Is2.func = func2;
        function objectLiteral(value) {
          return value !== null && typeof value === "object";
        }
        Is2.objectLiteral = objectLiteral;
        function typedArray(value, check) {
          return Array.isArray(value) && value.every(check);
        }
        Is2.typedArray = typedArray;
      })(Is || (Is = {}));
    });
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/messages.js
var require_messages2 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProtocolNotificationType = exports2.ProtocolNotificationType0 = exports2.ProtocolRequestType = exports2.ProtocolRequestType0 = exports2.RegistrationType = exports2.MessageDirection = void 0;
    var vscode_jsonrpc_1 = require_main();
    var MessageDirection;
    (function(MessageDirection2) {
      MessageDirection2["clientToServer"] = "clientToServer";
      MessageDirection2["serverToClient"] = "serverToClient";
      MessageDirection2["both"] = "both";
    })(MessageDirection || (exports2.MessageDirection = MessageDirection = {}));
    var RegistrationType = class {
      constructor(method) {
        this.method = method;
      }
    };
    exports2.RegistrationType = RegistrationType;
    var ProtocolRequestType0 = class extends vscode_jsonrpc_1.RequestType0 {
      constructor(method) {
        super(method);
      }
    };
    exports2.ProtocolRequestType0 = ProtocolRequestType0;
    var ProtocolRequestType = class extends vscode_jsonrpc_1.RequestType {
      constructor(method) {
        super(method, vscode_jsonrpc_1.ParameterStructures.byName);
      }
    };
    exports2.ProtocolRequestType = ProtocolRequestType;
    var ProtocolNotificationType0 = class extends vscode_jsonrpc_1.NotificationType0 {
      constructor(method) {
        super(method);
      }
    };
    exports2.ProtocolNotificationType0 = ProtocolNotificationType0;
    var ProtocolNotificationType = class extends vscode_jsonrpc_1.NotificationType {
      constructor(method) {
        super(method, vscode_jsonrpc_1.ParameterStructures.byName);
      }
    };
    exports2.ProtocolNotificationType = ProtocolNotificationType;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/utils/is.js
var require_is3 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/utils/is.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.objectLiteral = exports2.typedArray = exports2.stringArray = exports2.array = exports2.func = exports2.error = exports2.number = exports2.string = exports2.boolean = void 0;
    function boolean(value) {
      return value === true || value === false;
    }
    exports2.boolean = boolean;
    function string(value) {
      return typeof value === "string" || value instanceof String;
    }
    exports2.string = string;
    function number(value) {
      return typeof value === "number" || value instanceof Number;
    }
    exports2.number = number;
    function error(value) {
      return value instanceof Error;
    }
    exports2.error = error;
    function func2(value) {
      return typeof value === "function";
    }
    exports2.func = func2;
    function array(value) {
      return Array.isArray(value);
    }
    exports2.array = array;
    function stringArray(value) {
      return array(value) && value.every((elem) => string(elem));
    }
    exports2.stringArray = stringArray;
    function typedArray(value, check) {
      return Array.isArray(value) && value.every(check);
    }
    exports2.typedArray = typedArray;
    function objectLiteral(value) {
      return value !== null && typeof value === "object";
    }
    exports2.objectLiteral = objectLiteral;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.implementation.js
var require_protocol_implementation = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.implementation.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ImplementationRequest = void 0;
    var messages_1 = require_messages2();
    var ImplementationRequest;
    (function(ImplementationRequest2) {
      ImplementationRequest2.method = "textDocument/implementation";
      ImplementationRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ImplementationRequest2.type = new messages_1.ProtocolRequestType(ImplementationRequest2.method);
    })(ImplementationRequest || (exports2.ImplementationRequest = ImplementationRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.typeDefinition.js
var require_protocol_typeDefinition = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.typeDefinition.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypeDefinitionRequest = void 0;
    var messages_1 = require_messages2();
    var TypeDefinitionRequest;
    (function(TypeDefinitionRequest2) {
      TypeDefinitionRequest2.method = "textDocument/typeDefinition";
      TypeDefinitionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      TypeDefinitionRequest2.type = new messages_1.ProtocolRequestType(TypeDefinitionRequest2.method);
    })(TypeDefinitionRequest || (exports2.TypeDefinitionRequest = TypeDefinitionRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.workspaceFolder.js
var require_protocol_workspaceFolder = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.workspaceFolder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DidChangeWorkspaceFoldersNotification = exports2.WorkspaceFoldersRequest = void 0;
    var messages_1 = require_messages2();
    var WorkspaceFoldersRequest;
    (function(WorkspaceFoldersRequest2) {
      WorkspaceFoldersRequest2.method = "workspace/workspaceFolders";
      WorkspaceFoldersRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      WorkspaceFoldersRequest2.type = new messages_1.ProtocolRequestType0(WorkspaceFoldersRequest2.method);
    })(WorkspaceFoldersRequest || (exports2.WorkspaceFoldersRequest = WorkspaceFoldersRequest = {}));
    var DidChangeWorkspaceFoldersNotification;
    (function(DidChangeWorkspaceFoldersNotification2) {
      DidChangeWorkspaceFoldersNotification2.method = "workspace/didChangeWorkspaceFolders";
      DidChangeWorkspaceFoldersNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeWorkspaceFoldersNotification2.type = new messages_1.ProtocolNotificationType(DidChangeWorkspaceFoldersNotification2.method);
    })(DidChangeWorkspaceFoldersNotification || (exports2.DidChangeWorkspaceFoldersNotification = DidChangeWorkspaceFoldersNotification = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.configuration.js
var require_protocol_configuration = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.configuration.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfigurationRequest = void 0;
    var messages_1 = require_messages2();
    var ConfigurationRequest;
    (function(ConfigurationRequest2) {
      ConfigurationRequest2.method = "workspace/configuration";
      ConfigurationRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      ConfigurationRequest2.type = new messages_1.ProtocolRequestType(ConfigurationRequest2.method);
    })(ConfigurationRequest || (exports2.ConfigurationRequest = ConfigurationRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.colorProvider.js
var require_protocol_colorProvider = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.colorProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ColorPresentationRequest = exports2.DocumentColorRequest = void 0;
    var messages_1 = require_messages2();
    var DocumentColorRequest;
    (function(DocumentColorRequest2) {
      DocumentColorRequest2.method = "textDocument/documentColor";
      DocumentColorRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentColorRequest2.type = new messages_1.ProtocolRequestType(DocumentColorRequest2.method);
    })(DocumentColorRequest || (exports2.DocumentColorRequest = DocumentColorRequest = {}));
    var ColorPresentationRequest;
    (function(ColorPresentationRequest2) {
      ColorPresentationRequest2.method = "textDocument/colorPresentation";
      ColorPresentationRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ColorPresentationRequest2.type = new messages_1.ProtocolRequestType(ColorPresentationRequest2.method);
    })(ColorPresentationRequest || (exports2.ColorPresentationRequest = ColorPresentationRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.foldingRange.js
var require_protocol_foldingRange = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.foldingRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FoldingRangeRefreshRequest = exports2.FoldingRangeRequest = void 0;
    var messages_1 = require_messages2();
    var FoldingRangeRequest;
    (function(FoldingRangeRequest2) {
      FoldingRangeRequest2.method = "textDocument/foldingRange";
      FoldingRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      FoldingRangeRequest2.type = new messages_1.ProtocolRequestType(FoldingRangeRequest2.method);
    })(FoldingRangeRequest || (exports2.FoldingRangeRequest = FoldingRangeRequest = {}));
    var FoldingRangeRefreshRequest;
    (function(FoldingRangeRefreshRequest2) {
      FoldingRangeRefreshRequest2.method = `workspace/foldingRange/refresh`;
      FoldingRangeRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      FoldingRangeRefreshRequest2.type = new messages_1.ProtocolRequestType0(FoldingRangeRefreshRequest2.method);
    })(FoldingRangeRefreshRequest || (exports2.FoldingRangeRefreshRequest = FoldingRangeRefreshRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.declaration.js
var require_protocol_declaration = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.declaration.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DeclarationRequest = void 0;
    var messages_1 = require_messages2();
    var DeclarationRequest;
    (function(DeclarationRequest2) {
      DeclarationRequest2.method = "textDocument/declaration";
      DeclarationRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DeclarationRequest2.type = new messages_1.ProtocolRequestType(DeclarationRequest2.method);
    })(DeclarationRequest || (exports2.DeclarationRequest = DeclarationRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.selectionRange.js
var require_protocol_selectionRange = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.selectionRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SelectionRangeRequest = void 0;
    var messages_1 = require_messages2();
    var SelectionRangeRequest;
    (function(SelectionRangeRequest2) {
      SelectionRangeRequest2.method = "textDocument/selectionRange";
      SelectionRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SelectionRangeRequest2.type = new messages_1.ProtocolRequestType(SelectionRangeRequest2.method);
    })(SelectionRangeRequest || (exports2.SelectionRangeRequest = SelectionRangeRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.progress.js
var require_protocol_progress = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.progress.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WorkDoneProgressCancelNotification = exports2.WorkDoneProgressCreateRequest = exports2.WorkDoneProgress = void 0;
    var vscode_jsonrpc_1 = require_main();
    var messages_1 = require_messages2();
    var WorkDoneProgress;
    (function(WorkDoneProgress2) {
      WorkDoneProgress2.type = new vscode_jsonrpc_1.ProgressType();
      function is(value) {
        return value === WorkDoneProgress2.type;
      }
      WorkDoneProgress2.is = is;
    })(WorkDoneProgress || (exports2.WorkDoneProgress = WorkDoneProgress = {}));
    var WorkDoneProgressCreateRequest;
    (function(WorkDoneProgressCreateRequest2) {
      WorkDoneProgressCreateRequest2.method = "window/workDoneProgress/create";
      WorkDoneProgressCreateRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      WorkDoneProgressCreateRequest2.type = new messages_1.ProtocolRequestType(WorkDoneProgressCreateRequest2.method);
    })(WorkDoneProgressCreateRequest || (exports2.WorkDoneProgressCreateRequest = WorkDoneProgressCreateRequest = {}));
    var WorkDoneProgressCancelNotification;
    (function(WorkDoneProgressCancelNotification2) {
      WorkDoneProgressCancelNotification2.method = "window/workDoneProgress/cancel";
      WorkDoneProgressCancelNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      WorkDoneProgressCancelNotification2.type = new messages_1.ProtocolNotificationType(WorkDoneProgressCancelNotification2.method);
    })(WorkDoneProgressCancelNotification || (exports2.WorkDoneProgressCancelNotification = WorkDoneProgressCancelNotification = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.callHierarchy.js
var require_protocol_callHierarchy = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.callHierarchy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CallHierarchyOutgoingCallsRequest = exports2.CallHierarchyIncomingCallsRequest = exports2.CallHierarchyPrepareRequest = void 0;
    var messages_1 = require_messages2();
    var CallHierarchyPrepareRequest;
    (function(CallHierarchyPrepareRequest2) {
      CallHierarchyPrepareRequest2.method = "textDocument/prepareCallHierarchy";
      CallHierarchyPrepareRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CallHierarchyPrepareRequest2.type = new messages_1.ProtocolRequestType(CallHierarchyPrepareRequest2.method);
    })(CallHierarchyPrepareRequest || (exports2.CallHierarchyPrepareRequest = CallHierarchyPrepareRequest = {}));
    var CallHierarchyIncomingCallsRequest;
    (function(CallHierarchyIncomingCallsRequest2) {
      CallHierarchyIncomingCallsRequest2.method = "callHierarchy/incomingCalls";
      CallHierarchyIncomingCallsRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CallHierarchyIncomingCallsRequest2.type = new messages_1.ProtocolRequestType(CallHierarchyIncomingCallsRequest2.method);
    })(CallHierarchyIncomingCallsRequest || (exports2.CallHierarchyIncomingCallsRequest = CallHierarchyIncomingCallsRequest = {}));
    var CallHierarchyOutgoingCallsRequest;
    (function(CallHierarchyOutgoingCallsRequest2) {
      CallHierarchyOutgoingCallsRequest2.method = "callHierarchy/outgoingCalls";
      CallHierarchyOutgoingCallsRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CallHierarchyOutgoingCallsRequest2.type = new messages_1.ProtocolRequestType(CallHierarchyOutgoingCallsRequest2.method);
    })(CallHierarchyOutgoingCallsRequest || (exports2.CallHierarchyOutgoingCallsRequest = CallHierarchyOutgoingCallsRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.semanticTokens.js
var require_protocol_semanticTokens = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.semanticTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SemanticTokensRefreshRequest = exports2.SemanticTokensRangeRequest = exports2.SemanticTokensDeltaRequest = exports2.SemanticTokensRequest = exports2.SemanticTokensRegistrationType = exports2.TokenFormat = void 0;
    var messages_1 = require_messages2();
    var TokenFormat;
    (function(TokenFormat2) {
      TokenFormat2.Relative = "relative";
    })(TokenFormat || (exports2.TokenFormat = TokenFormat = {}));
    var SemanticTokensRegistrationType;
    (function(SemanticTokensRegistrationType2) {
      SemanticTokensRegistrationType2.method = "textDocument/semanticTokens";
      SemanticTokensRegistrationType2.type = new messages_1.RegistrationType(SemanticTokensRegistrationType2.method);
    })(SemanticTokensRegistrationType || (exports2.SemanticTokensRegistrationType = SemanticTokensRegistrationType = {}));
    var SemanticTokensRequest;
    (function(SemanticTokensRequest2) {
      SemanticTokensRequest2.method = "textDocument/semanticTokens/full";
      SemanticTokensRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SemanticTokensRequest2.type = new messages_1.ProtocolRequestType(SemanticTokensRequest2.method);
      SemanticTokensRequest2.registrationMethod = SemanticTokensRegistrationType.method;
    })(SemanticTokensRequest || (exports2.SemanticTokensRequest = SemanticTokensRequest = {}));
    var SemanticTokensDeltaRequest;
    (function(SemanticTokensDeltaRequest2) {
      SemanticTokensDeltaRequest2.method = "textDocument/semanticTokens/full/delta";
      SemanticTokensDeltaRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SemanticTokensDeltaRequest2.type = new messages_1.ProtocolRequestType(SemanticTokensDeltaRequest2.method);
      SemanticTokensDeltaRequest2.registrationMethod = SemanticTokensRegistrationType.method;
    })(SemanticTokensDeltaRequest || (exports2.SemanticTokensDeltaRequest = SemanticTokensDeltaRequest = {}));
    var SemanticTokensRangeRequest;
    (function(SemanticTokensRangeRequest2) {
      SemanticTokensRangeRequest2.method = "textDocument/semanticTokens/range";
      SemanticTokensRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SemanticTokensRangeRequest2.type = new messages_1.ProtocolRequestType(SemanticTokensRangeRequest2.method);
      SemanticTokensRangeRequest2.registrationMethod = SemanticTokensRegistrationType.method;
    })(SemanticTokensRangeRequest || (exports2.SemanticTokensRangeRequest = SemanticTokensRangeRequest = {}));
    var SemanticTokensRefreshRequest;
    (function(SemanticTokensRefreshRequest2) {
      SemanticTokensRefreshRequest2.method = `workspace/semanticTokens/refresh`;
      SemanticTokensRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      SemanticTokensRefreshRequest2.type = new messages_1.ProtocolRequestType0(SemanticTokensRefreshRequest2.method);
    })(SemanticTokensRefreshRequest || (exports2.SemanticTokensRefreshRequest = SemanticTokensRefreshRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.showDocument.js
var require_protocol_showDocument = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.showDocument.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ShowDocumentRequest = void 0;
    var messages_1 = require_messages2();
    var ShowDocumentRequest;
    (function(ShowDocumentRequest2) {
      ShowDocumentRequest2.method = "window/showDocument";
      ShowDocumentRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      ShowDocumentRequest2.type = new messages_1.ProtocolRequestType(ShowDocumentRequest2.method);
    })(ShowDocumentRequest || (exports2.ShowDocumentRequest = ShowDocumentRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.linkedEditingRange.js
var require_protocol_linkedEditingRange = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.linkedEditingRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LinkedEditingRangeRequest = void 0;
    var messages_1 = require_messages2();
    var LinkedEditingRangeRequest;
    (function(LinkedEditingRangeRequest2) {
      LinkedEditingRangeRequest2.method = "textDocument/linkedEditingRange";
      LinkedEditingRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      LinkedEditingRangeRequest2.type = new messages_1.ProtocolRequestType(LinkedEditingRangeRequest2.method);
    })(LinkedEditingRangeRequest || (exports2.LinkedEditingRangeRequest = LinkedEditingRangeRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.fileOperations.js
var require_protocol_fileOperations = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.fileOperations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WillDeleteFilesRequest = exports2.DidDeleteFilesNotification = exports2.DidRenameFilesNotification = exports2.WillRenameFilesRequest = exports2.DidCreateFilesNotification = exports2.WillCreateFilesRequest = exports2.FileOperationPatternKind = void 0;
    var messages_1 = require_messages2();
    var FileOperationPatternKind;
    (function(FileOperationPatternKind2) {
      FileOperationPatternKind2.file = "file";
      FileOperationPatternKind2.folder = "folder";
    })(FileOperationPatternKind || (exports2.FileOperationPatternKind = FileOperationPatternKind = {}));
    var WillCreateFilesRequest;
    (function(WillCreateFilesRequest2) {
      WillCreateFilesRequest2.method = "workspace/willCreateFiles";
      WillCreateFilesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillCreateFilesRequest2.type = new messages_1.ProtocolRequestType(WillCreateFilesRequest2.method);
    })(WillCreateFilesRequest || (exports2.WillCreateFilesRequest = WillCreateFilesRequest = {}));
    var DidCreateFilesNotification;
    (function(DidCreateFilesNotification2) {
      DidCreateFilesNotification2.method = "workspace/didCreateFiles";
      DidCreateFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidCreateFilesNotification2.type = new messages_1.ProtocolNotificationType(DidCreateFilesNotification2.method);
    })(DidCreateFilesNotification || (exports2.DidCreateFilesNotification = DidCreateFilesNotification = {}));
    var WillRenameFilesRequest;
    (function(WillRenameFilesRequest2) {
      WillRenameFilesRequest2.method = "workspace/willRenameFiles";
      WillRenameFilesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillRenameFilesRequest2.type = new messages_1.ProtocolRequestType(WillRenameFilesRequest2.method);
    })(WillRenameFilesRequest || (exports2.WillRenameFilesRequest = WillRenameFilesRequest = {}));
    var DidRenameFilesNotification;
    (function(DidRenameFilesNotification2) {
      DidRenameFilesNotification2.method = "workspace/didRenameFiles";
      DidRenameFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidRenameFilesNotification2.type = new messages_1.ProtocolNotificationType(DidRenameFilesNotification2.method);
    })(DidRenameFilesNotification || (exports2.DidRenameFilesNotification = DidRenameFilesNotification = {}));
    var DidDeleteFilesNotification;
    (function(DidDeleteFilesNotification2) {
      DidDeleteFilesNotification2.method = "workspace/didDeleteFiles";
      DidDeleteFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidDeleteFilesNotification2.type = new messages_1.ProtocolNotificationType(DidDeleteFilesNotification2.method);
    })(DidDeleteFilesNotification || (exports2.DidDeleteFilesNotification = DidDeleteFilesNotification = {}));
    var WillDeleteFilesRequest;
    (function(WillDeleteFilesRequest2) {
      WillDeleteFilesRequest2.method = "workspace/willDeleteFiles";
      WillDeleteFilesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillDeleteFilesRequest2.type = new messages_1.ProtocolRequestType(WillDeleteFilesRequest2.method);
    })(WillDeleteFilesRequest || (exports2.WillDeleteFilesRequest = WillDeleteFilesRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.moniker.js
var require_protocol_moniker = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.moniker.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MonikerRequest = exports2.MonikerKind = exports2.UniquenessLevel = void 0;
    var messages_1 = require_messages2();
    var UniquenessLevel;
    (function(UniquenessLevel2) {
      UniquenessLevel2.document = "document";
      UniquenessLevel2.project = "project";
      UniquenessLevel2.group = "group";
      UniquenessLevel2.scheme = "scheme";
      UniquenessLevel2.global = "global";
    })(UniquenessLevel || (exports2.UniquenessLevel = UniquenessLevel = {}));
    var MonikerKind;
    (function(MonikerKind2) {
      MonikerKind2.$import = "import";
      MonikerKind2.$export = "export";
      MonikerKind2.local = "local";
    })(MonikerKind || (exports2.MonikerKind = MonikerKind = {}));
    var MonikerRequest;
    (function(MonikerRequest2) {
      MonikerRequest2.method = "textDocument/moniker";
      MonikerRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      MonikerRequest2.type = new messages_1.ProtocolRequestType(MonikerRequest2.method);
    })(MonikerRequest || (exports2.MonikerRequest = MonikerRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.typeHierarchy.js
var require_protocol_typeHierarchy = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.typeHierarchy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypeHierarchySubtypesRequest = exports2.TypeHierarchySupertypesRequest = exports2.TypeHierarchyPrepareRequest = void 0;
    var messages_1 = require_messages2();
    var TypeHierarchyPrepareRequest;
    (function(TypeHierarchyPrepareRequest2) {
      TypeHierarchyPrepareRequest2.method = "textDocument/prepareTypeHierarchy";
      TypeHierarchyPrepareRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      TypeHierarchyPrepareRequest2.type = new messages_1.ProtocolRequestType(TypeHierarchyPrepareRequest2.method);
    })(TypeHierarchyPrepareRequest || (exports2.TypeHierarchyPrepareRequest = TypeHierarchyPrepareRequest = {}));
    var TypeHierarchySupertypesRequest;
    (function(TypeHierarchySupertypesRequest2) {
      TypeHierarchySupertypesRequest2.method = "typeHierarchy/supertypes";
      TypeHierarchySupertypesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      TypeHierarchySupertypesRequest2.type = new messages_1.ProtocolRequestType(TypeHierarchySupertypesRequest2.method);
    })(TypeHierarchySupertypesRequest || (exports2.TypeHierarchySupertypesRequest = TypeHierarchySupertypesRequest = {}));
    var TypeHierarchySubtypesRequest;
    (function(TypeHierarchySubtypesRequest2) {
      TypeHierarchySubtypesRequest2.method = "typeHierarchy/subtypes";
      TypeHierarchySubtypesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      TypeHierarchySubtypesRequest2.type = new messages_1.ProtocolRequestType(TypeHierarchySubtypesRequest2.method);
    })(TypeHierarchySubtypesRequest || (exports2.TypeHierarchySubtypesRequest = TypeHierarchySubtypesRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineValue.js
var require_protocol_inlineValue = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineValue.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlineValueRefreshRequest = exports2.InlineValueRequest = void 0;
    var messages_1 = require_messages2();
    var InlineValueRequest;
    (function(InlineValueRequest2) {
      InlineValueRequest2.method = "textDocument/inlineValue";
      InlineValueRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InlineValueRequest2.type = new messages_1.ProtocolRequestType(InlineValueRequest2.method);
    })(InlineValueRequest || (exports2.InlineValueRequest = InlineValueRequest = {}));
    var InlineValueRefreshRequest;
    (function(InlineValueRefreshRequest2) {
      InlineValueRefreshRequest2.method = `workspace/inlineValue/refresh`;
      InlineValueRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      InlineValueRefreshRequest2.type = new messages_1.ProtocolRequestType0(InlineValueRefreshRequest2.method);
    })(InlineValueRefreshRequest || (exports2.InlineValueRefreshRequest = InlineValueRefreshRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.inlayHint.js
var require_protocol_inlayHint = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.inlayHint.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlayHintRefreshRequest = exports2.InlayHintResolveRequest = exports2.InlayHintRequest = void 0;
    var messages_1 = require_messages2();
    var InlayHintRequest;
    (function(InlayHintRequest2) {
      InlayHintRequest2.method = "textDocument/inlayHint";
      InlayHintRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InlayHintRequest2.type = new messages_1.ProtocolRequestType(InlayHintRequest2.method);
    })(InlayHintRequest || (exports2.InlayHintRequest = InlayHintRequest = {}));
    var InlayHintResolveRequest;
    (function(InlayHintResolveRequest2) {
      InlayHintResolveRequest2.method = "inlayHint/resolve";
      InlayHintResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InlayHintResolveRequest2.type = new messages_1.ProtocolRequestType(InlayHintResolveRequest2.method);
    })(InlayHintResolveRequest || (exports2.InlayHintResolveRequest = InlayHintResolveRequest = {}));
    var InlayHintRefreshRequest;
    (function(InlayHintRefreshRequest2) {
      InlayHintRefreshRequest2.method = `workspace/inlayHint/refresh`;
      InlayHintRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      InlayHintRefreshRequest2.type = new messages_1.ProtocolRequestType0(InlayHintRefreshRequest2.method);
    })(InlayHintRefreshRequest || (exports2.InlayHintRefreshRequest = InlayHintRefreshRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.diagnostic.js
var require_protocol_diagnostic = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.diagnostic.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DiagnosticRefreshRequest = exports2.WorkspaceDiagnosticRequest = exports2.DocumentDiagnosticRequest = exports2.DocumentDiagnosticReportKind = exports2.DiagnosticServerCancellationData = void 0;
    var vscode_jsonrpc_1 = require_main();
    var Is = require_is3();
    var messages_1 = require_messages2();
    var DiagnosticServerCancellationData;
    (function(DiagnosticServerCancellationData2) {
      function is(value) {
        const candidate = value;
        return candidate && Is.boolean(candidate.retriggerRequest);
      }
      DiagnosticServerCancellationData2.is = is;
    })(DiagnosticServerCancellationData || (exports2.DiagnosticServerCancellationData = DiagnosticServerCancellationData = {}));
    var DocumentDiagnosticReportKind;
    (function(DocumentDiagnosticReportKind2) {
      DocumentDiagnosticReportKind2.Full = "full";
      DocumentDiagnosticReportKind2.Unchanged = "unchanged";
    })(DocumentDiagnosticReportKind || (exports2.DocumentDiagnosticReportKind = DocumentDiagnosticReportKind = {}));
    var DocumentDiagnosticRequest;
    (function(DocumentDiagnosticRequest2) {
      DocumentDiagnosticRequest2.method = "textDocument/diagnostic";
      DocumentDiagnosticRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentDiagnosticRequest2.type = new messages_1.ProtocolRequestType(DocumentDiagnosticRequest2.method);
      DocumentDiagnosticRequest2.partialResult = new vscode_jsonrpc_1.ProgressType();
    })(DocumentDiagnosticRequest || (exports2.DocumentDiagnosticRequest = DocumentDiagnosticRequest = {}));
    var WorkspaceDiagnosticRequest;
    (function(WorkspaceDiagnosticRequest2) {
      WorkspaceDiagnosticRequest2.method = "workspace/diagnostic";
      WorkspaceDiagnosticRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WorkspaceDiagnosticRequest2.type = new messages_1.ProtocolRequestType(WorkspaceDiagnosticRequest2.method);
      WorkspaceDiagnosticRequest2.partialResult = new vscode_jsonrpc_1.ProgressType();
    })(WorkspaceDiagnosticRequest || (exports2.WorkspaceDiagnosticRequest = WorkspaceDiagnosticRequest = {}));
    var DiagnosticRefreshRequest;
    (function(DiagnosticRefreshRequest2) {
      DiagnosticRefreshRequest2.method = `workspace/diagnostic/refresh`;
      DiagnosticRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      DiagnosticRefreshRequest2.type = new messages_1.ProtocolRequestType0(DiagnosticRefreshRequest2.method);
    })(DiagnosticRefreshRequest || (exports2.DiagnosticRefreshRequest = DiagnosticRefreshRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.notebook.js
var require_protocol_notebook = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.notebook.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DidCloseNotebookDocumentNotification = exports2.DidSaveNotebookDocumentNotification = exports2.DidChangeNotebookDocumentNotification = exports2.NotebookCellArrayChange = exports2.DidOpenNotebookDocumentNotification = exports2.NotebookDocumentSyncRegistrationType = exports2.NotebookDocument = exports2.NotebookCell = exports2.ExecutionSummary = exports2.NotebookCellKind = void 0;
    var vscode_languageserver_types_1 = require_main2();
    var Is = require_is3();
    var messages_1 = require_messages2();
    var NotebookCellKind;
    (function(NotebookCellKind2) {
      NotebookCellKind2.Markup = 1;
      NotebookCellKind2.Code = 2;
      function is(value) {
        return value === 1 || value === 2;
      }
      NotebookCellKind2.is = is;
    })(NotebookCellKind || (exports2.NotebookCellKind = NotebookCellKind = {}));
    var ExecutionSummary;
    (function(ExecutionSummary2) {
      function create(executionOrder, success) {
        const result = { executionOrder };
        if (success === true || success === false) {
          result.success = success;
        }
        return result;
      }
      ExecutionSummary2.create = create;
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && vscode_languageserver_types_1.uinteger.is(candidate.executionOrder) && (candidate.success === void 0 || Is.boolean(candidate.success));
      }
      ExecutionSummary2.is = is;
      function equals(one, other) {
        if (one === other) {
          return true;
        }
        if (one === null || one === void 0 || other === null || other === void 0) {
          return false;
        }
        return one.executionOrder === other.executionOrder && one.success === other.success;
      }
      ExecutionSummary2.equals = equals;
    })(ExecutionSummary || (exports2.ExecutionSummary = ExecutionSummary = {}));
    var NotebookCell;
    (function(NotebookCell2) {
      function create(kind, document2) {
        return { kind, document: document2 };
      }
      NotebookCell2.create = create;
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && NotebookCellKind.is(candidate.kind) && vscode_languageserver_types_1.DocumentUri.is(candidate.document) && (candidate.metadata === void 0 || Is.objectLiteral(candidate.metadata));
      }
      NotebookCell2.is = is;
      function diff(one, two) {
        const result = /* @__PURE__ */ new Set();
        if (one.document !== two.document) {
          result.add("document");
        }
        if (one.kind !== two.kind) {
          result.add("kind");
        }
        if (one.executionSummary !== two.executionSummary) {
          result.add("executionSummary");
        }
        if ((one.metadata !== void 0 || two.metadata !== void 0) && !equalsMetadata(one.metadata, two.metadata)) {
          result.add("metadata");
        }
        if ((one.executionSummary !== void 0 || two.executionSummary !== void 0) && !ExecutionSummary.equals(one.executionSummary, two.executionSummary)) {
          result.add("executionSummary");
        }
        return result;
      }
      NotebookCell2.diff = diff;
      function equalsMetadata(one, other) {
        if (one === other) {
          return true;
        }
        if (one === null || one === void 0 || other === null || other === void 0) {
          return false;
        }
        if (typeof one !== typeof other) {
          return false;
        }
        if (typeof one !== "object") {
          return false;
        }
        const oneArray = Array.isArray(one);
        const otherArray = Array.isArray(other);
        if (oneArray !== otherArray) {
          return false;
        }
        if (oneArray && otherArray) {
          if (one.length !== other.length) {
            return false;
          }
          for (let i2 = 0; i2 < one.length; i2++) {
            if (!equalsMetadata(one[i2], other[i2])) {
              return false;
            }
          }
        }
        if (Is.objectLiteral(one) && Is.objectLiteral(other)) {
          const oneKeys = Object.keys(one);
          const otherKeys = Object.keys(other);
          if (oneKeys.length !== otherKeys.length) {
            return false;
          }
          oneKeys.sort();
          otherKeys.sort();
          if (!equalsMetadata(oneKeys, otherKeys)) {
            return false;
          }
          for (let i2 = 0; i2 < oneKeys.length; i2++) {
            const prop = oneKeys[i2];
            if (!equalsMetadata(one[prop], other[prop])) {
              return false;
            }
          }
        }
        return true;
      }
    })(NotebookCell || (exports2.NotebookCell = NotebookCell = {}));
    var NotebookDocument;
    (function(NotebookDocument2) {
      function create(uri, notebookType, version, cells) {
        return { uri, notebookType, version, cells };
      }
      NotebookDocument2.create = create;
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && Is.string(candidate.uri) && vscode_languageserver_types_1.integer.is(candidate.version) && Is.typedArray(candidate.cells, NotebookCell.is);
      }
      NotebookDocument2.is = is;
    })(NotebookDocument || (exports2.NotebookDocument = NotebookDocument = {}));
    var NotebookDocumentSyncRegistrationType;
    (function(NotebookDocumentSyncRegistrationType2) {
      NotebookDocumentSyncRegistrationType2.method = "notebookDocument/sync";
      NotebookDocumentSyncRegistrationType2.messageDirection = messages_1.MessageDirection.clientToServer;
      NotebookDocumentSyncRegistrationType2.type = new messages_1.RegistrationType(NotebookDocumentSyncRegistrationType2.method);
    })(NotebookDocumentSyncRegistrationType || (exports2.NotebookDocumentSyncRegistrationType = NotebookDocumentSyncRegistrationType = {}));
    var DidOpenNotebookDocumentNotification;
    (function(DidOpenNotebookDocumentNotification2) {
      DidOpenNotebookDocumentNotification2.method = "notebookDocument/didOpen";
      DidOpenNotebookDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidOpenNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidOpenNotebookDocumentNotification2.method);
      DidOpenNotebookDocumentNotification2.registrationMethod = NotebookDocumentSyncRegistrationType.method;
    })(DidOpenNotebookDocumentNotification || (exports2.DidOpenNotebookDocumentNotification = DidOpenNotebookDocumentNotification = {}));
    var NotebookCellArrayChange;
    (function(NotebookCellArrayChange2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && vscode_languageserver_types_1.uinteger.is(candidate.start) && vscode_languageserver_types_1.uinteger.is(candidate.deleteCount) && (candidate.cells === void 0 || Is.typedArray(candidate.cells, NotebookCell.is));
      }
      NotebookCellArrayChange2.is = is;
      function create(start2, deleteCount, cells) {
        const result = { start: start2, deleteCount };
        if (cells !== void 0) {
          result.cells = cells;
        }
        return result;
      }
      NotebookCellArrayChange2.create = create;
    })(NotebookCellArrayChange || (exports2.NotebookCellArrayChange = NotebookCellArrayChange = {}));
    var DidChangeNotebookDocumentNotification;
    (function(DidChangeNotebookDocumentNotification2) {
      DidChangeNotebookDocumentNotification2.method = "notebookDocument/didChange";
      DidChangeNotebookDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidChangeNotebookDocumentNotification2.method);
      DidChangeNotebookDocumentNotification2.registrationMethod = NotebookDocumentSyncRegistrationType.method;
    })(DidChangeNotebookDocumentNotification || (exports2.DidChangeNotebookDocumentNotification = DidChangeNotebookDocumentNotification = {}));
    var DidSaveNotebookDocumentNotification;
    (function(DidSaveNotebookDocumentNotification2) {
      DidSaveNotebookDocumentNotification2.method = "notebookDocument/didSave";
      DidSaveNotebookDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidSaveNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidSaveNotebookDocumentNotification2.method);
      DidSaveNotebookDocumentNotification2.registrationMethod = NotebookDocumentSyncRegistrationType.method;
    })(DidSaveNotebookDocumentNotification || (exports2.DidSaveNotebookDocumentNotification = DidSaveNotebookDocumentNotification = {}));
    var DidCloseNotebookDocumentNotification;
    (function(DidCloseNotebookDocumentNotification2) {
      DidCloseNotebookDocumentNotification2.method = "notebookDocument/didClose";
      DidCloseNotebookDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidCloseNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidCloseNotebookDocumentNotification2.method);
      DidCloseNotebookDocumentNotification2.registrationMethod = NotebookDocumentSyncRegistrationType.method;
    })(DidCloseNotebookDocumentNotification || (exports2.DidCloseNotebookDocumentNotification = DidCloseNotebookDocumentNotification = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineCompletion.js
var require_protocol_inlineCompletion = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineCompletion.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlineCompletionRequest = void 0;
    var messages_1 = require_messages2();
    var InlineCompletionRequest;
    (function(InlineCompletionRequest2) {
      InlineCompletionRequest2.method = "textDocument/inlineCompletion";
      InlineCompletionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InlineCompletionRequest2.type = new messages_1.ProtocolRequestType(InlineCompletionRequest2.method);
    })(InlineCompletionRequest || (exports2.InlineCompletionRequest = InlineCompletionRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.js
var require_protocol = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WorkspaceSymbolRequest = exports2.CodeActionResolveRequest = exports2.CodeActionRequest = exports2.DocumentSymbolRequest = exports2.DocumentHighlightRequest = exports2.ReferencesRequest = exports2.DefinitionRequest = exports2.SignatureHelpRequest = exports2.SignatureHelpTriggerKind = exports2.HoverRequest = exports2.CompletionResolveRequest = exports2.CompletionRequest = exports2.CompletionTriggerKind = exports2.PublishDiagnosticsNotification = exports2.WatchKind = exports2.RelativePattern = exports2.FileChangeType = exports2.DidChangeWatchedFilesNotification = exports2.WillSaveTextDocumentWaitUntilRequest = exports2.WillSaveTextDocumentNotification = exports2.TextDocumentSaveReason = exports2.DidSaveTextDocumentNotification = exports2.DidCloseTextDocumentNotification = exports2.DidChangeTextDocumentNotification = exports2.TextDocumentContentChangeEvent = exports2.DidOpenTextDocumentNotification = exports2.TextDocumentSyncKind = exports2.TelemetryEventNotification = exports2.LogMessageNotification = exports2.ShowMessageRequest = exports2.ShowMessageNotification = exports2.MessageType = exports2.DidChangeConfigurationNotification = exports2.ExitNotification = exports2.ShutdownRequest = exports2.InitializedNotification = exports2.InitializeErrorCodes = exports2.InitializeRequest = exports2.WorkDoneProgressOptions = exports2.TextDocumentRegistrationOptions = exports2.StaticRegistrationOptions = exports2.PositionEncodingKind = exports2.FailureHandlingKind = exports2.ResourceOperationKind = exports2.UnregistrationRequest = exports2.RegistrationRequest = exports2.DocumentSelector = exports2.NotebookCellTextDocumentFilter = exports2.NotebookDocumentFilter = exports2.TextDocumentFilter = void 0;
    exports2.MonikerRequest = exports2.MonikerKind = exports2.UniquenessLevel = exports2.WillDeleteFilesRequest = exports2.DidDeleteFilesNotification = exports2.WillRenameFilesRequest = exports2.DidRenameFilesNotification = exports2.WillCreateFilesRequest = exports2.DidCreateFilesNotification = exports2.FileOperationPatternKind = exports2.LinkedEditingRangeRequest = exports2.ShowDocumentRequest = exports2.SemanticTokensRegistrationType = exports2.SemanticTokensRefreshRequest = exports2.SemanticTokensRangeRequest = exports2.SemanticTokensDeltaRequest = exports2.SemanticTokensRequest = exports2.TokenFormat = exports2.CallHierarchyPrepareRequest = exports2.CallHierarchyOutgoingCallsRequest = exports2.CallHierarchyIncomingCallsRequest = exports2.WorkDoneProgressCancelNotification = exports2.WorkDoneProgressCreateRequest = exports2.WorkDoneProgress = exports2.SelectionRangeRequest = exports2.DeclarationRequest = exports2.FoldingRangeRefreshRequest = exports2.FoldingRangeRequest = exports2.ColorPresentationRequest = exports2.DocumentColorRequest = exports2.ConfigurationRequest = exports2.DidChangeWorkspaceFoldersNotification = exports2.WorkspaceFoldersRequest = exports2.TypeDefinitionRequest = exports2.ImplementationRequest = exports2.ApplyWorkspaceEditRequest = exports2.ExecuteCommandRequest = exports2.PrepareRenameRequest = exports2.RenameRequest = exports2.PrepareSupportDefaultBehavior = exports2.DocumentOnTypeFormattingRequest = exports2.DocumentRangesFormattingRequest = exports2.DocumentRangeFormattingRequest = exports2.DocumentFormattingRequest = exports2.DocumentLinkResolveRequest = exports2.DocumentLinkRequest = exports2.CodeLensRefreshRequest = exports2.CodeLensResolveRequest = exports2.CodeLensRequest = exports2.WorkspaceSymbolResolveRequest = void 0;
    exports2.InlineCompletionRequest = exports2.DidCloseNotebookDocumentNotification = exports2.DidSaveNotebookDocumentNotification = exports2.DidChangeNotebookDocumentNotification = exports2.NotebookCellArrayChange = exports2.DidOpenNotebookDocumentNotification = exports2.NotebookDocumentSyncRegistrationType = exports2.NotebookDocument = exports2.NotebookCell = exports2.ExecutionSummary = exports2.NotebookCellKind = exports2.DiagnosticRefreshRequest = exports2.WorkspaceDiagnosticRequest = exports2.DocumentDiagnosticRequest = exports2.DocumentDiagnosticReportKind = exports2.DiagnosticServerCancellationData = exports2.InlayHintRefreshRequest = exports2.InlayHintResolveRequest = exports2.InlayHintRequest = exports2.InlineValueRefreshRequest = exports2.InlineValueRequest = exports2.TypeHierarchySupertypesRequest = exports2.TypeHierarchySubtypesRequest = exports2.TypeHierarchyPrepareRequest = void 0;
    var messages_1 = require_messages2();
    var vscode_languageserver_types_1 = require_main2();
    var Is = require_is3();
    var protocol_implementation_1 = require_protocol_implementation();
    Object.defineProperty(exports2, "ImplementationRequest", { enumerable: true, get: function() {
      return protocol_implementation_1.ImplementationRequest;
    } });
    var protocol_typeDefinition_1 = require_protocol_typeDefinition();
    Object.defineProperty(exports2, "TypeDefinitionRequest", { enumerable: true, get: function() {
      return protocol_typeDefinition_1.TypeDefinitionRequest;
    } });
    var protocol_workspaceFolder_1 = require_protocol_workspaceFolder();
    Object.defineProperty(exports2, "WorkspaceFoldersRequest", { enumerable: true, get: function() {
      return protocol_workspaceFolder_1.WorkspaceFoldersRequest;
    } });
    Object.defineProperty(exports2, "DidChangeWorkspaceFoldersNotification", { enumerable: true, get: function() {
      return protocol_workspaceFolder_1.DidChangeWorkspaceFoldersNotification;
    } });
    var protocol_configuration_1 = require_protocol_configuration();
    Object.defineProperty(exports2, "ConfigurationRequest", { enumerable: true, get: function() {
      return protocol_configuration_1.ConfigurationRequest;
    } });
    var protocol_colorProvider_1 = require_protocol_colorProvider();
    Object.defineProperty(exports2, "DocumentColorRequest", { enumerable: true, get: function() {
      return protocol_colorProvider_1.DocumentColorRequest;
    } });
    Object.defineProperty(exports2, "ColorPresentationRequest", { enumerable: true, get: function() {
      return protocol_colorProvider_1.ColorPresentationRequest;
    } });
    var protocol_foldingRange_1 = require_protocol_foldingRange();
    Object.defineProperty(exports2, "FoldingRangeRequest", { enumerable: true, get: function() {
      return protocol_foldingRange_1.FoldingRangeRequest;
    } });
    Object.defineProperty(exports2, "FoldingRangeRefreshRequest", { enumerable: true, get: function() {
      return protocol_foldingRange_1.FoldingRangeRefreshRequest;
    } });
    var protocol_declaration_1 = require_protocol_declaration();
    Object.defineProperty(exports2, "DeclarationRequest", { enumerable: true, get: function() {
      return protocol_declaration_1.DeclarationRequest;
    } });
    var protocol_selectionRange_1 = require_protocol_selectionRange();
    Object.defineProperty(exports2, "SelectionRangeRequest", { enumerable: true, get: function() {
      return protocol_selectionRange_1.SelectionRangeRequest;
    } });
    var protocol_progress_1 = require_protocol_progress();
    Object.defineProperty(exports2, "WorkDoneProgress", { enumerable: true, get: function() {
      return protocol_progress_1.WorkDoneProgress;
    } });
    Object.defineProperty(exports2, "WorkDoneProgressCreateRequest", { enumerable: true, get: function() {
      return protocol_progress_1.WorkDoneProgressCreateRequest;
    } });
    Object.defineProperty(exports2, "WorkDoneProgressCancelNotification", { enumerable: true, get: function() {
      return protocol_progress_1.WorkDoneProgressCancelNotification;
    } });
    var protocol_callHierarchy_1 = require_protocol_callHierarchy();
    Object.defineProperty(exports2, "CallHierarchyIncomingCallsRequest", { enumerable: true, get: function() {
      return protocol_callHierarchy_1.CallHierarchyIncomingCallsRequest;
    } });
    Object.defineProperty(exports2, "CallHierarchyOutgoingCallsRequest", { enumerable: true, get: function() {
      return protocol_callHierarchy_1.CallHierarchyOutgoingCallsRequest;
    } });
    Object.defineProperty(exports2, "CallHierarchyPrepareRequest", { enumerable: true, get: function() {
      return protocol_callHierarchy_1.CallHierarchyPrepareRequest;
    } });
    var protocol_semanticTokens_1 = require_protocol_semanticTokens();
    Object.defineProperty(exports2, "TokenFormat", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.TokenFormat;
    } });
    Object.defineProperty(exports2, "SemanticTokensRequest", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensRequest;
    } });
    Object.defineProperty(exports2, "SemanticTokensDeltaRequest", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensDeltaRequest;
    } });
    Object.defineProperty(exports2, "SemanticTokensRangeRequest", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensRangeRequest;
    } });
    Object.defineProperty(exports2, "SemanticTokensRefreshRequest", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensRefreshRequest;
    } });
    Object.defineProperty(exports2, "SemanticTokensRegistrationType", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensRegistrationType;
    } });
    var protocol_showDocument_1 = require_protocol_showDocument();
    Object.defineProperty(exports2, "ShowDocumentRequest", { enumerable: true, get: function() {
      return protocol_showDocument_1.ShowDocumentRequest;
    } });
    var protocol_linkedEditingRange_1 = require_protocol_linkedEditingRange();
    Object.defineProperty(exports2, "LinkedEditingRangeRequest", { enumerable: true, get: function() {
      return protocol_linkedEditingRange_1.LinkedEditingRangeRequest;
    } });
    var protocol_fileOperations_1 = require_protocol_fileOperations();
    Object.defineProperty(exports2, "FileOperationPatternKind", { enumerable: true, get: function() {
      return protocol_fileOperations_1.FileOperationPatternKind;
    } });
    Object.defineProperty(exports2, "DidCreateFilesNotification", { enumerable: true, get: function() {
      return protocol_fileOperations_1.DidCreateFilesNotification;
    } });
    Object.defineProperty(exports2, "WillCreateFilesRequest", { enumerable: true, get: function() {
      return protocol_fileOperations_1.WillCreateFilesRequest;
    } });
    Object.defineProperty(exports2, "DidRenameFilesNotification", { enumerable: true, get: function() {
      return protocol_fileOperations_1.DidRenameFilesNotification;
    } });
    Object.defineProperty(exports2, "WillRenameFilesRequest", { enumerable: true, get: function() {
      return protocol_fileOperations_1.WillRenameFilesRequest;
    } });
    Object.defineProperty(exports2, "DidDeleteFilesNotification", { enumerable: true, get: function() {
      return protocol_fileOperations_1.DidDeleteFilesNotification;
    } });
    Object.defineProperty(exports2, "WillDeleteFilesRequest", { enumerable: true, get: function() {
      return protocol_fileOperations_1.WillDeleteFilesRequest;
    } });
    var protocol_moniker_1 = require_protocol_moniker();
    Object.defineProperty(exports2, "UniquenessLevel", { enumerable: true, get: function() {
      return protocol_moniker_1.UniquenessLevel;
    } });
    Object.defineProperty(exports2, "MonikerKind", { enumerable: true, get: function() {
      return protocol_moniker_1.MonikerKind;
    } });
    Object.defineProperty(exports2, "MonikerRequest", { enumerable: true, get: function() {
      return protocol_moniker_1.MonikerRequest;
    } });
    var protocol_typeHierarchy_1 = require_protocol_typeHierarchy();
    Object.defineProperty(exports2, "TypeHierarchyPrepareRequest", { enumerable: true, get: function() {
      return protocol_typeHierarchy_1.TypeHierarchyPrepareRequest;
    } });
    Object.defineProperty(exports2, "TypeHierarchySubtypesRequest", { enumerable: true, get: function() {
      return protocol_typeHierarchy_1.TypeHierarchySubtypesRequest;
    } });
    Object.defineProperty(exports2, "TypeHierarchySupertypesRequest", { enumerable: true, get: function() {
      return protocol_typeHierarchy_1.TypeHierarchySupertypesRequest;
    } });
    var protocol_inlineValue_1 = require_protocol_inlineValue();
    Object.defineProperty(exports2, "InlineValueRequest", { enumerable: true, get: function() {
      return protocol_inlineValue_1.InlineValueRequest;
    } });
    Object.defineProperty(exports2, "InlineValueRefreshRequest", { enumerable: true, get: function() {
      return protocol_inlineValue_1.InlineValueRefreshRequest;
    } });
    var protocol_inlayHint_1 = require_protocol_inlayHint();
    Object.defineProperty(exports2, "InlayHintRequest", { enumerable: true, get: function() {
      return protocol_inlayHint_1.InlayHintRequest;
    } });
    Object.defineProperty(exports2, "InlayHintResolveRequest", { enumerable: true, get: function() {
      return protocol_inlayHint_1.InlayHintResolveRequest;
    } });
    Object.defineProperty(exports2, "InlayHintRefreshRequest", { enumerable: true, get: function() {
      return protocol_inlayHint_1.InlayHintRefreshRequest;
    } });
    var protocol_diagnostic_1 = require_protocol_diagnostic();
    Object.defineProperty(exports2, "DiagnosticServerCancellationData", { enumerable: true, get: function() {
      return protocol_diagnostic_1.DiagnosticServerCancellationData;
    } });
    Object.defineProperty(exports2, "DocumentDiagnosticReportKind", { enumerable: true, get: function() {
      return protocol_diagnostic_1.DocumentDiagnosticReportKind;
    } });
    Object.defineProperty(exports2, "DocumentDiagnosticRequest", { enumerable: true, get: function() {
      return protocol_diagnostic_1.DocumentDiagnosticRequest;
    } });
    Object.defineProperty(exports2, "WorkspaceDiagnosticRequest", { enumerable: true, get: function() {
      return protocol_diagnostic_1.WorkspaceDiagnosticRequest;
    } });
    Object.defineProperty(exports2, "DiagnosticRefreshRequest", { enumerable: true, get: function() {
      return protocol_diagnostic_1.DiagnosticRefreshRequest;
    } });
    var protocol_notebook_1 = require_protocol_notebook();
    Object.defineProperty(exports2, "NotebookCellKind", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookCellKind;
    } });
    Object.defineProperty(exports2, "ExecutionSummary", { enumerable: true, get: function() {
      return protocol_notebook_1.ExecutionSummary;
    } });
    Object.defineProperty(exports2, "NotebookCell", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookCell;
    } });
    Object.defineProperty(exports2, "NotebookDocument", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookDocument;
    } });
    Object.defineProperty(exports2, "NotebookDocumentSyncRegistrationType", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookDocumentSyncRegistrationType;
    } });
    Object.defineProperty(exports2, "DidOpenNotebookDocumentNotification", { enumerable: true, get: function() {
      return protocol_notebook_1.DidOpenNotebookDocumentNotification;
    } });
    Object.defineProperty(exports2, "NotebookCellArrayChange", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookCellArrayChange;
    } });
    Object.defineProperty(exports2, "DidChangeNotebookDocumentNotification", { enumerable: true, get: function() {
      return protocol_notebook_1.DidChangeNotebookDocumentNotification;
    } });
    Object.defineProperty(exports2, "DidSaveNotebookDocumentNotification", { enumerable: true, get: function() {
      return protocol_notebook_1.DidSaveNotebookDocumentNotification;
    } });
    Object.defineProperty(exports2, "DidCloseNotebookDocumentNotification", { enumerable: true, get: function() {
      return protocol_notebook_1.DidCloseNotebookDocumentNotification;
    } });
    var protocol_inlineCompletion_1 = require_protocol_inlineCompletion();
    Object.defineProperty(exports2, "InlineCompletionRequest", { enumerable: true, get: function() {
      return protocol_inlineCompletion_1.InlineCompletionRequest;
    } });
    var TextDocumentFilter;
    (function(TextDocumentFilter2) {
      function is(value) {
        const candidate = value;
        return Is.string(candidate) || (Is.string(candidate.language) || Is.string(candidate.scheme) || Is.string(candidate.pattern));
      }
      TextDocumentFilter2.is = is;
    })(TextDocumentFilter || (exports2.TextDocumentFilter = TextDocumentFilter = {}));
    var NotebookDocumentFilter;
    (function(NotebookDocumentFilter2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && (Is.string(candidate.notebookType) || Is.string(candidate.scheme) || Is.string(candidate.pattern));
      }
      NotebookDocumentFilter2.is = is;
    })(NotebookDocumentFilter || (exports2.NotebookDocumentFilter = NotebookDocumentFilter = {}));
    var NotebookCellTextDocumentFilter;
    (function(NotebookCellTextDocumentFilter2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && (Is.string(candidate.notebook) || NotebookDocumentFilter.is(candidate.notebook)) && (candidate.language === void 0 || Is.string(candidate.language));
      }
      NotebookCellTextDocumentFilter2.is = is;
    })(NotebookCellTextDocumentFilter || (exports2.NotebookCellTextDocumentFilter = NotebookCellTextDocumentFilter = {}));
    var DocumentSelector;
    (function(DocumentSelector2) {
      function is(value) {
        if (!Array.isArray(value)) {
          return false;
        }
        for (let elem of value) {
          if (!Is.string(elem) && !TextDocumentFilter.is(elem) && !NotebookCellTextDocumentFilter.is(elem)) {
            return false;
          }
        }
        return true;
      }
      DocumentSelector2.is = is;
    })(DocumentSelector || (exports2.DocumentSelector = DocumentSelector = {}));
    var RegistrationRequest;
    (function(RegistrationRequest2) {
      RegistrationRequest2.method = "client/registerCapability";
      RegistrationRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      RegistrationRequest2.type = new messages_1.ProtocolRequestType(RegistrationRequest2.method);
    })(RegistrationRequest || (exports2.RegistrationRequest = RegistrationRequest = {}));
    var UnregistrationRequest;
    (function(UnregistrationRequest2) {
      UnregistrationRequest2.method = "client/unregisterCapability";
      UnregistrationRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      UnregistrationRequest2.type = new messages_1.ProtocolRequestType(UnregistrationRequest2.method);
    })(UnregistrationRequest || (exports2.UnregistrationRequest = UnregistrationRequest = {}));
    var ResourceOperationKind;
    (function(ResourceOperationKind2) {
      ResourceOperationKind2.Create = "create";
      ResourceOperationKind2.Rename = "rename";
      ResourceOperationKind2.Delete = "delete";
    })(ResourceOperationKind || (exports2.ResourceOperationKind = ResourceOperationKind = {}));
    var FailureHandlingKind;
    (function(FailureHandlingKind2) {
      FailureHandlingKind2.Abort = "abort";
      FailureHandlingKind2.Transactional = "transactional";
      FailureHandlingKind2.TextOnlyTransactional = "textOnlyTransactional";
      FailureHandlingKind2.Undo = "undo";
    })(FailureHandlingKind || (exports2.FailureHandlingKind = FailureHandlingKind = {}));
    var PositionEncodingKind;
    (function(PositionEncodingKind2) {
      PositionEncodingKind2.UTF8 = "utf-8";
      PositionEncodingKind2.UTF16 = "utf-16";
      PositionEncodingKind2.UTF32 = "utf-32";
    })(PositionEncodingKind || (exports2.PositionEncodingKind = PositionEncodingKind = {}));
    var StaticRegistrationOptions;
    (function(StaticRegistrationOptions2) {
      function hasId(value) {
        const candidate = value;
        return candidate && Is.string(candidate.id) && candidate.id.length > 0;
      }
      StaticRegistrationOptions2.hasId = hasId;
    })(StaticRegistrationOptions || (exports2.StaticRegistrationOptions = StaticRegistrationOptions = {}));
    var TextDocumentRegistrationOptions;
    (function(TextDocumentRegistrationOptions2) {
      function is(value) {
        const candidate = value;
        return candidate && (candidate.documentSelector === null || DocumentSelector.is(candidate.documentSelector));
      }
      TextDocumentRegistrationOptions2.is = is;
    })(TextDocumentRegistrationOptions || (exports2.TextDocumentRegistrationOptions = TextDocumentRegistrationOptions = {}));
    var WorkDoneProgressOptions;
    (function(WorkDoneProgressOptions2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && (candidate.workDoneProgress === void 0 || Is.boolean(candidate.workDoneProgress));
      }
      WorkDoneProgressOptions2.is = is;
      function hasWorkDoneProgress(value) {
        const candidate = value;
        return candidate && Is.boolean(candidate.workDoneProgress);
      }
      WorkDoneProgressOptions2.hasWorkDoneProgress = hasWorkDoneProgress;
    })(WorkDoneProgressOptions || (exports2.WorkDoneProgressOptions = WorkDoneProgressOptions = {}));
    var InitializeRequest;
    (function(InitializeRequest2) {
      InitializeRequest2.method = "initialize";
      InitializeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InitializeRequest2.type = new messages_1.ProtocolRequestType(InitializeRequest2.method);
    })(InitializeRequest || (exports2.InitializeRequest = InitializeRequest = {}));
    var InitializeErrorCodes;
    (function(InitializeErrorCodes2) {
      InitializeErrorCodes2.unknownProtocolVersion = 1;
    })(InitializeErrorCodes || (exports2.InitializeErrorCodes = InitializeErrorCodes = {}));
    var InitializedNotification;
    (function(InitializedNotification2) {
      InitializedNotification2.method = "initialized";
      InitializedNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      InitializedNotification2.type = new messages_1.ProtocolNotificationType(InitializedNotification2.method);
    })(InitializedNotification || (exports2.InitializedNotification = InitializedNotification = {}));
    var ShutdownRequest;
    (function(ShutdownRequest2) {
      ShutdownRequest2.method = "shutdown";
      ShutdownRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ShutdownRequest2.type = new messages_1.ProtocolRequestType0(ShutdownRequest2.method);
    })(ShutdownRequest || (exports2.ShutdownRequest = ShutdownRequest = {}));
    var ExitNotification;
    (function(ExitNotification2) {
      ExitNotification2.method = "exit";
      ExitNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      ExitNotification2.type = new messages_1.ProtocolNotificationType0(ExitNotification2.method);
    })(ExitNotification || (exports2.ExitNotification = ExitNotification = {}));
    var DidChangeConfigurationNotification;
    (function(DidChangeConfigurationNotification2) {
      DidChangeConfigurationNotification2.method = "workspace/didChangeConfiguration";
      DidChangeConfigurationNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeConfigurationNotification2.type = new messages_1.ProtocolNotificationType(DidChangeConfigurationNotification2.method);
    })(DidChangeConfigurationNotification || (exports2.DidChangeConfigurationNotification = DidChangeConfigurationNotification = {}));
    var MessageType;
    (function(MessageType2) {
      MessageType2.Error = 1;
      MessageType2.Warning = 2;
      MessageType2.Info = 3;
      MessageType2.Log = 4;
      MessageType2.Debug = 5;
    })(MessageType || (exports2.MessageType = MessageType = {}));
    var ShowMessageNotification;
    (function(ShowMessageNotification2) {
      ShowMessageNotification2.method = "window/showMessage";
      ShowMessageNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
      ShowMessageNotification2.type = new messages_1.ProtocolNotificationType(ShowMessageNotification2.method);
    })(ShowMessageNotification || (exports2.ShowMessageNotification = ShowMessageNotification = {}));
    var ShowMessageRequest;
    (function(ShowMessageRequest2) {
      ShowMessageRequest2.method = "window/showMessageRequest";
      ShowMessageRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      ShowMessageRequest2.type = new messages_1.ProtocolRequestType(ShowMessageRequest2.method);
    })(ShowMessageRequest || (exports2.ShowMessageRequest = ShowMessageRequest = {}));
    var LogMessageNotification;
    (function(LogMessageNotification2) {
      LogMessageNotification2.method = "window/logMessage";
      LogMessageNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
      LogMessageNotification2.type = new messages_1.ProtocolNotificationType(LogMessageNotification2.method);
    })(LogMessageNotification || (exports2.LogMessageNotification = LogMessageNotification = {}));
    var TelemetryEventNotification;
    (function(TelemetryEventNotification2) {
      TelemetryEventNotification2.method = "telemetry/event";
      TelemetryEventNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
      TelemetryEventNotification2.type = new messages_1.ProtocolNotificationType(TelemetryEventNotification2.method);
    })(TelemetryEventNotification || (exports2.TelemetryEventNotification = TelemetryEventNotification = {}));
    var TextDocumentSyncKind2;
    (function(TextDocumentSyncKind3) {
      TextDocumentSyncKind3.None = 0;
      TextDocumentSyncKind3.Full = 1;
      TextDocumentSyncKind3.Incremental = 2;
    })(TextDocumentSyncKind2 || (exports2.TextDocumentSyncKind = TextDocumentSyncKind2 = {}));
    var DidOpenTextDocumentNotification;
    (function(DidOpenTextDocumentNotification2) {
      DidOpenTextDocumentNotification2.method = "textDocument/didOpen";
      DidOpenTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidOpenTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidOpenTextDocumentNotification2.method);
    })(DidOpenTextDocumentNotification || (exports2.DidOpenTextDocumentNotification = DidOpenTextDocumentNotification = {}));
    var TextDocumentContentChangeEvent;
    (function(TextDocumentContentChangeEvent2) {
      function isIncremental(event) {
        let candidate = event;
        return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range !== void 0 && (candidate.rangeLength === void 0 || typeof candidate.rangeLength === "number");
      }
      TextDocumentContentChangeEvent2.isIncremental = isIncremental;
      function isFull(event) {
        let candidate = event;
        return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range === void 0 && candidate.rangeLength === void 0;
      }
      TextDocumentContentChangeEvent2.isFull = isFull;
    })(TextDocumentContentChangeEvent || (exports2.TextDocumentContentChangeEvent = TextDocumentContentChangeEvent = {}));
    var DidChangeTextDocumentNotification;
    (function(DidChangeTextDocumentNotification2) {
      DidChangeTextDocumentNotification2.method = "textDocument/didChange";
      DidChangeTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidChangeTextDocumentNotification2.method);
    })(DidChangeTextDocumentNotification || (exports2.DidChangeTextDocumentNotification = DidChangeTextDocumentNotification = {}));
    var DidCloseTextDocumentNotification;
    (function(DidCloseTextDocumentNotification2) {
      DidCloseTextDocumentNotification2.method = "textDocument/didClose";
      DidCloseTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidCloseTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidCloseTextDocumentNotification2.method);
    })(DidCloseTextDocumentNotification || (exports2.DidCloseTextDocumentNotification = DidCloseTextDocumentNotification = {}));
    var DidSaveTextDocumentNotification;
    (function(DidSaveTextDocumentNotification2) {
      DidSaveTextDocumentNotification2.method = "textDocument/didSave";
      DidSaveTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidSaveTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidSaveTextDocumentNotification2.method);
    })(DidSaveTextDocumentNotification || (exports2.DidSaveTextDocumentNotification = DidSaveTextDocumentNotification = {}));
    var TextDocumentSaveReason;
    (function(TextDocumentSaveReason2) {
      TextDocumentSaveReason2.Manual = 1;
      TextDocumentSaveReason2.AfterDelay = 2;
      TextDocumentSaveReason2.FocusOut = 3;
    })(TextDocumentSaveReason || (exports2.TextDocumentSaveReason = TextDocumentSaveReason = {}));
    var WillSaveTextDocumentNotification;
    (function(WillSaveTextDocumentNotification2) {
      WillSaveTextDocumentNotification2.method = "textDocument/willSave";
      WillSaveTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillSaveTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(WillSaveTextDocumentNotification2.method);
    })(WillSaveTextDocumentNotification || (exports2.WillSaveTextDocumentNotification = WillSaveTextDocumentNotification = {}));
    var WillSaveTextDocumentWaitUntilRequest;
    (function(WillSaveTextDocumentWaitUntilRequest2) {
      WillSaveTextDocumentWaitUntilRequest2.method = "textDocument/willSaveWaitUntil";
      WillSaveTextDocumentWaitUntilRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillSaveTextDocumentWaitUntilRequest2.type = new messages_1.ProtocolRequestType(WillSaveTextDocumentWaitUntilRequest2.method);
    })(WillSaveTextDocumentWaitUntilRequest || (exports2.WillSaveTextDocumentWaitUntilRequest = WillSaveTextDocumentWaitUntilRequest = {}));
    var DidChangeWatchedFilesNotification;
    (function(DidChangeWatchedFilesNotification2) {
      DidChangeWatchedFilesNotification2.method = "workspace/didChangeWatchedFiles";
      DidChangeWatchedFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeWatchedFilesNotification2.type = new messages_1.ProtocolNotificationType(DidChangeWatchedFilesNotification2.method);
    })(DidChangeWatchedFilesNotification || (exports2.DidChangeWatchedFilesNotification = DidChangeWatchedFilesNotification = {}));
    var FileChangeType;
    (function(FileChangeType2) {
      FileChangeType2.Created = 1;
      FileChangeType2.Changed = 2;
      FileChangeType2.Deleted = 3;
    })(FileChangeType || (exports2.FileChangeType = FileChangeType = {}));
    var RelativePattern;
    (function(RelativePattern2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && (vscode_languageserver_types_1.URI.is(candidate.baseUri) || vscode_languageserver_types_1.WorkspaceFolder.is(candidate.baseUri)) && Is.string(candidate.pattern);
      }
      RelativePattern2.is = is;
    })(RelativePattern || (exports2.RelativePattern = RelativePattern = {}));
    var WatchKind;
    (function(WatchKind2) {
      WatchKind2.Create = 1;
      WatchKind2.Change = 2;
      WatchKind2.Delete = 4;
    })(WatchKind || (exports2.WatchKind = WatchKind = {}));
    var PublishDiagnosticsNotification;
    (function(PublishDiagnosticsNotification2) {
      PublishDiagnosticsNotification2.method = "textDocument/publishDiagnostics";
      PublishDiagnosticsNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
      PublishDiagnosticsNotification2.type = new messages_1.ProtocolNotificationType(PublishDiagnosticsNotification2.method);
    })(PublishDiagnosticsNotification || (exports2.PublishDiagnosticsNotification = PublishDiagnosticsNotification = {}));
    var CompletionTriggerKind;
    (function(CompletionTriggerKind2) {
      CompletionTriggerKind2.Invoked = 1;
      CompletionTriggerKind2.TriggerCharacter = 2;
      CompletionTriggerKind2.TriggerForIncompleteCompletions = 3;
    })(CompletionTriggerKind || (exports2.CompletionTriggerKind = CompletionTriggerKind = {}));
    var CompletionRequest;
    (function(CompletionRequest2) {
      CompletionRequest2.method = "textDocument/completion";
      CompletionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CompletionRequest2.type = new messages_1.ProtocolRequestType(CompletionRequest2.method);
    })(CompletionRequest || (exports2.CompletionRequest = CompletionRequest = {}));
    var CompletionResolveRequest;
    (function(CompletionResolveRequest2) {
      CompletionResolveRequest2.method = "completionItem/resolve";
      CompletionResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CompletionResolveRequest2.type = new messages_1.ProtocolRequestType(CompletionResolveRequest2.method);
    })(CompletionResolveRequest || (exports2.CompletionResolveRequest = CompletionResolveRequest = {}));
    var HoverRequest;
    (function(HoverRequest2) {
      HoverRequest2.method = "textDocument/hover";
      HoverRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      HoverRequest2.type = new messages_1.ProtocolRequestType(HoverRequest2.method);
    })(HoverRequest || (exports2.HoverRequest = HoverRequest = {}));
    var SignatureHelpTriggerKind;
    (function(SignatureHelpTriggerKind2) {
      SignatureHelpTriggerKind2.Invoked = 1;
      SignatureHelpTriggerKind2.TriggerCharacter = 2;
      SignatureHelpTriggerKind2.ContentChange = 3;
    })(SignatureHelpTriggerKind || (exports2.SignatureHelpTriggerKind = SignatureHelpTriggerKind = {}));
    var SignatureHelpRequest;
    (function(SignatureHelpRequest2) {
      SignatureHelpRequest2.method = "textDocument/signatureHelp";
      SignatureHelpRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SignatureHelpRequest2.type = new messages_1.ProtocolRequestType(SignatureHelpRequest2.method);
    })(SignatureHelpRequest || (exports2.SignatureHelpRequest = SignatureHelpRequest = {}));
    var DefinitionRequest;
    (function(DefinitionRequest2) {
      DefinitionRequest2.method = "textDocument/definition";
      DefinitionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DefinitionRequest2.type = new messages_1.ProtocolRequestType(DefinitionRequest2.method);
    })(DefinitionRequest || (exports2.DefinitionRequest = DefinitionRequest = {}));
    var ReferencesRequest;
    (function(ReferencesRequest2) {
      ReferencesRequest2.method = "textDocument/references";
      ReferencesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ReferencesRequest2.type = new messages_1.ProtocolRequestType(ReferencesRequest2.method);
    })(ReferencesRequest || (exports2.ReferencesRequest = ReferencesRequest = {}));
    var DocumentHighlightRequest;
    (function(DocumentHighlightRequest2) {
      DocumentHighlightRequest2.method = "textDocument/documentHighlight";
      DocumentHighlightRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentHighlightRequest2.type = new messages_1.ProtocolRequestType(DocumentHighlightRequest2.method);
    })(DocumentHighlightRequest || (exports2.DocumentHighlightRequest = DocumentHighlightRequest = {}));
    var DocumentSymbolRequest;
    (function(DocumentSymbolRequest2) {
      DocumentSymbolRequest2.method = "textDocument/documentSymbol";
      DocumentSymbolRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentSymbolRequest2.type = new messages_1.ProtocolRequestType(DocumentSymbolRequest2.method);
    })(DocumentSymbolRequest || (exports2.DocumentSymbolRequest = DocumentSymbolRequest = {}));
    var CodeActionRequest;
    (function(CodeActionRequest2) {
      CodeActionRequest2.method = "textDocument/codeAction";
      CodeActionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CodeActionRequest2.type = new messages_1.ProtocolRequestType(CodeActionRequest2.method);
    })(CodeActionRequest || (exports2.CodeActionRequest = CodeActionRequest = {}));
    var CodeActionResolveRequest;
    (function(CodeActionResolveRequest2) {
      CodeActionResolveRequest2.method = "codeAction/resolve";
      CodeActionResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CodeActionResolveRequest2.type = new messages_1.ProtocolRequestType(CodeActionResolveRequest2.method);
    })(CodeActionResolveRequest || (exports2.CodeActionResolveRequest = CodeActionResolveRequest = {}));
    var WorkspaceSymbolRequest;
    (function(WorkspaceSymbolRequest2) {
      WorkspaceSymbolRequest2.method = "workspace/symbol";
      WorkspaceSymbolRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WorkspaceSymbolRequest2.type = new messages_1.ProtocolRequestType(WorkspaceSymbolRequest2.method);
    })(WorkspaceSymbolRequest || (exports2.WorkspaceSymbolRequest = WorkspaceSymbolRequest = {}));
    var WorkspaceSymbolResolveRequest;
    (function(WorkspaceSymbolResolveRequest2) {
      WorkspaceSymbolResolveRequest2.method = "workspaceSymbol/resolve";
      WorkspaceSymbolResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WorkspaceSymbolResolveRequest2.type = new messages_1.ProtocolRequestType(WorkspaceSymbolResolveRequest2.method);
    })(WorkspaceSymbolResolveRequest || (exports2.WorkspaceSymbolResolveRequest = WorkspaceSymbolResolveRequest = {}));
    var CodeLensRequest;
    (function(CodeLensRequest2) {
      CodeLensRequest2.method = "textDocument/codeLens";
      CodeLensRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CodeLensRequest2.type = new messages_1.ProtocolRequestType(CodeLensRequest2.method);
    })(CodeLensRequest || (exports2.CodeLensRequest = CodeLensRequest = {}));
    var CodeLensResolveRequest;
    (function(CodeLensResolveRequest2) {
      CodeLensResolveRequest2.method = "codeLens/resolve";
      CodeLensResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CodeLensResolveRequest2.type = new messages_1.ProtocolRequestType(CodeLensResolveRequest2.method);
    })(CodeLensResolveRequest || (exports2.CodeLensResolveRequest = CodeLensResolveRequest = {}));
    var CodeLensRefreshRequest;
    (function(CodeLensRefreshRequest2) {
      CodeLensRefreshRequest2.method = `workspace/codeLens/refresh`;
      CodeLensRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      CodeLensRefreshRequest2.type = new messages_1.ProtocolRequestType0(CodeLensRefreshRequest2.method);
    })(CodeLensRefreshRequest || (exports2.CodeLensRefreshRequest = CodeLensRefreshRequest = {}));
    var DocumentLinkRequest;
    (function(DocumentLinkRequest2) {
      DocumentLinkRequest2.method = "textDocument/documentLink";
      DocumentLinkRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentLinkRequest2.type = new messages_1.ProtocolRequestType(DocumentLinkRequest2.method);
    })(DocumentLinkRequest || (exports2.DocumentLinkRequest = DocumentLinkRequest = {}));
    var DocumentLinkResolveRequest;
    (function(DocumentLinkResolveRequest2) {
      DocumentLinkResolveRequest2.method = "documentLink/resolve";
      DocumentLinkResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentLinkResolveRequest2.type = new messages_1.ProtocolRequestType(DocumentLinkResolveRequest2.method);
    })(DocumentLinkResolveRequest || (exports2.DocumentLinkResolveRequest = DocumentLinkResolveRequest = {}));
    var DocumentFormattingRequest;
    (function(DocumentFormattingRequest2) {
      DocumentFormattingRequest2.method = "textDocument/formatting";
      DocumentFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentFormattingRequest2.type = new messages_1.ProtocolRequestType(DocumentFormattingRequest2.method);
    })(DocumentFormattingRequest || (exports2.DocumentFormattingRequest = DocumentFormattingRequest = {}));
    var DocumentRangeFormattingRequest;
    (function(DocumentRangeFormattingRequest2) {
      DocumentRangeFormattingRequest2.method = "textDocument/rangeFormatting";
      DocumentRangeFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentRangeFormattingRequest2.type = new messages_1.ProtocolRequestType(DocumentRangeFormattingRequest2.method);
    })(DocumentRangeFormattingRequest || (exports2.DocumentRangeFormattingRequest = DocumentRangeFormattingRequest = {}));
    var DocumentRangesFormattingRequest;
    (function(DocumentRangesFormattingRequest2) {
      DocumentRangesFormattingRequest2.method = "textDocument/rangesFormatting";
      DocumentRangesFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentRangesFormattingRequest2.type = new messages_1.ProtocolRequestType(DocumentRangesFormattingRequest2.method);
    })(DocumentRangesFormattingRequest || (exports2.DocumentRangesFormattingRequest = DocumentRangesFormattingRequest = {}));
    var DocumentOnTypeFormattingRequest;
    (function(DocumentOnTypeFormattingRequest2) {
      DocumentOnTypeFormattingRequest2.method = "textDocument/onTypeFormatting";
      DocumentOnTypeFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentOnTypeFormattingRequest2.type = new messages_1.ProtocolRequestType(DocumentOnTypeFormattingRequest2.method);
    })(DocumentOnTypeFormattingRequest || (exports2.DocumentOnTypeFormattingRequest = DocumentOnTypeFormattingRequest = {}));
    var PrepareSupportDefaultBehavior;
    (function(PrepareSupportDefaultBehavior2) {
      PrepareSupportDefaultBehavior2.Identifier = 1;
    })(PrepareSupportDefaultBehavior || (exports2.PrepareSupportDefaultBehavior = PrepareSupportDefaultBehavior = {}));
    var RenameRequest;
    (function(RenameRequest2) {
      RenameRequest2.method = "textDocument/rename";
      RenameRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      RenameRequest2.type = new messages_1.ProtocolRequestType(RenameRequest2.method);
    })(RenameRequest || (exports2.RenameRequest = RenameRequest = {}));
    var PrepareRenameRequest;
    (function(PrepareRenameRequest2) {
      PrepareRenameRequest2.method = "textDocument/prepareRename";
      PrepareRenameRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      PrepareRenameRequest2.type = new messages_1.ProtocolRequestType(PrepareRenameRequest2.method);
    })(PrepareRenameRequest || (exports2.PrepareRenameRequest = PrepareRenameRequest = {}));
    var ExecuteCommandRequest;
    (function(ExecuteCommandRequest2) {
      ExecuteCommandRequest2.method = "workspace/executeCommand";
      ExecuteCommandRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ExecuteCommandRequest2.type = new messages_1.ProtocolRequestType(ExecuteCommandRequest2.method);
    })(ExecuteCommandRequest || (exports2.ExecuteCommandRequest = ExecuteCommandRequest = {}));
    var ApplyWorkspaceEditRequest;
    (function(ApplyWorkspaceEditRequest2) {
      ApplyWorkspaceEditRequest2.method = "workspace/applyEdit";
      ApplyWorkspaceEditRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      ApplyWorkspaceEditRequest2.type = new messages_1.ProtocolRequestType("workspace/applyEdit");
    })(ApplyWorkspaceEditRequest || (exports2.ApplyWorkspaceEditRequest = ApplyWorkspaceEditRequest = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/connection.js
var require_connection2 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/connection.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createProtocolConnection = void 0;
    var vscode_jsonrpc_1 = require_main();
    function createProtocolConnection(input, output, logger, options) {
      if (vscode_jsonrpc_1.ConnectionStrategy.is(options)) {
        options = { connectionStrategy: options };
      }
      return (0, vscode_jsonrpc_1.createMessageConnection)(input, output, logger, options);
    }
    exports2.createProtocolConnection = createProtocolConnection;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/api.js
var require_api2 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/api.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LSPErrorCodes = exports2.createProtocolConnection = void 0;
    __exportStar(require_main(), exports2);
    __exportStar(require_main2(), exports2);
    __exportStar(require_messages2(), exports2);
    __exportStar(require_protocol(), exports2);
    var connection_1 = require_connection2();
    Object.defineProperty(exports2, "createProtocolConnection", { enumerable: true, get: function() {
      return connection_1.createProtocolConnection;
    } });
    var LSPErrorCodes;
    (function(LSPErrorCodes2) {
      LSPErrorCodes2.lspReservedErrorRangeStart = -32899;
      LSPErrorCodes2.RequestFailed = -32803;
      LSPErrorCodes2.ServerCancelled = -32802;
      LSPErrorCodes2.ContentModified = -32801;
      LSPErrorCodes2.RequestCancelled = -32800;
      LSPErrorCodes2.lspReservedErrorRangeEnd = -32800;
    })(LSPErrorCodes || (exports2.LSPErrorCodes = LSPErrorCodes = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/node/main.js
var require_main3 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/node/main.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createProtocolConnection = void 0;
    var node_1 = require_node();
    __exportStar(require_node(), exports2);
    __exportStar(require_api2(), exports2);
    function createProtocolConnection(input, output, logger, options) {
      return (0, node_1.createMessageConnection)(input, output, logger, options);
    }
    exports2.createProtocolConnection = createProtocolConnection;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/utils/uuid.js
var require_uuid = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/utils/uuid.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generateUuid = exports2.parse = exports2.isUUID = exports2.v4 = exports2.empty = void 0;
    var ValueUUID = class {
      constructor(_value) {
        this._value = _value;
      }
      asHex() {
        return this._value;
      }
      equals(other) {
        return this.asHex() === other.asHex();
      }
    };
    var V4UUID = class _V4UUID extends ValueUUID {
      static _oneOf(array) {
        return array[Math.floor(array.length * Math.random())];
      }
      static _randomHex() {
        return _V4UUID._oneOf(_V4UUID._chars);
      }
      constructor() {
        super([
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          "-",
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          "-",
          "4",
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          "-",
          _V4UUID._oneOf(_V4UUID._timeHighBits),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          "-",
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex()
        ].join(""));
      }
    };
    V4UUID._chars = ["0", "1", "2", "3", "4", "5", "6", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    V4UUID._timeHighBits = ["8", "9", "a", "b"];
    exports2.empty = new ValueUUID("00000000-0000-0000-0000-000000000000");
    function v4() {
      return new V4UUID();
    }
    exports2.v4 = v4;
    var _UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    function isUUID(value) {
      return _UUIDPattern.test(value);
    }
    exports2.isUUID = isUUID;
    function parse(value) {
      if (!isUUID(value)) {
        throw new Error("invalid uuid");
      }
      return new ValueUUID(value);
    }
    exports2.parse = parse;
    function generateUuid() {
      return v4().asHex();
    }
    exports2.generateUuid = generateUuid;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/progress.js
var require_progress = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/progress.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.attachPartialResult = exports2.ProgressFeature = exports2.attachWorkDone = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var uuid_1 = require_uuid();
    var WorkDoneProgressReporterImpl = class _WorkDoneProgressReporterImpl {
      constructor(_connection, _token) {
        this._connection = _connection;
        this._token = _token;
        _WorkDoneProgressReporterImpl.Instances.set(this._token, this);
      }
      begin(title, percentage, message, cancellable) {
        let param = {
          kind: "begin",
          title,
          percentage,
          message,
          cancellable
        };
        this._connection.sendProgress(vscode_languageserver_protocol_1.WorkDoneProgress.type, this._token, param);
      }
      report(arg0, arg1) {
        let param = {
          kind: "report"
        };
        if (typeof arg0 === "number") {
          param.percentage = arg0;
          if (arg1 !== void 0) {
            param.message = arg1;
          }
        } else {
          param.message = arg0;
        }
        this._connection.sendProgress(vscode_languageserver_protocol_1.WorkDoneProgress.type, this._token, param);
      }
      done() {
        _WorkDoneProgressReporterImpl.Instances.delete(this._token);
        this._connection.sendProgress(vscode_languageserver_protocol_1.WorkDoneProgress.type, this._token, { kind: "end" });
      }
    };
    WorkDoneProgressReporterImpl.Instances = /* @__PURE__ */ new Map();
    var WorkDoneProgressServerReporterImpl = class extends WorkDoneProgressReporterImpl {
      constructor(connection, token) {
        super(connection, token);
        this._source = new vscode_languageserver_protocol_1.CancellationTokenSource();
      }
      get token() {
        return this._source.token;
      }
      done() {
        this._source.dispose();
        super.done();
      }
      cancel() {
        this._source.cancel();
      }
    };
    var NullProgressReporter = class {
      constructor() {
      }
      begin() {
      }
      report() {
      }
      done() {
      }
    };
    var NullProgressServerReporter = class extends NullProgressReporter {
      constructor() {
        super();
        this._source = new vscode_languageserver_protocol_1.CancellationTokenSource();
      }
      get token() {
        return this._source.token;
      }
      done() {
        this._source.dispose();
      }
      cancel() {
        this._source.cancel();
      }
    };
    function attachWorkDone(connection, params) {
      if (params === void 0 || params.workDoneToken === void 0) {
        return new NullProgressReporter();
      }
      const token = params.workDoneToken;
      delete params.workDoneToken;
      return new WorkDoneProgressReporterImpl(connection, token);
    }
    exports2.attachWorkDone = attachWorkDone;
    var ProgressFeature = (Base) => {
      return class extends Base {
        constructor() {
          super();
          this._progressSupported = false;
        }
        initialize(capabilities) {
          super.initialize(capabilities);
          if (capabilities?.window?.workDoneProgress === true) {
            this._progressSupported = true;
            this.connection.onNotification(vscode_languageserver_protocol_1.WorkDoneProgressCancelNotification.type, (params) => {
              let progress = WorkDoneProgressReporterImpl.Instances.get(params.token);
              if (progress instanceof WorkDoneProgressServerReporterImpl || progress instanceof NullProgressServerReporter) {
                progress.cancel();
              }
            });
          }
        }
        attachWorkDoneProgress(token) {
          if (token === void 0) {
            return new NullProgressReporter();
          } else {
            return new WorkDoneProgressReporterImpl(this.connection, token);
          }
        }
        createWorkDoneProgress() {
          if (this._progressSupported) {
            const token = (0, uuid_1.generateUuid)();
            return this.connection.sendRequest(vscode_languageserver_protocol_1.WorkDoneProgressCreateRequest.type, { token }).then(() => {
              const result = new WorkDoneProgressServerReporterImpl(this.connection, token);
              return result;
            });
          } else {
            return Promise.resolve(new NullProgressServerReporter());
          }
        }
      };
    };
    exports2.ProgressFeature = ProgressFeature;
    var ResultProgress;
    (function(ResultProgress2) {
      ResultProgress2.type = new vscode_languageserver_protocol_1.ProgressType();
    })(ResultProgress || (ResultProgress = {}));
    var ResultProgressReporterImpl = class {
      constructor(_connection, _token) {
        this._connection = _connection;
        this._token = _token;
      }
      report(data) {
        this._connection.sendProgress(ResultProgress.type, this._token, data);
      }
    };
    function attachPartialResult(connection, params) {
      if (params === void 0 || params.partialResultToken === void 0) {
        return void 0;
      }
      const token = params.partialResultToken;
      delete params.partialResultToken;
      return new ResultProgressReporterImpl(connection, token);
    }
    exports2.attachPartialResult = attachPartialResult;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/configuration.js
var require_configuration = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/configuration.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfigurationFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var Is = require_is();
    var ConfigurationFeature = (Base) => {
      return class extends Base {
        getConfiguration(arg) {
          if (!arg) {
            return this._getConfiguration({});
          } else if (Is.string(arg)) {
            return this._getConfiguration({ section: arg });
          } else {
            return this._getConfiguration(arg);
          }
        }
        _getConfiguration(arg) {
          let params = {
            items: Array.isArray(arg) ? arg : [arg]
          };
          return this.connection.sendRequest(vscode_languageserver_protocol_1.ConfigurationRequest.type, params).then((result) => {
            if (Array.isArray(result)) {
              return Array.isArray(arg) ? result : result[0];
            } else {
              return Array.isArray(arg) ? [] : null;
            }
          });
        }
      };
    };
    exports2.ConfigurationFeature = ConfigurationFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/workspaceFolder.js
var require_workspaceFolder = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/workspaceFolder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WorkspaceFoldersFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var WorkspaceFoldersFeature = (Base) => {
      return class extends Base {
        constructor() {
          super();
          this._notificationIsAutoRegistered = false;
        }
        initialize(capabilities) {
          super.initialize(capabilities);
          let workspaceCapabilities = capabilities.workspace;
          if (workspaceCapabilities && workspaceCapabilities.workspaceFolders) {
            this._onDidChangeWorkspaceFolders = new vscode_languageserver_protocol_1.Emitter();
            this.connection.onNotification(vscode_languageserver_protocol_1.DidChangeWorkspaceFoldersNotification.type, (params) => {
              this._onDidChangeWorkspaceFolders.fire(params.event);
            });
          }
        }
        fillServerCapabilities(capabilities) {
          super.fillServerCapabilities(capabilities);
          const changeNotifications = capabilities.workspace?.workspaceFolders?.changeNotifications;
          this._notificationIsAutoRegistered = changeNotifications === true || typeof changeNotifications === "string";
        }
        getWorkspaceFolders() {
          return this.connection.sendRequest(vscode_languageserver_protocol_1.WorkspaceFoldersRequest.type);
        }
        get onDidChangeWorkspaceFolders() {
          if (!this._onDidChangeWorkspaceFolders) {
            throw new Error("Client doesn't support sending workspace folder change events.");
          }
          if (!this._notificationIsAutoRegistered && !this._unregistration) {
            this._unregistration = this.connection.client.register(vscode_languageserver_protocol_1.DidChangeWorkspaceFoldersNotification.type);
          }
          return this._onDidChangeWorkspaceFolders.event;
        }
      };
    };
    exports2.WorkspaceFoldersFeature = WorkspaceFoldersFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/callHierarchy.js
var require_callHierarchy = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/callHierarchy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CallHierarchyFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var CallHierarchyFeature = (Base) => {
      return class extends Base {
        get callHierarchy() {
          return {
            onPrepare: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.CallHierarchyPrepareRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), void 0);
              });
            },
            onIncomingCalls: (handler) => {
              const type = vscode_languageserver_protocol_1.CallHierarchyIncomingCallsRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            },
            onOutgoingCalls: (handler) => {
              const type = vscode_languageserver_protocol_1.CallHierarchyOutgoingCallsRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.CallHierarchyFeature = CallHierarchyFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/semanticTokens.js
var require_semanticTokens = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/semanticTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SemanticTokensBuilder = exports2.SemanticTokensDiff = exports2.SemanticTokensFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var SemanticTokensFeature = (Base) => {
      return class extends Base {
        get semanticTokens() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.SemanticTokensRefreshRequest.type);
            },
            on: (handler) => {
              const type = vscode_languageserver_protocol_1.SemanticTokensRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            },
            onDelta: (handler) => {
              const type = vscode_languageserver_protocol_1.SemanticTokensDeltaRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            },
            onRange: (handler) => {
              const type = vscode_languageserver_protocol_1.SemanticTokensRangeRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.SemanticTokensFeature = SemanticTokensFeature;
    var SemanticTokensDiff = class {
      constructor(originalSequence, modifiedSequence) {
        this.originalSequence = originalSequence;
        this.modifiedSequence = modifiedSequence;
      }
      computeDiff() {
        const originalLength = this.originalSequence.length;
        const modifiedLength = this.modifiedSequence.length;
        let startIndex = 0;
        while (startIndex < modifiedLength && startIndex < originalLength && this.originalSequence[startIndex] === this.modifiedSequence[startIndex]) {
          startIndex++;
        }
        if (startIndex < modifiedLength && startIndex < originalLength) {
          let originalEndIndex = originalLength - 1;
          let modifiedEndIndex = modifiedLength - 1;
          while (originalEndIndex >= startIndex && modifiedEndIndex >= startIndex && this.originalSequence[originalEndIndex] === this.modifiedSequence[modifiedEndIndex]) {
            originalEndIndex--;
            modifiedEndIndex--;
          }
          if (originalEndIndex < startIndex || modifiedEndIndex < startIndex) {
            originalEndIndex++;
            modifiedEndIndex++;
          }
          const deleteCount = originalEndIndex - startIndex + 1;
          const newData = this.modifiedSequence.slice(startIndex, modifiedEndIndex + 1);
          if (newData.length === 1 && newData[0] === this.originalSequence[originalEndIndex]) {
            return [
              { start: startIndex, deleteCount: deleteCount - 1 }
            ];
          } else {
            return [
              { start: startIndex, deleteCount, data: newData }
            ];
          }
        } else if (startIndex < modifiedLength) {
          return [
            { start: startIndex, deleteCount: 0, data: this.modifiedSequence.slice(startIndex) }
          ];
        } else if (startIndex < originalLength) {
          return [
            { start: startIndex, deleteCount: originalLength - startIndex }
          ];
        } else {
          return [];
        }
      }
    };
    exports2.SemanticTokensDiff = SemanticTokensDiff;
    var SemanticTokensBuilder2 = class {
      constructor() {
        this._prevData = void 0;
        this.initialize();
      }
      initialize() {
        this._id = Date.now();
        this._prevLine = 0;
        this._prevChar = 0;
        this._data = [];
        this._dataLen = 0;
      }
      push(line, char, length, tokenType, tokenModifiers) {
        let pushLine = line;
        let pushChar = char;
        if (this._dataLen > 0) {
          pushLine -= this._prevLine;
          if (pushLine === 0) {
            pushChar -= this._prevChar;
          }
        }
        this._data[this._dataLen++] = pushLine;
        this._data[this._dataLen++] = pushChar;
        this._data[this._dataLen++] = length;
        this._data[this._dataLen++] = tokenType;
        this._data[this._dataLen++] = tokenModifiers;
        this._prevLine = line;
        this._prevChar = char;
      }
      get id() {
        return this._id.toString();
      }
      previousResult(id) {
        if (this.id === id) {
          this._prevData = this._data;
        }
        this.initialize();
      }
      build() {
        this._prevData = void 0;
        return {
          resultId: this.id,
          data: this._data
        };
      }
      canBuildEdits() {
        return this._prevData !== void 0;
      }
      buildEdits() {
        if (this._prevData !== void 0) {
          return {
            resultId: this.id,
            edits: new SemanticTokensDiff(this._prevData, this._data).computeDiff()
          };
        } else {
          return this.build();
        }
      }
    };
    exports2.SemanticTokensBuilder = SemanticTokensBuilder2;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/showDocument.js
var require_showDocument = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/showDocument.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ShowDocumentFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var ShowDocumentFeature = (Base) => {
      return class extends Base {
        showDocument(params) {
          return this.connection.sendRequest(vscode_languageserver_protocol_1.ShowDocumentRequest.type, params);
        }
      };
    };
    exports2.ShowDocumentFeature = ShowDocumentFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/fileOperations.js
var require_fileOperations = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/fileOperations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileOperationsFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var FileOperationsFeature = (Base) => {
      return class extends Base {
        onDidCreateFiles(handler) {
          return this.connection.onNotification(vscode_languageserver_protocol_1.DidCreateFilesNotification.type, (params) => {
            handler(params);
          });
        }
        onDidRenameFiles(handler) {
          return this.connection.onNotification(vscode_languageserver_protocol_1.DidRenameFilesNotification.type, (params) => {
            handler(params);
          });
        }
        onDidDeleteFiles(handler) {
          return this.connection.onNotification(vscode_languageserver_protocol_1.DidDeleteFilesNotification.type, (params) => {
            handler(params);
          });
        }
        onWillCreateFiles(handler) {
          return this.connection.onRequest(vscode_languageserver_protocol_1.WillCreateFilesRequest.type, (params, cancel) => {
            return handler(params, cancel);
          });
        }
        onWillRenameFiles(handler) {
          return this.connection.onRequest(vscode_languageserver_protocol_1.WillRenameFilesRequest.type, (params, cancel) => {
            return handler(params, cancel);
          });
        }
        onWillDeleteFiles(handler) {
          return this.connection.onRequest(vscode_languageserver_protocol_1.WillDeleteFilesRequest.type, (params, cancel) => {
            return handler(params, cancel);
          });
        }
      };
    };
    exports2.FileOperationsFeature = FileOperationsFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/linkedEditingRange.js
var require_linkedEditingRange = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/linkedEditingRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LinkedEditingRangeFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var LinkedEditingRangeFeature = (Base) => {
      return class extends Base {
        onLinkedEditingRange(handler) {
          return this.connection.onRequest(vscode_languageserver_protocol_1.LinkedEditingRangeRequest.type, (params, cancel) => {
            return handler(params, cancel, this.attachWorkDoneProgress(params), void 0);
          });
        }
      };
    };
    exports2.LinkedEditingRangeFeature = LinkedEditingRangeFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/typeHierarchy.js
var require_typeHierarchy = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/typeHierarchy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypeHierarchyFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var TypeHierarchyFeature = (Base) => {
      return class extends Base {
        get typeHierarchy() {
          return {
            onPrepare: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.TypeHierarchyPrepareRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), void 0);
              });
            },
            onSupertypes: (handler) => {
              const type = vscode_languageserver_protocol_1.TypeHierarchySupertypesRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            },
            onSubtypes: (handler) => {
              const type = vscode_languageserver_protocol_1.TypeHierarchySubtypesRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.TypeHierarchyFeature = TypeHierarchyFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/inlineValue.js
var require_inlineValue = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/inlineValue.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlineValueFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var InlineValueFeature = (Base) => {
      return class extends Base {
        get inlineValue() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.InlineValueRefreshRequest.type);
            },
            on: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.InlineValueRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params));
              });
            }
          };
        }
      };
    };
    exports2.InlineValueFeature = InlineValueFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/foldingRange.js
var require_foldingRange = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/foldingRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FoldingRangeFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var FoldingRangeFeature = (Base) => {
      return class extends Base {
        get foldingRange() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.FoldingRangeRefreshRequest.type);
            },
            on: (handler) => {
              const type = vscode_languageserver_protocol_1.FoldingRangeRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.FoldingRangeFeature = FoldingRangeFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/inlayHint.js
var require_inlayHint = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/inlayHint.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlayHintFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var InlayHintFeature = (Base) => {
      return class extends Base {
        get inlayHint() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.InlayHintRefreshRequest.type);
            },
            on: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.InlayHintRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params));
              });
            },
            resolve: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.InlayHintResolveRequest.type, (params, cancel) => {
                return handler(params, cancel);
              });
            }
          };
        }
      };
    };
    exports2.InlayHintFeature = InlayHintFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/diagnostic.js
var require_diagnostic = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/diagnostic.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DiagnosticFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var DiagnosticFeature = (Base) => {
      return class extends Base {
        get diagnostics() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.DiagnosticRefreshRequest.type);
            },
            on: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.DocumentDiagnosticRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(vscode_languageserver_protocol_1.DocumentDiagnosticRequest.partialResult, params));
              });
            },
            onWorkspace: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.WorkspaceDiagnosticRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(vscode_languageserver_protocol_1.WorkspaceDiagnosticRequest.partialResult, params));
              });
            }
          };
        }
      };
    };
    exports2.DiagnosticFeature = DiagnosticFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/textDocuments.js
var require_textDocuments = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/textDocuments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TextDocuments = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var TextDocuments2 = class {
      /**
       * Create a new text document manager.
       */
      constructor(configuration) {
        this._configuration = configuration;
        this._syncedDocuments = /* @__PURE__ */ new Map();
        this._onDidChangeContent = new vscode_languageserver_protocol_1.Emitter();
        this._onDidOpen = new vscode_languageserver_protocol_1.Emitter();
        this._onDidClose = new vscode_languageserver_protocol_1.Emitter();
        this._onDidSave = new vscode_languageserver_protocol_1.Emitter();
        this._onWillSave = new vscode_languageserver_protocol_1.Emitter();
      }
      /**
       * An event that fires when a text document managed by this manager
       * has been opened.
       */
      get onDidOpen() {
        return this._onDidOpen.event;
      }
      /**
       * An event that fires when a text document managed by this manager
       * has been opened or the content changes.
       */
      get onDidChangeContent() {
        return this._onDidChangeContent.event;
      }
      /**
       * An event that fires when a text document managed by this manager
       * will be saved.
       */
      get onWillSave() {
        return this._onWillSave.event;
      }
      /**
       * Sets a handler that will be called if a participant wants to provide
       * edits during a text document save.
       */
      onWillSaveWaitUntil(handler) {
        this._willSaveWaitUntil = handler;
      }
      /**
       * An event that fires when a text document managed by this manager
       * has been saved.
       */
      get onDidSave() {
        return this._onDidSave.event;
      }
      /**
       * An event that fires when a text document managed by this manager
       * has been closed.
       */
      get onDidClose() {
        return this._onDidClose.event;
      }
      /**
       * Returns the document for the given URI. Returns undefined if
       * the document is not managed by this instance.
       *
       * @param uri The text document's URI to retrieve.
       * @return the text document or `undefined`.
       */
      get(uri) {
        return this._syncedDocuments.get(uri);
      }
      /**
       * Returns all text documents managed by this instance.
       *
       * @return all text documents.
       */
      all() {
        return Array.from(this._syncedDocuments.values());
      }
      /**
       * Returns the URIs of all text documents managed by this instance.
       *
       * @return the URI's of all text documents.
       */
      keys() {
        return Array.from(this._syncedDocuments.keys());
      }
      /**
       * Listens for `low level` notification on the given connection to
       * update the text documents managed by this instance.
       *
       * Please note that the connection only provides handlers not an event model. Therefore
       * listening on a connection will overwrite the following handlers on a connection:
       * `onDidOpenTextDocument`, `onDidChangeTextDocument`, `onDidCloseTextDocument`,
       * `onWillSaveTextDocument`, `onWillSaveTextDocumentWaitUntil` and `onDidSaveTextDocument`.
       *
       * Use the corresponding events on the TextDocuments instance instead.
       *
       * @param connection The connection to listen on.
       */
      listen(connection) {
        connection.__textDocumentSync = vscode_languageserver_protocol_1.TextDocumentSyncKind.Incremental;
        const disposables = [];
        disposables.push(connection.onDidOpenTextDocument((event) => {
          const td = event.textDocument;
          const document2 = this._configuration.create(td.uri, td.languageId, td.version, td.text);
          this._syncedDocuments.set(td.uri, document2);
          const toFire = Object.freeze({ document: document2 });
          this._onDidOpen.fire(toFire);
          this._onDidChangeContent.fire(toFire);
        }));
        disposables.push(connection.onDidChangeTextDocument((event) => {
          const td = event.textDocument;
          const changes = event.contentChanges;
          if (changes.length === 0) {
            return;
          }
          const { version } = td;
          if (version === null || version === void 0) {
            throw new Error(`Received document change event for ${td.uri} without valid version identifier`);
          }
          let syncedDocument = this._syncedDocuments.get(td.uri);
          if (syncedDocument !== void 0) {
            syncedDocument = this._configuration.update(syncedDocument, changes, version);
            this._syncedDocuments.set(td.uri, syncedDocument);
            this._onDidChangeContent.fire(Object.freeze({ document: syncedDocument }));
          }
        }));
        disposables.push(connection.onDidCloseTextDocument((event) => {
          let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
          if (syncedDocument !== void 0) {
            this._syncedDocuments.delete(event.textDocument.uri);
            this._onDidClose.fire(Object.freeze({ document: syncedDocument }));
          }
        }));
        disposables.push(connection.onWillSaveTextDocument((event) => {
          let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
          if (syncedDocument !== void 0) {
            this._onWillSave.fire(Object.freeze({ document: syncedDocument, reason: event.reason }));
          }
        }));
        disposables.push(connection.onWillSaveTextDocumentWaitUntil((event, token) => {
          let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
          if (syncedDocument !== void 0 && this._willSaveWaitUntil) {
            return this._willSaveWaitUntil(Object.freeze({ document: syncedDocument, reason: event.reason }), token);
          } else {
            return [];
          }
        }));
        disposables.push(connection.onDidSaveTextDocument((event) => {
          let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
          if (syncedDocument !== void 0) {
            this._onDidSave.fire(Object.freeze({ document: syncedDocument }));
          }
        }));
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          disposables.forEach((disposable) => disposable.dispose());
        });
      }
    };
    exports2.TextDocuments = TextDocuments2;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/notebook.js
var require_notebook = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/notebook.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NotebookDocuments = exports2.NotebookSyncFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var textDocuments_1 = require_textDocuments();
    var NotebookSyncFeature = (Base) => {
      return class extends Base {
        get synchronization() {
          return {
            onDidOpenNotebookDocument: (handler) => {
              return this.connection.onNotification(vscode_languageserver_protocol_1.DidOpenNotebookDocumentNotification.type, (params) => {
                handler(params);
              });
            },
            onDidChangeNotebookDocument: (handler) => {
              return this.connection.onNotification(vscode_languageserver_protocol_1.DidChangeNotebookDocumentNotification.type, (params) => {
                handler(params);
              });
            },
            onDidSaveNotebookDocument: (handler) => {
              return this.connection.onNotification(vscode_languageserver_protocol_1.DidSaveNotebookDocumentNotification.type, (params) => {
                handler(params);
              });
            },
            onDidCloseNotebookDocument: (handler) => {
              return this.connection.onNotification(vscode_languageserver_protocol_1.DidCloseNotebookDocumentNotification.type, (params) => {
                handler(params);
              });
            }
          };
        }
      };
    };
    exports2.NotebookSyncFeature = NotebookSyncFeature;
    var CellTextDocumentConnection = class _CellTextDocumentConnection {
      onDidOpenTextDocument(handler) {
        this.openHandler = handler;
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          this.openHandler = void 0;
        });
      }
      openTextDocument(params) {
        this.openHandler && this.openHandler(params);
      }
      onDidChangeTextDocument(handler) {
        this.changeHandler = handler;
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          this.changeHandler = handler;
        });
      }
      changeTextDocument(params) {
        this.changeHandler && this.changeHandler(params);
      }
      onDidCloseTextDocument(handler) {
        this.closeHandler = handler;
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          this.closeHandler = void 0;
        });
      }
      closeTextDocument(params) {
        this.closeHandler && this.closeHandler(params);
      }
      onWillSaveTextDocument() {
        return _CellTextDocumentConnection.NULL_DISPOSE;
      }
      onWillSaveTextDocumentWaitUntil() {
        return _CellTextDocumentConnection.NULL_DISPOSE;
      }
      onDidSaveTextDocument() {
        return _CellTextDocumentConnection.NULL_DISPOSE;
      }
    };
    CellTextDocumentConnection.NULL_DISPOSE = Object.freeze({ dispose: () => {
    } });
    var NotebookDocuments = class {
      constructor(configurationOrTextDocuments) {
        if (configurationOrTextDocuments instanceof textDocuments_1.TextDocuments) {
          this._cellTextDocuments = configurationOrTextDocuments;
        } else {
          this._cellTextDocuments = new textDocuments_1.TextDocuments(configurationOrTextDocuments);
        }
        this.notebookDocuments = /* @__PURE__ */ new Map();
        this.notebookCellMap = /* @__PURE__ */ new Map();
        this._onDidOpen = new vscode_languageserver_protocol_1.Emitter();
        this._onDidChange = new vscode_languageserver_protocol_1.Emitter();
        this._onDidSave = new vscode_languageserver_protocol_1.Emitter();
        this._onDidClose = new vscode_languageserver_protocol_1.Emitter();
      }
      get cellTextDocuments() {
        return this._cellTextDocuments;
      }
      getCellTextDocument(cell) {
        return this._cellTextDocuments.get(cell.document);
      }
      getNotebookDocument(uri) {
        return this.notebookDocuments.get(uri);
      }
      getNotebookCell(uri) {
        const value = this.notebookCellMap.get(uri);
        return value && value[0];
      }
      findNotebookDocumentForCell(cell) {
        const key = typeof cell === "string" ? cell : cell.document;
        const value = this.notebookCellMap.get(key);
        return value && value[1];
      }
      get onDidOpen() {
        return this._onDidOpen.event;
      }
      get onDidSave() {
        return this._onDidSave.event;
      }
      get onDidChange() {
        return this._onDidChange.event;
      }
      get onDidClose() {
        return this._onDidClose.event;
      }
      /**
       * Listens for `low level` notification on the given connection to
       * update the notebook documents managed by this instance.
       *
       * Please note that the connection only provides handlers not an event model. Therefore
       * listening on a connection will overwrite the following handlers on a connection:
       * `onDidOpenNotebookDocument`, `onDidChangeNotebookDocument`, `onDidSaveNotebookDocument`,
       *  and `onDidCloseNotebookDocument`.
       *
       * @param connection The connection to listen on.
       */
      listen(connection) {
        const cellTextDocumentConnection = new CellTextDocumentConnection();
        const disposables = [];
        disposables.push(this.cellTextDocuments.listen(cellTextDocumentConnection));
        disposables.push(connection.notebooks.synchronization.onDidOpenNotebookDocument((params) => {
          this.notebookDocuments.set(params.notebookDocument.uri, params.notebookDocument);
          for (const cellTextDocument of params.cellTextDocuments) {
            cellTextDocumentConnection.openTextDocument({ textDocument: cellTextDocument });
          }
          this.updateCellMap(params.notebookDocument);
          this._onDidOpen.fire(params.notebookDocument);
        }));
        disposables.push(connection.notebooks.synchronization.onDidChangeNotebookDocument((params) => {
          const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
          if (notebookDocument === void 0) {
            return;
          }
          notebookDocument.version = params.notebookDocument.version;
          const oldMetadata = notebookDocument.metadata;
          let metadataChanged = false;
          const change = params.change;
          if (change.metadata !== void 0) {
            metadataChanged = true;
            notebookDocument.metadata = change.metadata;
          }
          const opened = [];
          const closed = [];
          const data = [];
          const text = [];
          if (change.cells !== void 0) {
            const changedCells = change.cells;
            if (changedCells.structure !== void 0) {
              const array = changedCells.structure.array;
              notebookDocument.cells.splice(array.start, array.deleteCount, ...array.cells !== void 0 ? array.cells : []);
              if (changedCells.structure.didOpen !== void 0) {
                for (const open of changedCells.structure.didOpen) {
                  cellTextDocumentConnection.openTextDocument({ textDocument: open });
                  opened.push(open.uri);
                }
              }
              if (changedCells.structure.didClose) {
                for (const close of changedCells.structure.didClose) {
                  cellTextDocumentConnection.closeTextDocument({ textDocument: close });
                  closed.push(close.uri);
                }
              }
            }
            if (changedCells.data !== void 0) {
              const cellUpdates = new Map(changedCells.data.map((cell) => [cell.document, cell]));
              for (let i2 = 0; i2 <= notebookDocument.cells.length; i2++) {
                const change2 = cellUpdates.get(notebookDocument.cells[i2].document);
                if (change2 !== void 0) {
                  const old = notebookDocument.cells.splice(i2, 1, change2);
                  data.push({ old: old[0], new: change2 });
                  cellUpdates.delete(change2.document);
                  if (cellUpdates.size === 0) {
                    break;
                  }
                }
              }
            }
            if (changedCells.textContent !== void 0) {
              for (const cellTextDocument of changedCells.textContent) {
                cellTextDocumentConnection.changeTextDocument({ textDocument: cellTextDocument.document, contentChanges: cellTextDocument.changes });
                text.push(cellTextDocument.document.uri);
              }
            }
          }
          this.updateCellMap(notebookDocument);
          const changeEvent = { notebookDocument };
          if (metadataChanged) {
            changeEvent.metadata = { old: oldMetadata, new: notebookDocument.metadata };
          }
          const added = [];
          for (const open of opened) {
            added.push(this.getNotebookCell(open));
          }
          const removed = [];
          for (const close of closed) {
            removed.push(this.getNotebookCell(close));
          }
          const textContent = [];
          for (const change2 of text) {
            textContent.push(this.getNotebookCell(change2));
          }
          if (added.length > 0 || removed.length > 0 || data.length > 0 || textContent.length > 0) {
            changeEvent.cells = { added, removed, changed: { data, textContent } };
          }
          if (changeEvent.metadata !== void 0 || changeEvent.cells !== void 0) {
            this._onDidChange.fire(changeEvent);
          }
        }));
        disposables.push(connection.notebooks.synchronization.onDidSaveNotebookDocument((params) => {
          const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
          if (notebookDocument === void 0) {
            return;
          }
          this._onDidSave.fire(notebookDocument);
        }));
        disposables.push(connection.notebooks.synchronization.onDidCloseNotebookDocument((params) => {
          const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
          if (notebookDocument === void 0) {
            return;
          }
          this._onDidClose.fire(notebookDocument);
          for (const cellTextDocument of params.cellTextDocuments) {
            cellTextDocumentConnection.closeTextDocument({ textDocument: cellTextDocument });
          }
          this.notebookDocuments.delete(params.notebookDocument.uri);
          for (const cell of notebookDocument.cells) {
            this.notebookCellMap.delete(cell.document);
          }
        }));
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          disposables.forEach((disposable) => disposable.dispose());
        });
      }
      updateCellMap(notebookDocument) {
        for (const cell of notebookDocument.cells) {
          this.notebookCellMap.set(cell.document, [cell, notebookDocument]);
        }
      }
    };
    exports2.NotebookDocuments = NotebookDocuments;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/moniker.js
var require_moniker = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/moniker.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MonikerFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var MonikerFeature = (Base) => {
      return class extends Base {
        get moniker() {
          return {
            on: (handler) => {
              const type = vscode_languageserver_protocol_1.MonikerRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.MonikerFeature = MonikerFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/server.js
var require_server = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/server.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createConnection = exports2.combineFeatures = exports2.combineNotebooksFeatures = exports2.combineLanguagesFeatures = exports2.combineWorkspaceFeatures = exports2.combineWindowFeatures = exports2.combineClientFeatures = exports2.combineTracerFeatures = exports2.combineTelemetryFeatures = exports2.combineConsoleFeatures = exports2._NotebooksImpl = exports2._LanguagesImpl = exports2.BulkUnregistration = exports2.BulkRegistration = exports2.ErrorMessageTracker = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var Is = require_is();
    var UUID = require_uuid();
    var progress_1 = require_progress();
    var configuration_1 = require_configuration();
    var workspaceFolder_1 = require_workspaceFolder();
    var callHierarchy_1 = require_callHierarchy();
    var semanticTokens_1 = require_semanticTokens();
    var showDocument_1 = require_showDocument();
    var fileOperations_1 = require_fileOperations();
    var linkedEditingRange_1 = require_linkedEditingRange();
    var typeHierarchy_1 = require_typeHierarchy();
    var inlineValue_1 = require_inlineValue();
    var foldingRange_1 = require_foldingRange();
    var inlayHint_1 = require_inlayHint();
    var diagnostic_1 = require_diagnostic();
    var notebook_1 = require_notebook();
    var moniker_1 = require_moniker();
    function null2Undefined(value) {
      if (value === null) {
        return void 0;
      }
      return value;
    }
    var ErrorMessageTracker = class {
      constructor() {
        this._messages = /* @__PURE__ */ Object.create(null);
      }
      /**
       * Add a message to the tracker.
       *
       * @param message The message to add.
       */
      add(message) {
        let count = this._messages[message];
        if (!count) {
          count = 0;
        }
        count++;
        this._messages[message] = count;
      }
      /**
       * Send all tracked messages to the connection's window.
       *
       * @param connection The connection established between client and server.
       */
      sendErrors(connection) {
        Object.keys(this._messages).forEach((message) => {
          connection.window.showErrorMessage(message);
        });
      }
    };
    exports2.ErrorMessageTracker = ErrorMessageTracker;
    var RemoteConsoleImpl = class {
      constructor() {
      }
      rawAttach(connection) {
        this._rawConnection = connection;
      }
      attach(connection) {
        this._connection = connection;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      fillServerCapabilities(_capabilities) {
      }
      initialize(_capabilities) {
      }
      error(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Error, message);
      }
      warn(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Warning, message);
      }
      info(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Info, message);
      }
      log(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Log, message);
      }
      debug(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Debug, message);
      }
      send(type, message) {
        if (this._rawConnection) {
          this._rawConnection.sendNotification(vscode_languageserver_protocol_1.LogMessageNotification.type, { type, message }).catch(() => {
            (0, vscode_languageserver_protocol_1.RAL)().console.error(`Sending log message failed`);
          });
        }
      }
    };
    var _RemoteWindowImpl = class {
      constructor() {
      }
      attach(connection) {
        this._connection = connection;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      showErrorMessage(message, ...actions) {
        let params = { type: vscode_languageserver_protocol_1.MessageType.Error, message, actions };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.ShowMessageRequest.type, params).then(null2Undefined);
      }
      showWarningMessage(message, ...actions) {
        let params = { type: vscode_languageserver_protocol_1.MessageType.Warning, message, actions };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.ShowMessageRequest.type, params).then(null2Undefined);
      }
      showInformationMessage(message, ...actions) {
        let params = { type: vscode_languageserver_protocol_1.MessageType.Info, message, actions };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.ShowMessageRequest.type, params).then(null2Undefined);
      }
    };
    var RemoteWindowImpl = (0, showDocument_1.ShowDocumentFeature)((0, progress_1.ProgressFeature)(_RemoteWindowImpl));
    var BulkRegistration;
    (function(BulkRegistration2) {
      function create() {
        return new BulkRegistrationImpl();
      }
      BulkRegistration2.create = create;
    })(BulkRegistration || (exports2.BulkRegistration = BulkRegistration = {}));
    var BulkRegistrationImpl = class {
      constructor() {
        this._registrations = [];
        this._registered = /* @__PURE__ */ new Set();
      }
      add(type, registerOptions) {
        const method = Is.string(type) ? type : type.method;
        if (this._registered.has(method)) {
          throw new Error(`${method} is already added to this registration`);
        }
        const id = UUID.generateUuid();
        this._registrations.push({
          id,
          method,
          registerOptions: registerOptions || {}
        });
        this._registered.add(method);
      }
      asRegistrationParams() {
        return {
          registrations: this._registrations
        };
      }
    };
    var BulkUnregistration;
    (function(BulkUnregistration2) {
      function create() {
        return new BulkUnregistrationImpl(void 0, []);
      }
      BulkUnregistration2.create = create;
    })(BulkUnregistration || (exports2.BulkUnregistration = BulkUnregistration = {}));
    var BulkUnregistrationImpl = class {
      constructor(_connection, unregistrations) {
        this._connection = _connection;
        this._unregistrations = /* @__PURE__ */ new Map();
        unregistrations.forEach((unregistration) => {
          this._unregistrations.set(unregistration.method, unregistration);
        });
      }
      get isAttached() {
        return !!this._connection;
      }
      attach(connection) {
        this._connection = connection;
      }
      add(unregistration) {
        this._unregistrations.set(unregistration.method, unregistration);
      }
      dispose() {
        let unregistrations = [];
        for (let unregistration of this._unregistrations.values()) {
          unregistrations.push(unregistration);
        }
        let params = {
          unregisterations: unregistrations
        };
        this._connection.sendRequest(vscode_languageserver_protocol_1.UnregistrationRequest.type, params).catch(() => {
          this._connection.console.info(`Bulk unregistration failed.`);
        });
      }
      disposeSingle(arg) {
        const method = Is.string(arg) ? arg : arg.method;
        const unregistration = this._unregistrations.get(method);
        if (!unregistration) {
          return false;
        }
        let params = {
          unregisterations: [unregistration]
        };
        this._connection.sendRequest(vscode_languageserver_protocol_1.UnregistrationRequest.type, params).then(() => {
          this._unregistrations.delete(method);
        }, (_error) => {
          this._connection.console.info(`Un-registering request handler for ${unregistration.id} failed.`);
        });
        return true;
      }
    };
    var RemoteClientImpl = class {
      attach(connection) {
        this._connection = connection;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      register(typeOrRegistrations, registerOptionsOrType, registerOptions) {
        if (typeOrRegistrations instanceof BulkRegistrationImpl) {
          return this.registerMany(typeOrRegistrations);
        } else if (typeOrRegistrations instanceof BulkUnregistrationImpl) {
          return this.registerSingle1(typeOrRegistrations, registerOptionsOrType, registerOptions);
        } else {
          return this.registerSingle2(typeOrRegistrations, registerOptionsOrType);
        }
      }
      registerSingle1(unregistration, type, registerOptions) {
        const method = Is.string(type) ? type : type.method;
        const id = UUID.generateUuid();
        let params = {
          registrations: [{ id, method, registerOptions: registerOptions || {} }]
        };
        if (!unregistration.isAttached) {
          unregistration.attach(this.connection);
        }
        return this.connection.sendRequest(vscode_languageserver_protocol_1.RegistrationRequest.type, params).then((_result) => {
          unregistration.add({ id, method });
          return unregistration;
        }, (_error) => {
          this.connection.console.info(`Registering request handler for ${method} failed.`);
          return Promise.reject(_error);
        });
      }
      registerSingle2(type, registerOptions) {
        const method = Is.string(type) ? type : type.method;
        const id = UUID.generateUuid();
        let params = {
          registrations: [{ id, method, registerOptions: registerOptions || {} }]
        };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.RegistrationRequest.type, params).then((_result) => {
          return vscode_languageserver_protocol_1.Disposable.create(() => {
            this.unregisterSingle(id, method).catch(() => {
              this.connection.console.info(`Un-registering capability with id ${id} failed.`);
            });
          });
        }, (_error) => {
          this.connection.console.info(`Registering request handler for ${method} failed.`);
          return Promise.reject(_error);
        });
      }
      unregisterSingle(id, method) {
        let params = {
          unregisterations: [{ id, method }]
        };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.UnregistrationRequest.type, params).catch(() => {
          this.connection.console.info(`Un-registering request handler for ${id} failed.`);
        });
      }
      registerMany(registrations) {
        let params = registrations.asRegistrationParams();
        return this.connection.sendRequest(vscode_languageserver_protocol_1.RegistrationRequest.type, params).then(() => {
          return new BulkUnregistrationImpl(this._connection, params.registrations.map((registration) => {
            return { id: registration.id, method: registration.method };
          }));
        }, (_error) => {
          this.connection.console.info(`Bulk registration failed.`);
          return Promise.reject(_error);
        });
      }
    };
    var _RemoteWorkspaceImpl = class {
      constructor() {
      }
      attach(connection) {
        this._connection = connection;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      applyEdit(paramOrEdit) {
        function isApplyWorkspaceEditParams(value) {
          return value && !!value.edit;
        }
        let params = isApplyWorkspaceEditParams(paramOrEdit) ? paramOrEdit : { edit: paramOrEdit };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.ApplyWorkspaceEditRequest.type, params);
      }
    };
    var RemoteWorkspaceImpl = (0, fileOperations_1.FileOperationsFeature)((0, workspaceFolder_1.WorkspaceFoldersFeature)((0, configuration_1.ConfigurationFeature)(_RemoteWorkspaceImpl)));
    var TracerImpl = class {
      constructor() {
        this._trace = vscode_languageserver_protocol_1.Trace.Off;
      }
      attach(connection) {
        this._connection = connection;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      set trace(value) {
        this._trace = value;
      }
      log(message, verbose) {
        if (this._trace === vscode_languageserver_protocol_1.Trace.Off) {
          return;
        }
        this.connection.sendNotification(vscode_languageserver_protocol_1.LogTraceNotification.type, {
          message,
          verbose: this._trace === vscode_languageserver_protocol_1.Trace.Verbose ? verbose : void 0
        }).catch(() => {
        });
      }
    };
    var TelemetryImpl = class {
      constructor() {
      }
      attach(connection) {
        this._connection = connection;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      logEvent(data) {
        this.connection.sendNotification(vscode_languageserver_protocol_1.TelemetryEventNotification.type, data).catch(() => {
          this.connection.console.log(`Sending TelemetryEventNotification failed`);
        });
      }
    };
    var _LanguagesImpl = class {
      constructor() {
      }
      attach(connection) {
        this._connection = connection;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      attachWorkDoneProgress(params) {
        return (0, progress_1.attachWorkDone)(this.connection, params);
      }
      attachPartialResultProgress(_type, params) {
        return (0, progress_1.attachPartialResult)(this.connection, params);
      }
    };
    exports2._LanguagesImpl = _LanguagesImpl;
    var LanguagesImpl = (0, foldingRange_1.FoldingRangeFeature)((0, moniker_1.MonikerFeature)((0, diagnostic_1.DiagnosticFeature)((0, inlayHint_1.InlayHintFeature)((0, inlineValue_1.InlineValueFeature)((0, typeHierarchy_1.TypeHierarchyFeature)((0, linkedEditingRange_1.LinkedEditingRangeFeature)((0, semanticTokens_1.SemanticTokensFeature)((0, callHierarchy_1.CallHierarchyFeature)(_LanguagesImpl)))))))));
    var _NotebooksImpl = class {
      constructor() {
      }
      attach(connection) {
        this._connection = connection;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      attachWorkDoneProgress(params) {
        return (0, progress_1.attachWorkDone)(this.connection, params);
      }
      attachPartialResultProgress(_type, params) {
        return (0, progress_1.attachPartialResult)(this.connection, params);
      }
    };
    exports2._NotebooksImpl = _NotebooksImpl;
    var NotebooksImpl = (0, notebook_1.NotebookSyncFeature)(_NotebooksImpl);
    function combineConsoleFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineConsoleFeatures = combineConsoleFeatures;
    function combineTelemetryFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineTelemetryFeatures = combineTelemetryFeatures;
    function combineTracerFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineTracerFeatures = combineTracerFeatures;
    function combineClientFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineClientFeatures = combineClientFeatures;
    function combineWindowFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineWindowFeatures = combineWindowFeatures;
    function combineWorkspaceFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineWorkspaceFeatures = combineWorkspaceFeatures;
    function combineLanguagesFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineLanguagesFeatures = combineLanguagesFeatures;
    function combineNotebooksFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineNotebooksFeatures = combineNotebooksFeatures;
    function combineFeatures(one, two) {
      function combine(one2, two2, func2) {
        if (one2 && two2) {
          return func2(one2, two2);
        } else if (one2) {
          return one2;
        } else {
          return two2;
        }
      }
      let result = {
        __brand: "features",
        console: combine(one.console, two.console, combineConsoleFeatures),
        tracer: combine(one.tracer, two.tracer, combineTracerFeatures),
        telemetry: combine(one.telemetry, two.telemetry, combineTelemetryFeatures),
        client: combine(one.client, two.client, combineClientFeatures),
        window: combine(one.window, two.window, combineWindowFeatures),
        workspace: combine(one.workspace, two.workspace, combineWorkspaceFeatures),
        languages: combine(one.languages, two.languages, combineLanguagesFeatures),
        notebooks: combine(one.notebooks, two.notebooks, combineNotebooksFeatures)
      };
      return result;
    }
    exports2.combineFeatures = combineFeatures;
    function createConnection2(connectionFactory, watchDog, factories) {
      const logger = factories && factories.console ? new (factories.console(RemoteConsoleImpl))() : new RemoteConsoleImpl();
      const connection = connectionFactory(logger);
      logger.rawAttach(connection);
      const tracer = factories && factories.tracer ? new (factories.tracer(TracerImpl))() : new TracerImpl();
      const telemetry = factories && factories.telemetry ? new (factories.telemetry(TelemetryImpl))() : new TelemetryImpl();
      const client = factories && factories.client ? new (factories.client(RemoteClientImpl))() : new RemoteClientImpl();
      const remoteWindow = factories && factories.window ? new (factories.window(RemoteWindowImpl))() : new RemoteWindowImpl();
      const workspace = factories && factories.workspace ? new (factories.workspace(RemoteWorkspaceImpl))() : new RemoteWorkspaceImpl();
      const languages = factories && factories.languages ? new (factories.languages(LanguagesImpl))() : new LanguagesImpl();
      const notebooks = factories && factories.notebooks ? new (factories.notebooks(NotebooksImpl))() : new NotebooksImpl();
      const allRemotes = [logger, tracer, telemetry, client, remoteWindow, workspace, languages, notebooks];
      function asPromise(value) {
        if (value instanceof Promise) {
          return value;
        } else if (Is.thenable(value)) {
          return new Promise((resolve, reject) => {
            value.then((resolved) => resolve(resolved), (error) => reject(error));
          });
        } else {
          return Promise.resolve(value);
        }
      }
      let shutdownHandler = void 0;
      let initializeHandler = void 0;
      let exitHandler = void 0;
      let protocolConnection = {
        listen: () => connection.listen(),
        sendRequest: (type, ...params) => connection.sendRequest(Is.string(type) ? type : type.method, ...params),
        onRequest: (type, handler) => connection.onRequest(type, handler),
        sendNotification: (type, param) => {
          const method = Is.string(type) ? type : type.method;
          return connection.sendNotification(method, param);
        },
        onNotification: (type, handler) => connection.onNotification(type, handler),
        onProgress: connection.onProgress,
        sendProgress: connection.sendProgress,
        onInitialize: (handler) => {
          initializeHandler = handler;
          return {
            dispose: () => {
              initializeHandler = void 0;
            }
          };
        },
        onInitialized: (handler) => connection.onNotification(vscode_languageserver_protocol_1.InitializedNotification.type, handler),
        onShutdown: (handler) => {
          shutdownHandler = handler;
          return {
            dispose: () => {
              shutdownHandler = void 0;
            }
          };
        },
        onExit: (handler) => {
          exitHandler = handler;
          return {
            dispose: () => {
              exitHandler = void 0;
            }
          };
        },
        get console() {
          return logger;
        },
        get telemetry() {
          return telemetry;
        },
        get tracer() {
          return tracer;
        },
        get client() {
          return client;
        },
        get window() {
          return remoteWindow;
        },
        get workspace() {
          return workspace;
        },
        get languages() {
          return languages;
        },
        get notebooks() {
          return notebooks;
        },
        onDidChangeConfiguration: (handler) => connection.onNotification(vscode_languageserver_protocol_1.DidChangeConfigurationNotification.type, handler),
        onDidChangeWatchedFiles: (handler) => connection.onNotification(vscode_languageserver_protocol_1.DidChangeWatchedFilesNotification.type, handler),
        __textDocumentSync: void 0,
        onDidOpenTextDocument: (handler) => connection.onNotification(vscode_languageserver_protocol_1.DidOpenTextDocumentNotification.type, handler),
        onDidChangeTextDocument: (handler) => connection.onNotification(vscode_languageserver_protocol_1.DidChangeTextDocumentNotification.type, handler),
        onDidCloseTextDocument: (handler) => connection.onNotification(vscode_languageserver_protocol_1.DidCloseTextDocumentNotification.type, handler),
        onWillSaveTextDocument: (handler) => connection.onNotification(vscode_languageserver_protocol_1.WillSaveTextDocumentNotification.type, handler),
        onWillSaveTextDocumentWaitUntil: (handler) => connection.onRequest(vscode_languageserver_protocol_1.WillSaveTextDocumentWaitUntilRequest.type, handler),
        onDidSaveTextDocument: (handler) => connection.onNotification(vscode_languageserver_protocol_1.DidSaveTextDocumentNotification.type, handler),
        sendDiagnostics: (params) => connection.sendNotification(vscode_languageserver_protocol_1.PublishDiagnosticsNotification.type, params),
        onHover: (handler) => connection.onRequest(vscode_languageserver_protocol_1.HoverRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), void 0);
        }),
        onCompletion: (handler) => connection.onRequest(vscode_languageserver_protocol_1.CompletionRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onCompletionResolve: (handler) => connection.onRequest(vscode_languageserver_protocol_1.CompletionResolveRequest.type, handler),
        onSignatureHelp: (handler) => connection.onRequest(vscode_languageserver_protocol_1.SignatureHelpRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), void 0);
        }),
        onDeclaration: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DeclarationRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onDefinition: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DefinitionRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onTypeDefinition: (handler) => connection.onRequest(vscode_languageserver_protocol_1.TypeDefinitionRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onImplementation: (handler) => connection.onRequest(vscode_languageserver_protocol_1.ImplementationRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onReferences: (handler) => connection.onRequest(vscode_languageserver_protocol_1.ReferencesRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onDocumentHighlight: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DocumentHighlightRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onDocumentSymbol: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DocumentSymbolRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onWorkspaceSymbol: (handler) => connection.onRequest(vscode_languageserver_protocol_1.WorkspaceSymbolRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onWorkspaceSymbolResolve: (handler) => connection.onRequest(vscode_languageserver_protocol_1.WorkspaceSymbolResolveRequest.type, handler),
        onCodeAction: (handler) => connection.onRequest(vscode_languageserver_protocol_1.CodeActionRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onCodeActionResolve: (handler) => connection.onRequest(vscode_languageserver_protocol_1.CodeActionResolveRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onCodeLens: (handler) => connection.onRequest(vscode_languageserver_protocol_1.CodeLensRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onCodeLensResolve: (handler) => connection.onRequest(vscode_languageserver_protocol_1.CodeLensResolveRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onDocumentFormatting: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DocumentFormattingRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), void 0);
        }),
        onDocumentRangeFormatting: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DocumentRangeFormattingRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), void 0);
        }),
        onDocumentOnTypeFormatting: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DocumentOnTypeFormattingRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onRenameRequest: (handler) => connection.onRequest(vscode_languageserver_protocol_1.RenameRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), void 0);
        }),
        onPrepareRename: (handler) => connection.onRequest(vscode_languageserver_protocol_1.PrepareRenameRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onDocumentLinks: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DocumentLinkRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onDocumentLinkResolve: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DocumentLinkResolveRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onDocumentColor: (handler) => connection.onRequest(vscode_languageserver_protocol_1.DocumentColorRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onColorPresentation: (handler) => connection.onRequest(vscode_languageserver_protocol_1.ColorPresentationRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onFoldingRanges: (handler) => connection.onRequest(vscode_languageserver_protocol_1.FoldingRangeRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onSelectionRanges: (handler) => connection.onRequest(vscode_languageserver_protocol_1.SelectionRangeRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params));
        }),
        onExecuteCommand: (handler) => connection.onRequest(vscode_languageserver_protocol_1.ExecuteCommandRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection, params), void 0);
        }),
        dispose: () => connection.dispose()
      };
      for (let remote of allRemotes) {
        remote.attach(protocolConnection);
      }
      connection.onRequest(vscode_languageserver_protocol_1.InitializeRequest.type, (params) => {
        watchDog.initialize(params);
        if (Is.string(params.trace)) {
          tracer.trace = vscode_languageserver_protocol_1.Trace.fromString(params.trace);
        }
        for (let remote of allRemotes) {
          remote.initialize(params.capabilities);
        }
        if (initializeHandler) {
          let result = initializeHandler(params, new vscode_languageserver_protocol_1.CancellationTokenSource().token, (0, progress_1.attachWorkDone)(connection, params), void 0);
          return asPromise(result).then((value) => {
            if (value instanceof vscode_languageserver_protocol_1.ResponseError) {
              return value;
            }
            let result2 = value;
            if (!result2) {
              result2 = { capabilities: {} };
            }
            let capabilities = result2.capabilities;
            if (!capabilities) {
              capabilities = {};
              result2.capabilities = capabilities;
            }
            if (capabilities.textDocumentSync === void 0 || capabilities.textDocumentSync === null) {
              capabilities.textDocumentSync = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : vscode_languageserver_protocol_1.TextDocumentSyncKind.None;
            } else if (!Is.number(capabilities.textDocumentSync) && !Is.number(capabilities.textDocumentSync.change)) {
              capabilities.textDocumentSync.change = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : vscode_languageserver_protocol_1.TextDocumentSyncKind.None;
            }
            for (let remote of allRemotes) {
              remote.fillServerCapabilities(capabilities);
            }
            return result2;
          });
        } else {
          let result = { capabilities: { textDocumentSync: vscode_languageserver_protocol_1.TextDocumentSyncKind.None } };
          for (let remote of allRemotes) {
            remote.fillServerCapabilities(result.capabilities);
          }
          return result;
        }
      });
      connection.onRequest(vscode_languageserver_protocol_1.ShutdownRequest.type, () => {
        watchDog.shutdownReceived = true;
        if (shutdownHandler) {
          return shutdownHandler(new vscode_languageserver_protocol_1.CancellationTokenSource().token);
        } else {
          return void 0;
        }
      });
      connection.onNotification(vscode_languageserver_protocol_1.ExitNotification.type, () => {
        try {
          if (exitHandler) {
            exitHandler();
          }
        } finally {
          if (watchDog.shutdownReceived) {
            watchDog.exit(0);
          } else {
            watchDog.exit(1);
          }
        }
      });
      connection.onNotification(vscode_languageserver_protocol_1.SetTraceNotification.type, (params) => {
        tracer.trace = vscode_languageserver_protocol_1.Trace.fromString(params.value);
      });
      return protocolConnection;
    }
    exports2.createConnection = createConnection2;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/node/files.js
var require_files = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/node/files.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resolveModulePath = exports2.FileSystem = exports2.resolveGlobalYarnPath = exports2.resolveGlobalNodePath = exports2.resolve = exports2.uriToFilePath = void 0;
    var url = require("url");
    var path = require("path");
    var fs2 = require("fs");
    var child_process_1 = require("child_process");
    function uriToFilePath(uri) {
      let parsed = url.parse(uri);
      if (parsed.protocol !== "file:" || !parsed.path) {
        return void 0;
      }
      let segments = parsed.path.split("/");
      for (var i2 = 0, len = segments.length; i2 < len; i2++) {
        segments[i2] = decodeURIComponent(segments[i2]);
      }
      if (process.platform === "win32" && segments.length > 1) {
        let first = segments[0];
        let second = segments[1];
        if (first.length === 0 && second.length > 1 && second[1] === ":") {
          segments.shift();
        }
      }
      return path.normalize(segments.join("/"));
    }
    exports2.uriToFilePath = uriToFilePath;
    function isWindows() {
      return process.platform === "win32";
    }
    function resolve(moduleName, nodePath, cwd, tracer) {
      const nodePathKey = "NODE_PATH";
      const app = [
        "var p = process;",
        "p.on('message',function(m){",
        "if(m.c==='e'){",
        "p.exit(0);",
        "}",
        "else if(m.c==='rs'){",
        "try{",
        "var r=require.resolve(m.a);",
        "p.send({c:'r',s:true,r:r});",
        "}",
        "catch(err){",
        "p.send({c:'r',s:false});",
        "}",
        "}",
        "});"
      ].join("");
      return new Promise((resolve2, reject) => {
        let env = process.env;
        let newEnv = /* @__PURE__ */ Object.create(null);
        Object.keys(env).forEach((key) => newEnv[key] = env[key]);
        if (nodePath && fs2.existsSync(nodePath)) {
          if (newEnv[nodePathKey]) {
            newEnv[nodePathKey] = nodePath + path.delimiter + newEnv[nodePathKey];
          } else {
            newEnv[nodePathKey] = nodePath;
          }
          if (tracer) {
            tracer(`NODE_PATH value is: ${newEnv[nodePathKey]}`);
          }
        }
        newEnv["ELECTRON_RUN_AS_NODE"] = "1";
        try {
          let cp = (0, child_process_1.fork)("", [], {
            cwd,
            env: newEnv,
            execArgv: ["-e", app]
          });
          if (cp.pid === void 0) {
            reject(new Error(`Starting process to resolve node module  ${moduleName} failed`));
            return;
          }
          cp.on("error", (error) => {
            reject(error);
          });
          cp.on("message", (message2) => {
            if (message2.c === "r") {
              cp.send({ c: "e" });
              if (message2.s) {
                resolve2(message2.r);
              } else {
                reject(new Error(`Failed to resolve module: ${moduleName}`));
              }
            }
          });
          let message = {
            c: "rs",
            a: moduleName
          };
          cp.send(message);
        } catch (error) {
          reject(error);
        }
      });
    }
    exports2.resolve = resolve;
    function resolveGlobalNodePath(tracer) {
      let npmCommand = "npm";
      const env = /* @__PURE__ */ Object.create(null);
      Object.keys(process.env).forEach((key) => env[key] = process.env[key]);
      env["NO_UPDATE_NOTIFIER"] = "true";
      const options = {
        encoding: "utf8",
        env
      };
      if (isWindows()) {
        npmCommand = "npm.cmd";
        options.shell = true;
      }
      let handler = () => {
      };
      try {
        process.on("SIGPIPE", handler);
        let stdout = (0, child_process_1.spawnSync)(npmCommand, ["config", "get", "prefix"], options).stdout;
        if (!stdout) {
          if (tracer) {
            tracer(`'npm config get prefix' didn't return a value.`);
          }
          return void 0;
        }
        let prefix = stdout.trim();
        if (tracer) {
          tracer(`'npm config get prefix' value is: ${prefix}`);
        }
        if (prefix.length > 0) {
          if (isWindows()) {
            return path.join(prefix, "node_modules");
          } else {
            return path.join(prefix, "lib", "node_modules");
          }
        }
        return void 0;
      } catch (err2) {
        return void 0;
      } finally {
        process.removeListener("SIGPIPE", handler);
      }
    }
    exports2.resolveGlobalNodePath = resolveGlobalNodePath;
    function resolveGlobalYarnPath(tracer) {
      let yarnCommand = "yarn";
      let options = {
        encoding: "utf8"
      };
      if (isWindows()) {
        yarnCommand = "yarn.cmd";
        options.shell = true;
      }
      let handler = () => {
      };
      try {
        process.on("SIGPIPE", handler);
        let results = (0, child_process_1.spawnSync)(yarnCommand, ["global", "dir", "--json"], options);
        let stdout = results.stdout;
        if (!stdout) {
          if (tracer) {
            tracer(`'yarn global dir' didn't return a value.`);
            if (results.stderr) {
              tracer(results.stderr);
            }
          }
          return void 0;
        }
        let lines = stdout.trim().split(/\r?\n/);
        for (let line of lines) {
          try {
            let yarn = JSON.parse(line);
            if (yarn.type === "log") {
              return path.join(yarn.data, "node_modules");
            }
          } catch (e) {
          }
        }
        return void 0;
      } catch (err2) {
        return void 0;
      } finally {
        process.removeListener("SIGPIPE", handler);
      }
    }
    exports2.resolveGlobalYarnPath = resolveGlobalYarnPath;
    var FileSystem;
    (function(FileSystem2) {
      let _isCaseSensitive = void 0;
      function isCaseSensitive() {
        if (_isCaseSensitive !== void 0) {
          return _isCaseSensitive;
        }
        if (process.platform === "win32") {
          _isCaseSensitive = false;
        } else {
          _isCaseSensitive = !fs2.existsSync(__filename.toUpperCase()) || !fs2.existsSync(__filename.toLowerCase());
        }
        return _isCaseSensitive;
      }
      FileSystem2.isCaseSensitive = isCaseSensitive;
      function isParent(parent, child) {
        if (isCaseSensitive()) {
          return path.normalize(child).indexOf(path.normalize(parent)) === 0;
        } else {
          return path.normalize(child).toLowerCase().indexOf(path.normalize(parent).toLowerCase()) === 0;
        }
      }
      FileSystem2.isParent = isParent;
    })(FileSystem || (exports2.FileSystem = FileSystem = {}));
    function resolveModulePath(workspaceRoot, moduleName, nodePath, tracer) {
      if (nodePath) {
        if (!path.isAbsolute(nodePath)) {
          nodePath = path.join(workspaceRoot, nodePath);
        }
        return resolve(moduleName, nodePath, nodePath, tracer).then((value) => {
          if (FileSystem.isParent(nodePath, value)) {
            return value;
          } else {
            return Promise.reject(new Error(`Failed to load ${moduleName} from node path location.`));
          }
        }).then(void 0, (_error) => {
          return resolve(moduleName, resolveGlobalNodePath(tracer), workspaceRoot, tracer);
        });
      } else {
        return resolve(moduleName, resolveGlobalNodePath(tracer), workspaceRoot, tracer);
      }
    }
    exports2.resolveModulePath = resolveModulePath;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/node.js
var require_node2 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/node.js"(exports2, module2) {
    "use strict";
    module2.exports = require_main3();
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/inlineCompletion.proposed.js
var require_inlineCompletion_proposed = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/inlineCompletion.proposed.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlineCompletionFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var InlineCompletionFeature = (Base) => {
      return class extends Base {
        get inlineCompletion() {
          return {
            on: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.InlineCompletionRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params));
              });
            }
          };
        }
      };
    };
    exports2.InlineCompletionFeature = InlineCompletionFeature;
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/api.js
var require_api3 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/api.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProposedFeatures = exports2.NotebookDocuments = exports2.TextDocuments = exports2.SemanticTokensBuilder = void 0;
    var semanticTokens_1 = require_semanticTokens();
    Object.defineProperty(exports2, "SemanticTokensBuilder", { enumerable: true, get: function() {
      return semanticTokens_1.SemanticTokensBuilder;
    } });
    var ic = require_inlineCompletion_proposed();
    __exportStar(require_main3(), exports2);
    var textDocuments_1 = require_textDocuments();
    Object.defineProperty(exports2, "TextDocuments", { enumerable: true, get: function() {
      return textDocuments_1.TextDocuments;
    } });
    var notebook_1 = require_notebook();
    Object.defineProperty(exports2, "NotebookDocuments", { enumerable: true, get: function() {
      return notebook_1.NotebookDocuments;
    } });
    __exportStar(require_server(), exports2);
    var ProposedFeatures2;
    (function(ProposedFeatures3) {
      ProposedFeatures3.all = {
        __brand: "features",
        languages: ic.InlineCompletionFeature
      };
    })(ProposedFeatures2 || (exports2.ProposedFeatures = ProposedFeatures2 = {}));
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/node/main.js
var require_main4 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/node/main.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createConnection = exports2.Files = void 0;
    var node_util_1 = require("util");
    var Is = require_is();
    var server_1 = require_server();
    var fm = require_files();
    var node_1 = require_node2();
    __exportStar(require_node2(), exports2);
    __exportStar(require_api3(), exports2);
    var Files;
    (function(Files2) {
      Files2.uriToFilePath = fm.uriToFilePath;
      Files2.resolveGlobalNodePath = fm.resolveGlobalNodePath;
      Files2.resolveGlobalYarnPath = fm.resolveGlobalYarnPath;
      Files2.resolve = fm.resolve;
      Files2.resolveModulePath = fm.resolveModulePath;
    })(Files || (exports2.Files = Files = {}));
    var _protocolConnection;
    function endProtocolConnection() {
      if (_protocolConnection === void 0) {
        return;
      }
      try {
        _protocolConnection.end();
      } catch (_err) {
      }
    }
    var _shutdownReceived = false;
    var exitTimer = void 0;
    function setupExitTimer() {
      const argName = "--clientProcessId";
      function runTimer(value) {
        try {
          let processId = parseInt(value);
          if (!isNaN(processId)) {
            exitTimer = setInterval(() => {
              try {
                process.kill(processId, 0);
              } catch (ex) {
                endProtocolConnection();
                process.exit(_shutdownReceived ? 0 : 1);
              }
            }, 3e3);
          }
        } catch (e) {
        }
      }
      for (let i2 = 2; i2 < process.argv.length; i2++) {
        let arg = process.argv[i2];
        if (arg === argName && i2 + 1 < process.argv.length) {
          runTimer(process.argv[i2 + 1]);
          return;
        } else {
          let args2 = arg.split("=");
          if (args2[0] === argName) {
            runTimer(args2[1]);
          }
        }
      }
    }
    setupExitTimer();
    var watchDog = {
      initialize: (params) => {
        const processId = params.processId;
        if (Is.number(processId) && exitTimer === void 0) {
          setInterval(() => {
            try {
              process.kill(processId, 0);
            } catch (ex) {
              process.exit(_shutdownReceived ? 0 : 1);
            }
          }, 3e3);
        }
      },
      get shutdownReceived() {
        return _shutdownReceived;
      },
      set shutdownReceived(value) {
        _shutdownReceived = value;
      },
      exit: (code) => {
        endProtocolConnection();
        process.exit(code);
      }
    };
    function createConnection2(arg1, arg2, arg3, arg4) {
      let factories;
      let input;
      let output;
      let options;
      if (arg1 !== void 0 && arg1.__brand === "features") {
        factories = arg1;
        arg1 = arg2;
        arg2 = arg3;
        arg3 = arg4;
      }
      if (node_1.ConnectionStrategy.is(arg1) || node_1.ConnectionOptions.is(arg1)) {
        options = arg1;
      } else {
        input = arg1;
        output = arg2;
        options = arg3;
      }
      return _createConnection(input, output, options, factories);
    }
    exports2.createConnection = createConnection2;
    function _createConnection(input, output, options, factories) {
      let stdio = false;
      if (!input && !output && process.argv.length > 2) {
        let port = void 0;
        let pipeName = void 0;
        let argv = process.argv.slice(2);
        for (let i2 = 0; i2 < argv.length; i2++) {
          let arg = argv[i2];
          if (arg === "--node-ipc") {
            input = new node_1.IPCMessageReader(process);
            output = new node_1.IPCMessageWriter(process);
            break;
          } else if (arg === "--stdio") {
            stdio = true;
            input = process.stdin;
            output = process.stdout;
            break;
          } else if (arg === "--socket") {
            port = parseInt(argv[i2 + 1]);
            break;
          } else if (arg === "--pipe") {
            pipeName = argv[i2 + 1];
            break;
          } else {
            var args2 = arg.split("=");
            if (args2[0] === "--socket") {
              port = parseInt(args2[1]);
              break;
            } else if (args2[0] === "--pipe") {
              pipeName = args2[1];
              break;
            }
          }
        }
        if (port) {
          let transport = (0, node_1.createServerSocketTransport)(port);
          input = transport[0];
          output = transport[1];
        } else if (pipeName) {
          let transport = (0, node_1.createServerPipeTransport)(pipeName);
          input = transport[0];
          output = transport[1];
        }
      }
      var commandLineMessage = "Use arguments of createConnection or set command line parameters: '--node-ipc', '--stdio' or '--socket={number}'";
      if (!input) {
        throw new Error("Connection input stream is not set. " + commandLineMessage);
      }
      if (!output) {
        throw new Error("Connection output stream is not set. " + commandLineMessage);
      }
      if (Is.func(input.read) && Is.func(input.on)) {
        let inputStream = input;
        inputStream.on("end", () => {
          endProtocolConnection();
          process.exit(_shutdownReceived ? 0 : 1);
        });
        inputStream.on("close", () => {
          endProtocolConnection();
          process.exit(_shutdownReceived ? 0 : 1);
        });
      }
      const connectionFactory = (logger) => {
        const result = (0, node_1.createProtocolConnection)(input, output, logger, options);
        if (stdio) {
          patchConsole(logger);
        }
        return result;
      };
      return (0, server_1.createConnection)(connectionFactory, watchDog, factories);
    }
    function patchConsole(logger) {
      function serialize(args2) {
        return args2.map((arg) => typeof arg === "string" ? arg : (0, node_util_1.inspect)(arg)).join(" ");
      }
      const counters = /* @__PURE__ */ new Map();
      console.assert = function assert(assertion, ...args2) {
        if (assertion) {
          return;
        }
        if (args2.length === 0) {
          logger.error("Assertion failed");
        } else {
          const [message, ...rest] = args2;
          logger.error(`Assertion failed: ${message} ${serialize(rest)}`);
        }
      };
      console.count = function count(label = "default") {
        const message = String(label);
        let counter = counters.get(message) ?? 0;
        counter += 1;
        counters.set(message, counter);
        logger.log(`${message}: ${message}`);
      };
      console.countReset = function countReset(label) {
        if (label === void 0) {
          counters.clear();
        } else {
          counters.delete(String(label));
        }
      };
      console.debug = function debug(...args2) {
        logger.log(serialize(args2));
      };
      console.dir = function dir(arg, options) {
        logger.log((0, node_util_1.inspect)(arg, options));
      };
      console.log = function log(...args2) {
        logger.log(serialize(args2));
      };
      console.error = function error(...args2) {
        logger.error(serialize(args2));
      };
      console.trace = function trace(...args2) {
        const stack = new Error().stack.replace(/(.+\n){2}/, "");
        let message = "Trace";
        if (args2.length !== 0) {
          message += `: ${serialize(args2)}`;
        }
        logger.log(`${message}
${stack}`);
      };
      console.warn = function warn(...args2) {
        logger.warn(serialize(args2));
      };
    }
  }
});

// ../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/node.js
var require_node3 = __commonJS2({
  "../../node_modules/.pnpm/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/node.js"(exports2, module2) {
    "use strict";
    module2.exports = require_main4();
  }
});

// src/server.ts
var import_typed_mind2 = __toESM2(require_dist());
var import_node5 = __toESM2(require_node3());

// ../../node_modules/.pnpm/vscode-languageserver-textdocument@1.0.12/node_modules/vscode-languageserver-textdocument/lib/esm/main.js
var FullTextDocument = class _FullTextDocument {
  constructor(uri, languageId, version, content) {
    this._uri = uri;
    this._languageId = languageId;
    this._version = version;
    this._content = content;
    this._lineOffsets = void 0;
  }
  get uri() {
    return this._uri;
  }
  get languageId() {
    return this._languageId;
  }
  get version() {
    return this._version;
  }
  getText(range) {
    if (range) {
      const start2 = this.offsetAt(range.start);
      const end = this.offsetAt(range.end);
      return this._content.substring(start2, end);
    }
    return this._content;
  }
  update(changes, version) {
    for (const change of changes) {
      if (_FullTextDocument.isIncremental(change)) {
        const range = getWellformedRange(change.range);
        const startOffset = this.offsetAt(range.start);
        const endOffset = this.offsetAt(range.end);
        this._content = this._content.substring(0, startOffset) + change.text + this._content.substring(endOffset, this._content.length);
        const startLine = Math.max(range.start.line, 0);
        const endLine = Math.max(range.end.line, 0);
        let lineOffsets = this._lineOffsets;
        const addedLineOffsets = computeLineOffsets(change.text, false, startOffset);
        if (endLine - startLine === addedLineOffsets.length) {
          for (let i2 = 0, len = addedLineOffsets.length; i2 < len; i2++) {
            lineOffsets[i2 + startLine + 1] = addedLineOffsets[i2];
          }
        } else {
          if (addedLineOffsets.length < 1e4) {
            lineOffsets.splice(startLine + 1, endLine - startLine, ...addedLineOffsets);
          } else {
            this._lineOffsets = lineOffsets = lineOffsets.slice(0, startLine + 1).concat(addedLineOffsets, lineOffsets.slice(endLine + 1));
          }
        }
        const diff = change.text.length - (endOffset - startOffset);
        if (diff !== 0) {
          for (let i2 = startLine + 1 + addedLineOffsets.length, len = lineOffsets.length; i2 < len; i2++) {
            lineOffsets[i2] = lineOffsets[i2] + diff;
          }
        }
      } else if (_FullTextDocument.isFull(change)) {
        this._content = change.text;
        this._lineOffsets = void 0;
      } else {
        throw new Error("Unknown change event received");
      }
    }
    this._version = version;
  }
  getLineOffsets() {
    if (this._lineOffsets === void 0) {
      this._lineOffsets = computeLineOffsets(this._content, true);
    }
    return this._lineOffsets;
  }
  positionAt(offset) {
    offset = Math.max(Math.min(offset, this._content.length), 0);
    const lineOffsets = this.getLineOffsets();
    let low = 0, high = lineOffsets.length;
    if (high === 0) {
      return { line: 0, character: offset };
    }
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] > offset) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    const line = low - 1;
    offset = this.ensureBeforeEOL(offset, lineOffsets[line]);
    return { line, character: offset - lineOffsets[line] };
  }
  offsetAt(position) {
    const lineOffsets = this.getLineOffsets();
    if (position.line >= lineOffsets.length) {
      return this._content.length;
    } else if (position.line < 0) {
      return 0;
    }
    const lineOffset = lineOffsets[position.line];
    if (position.character <= 0) {
      return lineOffset;
    }
    const nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
    const offset = Math.min(lineOffset + position.character, nextLineOffset);
    return this.ensureBeforeEOL(offset, lineOffset);
  }
  ensureBeforeEOL(offset, lineOffset) {
    while (offset > lineOffset && isEOL(this._content.charCodeAt(offset - 1))) {
      offset--;
    }
    return offset;
  }
  get lineCount() {
    return this.getLineOffsets().length;
  }
  static isIncremental(event) {
    const candidate = event;
    return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range !== void 0 && (candidate.rangeLength === void 0 || typeof candidate.rangeLength === "number");
  }
  static isFull(event) {
    const candidate = event;
    return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range === void 0 && candidate.rangeLength === void 0;
  }
};
var TextDocument;
(function(TextDocument2) {
  function create(uri, languageId, version, content) {
    return new FullTextDocument(uri, languageId, version, content);
  }
  TextDocument2.create = create;
  function update(document2, changes, version) {
    if (document2 instanceof FullTextDocument) {
      document2.update(changes, version);
      return document2;
    } else {
      throw new Error("TextDocument.update: document must be created by TextDocument.create");
    }
  }
  TextDocument2.update = update;
  function applyEdits(document2, edits) {
    const text = document2.getText();
    const sortedEdits = mergeSort(edits.map(getWellformedEdit), (a, b) => {
      const diff = a.range.start.line - b.range.start.line;
      if (diff === 0) {
        return a.range.start.character - b.range.start.character;
      }
      return diff;
    });
    let lastModifiedOffset = 0;
    const spans = [];
    for (const e of sortedEdits) {
      const startOffset = document2.offsetAt(e.range.start);
      if (startOffset < lastModifiedOffset) {
        throw new Error("Overlapping edit");
      } else if (startOffset > lastModifiedOffset) {
        spans.push(text.substring(lastModifiedOffset, startOffset));
      }
      if (e.newText.length) {
        spans.push(e.newText);
      }
      lastModifiedOffset = document2.offsetAt(e.range.end);
    }
    spans.push(text.substr(lastModifiedOffset));
    return spans.join("");
  }
  TextDocument2.applyEdits = applyEdits;
})(TextDocument || (TextDocument = {}));
function mergeSort(data, compare) {
  if (data.length <= 1) {
    return data;
  }
  const p = data.length / 2 | 0;
  const left = data.slice(0, p);
  const right = data.slice(p);
  mergeSort(left, compare);
  mergeSort(right, compare);
  let leftIdx = 0;
  let rightIdx = 0;
  let i2 = 0;
  while (leftIdx < left.length && rightIdx < right.length) {
    const ret = compare(left[leftIdx], right[rightIdx]);
    if (ret <= 0) {
      data[i2++] = left[leftIdx++];
    } else {
      data[i2++] = right[rightIdx++];
    }
  }
  while (leftIdx < left.length) {
    data[i2++] = left[leftIdx++];
  }
  while (rightIdx < right.length) {
    data[i2++] = right[rightIdx++];
  }
  return data;
}
function computeLineOffsets(text, isAtLineStart, textOffset = 0) {
  const result = isAtLineStart ? [textOffset] : [];
  for (let i2 = 0; i2 < text.length; i2++) {
    const ch = text.charCodeAt(i2);
    if (isEOL(ch)) {
      if (ch === 13 && i2 + 1 < text.length && text.charCodeAt(i2 + 1) === 10) {
        i2++;
      }
      result.push(textOffset + i2 + 1);
    }
  }
  return result;
}
function isEOL(char) {
  return char === 13 || char === 10;
}
function getWellformedRange(range) {
  const start2 = range.start;
  const end = range.end;
  if (start2.line > end.line || start2.line === end.line && start2.character > end.character) {
    return { start: end, end: start2 };
  }
  return range;
}
function getWellformedEdit(textEdit) {
  const range = getWellformedRange(textEdit.range);
  if (range !== textEdit.range) {
    return { newText: textEdit.newText, range };
  }
  return textEdit;
}

// src/completions.ts
var import_node2 = __toESM2(require_node3());

// src/entity-kind-maps.ts
var import_node = __toESM2(require_node3());
var assertNever = (value) => {
  throw new Error(`entity-kind-maps: unhandled EntityKind ${JSON.stringify(value)}`);
};
var getCompletionItemKind = (kind) => {
  switch (kind) {
    case "Program":
      return import_node.CompletionItemKind.Module;
    case "File":
      return import_node.CompletionItemKind.File;
    case "Function":
      return import_node.CompletionItemKind.Function;
    case "Class":
      return import_node.CompletionItemKind.Class;
    case "ClassFile":
      return import_node.CompletionItemKind.Class;
    case "Constants":
      return import_node.CompletionItemKind.Constant;
    case "DTO":
      return import_node.CompletionItemKind.Interface;
    case "Asset":
      return import_node.CompletionItemKind.File;
    case "UIComponent":
      return import_node.CompletionItemKind.Class;
    case "RunParameter":
      return import_node.CompletionItemKind.Property;
    case "Dependency":
      return import_node.CompletionItemKind.Module;
    case "TypeDef":
      return import_node.CompletionItemKind.TypeParameter;
    default:
      return assertNever(kind);
  }
};
var SEMANTIC_TOKEN_LEGEND = [
  import_node.SemanticTokenTypes.function,
  import_node.SemanticTokenTypes.class,
  import_node.SemanticTokenTypes.interface,
  import_node.SemanticTokenTypes.variable,
  import_node.SemanticTokenTypes.parameter,
  import_node.SemanticTokenTypes.property,
  import_node.SemanticTokenTypes.namespace,
  import_node.SemanticTokenTypes.type
];
var getSemanticTokenType = (kind) => {
  switch (kind) {
    case "Function":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.function);
    case "Class":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.class);
    case "ClassFile":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.class);
    case "DTO":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.interface);
    case "Asset":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.interface);
    case "UIComponent":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.interface);
    case "RunParameter":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.parameter);
    case "Constants":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.property);
    case "Program":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.namespace);
    case "Dependency":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.namespace);
    case "File":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.type);
    case "TypeDef":
      return SEMANTIC_TOKEN_LEGEND.indexOf(import_node.SemanticTokenTypes.type);
    default:
      return assertNever(kind);
  }
};

// src/completions.ts
var ENTITY_TYPE_ITEMS = [
  "Program",
  "File",
  "Function",
  "Class",
  "ClassFile",
  "Constants",
  "DTO",
  "Asset",
  "UIComponent",
  "RunParameter",
  "Dependency",
  "TypeDef"
].map((type) => ({ label: type, kind: import_node2.CompletionItemKind.Keyword, detail: `Entity type: ${type}` }));
var OPERATOR_ITEMS = [
  { label: "->", detail: "Entry point operator" },
  { label: "<-", detail: "Import operator" },
  { label: "@", detail: "Location operator" },
  { label: "::", detail: "Function signature operator" },
  { label: "~>", detail: "Function calls operator" },
  { label: "<:", detail: "Extends operator" },
  { label: "!", detail: "Constants operator" },
  { label: "=>", detail: "Methods operator" },
  { label: "%", detail: "DTO operator" },
  { label: "~", detail: "Asset operator" },
  { label: "&", detail: "UIComponent operator" },
  { label: "&!", detail: "Root UIComponent operator" },
  { label: "#:", detail: "ClassFile operator" },
  { label: "^", detail: "Dependency operator" },
  { label: "$env", detail: "Environment variable parameter" },
  { label: "$iam", detail: "IAM role parameter" },
  { label: "$runtime", detail: "Runtime configuration parameter" },
  { label: "$config", detail: "Application configuration parameter" },
  { label: "$<", detail: "Function consumes parameters" },
  { label: ">>", detail: "Asset contains program" },
  { label: ">", detail: "UIComponent contains" },
  { label: "<", detail: "UIComponent contained by" },
  { label: "=", detail: "TypeDef operator" }
].map((op) => ({ label: op.label, kind: import_node2.CompletionItemKind.Operator, detail: op.detail }));
var provideCompletionsForEntities = (entities) => {
  const items = [...ENTITY_TYPE_ITEMS, ...OPERATOR_ITEMS];
  for (const [name2, entity] of entities) {
    items.push({ label: name2, kind: getCompletionItemKind(entity.kind), detail: `${entity.kind}: ${name2}` });
  }
  return items;
};

// src/name-occurrence-index.ts
var NAME_BEARING_TYPES = /* @__PURE__ */ new Set(["entity_name", "list_entry"]);
var collectOccurrences = (node, out2) => {
  const concreteType = node.syntaxNode.type;
  if (NAME_BEARING_TYPES.has(concreteType)) {
    const span = node.span();
    out2.push({
      name: node.text,
      startLine: span.start.line,
      startColumn: span.start.column,
      endLine: span.end.line,
      endColumn: span.end.column,
      isDeclaration: concreteType === "entity_name"
    });
    return;
  }
  for (const child of node.namedChildNodes()) {
    collectOccurrences(child, out2);
  }
};
var NameOccurrenceIndex = class {
  // Sorted by position (line, then column) — the walk visits the CST in
  // source order, which already satisfies this; asserted by construction,
  // not re-sorted.
  #occurrences;
  #byName;
  constructor(cst) {
    const occurrences = [];
    collectOccurrences(cst, occurrences);
    this.#occurrences = occurrences;
    const byName = /* @__PURE__ */ new Map();
    for (const occurrence of occurrences) {
      const bucket = byName.get(occurrence.name) ?? [];
      bucket.push(occurrence);
      byName.set(occurrence.name, bucket);
    }
    this.#byName = byName;
  }
  all() {
    return this.#occurrences;
  }
  occurrencesOf(name2) {
    return this.#byName.get(name2) ?? [];
  }
  // Replaces getWordRangeAtPosition/isEntityNameChar/isWordBoundary
  // (server.ts:535-574): a position falls inside an occurrence's span, or it
  // falls on nothing — the grammar's name class is the only definition.
  occurrenceAt(line, column) {
    return this.#occurrences.find((occurrence) => {
      if (line < occurrence.startLine || line > occurrence.endLine) {
        return false;
      }
      if (line === occurrence.startLine && column < occurrence.startColumn) {
        return false;
      }
      if (line === occurrence.endLine && column >= occurrence.endColumn) {
        return false;
      }
      return true;
    });
  }
};

// src/document-state.ts
var buildEntityByNameIndex = (output) => {
  const byName = /* @__PURE__ */ new Map();
  for (const entity of output.entities) {
    byName.set(entity.name, entity);
  }
  return byName;
};
var buildDocumentState = (output) => {
  return {
    output,
    nameIndex: new NameOccurrenceIndex(output.cst),
    byName: buildEntityByNameIndex(output)
  };
};

// src/hover.ts
var import_typed_mind = __toESM2(require_dist());
var section = (label, value) => {
  if (value === void 0 || value.length === 0) {
    return void 0;
  }
  return `**${label}**: ${value}`;
};
var listSection = (label, values) => {
  if (values === void 0 || values.length === 0) {
    return void 0;
  }
  return `**${label}**: ${values.join(", ")}`;
};
var renderReferencedBy = (entity, links) => {
  const references = links.referencedBy(entity.name);
  if (references.length === 0) {
    return void 0;
  }
  const byFromType = /* @__PURE__ */ new Map();
  for (const reference of references) {
    const bucket = byFromType.get(reference.fromType) ?? [];
    bucket.push(reference.from);
    byFromType.set(reference.fromType, bucket);
  }
  const groups = [...byFromType.entries()].map(([fromType, froms]) => `${fromType}: ${froms.join(", ")}`);
  return `**Referenced By**: ${groups.join(" | ")}`;
};
var renderCommon = (entity) => {
  const lines = [`**${entity.kind}**: ${entity.name}`];
  if (entity.comment !== void 0 && entity.comment.length > 0) {
    lines.push(`\u{1F4AC} *${entity.comment}*`);
  }
  return lines;
};
var renderProgram = (entity) => {
  return [
    section("Entry", entity.entry),
    section("Purpose", entity.purpose),
    section("Version", entity.version),
    listSection("Exports", entity.exports)
  ].filter((line) => line !== void 0);
};
var renderFile = (entity) => {
  return [
    section("Path", entity.path),
    section("Purpose", entity.purpose),
    listSection("Imports", entity.imports),
    listSection("Exports", entity.exports)
  ].filter((line) => line !== void 0);
};
var renderFunction = (entity) => {
  return [
    section("Signature", entity.signature.length > 0 ? `\`${entity.signature}\`` : void 0),
    section("Description", entity.description),
    section("Input", entity.input),
    section("Output", entity.output),
    listSection("Calls", entity.calls),
    listSection("Affects", entity.affects),
    listSection("Consumes", entity.consumes)
  ].filter((line) => line !== void 0);
};
var renderClass = (entity) => {
  return [
    section("Purpose", entity.purpose),
    section("Extends", entity.extends),
    listSection("Implements", entity.implements),
    listSection("Methods", entity.methods)
  ].filter((line) => line !== void 0);
};
var renderClassFile = (entity) => {
  return [
    section("Path", entity.path),
    section("Purpose", entity.purpose),
    section("Extends", entity.extends),
    listSection("Implements", entity.implements),
    listSection("Methods", entity.methods),
    listSection("Imports", entity.imports),
    listSection("Exports", entity.exports)
  ].filter((line) => line !== void 0);
};
var renderConstants = (entity) => {
  return [section("Path", entity.path), section("Schema", entity.schema), section("Purpose", entity.purpose)].filter(
    (line) => line !== void 0
  );
};
var renderDto = (entity) => {
  const lines = [];
  const purpose = section("Purpose", entity.purpose);
  if (purpose !== void 0) {
    lines.push(purpose);
  }
  if (entity.fields.length > 0) {
    const fieldList = entity.fields.map((field) => {
      const optional = field.isOptional ? " *(optional)*" : "";
      const desc = field.description !== void 0 && field.description.length > 0 ? ` - ${field.description}` : "";
      return `\u2022 \`${field.name}: ${field.type}\`${optional}${desc}`;
    }).join("\n");
    lines.push(`**Fields**:
${fieldList}`);
  }
  return lines;
};
var renderTypeDef = (entity) => {
  const lines = [`**Variant**: ${entity.variant}`];
  if (entity.variant === "enum") {
    const members = listSection("Members", entity.members);
    if (members !== void 0) {
      lines.push(members);
    }
  }
  const purpose = section("Purpose", entity.purpose);
  if (purpose !== void 0) {
    lines.push(purpose);
  }
  return lines;
};
var renderAsset = (entity) => {
  return [section("Description", entity.description), section("Contains Program", entity.containsProgram)].filter(
    (line) => line !== void 0
  );
};
var renderUiComponent = (entity, links) => {
  const lines = [
    section("Purpose", entity.purpose),
    entity.root ? "**Root Component**: \u2713" : void 0,
    listSection("Contains", entity.contains)
  ].filter((line) => line !== void 0);
  const containedBy = links.containedBy(entity.name);
  if (containedBy.length > 0) {
    lines.push(`**Contained By**: ${containedBy.join(", ")}`);
  }
  const affectedBy = links.affectedBy(entity.name);
  if (affectedBy.length > 0) {
    lines.push(`**Affected By**: ${affectedBy.join(", ")}`);
  }
  return lines;
};
var renderRunParameter = (entity, links) => {
  const lines = [
    `**Parameter Type**: ${entity.paramType}`,
    section("Description", entity.description),
    entity.required === true ? "**Required**: \u2713" : void 0,
    section("Default Value", entity.defaultValue !== void 0 ? `\`${entity.defaultValue}\`` : void 0)
  ].filter((line) => line !== void 0);
  const consumedBy = links.consumedBy(entity.name);
  if (consumedBy.length > 0) {
    lines.push(`**Consumed By**: ${consumedBy.join(", ")}`);
  }
  return lines;
};
var renderDependency = (entity, links) => {
  const lines = [section("Purpose", entity.purpose), section("Version", entity.version)].filter(
    (line) => line !== void 0
  );
  const importedBy = links.importedBy(entity.name);
  if (importedBy.length > 0) {
    lines.push(`**Imported By**: ${importedBy.join(", ")}`);
  }
  return lines;
};
var renderHoverContents = (entity, links) => {
  const lines = renderCommon(entity);
  if (entity instanceof import_typed_mind.ProgramNode) {
    lines.push(...renderProgram(entity));
  } else if (entity instanceof import_typed_mind.FileNode) {
    lines.push(...renderFile(entity));
  } else if (entity instanceof import_typed_mind.FunctionNode) {
    lines.push(...renderFunction(entity));
  } else if (entity instanceof import_typed_mind.ClassFileNode) {
    lines.push(...renderClassFile(entity));
  } else if (entity instanceof import_typed_mind.ClassNode) {
    lines.push(...renderClass(entity));
  } else if (entity instanceof import_typed_mind.ConstantsNode) {
    lines.push(...renderConstants(entity));
  } else if (entity instanceof import_typed_mind.AssetNode) {
    lines.push(...renderAsset(entity));
  } else if (entity instanceof import_typed_mind.UiComponentNode) {
    lines.push(...renderUiComponent(entity, links));
  } else if (entity instanceof import_typed_mind.RunParameterNode) {
    lines.push(...renderRunParameter(entity, links));
  } else if (entity instanceof import_typed_mind.DependencyNode) {
    lines.push(...renderDependency(entity, links));
  } else if (entity instanceof import_typed_mind.DtoNode) {
    lines.push(...renderDto(entity));
  } else if (entity instanceof import_typed_mind.TypeDefNode) {
    lines.push(...renderTypeDef(entity));
  }
  const referencedBy = renderReferencedBy(entity, links);
  if (referencedBy !== void 0) {
    lines.push(referencedBy);
  }
  return lines.join("\n\n");
};

// src/lsp-diagnostics.ts
var import_node3 = __toESM2(require_node3());
var toLspDiagnostic = (diagnostic) => {
  return {
    severity: diagnostic.severity === "error" ? import_node3.DiagnosticSeverity.Error : import_node3.DiagnosticSeverity.Warning,
    range: {
      start: { line: diagnostic.span.start.line - 1, character: diagnostic.span.start.column - 1 },
      end: { line: diagnostic.span.end.line - 1, character: diagnostic.span.end.column - 1 }
    },
    message: diagnostic.message,
    source: "typed-mind",
    code: diagnostic.code
  };
};
var toLspDiagnostics = (diagnostics) => {
  return diagnostics.map(toLspDiagnostic);
};

// src/references.ts
var toLspLocation = (uri, occurrence) => {
  return {
    uri,
    range: {
      start: { line: occurrence.startLine - 1, character: occurrence.startColumn - 1 },
      end: { line: occurrence.endLine - 1, character: occurrence.endColumn - 1 }
    }
  };
};
var provideReferencesForName = (uri, name2, nameIndex) => {
  return nameIndex.occurrencesOf(name2).map((occurrence) => toLspLocation(uri, occurrence));
};

// src/semantic-tokens.ts
var import_node4 = __toESM2(require_node3());
var SEMANTIC_TOKEN_MODIFIERS = [
  import_node4.SemanticTokenModifiers.declaration,
  import_node4.SemanticTokenModifiers.definition,
  import_node4.SemanticTokenModifiers.readonly,
  import_node4.SemanticTokenModifiers.static
];
var DECLARATION_MODIFIER_BIT = 1 << SEMANTIC_TOKEN_MODIFIERS.indexOf(import_node4.SemanticTokenModifiers.declaration);
var provideSemanticTokensForDocument = (state) => {
  const builder = new import_node4.SemanticTokensBuilder();
  for (const occurrence of state.nameIndex.all()) {
    const entity = state.byName.get(occurrence.name);
    if (entity === void 0) {
      continue;
    }
    const tokenType = getSemanticTokenType(entity.kind);
    const tokenModifiers = occurrence.isDeclaration ? DECLARATION_MODIFIER_BIT : 0;
    builder.push(
      occurrence.startLine - 1,
      occurrence.startColumn - 1,
      occurrence.endColumn - occurrence.startColumn,
      tokenType,
      tokenModifiers
    );
  }
  return builder.build();
};

// src/toggle-format.ts
var handleToggleFormat = (typedMind, fullText, params) => {
  let textToProcess = fullText;
  if (params.range !== void 0) {
    const lines = fullText.split("\n");
    const startLineIndex = Math.max(0, params.range.start);
    const endLineIndex = Math.min(lines.length - 1, params.range.end);
    if (startLineIndex <= endLineIndex) {
      textToProcess = lines.slice(startLineIndex, endLineIndex + 1).join("\n");
    }
  }
  const newText = typedMind.toggleFormat(textToProcess);
  return { newText };
};

// src/wasm-resolution.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var firstExisting = (candidates) => {
  return candidates.find((candidate) => (0, import_node_fs.existsSync)(candidate));
};
var resolveTypedMindPackageDir = () => {
  try {
    const typedMindEntry = require.resolve("@sammons/typed-mind", { paths: [__dirname] });
    return (0, import_node_path.dirname)((0, import_node_path.dirname)(typedMindEntry));
  } catch {
    return void 0;
  }
};
var resolveCorePackageGrammarWasm = () => {
  const typedMindPackageDir = resolveTypedMindPackageDir();
  if (typedMindPackageDir === void 0) {
    return void 0;
  }
  return firstExisting([(0, import_node_path.join)(typedMindPackageDir, "grammar", "grammar.wasm"), (0, import_node_path.join)(typedMindPackageDir, "grammar.wasm")]);
};
var resolveCorePackageRuntimeWasm = () => {
  const typedMindPackageDir = resolveTypedMindPackageDir();
  if (typedMindPackageDir === void 0) {
    return void 0;
  }
  let webTreeSitterDir;
  try {
    webTreeSitterDir = (0, import_node_path.dirname)(require.resolve("web-tree-sitter", { paths: [typedMindPackageDir] }));
  } catch {
    return void 0;
  }
  return firstExisting([(0, import_node_path.join)(webTreeSitterDir, "web-tree-sitter.wasm")]);
};
var resolveWasmPaths = () => {
  const bundleAdjacentGrammarWasm = (0, import_node_path.join)(__dirname, "grammar.wasm");
  const bundleAdjacentRuntimeWasm = (0, import_node_path.join)(__dirname, "web-tree-sitter.wasm");
  const wasmPath = (0, import_node_fs.existsSync)(bundleAdjacentGrammarWasm) ? bundleAdjacentGrammarWasm : resolveCorePackageGrammarWasm();
  const runtimeWasmPath = (0, import_node_fs.existsSync)(bundleAdjacentRuntimeWasm) ? bundleAdjacentRuntimeWasm : resolveCorePackageRuntimeWasm();
  return {
    ...wasmPath === void 0 ? {} : { wasmPath },
    ...runtimeWasmPath === void 0 ? {} : { runtimeWasmPath }
  };
};

// src/server.ts
var TypedMindLanguageServer = class _TypedMindLanguageServer {
  connection = (0, import_node5.createConnection)(import_node5.ProposedFeatures.all);
  documents = new import_node5.TextDocuments(TextDocument);
  typedMind;
  // Cache: Map<uri, DocumentState> — DocumentState = { output, nameIndex, byName }.
  documentStates = /* @__PURE__ */ new Map();
  // The constructor takes an already-ready TypedMind facade (the async wasm
  // load happened in the static create() below, before this class ever
  // exists) — no I/O in the constructor (no_side_effects_in_constructors).
  constructor(typedMind) {
    this.typedMind = typedMind;
    this.setupHandlers();
  }
  // Async bootstrap with race guard (RFC-TM-5 §1 leaf b): callers must await
  // this before calling start(), so connection.listen() (which is what
  // starts reading stdin) never runs before the parser is ready. See
  // start-server.ts for the ordering that makes this the only construction
  // path.
  static async create() {
    const typedMind = await import_typed_mind2.TypedMind.create(resolveWasmPaths());
    return new _TypedMindLanguageServer(typedMind);
  }
  setupHandlers() {
    this.connection.onInitialize((_params) => {
      return {
        capabilities: {
          textDocumentSync: import_node5.TextDocumentSyncKind.Incremental,
          completionProvider: {
            resolveProvider: false,
            triggerCharacters: ["-", "<", "@", ":", "~", "!", "=", "#"]
          },
          hoverProvider: true,
          definitionProvider: true,
          referencesProvider: true,
          semanticTokensProvider: {
            legend: {
              tokenTypes: [...SEMANTIC_TOKEN_LEGEND],
              tokenModifiers: [...SEMANTIC_TOKEN_MODIFIERS]
            },
            full: true
          }
        }
      };
    });
    this.connection.onInitialized(() => {
      this.connection.console.log("TypedMind Language Server initialized");
    });
    this.documents.onDidOpen((event) => {
      this.validateTextDocument(event.document);
    });
    this.documents.onDidChangeContent((change) => {
      this.validateTextDocument(change.document);
    });
    this.connection.onCompletion((params) => {
      return this.provideCompletions(params);
    });
    this.connection.onHover((params) => {
      return this.provideHover(params);
    });
    this.connection.onDefinition((params) => {
      return this.provideDefinition(params);
    });
    this.connection.onReferences((params) => {
      return this.provideReferences(params);
    });
    this.connection.languages.semanticTokens.on((params) => {
      return this.provideSemanticTokens(params);
    });
    this.connection.onRequest("typedmind/toggleFormat", (params) => {
      return this.handleToggleFormatRequest(params);
    });
  }
  // Real-range diagnostics (RFC-TM-5 §1 leaf a): typedMind.check(text) never
  // throws (the tolerant pipeline, rfc-tm-3-diamond.md §3.3), so there is no
  // catch arm and no 0,0 collapse — CheckOutcome.diagnostics maps straight
  // onto LSP Ranges via toLspDiagnostics.
  async validateTextDocument(textDocument) {
    const text = textDocument.getText();
    const parsed = this.typedMind.parseWithCst(text);
    this.documentStates.set(textDocument.uri, buildDocumentState(parsed));
    const checked = this.typedMind.check(text);
    await this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: toLspDiagnostics(checked.diagnostics) });
  }
  provideCompletions(params) {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === void 0) {
      return [];
    }
    return provideCompletionsForEntities(state.byName);
  }
  provideHover(params) {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === void 0) {
      return null;
    }
    const occurrence = state.nameIndex.occurrenceAt(params.position.line + 1, params.position.character + 1);
    if (occurrence === void 0) {
      return null;
    }
    const entity = state.byName.get(occurrence.name);
    if (entity === void 0) {
      return null;
    }
    return {
      contents: {
        kind: import_node5.MarkupKind.Markdown,
        value: renderHoverContents(entity, state.output.links)
      }
    };
  }
  provideDefinition(params) {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === void 0) {
      return null;
    }
    const occurrence = state.nameIndex.occurrenceAt(params.position.line + 1, params.position.character + 1);
    if (occurrence === void 0) {
      return null;
    }
    const entity = state.byName.get(occurrence.name);
    if (entity === void 0) {
      return null;
    }
    return {
      uri: params.textDocument.uri,
      range: {
        start: { line: entity.span.start.line - 1, character: entity.span.start.column - 1 },
        end: { line: entity.span.end.line - 1, character: entity.span.end.column - 1 }
      }
    };
  }
  provideReferences(params) {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === void 0) {
      return [];
    }
    const occurrence = state.nameIndex.occurrenceAt(params.position.line + 1, params.position.character + 1);
    if (occurrence === void 0) {
      return [];
    }
    return provideReferencesForName(params.textDocument.uri, occurrence.name, state.nameIndex);
  }
  provideSemanticTokens(params) {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === void 0) {
      return { data: [] };
    }
    return provideSemanticTokensForDocument(state);
  }
  handleToggleFormatRequest(params) {
    try {
      const document2 = this.documents.get(params.uri);
      if (document2 === void 0) {
        return { newText: "", error: "Document not found" };
      }
      return handleToggleFormat(this.typedMind, document2.getText(), params);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error during format toggle";
      this.connection.console.error(`Format toggle error: ${message}`);
      return { newText: "", error: message };
    }
  }
  // Only called after create() has resolved: the connection reads stdin
  // (connection.listen()) only from here, so no request can observe an
  // uninitialized parser (RFC-TM-5 §1 leaf b).
  start() {
    this.documents.listen(this.connection);
    this.connection.listen();
  }
};

// src/start-server.ts
async function startServer() {
  process.on("uncaughtException", (error) => {
    console.error("TypedMind LSP uncaught exception:", error.message);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("TypedMind LSP unhandled rejection:", reason);
    process.exit(1);
  });
  try {
    const server = await TypedMindLanguageServer.create();
    server.start();
  } catch (error) {
    console.error("Failed to start TypedMind Language Server:", error);
    process.exit(1);
  }
}

// src/cli.ts
void startServer();
