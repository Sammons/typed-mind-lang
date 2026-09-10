// C# analyzer: parses .cs files via tree-sitter and extracts ParsedModule data.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type {
  Analyzer,
  AnalyzerDiagnostic,
  ParsedClass,
  ParsedConstant,
  ParsedEnum,
  ParsedExport,
  ParsedFunction,
  ParsedImport,
  ParsedInterface,
  ParsedMethod,
  ParsedModule,
  ParsedParameter,
  ParsedProperty,
  ParsedTypeAlias,
  ProjectAnalysis,
  TreeSitterParser,
} from '@sammons/typed-mind-tree-sitter-common';
import type { Node as SyntaxNode, Tree } from 'web-tree-sitter';
import { parseCsproj, parseSln } from './csharp-project.ts';

export const GRAMMAR_PATH = new URL('../grammar/tree-sitter-c_sharp.wasm', import.meta.url).pathname;

function childrenOfType(node: SyntaxNode, type: string): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child !== null && child.type === type) {
      result.push(child);
    }
  }
  return result;
}

function firstChildOfType(node: SyntaxNode, type: string): SyntaxNode | undefined {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child !== null && child.type === type) {
      return child;
    }
  }
  return undefined;
}

function nodeText(node: SyntaxNode | undefined | null): string {
  return node?.text ?? '';
}

function hasModifier(node: SyntaxNode, modifier: string): boolean {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child !== null && child.type === 'modifier' && child.text === modifier) {
      return true;
    }
  }
  return false;
}

function extractDecorators(node: SyntaxNode): string[] {
  const decorators: string[] = [];
  const attrLists = childrenOfType(node, 'attribute_list');
  for (const attrList of attrLists) {
    const attrs = childrenOfType(attrList, 'attribute');
    for (const attr of attrs) {
      const name = firstChildOfType(attr, 'identifier') ?? firstChildOfType(attr, 'qualified_name');
      if (name !== undefined) {
        decorators.push(name.text);
      }
    }
  }
  return decorators;
}

function extractTypeParameters(node: SyntaxNode): string {
  const typeParamList = firstChildOfType(node, 'type_parameter_list');
  if (typeParamList === undefined) return '';
  return typeParamList.text;
}

function extractParameters(node: SyntaxNode): ParsedParameter[] {
  const paramList = firstChildOfType(node, 'parameter_list');
  if (paramList === undefined) return [];

  const params: ParsedParameter[] = [];
  const paramNodes = childrenOfType(paramList, 'parameter');
  for (const paramNode of paramNodes) {
    const nameNode = firstChildOfType(paramNode, 'identifier');
    const typeNode =
      firstChildOfType(paramNode, 'predefined_type') ??
      firstChildOfType(paramNode, 'generic_name') ??
      firstChildOfType(paramNode, 'qualified_name') ??
      firstChildOfType(paramNode, 'identifier') ??
      firstChildOfType(paramNode, 'nullable_type') ??
      firstChildOfType(paramNode, 'array_type');

    const name = nodeText(nameNode);
    let type = '';
    // The type comes before the identifier in C# parameter declarations
    for (let i = 0; i < paramNode.childCount; i++) {
      const child = paramNode.child(i);
      if (child !== null && child === nameNode) break;
      if (child !== null && child.type !== 'modifier' && child.type !== 'attribute_list') {
        type = child.text;
      }
    }
    if (type === '' && typeNode !== undefined && typeNode !== nameNode) {
      type = typeNode.text;
    }

    const hasDefault = firstChildOfType(paramNode, 'equals_value_clause') !== undefined;
    const isParams = hasModifier(paramNode, 'params');

    params.push({
      name,
      type,
      isOptional: hasDefault,
      hasDefaultValue: hasDefault,
      isRest: isParams,
    });
  }
  return params;
}

// The return type is the first type-like node after all modifiers and attributes.
// Structure: modifier* [attribute_list*] return-type method-name parameter_list body
// Return type can be: predefined_type, generic_name, qualified_name, void_keyword,
// nullable_type, array_type, or a plain identifier (user-defined type).
function extractReturnType(node: SyntaxNode): string {
  const TYPE_NODES = new Set([
    'predefined_type',
    'generic_name',
    'qualified_name',
    'void_keyword',
    'nullable_type',
    'array_type',
    'tuple_type',
    'ref_type',
  ]);
  const SKIP_NODES = new Set(['modifier', 'attribute_list']);

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child === null) continue;
    if (SKIP_NODES.has(child.type)) continue;

    // A matching type node is the return type
    if (TYPE_NODES.has(child.type)) return child.text;

    // A plain identifier here is the return type (user-defined type).
    // The NEXT identifier would be the method name.
    if (child.type === 'identifier') return child.text;

    // Anything else unexpected — stop looking
    break;
  }

  return 'void';
}

function buildMethodSignature(name: string, params: readonly ParsedParameter[], returnType: string, isAsync: boolean): string {
  const paramStr = params.map((p) => `${p.name}: ${p.type}`).join(', ');
  const asyncPrefix = isAsync ? 'async ' : '';
  return `${asyncPrefix}${name}(${paramStr}) => ${returnType}`;
}

// In C# method_declaration, the tree structure is:
// modifier* return-type method-name parameter_list body
// The return type can be an identifier (user type), predefined_type, generic_name, etc.
// The method name is always an identifier that follows the return type.
// We find it by locating the identifier that immediately precedes parameter_list.
function extractMethodName(node: SyntaxNode): string {
  // Walk backwards from parameter_list to find the method name identifier
  let foundParamList = false;
  for (let i = node.childCount - 1; i >= 0; i--) {
    const child = node.child(i);
    if (child === null) continue;
    if (child.type === 'parameter_list') {
      foundParamList = true;
      continue;
    }
    if (foundParamList && child.type === 'identifier') {
      return child.text;
    }
    // Also check for explicit_interface_specifier (Interface.Method pattern)
    if (foundParamList && child.type === 'explicit_interface_specifier') {
      continue;
    }
    if (foundParamList) {
      // type_parameter_list may appear between name and parameter_list
      if (child.type === 'type_parameter_list') continue;
      break;
    }
  }
  // Fallback: first identifier
  const nameNode = firstChildOfType(node, 'identifier');
  return nodeText(nameNode);
}

function extractMethod(node: SyntaxNode): ParsedMethod {
  const name = extractMethodName(node);
  const isStatic = hasModifier(node, 'static');
  const isPrivate = hasModifier(node, 'private');
  const isProtected = hasModifier(node, 'protected');
  const isAbstract = hasModifier(node, 'abstract');
  const params = extractParameters(node);
  const returnType = extractReturnType(node);
  const isAsync = hasModifier(node, 'async');

  return {
    name,
    signature: buildMethodSignature(name, params, returnType, isAsync),
    isStatic,
    isPrivate,
    isProtected,
    isAbstract,
    parameters: params,
    returnType,
    isAsync,
    accessorKind: undefined,
  };
}

function extractProperty(node: SyntaxNode): ParsedProperty {
  // The last identifier is the property name; for user-defined types like
  // `Color FillColor`, both type and name are identifiers in the AST.
  let nameNode: SyntaxNode | undefined;
  for (let i = node.childCount - 1; i >= 0; i--) {
    const c = node.child(i);
    if (c !== null && c.type === 'identifier') { nameNode = c; break; }
  }
  const name = nodeText(nameNode);
  const isStatic = hasModifier(node, 'static');
  const isPrivate = hasModifier(node, 'private');
  const isProtected = hasModifier(node, 'protected');
  const isReadonly = hasModifier(node, 'readonly');

  let type = '';
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child === null) continue;
    if (child === nameNode) break;
    if (child.type !== 'modifier' && child.type !== 'attribute_list') {
      type = child.text;
    }
  }

  return {
    name,
    type,
    isReadonly,
    isStatic,
    isPrivate,
    isProtected,
    isOptional: false,
  };
}

function extractFieldAsProperty(node: SyntaxNode): ParsedProperty[] {
  const isStatic = hasModifier(node, 'static');
  const isPrivate = hasModifier(node, 'private');
  const isProtected = hasModifier(node, 'protected');
  const isReadonly = hasModifier(node, 'readonly');

  const variableDecl = firstChildOfType(node, 'variable_declaration');
  if (variableDecl === undefined) return [];

  // Type is the first non-modifier child of variable_declaration
  let type = '';
  for (let i = 0; i < variableDecl.childCount; i++) {
    const child = variableDecl.child(i);
    if (child === null) continue;
    if (child.type === 'variable_declarator') break;
    type = child.text;
  }

  const declarators = childrenOfType(variableDecl, 'variable_declarator');
  return declarators.map((decl) => {
    const nameNode = firstChildOfType(decl, 'identifier');
    return {
      name: nodeText(nameNode),
      type,
      isReadonly,
      isStatic,
      isPrivate,
      isProtected,
      isOptional: false,
    };
  });
}

function extractBaseTypes(node: SyntaxNode): { extends: readonly string[]; implements: readonly string[] } {
  const baseList = firstChildOfType(node, 'base_list');
  if (baseList === undefined) return { extends: [], implements: [] };

  const baseTypes: string[] = [];
  // Walk children to find type identifiers
  for (let i = 0; i < baseList.childCount; i++) {
    const child = baseList.child(i);
    if (child === null) continue;
    if (child.type === 'identifier' || child.type === 'generic_name' || child.type === 'qualified_name') {
      baseTypes.push(child.text);
    }
    // Also check inside simple_base_type nodes
    if (child.type === 'simple_base_type' || child.type === 'primary_constructor_base_type') {
      const inner =
        firstChildOfType(child, 'identifier') ?? firstChildOfType(child, 'generic_name') ?? firstChildOfType(child, 'qualified_name');
      if (inner !== undefined) {
        baseTypes.push(inner.text);
      }
    }
  }

  // In C#, we cannot reliably distinguish base class from interface by syntax alone.
  // Convention: interface names start with 'I' followed by uppercase.
  const extendsTypes: string[] = [];
  const implementsTypes: string[] = [];
  for (const t of baseTypes) {
    const baseName = t.includes('<') ? t.substring(0, t.indexOf('<')) : t;
    if (/^I[A-Z]/.test(baseName)) {
      implementsTypes.push(t);
    } else {
      extendsTypes.push(t);
    }
  }

  return { extends: extendsTypes, implements: implementsTypes };
}

function extractClass(node: SyntaxNode, isStruct: boolean): ParsedClass {
  const nameNode = firstChildOfType(node, 'identifier');
  const name = nodeText(nameNode) + extractTypeParameters(node);
  const isAbstract = hasModifier(node, 'abstract');
  const decorators = extractDecorators(node);
  const { extends: extendsTypes, implements: implementsTypes } = extractBaseTypes(node);

  const body = firstChildOfType(node, 'declaration_list');
  const methods: ParsedMethod[] = [];
  const properties: ParsedProperty[] = [];

  if (body !== undefined) {
    for (let i = 0; i < body.childCount; i++) {
      const child = body.child(i);
      if (child === null) continue;

      if (child.type === 'method_declaration') {
        methods.push(extractMethod(child));
      } else if (child.type === 'constructor_declaration') {
        const className = nodeText(nameNode);
        const params = extractParameters(child);
        methods.push({
          name: className,
          signature: buildMethodSignature(className, params, 'void', false),
          isStatic: hasModifier(child, 'static'),
          isPrivate: hasModifier(child, 'private'),
          isProtected: hasModifier(child, 'protected'),
          isAbstract: false,
          parameters: params,
          returnType: 'void',
          isAsync: false,
          accessorKind: undefined,
        });
      } else if (child.type === 'property_declaration') {
        properties.push(extractProperty(child));
      } else if (child.type === 'field_declaration') {
        properties.push(...extractFieldAsProperty(child));
      }
    }
  }

  // Record types may also have a parameter_list (primary constructor) that
  // doubles as positional properties.
  if (node.type === 'record_declaration' || node.type === 'record_struct_declaration') {
    const paramList = firstChildOfType(node, 'parameter_list');
    if (paramList !== undefined) {
      const paramNodes = childrenOfType(paramList, 'parameter');
      for (const paramNode of paramNodes) {
        // The last identifier is the parameter name; everything before it
        // (excluding modifiers/attributes) is the type. For user-defined
        // types like `UserRole Role`, both the type and name are identifiers.
        let lastIdentifierIdx = -1;
        for (let i = paramNode.childCount - 1; i >= 0; i--) {
          if (paramNode.child(i)?.type === 'identifier') { lastIdentifierIdx = i; break; }
        }
        const pName = lastIdentifierIdx >= 0 ? nodeText(paramNode.child(lastIdentifierIdx)!) : '';
        let pType = '';
        for (let i = 0; i < paramNode.childCount; i++) {
          if (i === lastIdentifierIdx) break;
          const c = paramNode.child(i);
          if (c !== null && c.type !== 'modifier' && c.type !== 'attribute_list') {
            pType = c.text;
          }
        }
        properties.push({
          name: pName,
          type: pType,
          isReadonly: true,
          isStatic: false,
          isPrivate: false,
          isProtected: false,
          isOptional: false,
        });
      }
    }
  }

  const description = isStruct ? 'struct' : undefined;

  return {
    name,
    isAbstract,
    extends: extendsTypes,
    implements: implementsTypes,
    methods,
    properties,
    decorators,
    description,
  };
}

function extractInterface(node: SyntaxNode): ParsedInterface {
  const nameNode = firstChildOfType(node, 'identifier');
  const name = nodeText(nameNode) + extractTypeParameters(node);
  const { extends: _extendsTypes, implements: implementsTypes } = extractBaseTypes(node);
  // Interfaces "extend" other interfaces in C#, which appear in the base_list
  const extendsTypes = [..._extendsTypes, ...implementsTypes];

  const body = firstChildOfType(node, 'declaration_list');
  const methods: ParsedMethod[] = [];
  const properties: ParsedProperty[] = [];

  if (body !== undefined) {
    for (let i = 0; i < body.childCount; i++) {
      const child = body.child(i);
      if (child === null) continue;

      if (child.type === 'method_declaration') {
        methods.push(extractMethod(child));
      } else if (child.type === 'property_declaration') {
        properties.push(extractProperty(child));
      }
    }
  }

  return {
    name,
    extends: extendsTypes,
    properties,
    methods,
    description: undefined,
  };
}

function extractEnum(node: SyntaxNode): ParsedEnum {
  const nameNode = firstChildOfType(node, 'identifier');
  const name = nodeText(nameNode);
  const body = firstChildOfType(node, 'enum_member_declaration_list');
  const members: string[] = [];

  if (body !== undefined) {
    const memberNodes = childrenOfType(body, 'enum_member_declaration');
    for (const memberNode of memberNodes) {
      const memberName = firstChildOfType(memberNode, 'identifier');
      if (memberName !== undefined) {
        members.push(memberName.text);
      }
    }
  }

  return {
    name,
    members,
    description: undefined,
  };
}

function extractUsings(node: SyntaxNode): ParsedImport[] {
  const imports: ParsedImport[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child === null) continue;
    if (child.type === 'using_directive') {
      const nameNode = firstChildOfType(child, 'qualified_name') ?? firstChildOfType(child, 'identifier');
      if (nameNode !== undefined) {
        const isStatic = child.text.includes('static ');
        const aliasNode = firstChildOfType(child, 'name_equals');
        imports.push({
          specifier: nameNode.text,
          defaultImport: undefined,
          namedImports: [],
          namespaceImport: aliasNode !== undefined ? nodeText(firstChildOfType(aliasNode, 'identifier')) : undefined,
          isTypeOnly: isStatic,
        });
      }
    }
  }
  return imports;
}

interface TypeDeclarations {
  readonly classes: ParsedClass[];
  readonly interfaces: ParsedInterface[];
  readonly enums: ParsedEnum[];
  readonly functions: ParsedFunction[];
  readonly constants: ParsedConstant[];
  readonly types: ParsedTypeAlias[];
}

function extractDeclarationsFromBody(node: SyntaxNode): TypeDeclarations {
  const classes: ParsedClass[] = [];
  const interfaces: ParsedInterface[] = [];
  const enums: ParsedEnum[] = [];
  const functions: ParsedFunction[] = [];
  const constants: ParsedConstant[] = [];
  const types: ParsedTypeAlias[] = [];

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child === null) continue;

    switch (child.type) {
      case 'class_declaration':
        classes.push(extractClass(child, false));
        break;
      case 'struct_declaration':
        classes.push(extractClass(child, true));
        break;
      case 'record_declaration':
        classes.push(extractClass(child, false));
        break;
      case 'record_struct_declaration':
        classes.push(extractClass(child, true));
        break;
      case 'interface_declaration':
        interfaces.push(extractInterface(child));
        break;
      case 'enum_declaration':
        enums.push(extractEnum(child));
        break;
      case 'delegate_declaration': {
        // Treat delegates as type aliases
        const delName = nodeText(firstChildOfType(child, 'identifier'));
        const delType = child.text;
        types.push({ name: delName, type: delType, description: 'delegate' });
        break;
      }
      // Recurse into nested namespaces
      case 'namespace_declaration':
      case 'file_scoped_namespace_declaration': {
        const nested = extractDeclarationsFromBody(firstChildOfType(child, 'declaration_list') ?? child);
        classes.push(...nested.classes);
        interfaces.push(...nested.interfaces);
        enums.push(...nested.enums);
        functions.push(...nested.functions);
        constants.push(...nested.constants);
        types.push(...nested.types);
        break;
      }
      default:
        break;
    }
  }

  return { classes, interfaces, enums, functions, constants, types };
}

function parseFileToModule(tree: Tree, filePath: string): ParsedModule {
  const root = tree.rootNode;
  const imports = extractUsings(root);

  // extractDeclarationsFromBody recurses into namespace_declaration and
  // file_scoped_namespace_declaration children, so a single call from root
  // captures every declaration in the file.
  const declarations = extractDeclarationsFromBody(root);

  // Build exports from public types
  const exports: ParsedExport[] = [];
  for (const cls of declarations.classes) {
    exports.push({
      name: cls.name,
      isDefault: false,
      type: 'class',
      source: undefined,
    });
  }
  for (const iface of declarations.interfaces) {
    exports.push({
      name: iface.name,
      isDefault: false,
      type: 'interface',
      source: undefined,
    });
  }
  for (const enumDecl of declarations.enums) {
    exports.push({
      name: enumDecl.name,
      isDefault: false,
      type: 'enum',
      source: undefined,
    });
  }
  for (const typeAlias of declarations.types) {
    exports.push({
      name: typeAlias.name,
      isDefault: false,
      type: 'type',
      source: undefined,
    });
  }

  return {
    filePath,
    imports,
    exports,
    functions: declarations.functions,
    classes: declarations.classes,
    interfaces: declarations.interfaces,
    types: declarations.types,
    constants: declarations.constants,
    enums: declarations.enums,
  };
}

export class CSharpAnalyzer implements Analyzer {
  readonly #projectPath: string;
  readonly #configPath: string | undefined;
  readonly #parser: TreeSitterParser;

  constructor(projectPath: string, parser: TreeSitterParser, configPath?: string) {
    this.#projectPath = resolve(projectPath);
    this.#parser = parser;
    this.#configPath = configPath;
  }

  analyzeFromEntrypoint(entrypoint: string): ProjectAnalysis {
    const diagnostics: AnalyzerDiagnostic[] = [];
    const modules: ParsedModule[] = [];

    // Determine source files
    let sourceFiles: string[];
    let projectRoot = this.#projectPath;

    if (this.#configPath?.endsWith('.sln')) {
      const slnProjects = parseSln(this.#configPath);
      sourceFiles = [];
      for (const proj of slnProjects) {
        const info = parseCsproj(proj.csprojPath);
        sourceFiles.push(...info.sourceFiles.map((f) => join(dirname(proj.csprojPath), f)));
      }
    } else if (this.#configPath?.endsWith('.csproj')) {
      const info = parseCsproj(this.#configPath);
      projectRoot = info.projectPath;
      sourceFiles = info.sourceFiles.map((f) => join(info.projectPath, f));
    } else {
      // Scan directory for .cs files
      sourceFiles = this.#findCsFilesInDir(this.#projectPath);
    }

    for (const file of sourceFiles) {
      try {
        const absPath = resolve(projectRoot, file);
        const source = readFileSync(absPath, 'utf-8');
        const tree = this.#parser.parse(source);
        const relativePath = relative(projectRoot, absPath);
        modules.push(parseFileToModule(tree, relativePath));
      } catch (error) {
        diagnostics.push({
          severity: 'warning',
          category: 'parse',
          message: `Failed to parse ${file}: ${error instanceof Error ? error.message : String(error)}`,
          filePath: file,
        });
      }
    }

    return {
      modules,
      entryPoints: [entrypoint],
      projectRoot,
      diagnostics,
    };
  }

  #findCsFilesInDir(dir: string): string[] {
    const results: string[] = [];
    const excluded = new Set(['obj', 'bin', 'node_modules', '.git', '.vs']);

    const walk = (current: string): void => {
      let entries: import('node:fs').Dirent[];
      try {
        entries = readdirSync(current, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!excluded.has(entry.name)) {
            walk(join(current, entry.name));
          }
        } else if (entry.isFile() && entry.name.endsWith('.cs')) {
          results.push(join(current, entry.name));
        }
      }
    };
    walk(dir);
    return results;
  }
}
