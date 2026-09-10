import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import {
  type Analyzer,
  type AnalyzerDiagnostic,
  type ParsedClass,
  type ParsedEnum,
  type ParsedExport,
  type ParsedFunction,
  type ParsedImport,
  type ParsedInterface,
  type ParsedMethod,
  type ParsedModule,
  type ParsedParameter,
  type ParsedProperty,
  type ParsedTypeAlias,
  type ProjectAnalysis,
  TreeSitterParser,
} from '@sammons/typed-mind-tree-sitter-common';
import type TreeSitterModule from 'web-tree-sitter';
import type { Tree } from 'web-tree-sitter';
import { discoverJavaFiles, parseProjectConfig } from './java-project.ts';

type SyntaxNode = TreeSitterModule.Node;

const WASM_PATH = new URL('../grammar/tree-sitter-java.wasm', import.meta.url).pathname;

const textOf = (node: SyntaxNode | null | undefined): string => {
  if (node === null || node === undefined) return '';
  return node.text;
};

const findChild = (node: SyntaxNode, type: string): SyntaxNode | undefined =>
  node.children.find((child: SyntaxNode) => child.type === type) ?? undefined;

const findChildren = (node: SyntaxNode, type: string): SyntaxNode[] => node.children.filter((child: SyntaxNode) => child.type === type);

const VALID_MODIFIERS = new Set([
  'public',
  'private',
  'protected',
  'static',
  'abstract',
  'final',
  'default',
  'synchronized',
  'native',
  'transient',
  'volatile',
]);

const extractModifiers = (node: SyntaxNode): string[] => {
  const modifiers = findChild(node, 'modifiers');
  if (modifiers === undefined) return [];
  return modifiers.children.map((child: SyntaxNode) => child.text).filter((text: string) => VALID_MODIFIERS.has(text));
};

const extractAnnotations = (node: SyntaxNode): string[] => {
  const modifiers = findChild(node, 'modifiers');
  if (modifiers === undefined) return [];
  return modifiers.children
    .filter((child: SyntaxNode) => child.type === 'annotation' || child.type === 'marker_annotation')
    .map((child: SyntaxNode) => child.text);
};

const extractTypeParameters = (node: SyntaxNode): string => {
  const typeParams = findChild(node, 'type_parameters');
  if (typeParams === undefined) return '';
  return typeParams.text;
};

const TYPE_NODE_TYPES = new Set([
  'type_identifier',
  'generic_type',
  'array_type',
  'integral_type',
  'floating_point_type',
  'boolean_type',
  'void_type',
  'scoped_type_identifier',
]);

const findTypeChild = (node: SyntaxNode): SyntaxNode | undefined =>
  node.children.find((child: SyntaxNode) => TYPE_NODE_TYPES.has(child.type)) ?? undefined;

const extractParameters = (params: SyntaxNode | undefined): ParsedParameter[] => {
  if (params === undefined) return [];
  const result: ParsedParameter[] = [];
  for (const child of params.children) {
    if (child.type === 'formal_parameter' || child.type === 'spread_parameter') {
      const typeNode = findTypeChild(child);
      const nameNode = findChild(child, 'identifier');
      result.push({
        name: textOf(nameNode),
        type: textOf(typeNode),
        isOptional: false,
        hasDefaultValue: false,
        isRest: child.type === 'spread_parameter',
      });
    }
  }
  return result;
};

const extractReturnType = (node: SyntaxNode): string => {
  for (const child of node.children) {
    if (TYPE_NODE_TYPES.has(child.type)) {
      return child.text;
    }
  }
  return 'void';
};

const parseMethod = (node: SyntaxNode): ParsedMethod => {
  const modifiers = extractModifiers(node);
  const nameNode = findChild(node, 'identifier');
  const formalParams = findChild(node, 'formal_parameters');
  const returnType = node.type === 'constructor_declaration' ? '' : extractReturnType(node);
  const typeParams = extractTypeParameters(node);
  const params = extractParameters(formalParams);

  const name = textOf(nameNode);
  const paramStr = params.map((p) => `${p.type} ${p.name}`).join(', ');
  const signature = node.type === 'constructor_declaration' ? `${name}(${paramStr})` : `${returnType} ${name}(${paramStr})`;

  return {
    name,
    signature: typeParams.length > 0 ? `${typeParams} ${signature}` : signature,
    isStatic: modifiers.includes('static'),
    isPrivate: modifiers.includes('private'),
    isProtected: modifiers.includes('protected'),
    isAbstract: modifiers.includes('abstract') || modifiers.includes('native'),
    parameters: params,
    returnType,
    isAsync: false,
    accessorKind: undefined,
  };
};

const parseProperty = (node: SyntaxNode): ParsedProperty[] => {
  const modifiers = extractModifiers(node);
  const typeNode = findTypeChild(node);
  const type = textOf(typeNode);

  const declarators = findChildren(node, 'variable_declarator');
  return declarators.map((declarator: SyntaxNode) => {
    const nameNode = findChild(declarator, 'identifier');
    return {
      name: textOf(nameNode),
      type,
      isReadonly: modifiers.includes('final'),
      isStatic: modifiers.includes('static'),
      isPrivate: modifiers.includes('private'),
      isProtected: modifiers.includes('protected'),
      isOptional: false,
    };
  });
};

const parseClassDeclaration = (node: SyntaxNode): ParsedClass => {
  const modifiers = extractModifiers(node);
  const nameNode = findChild(node, 'identifier');
  const name = textOf(nameNode);
  const body = findChild(node, 'class_body');
  const typeParams = extractTypeParameters(node);

  // Extends
  const superclass = findChild(node, 'superclass');
  const extendsNames: string[] = [];
  if (superclass !== undefined) {
    const typeId = findChild(superclass, 'type_identifier') ?? findChild(superclass, 'generic_type');
    if (typeId !== undefined) {
      const baseName = typeId.type === 'generic_type' ? textOf(findChild(typeId, 'type_identifier')) : typeId.text;
      extendsNames.push(baseName);
    }
  }

  // Implements
  const superInterfaces = findChild(node, 'super_interfaces');
  const implementsNames: string[] = [];
  if (superInterfaces !== undefined) {
    const typeList = findChild(superInterfaces, 'type_list');
    if (typeList !== undefined) {
      for (const child of typeList.children) {
        if (child.type === 'type_identifier' || child.type === 'generic_type') {
          const base = child.type === 'generic_type' ? textOf(findChild(child, 'type_identifier')) : child.text;
          implementsNames.push(base);
        }
      }
    }
  }

  const methods: ParsedMethod[] = [];
  const properties: ParsedProperty[] = [];
  const decorators = extractAnnotations(node);
  const description = extractComment(node) ?? undefined;

  if (body !== undefined) {
    for (const child of body.children) {
      if (child.type === 'method_declaration') {
        methods.push(parseMethod(child));
      } else if (child.type === 'constructor_declaration') {
        methods.push(parseMethod(child));
      } else if (child.type === 'field_declaration') {
        properties.push(...parseProperty(child));
      }
    }
  }

  return {
    name: typeParams.length > 0 ? `${name}${typeParams}` : name,
    isAbstract: modifiers.includes('abstract'),
    extends: extendsNames,
    implements: implementsNames,
    methods,
    properties,
    decorators,
    description,
  };
};

const parseRecordDeclaration = (node: SyntaxNode): ParsedClass => {
  const nameNode = findChild(node, 'identifier');
  const name = textOf(nameNode);
  const typeParams = extractTypeParameters(node);
  const decorators = extractAnnotations(node);
  const description = extractComment(node) ?? undefined;

  const recordComponents = findChild(node, 'formal_parameters');
  const properties: ParsedProperty[] = [];
  if (recordComponents !== undefined) {
    for (const child of recordComponents.children) {
      if (child.type === 'formal_parameter') {
        const typeNode = findTypeChild(child);
        const idNode = findChild(child, 'identifier');
        properties.push({
          name: textOf(idNode),
          type: textOf(typeNode),
          isReadonly: true,
          isStatic: false,
          isPrivate: false,
          isProtected: false,
          isOptional: false,
        });
      }
    }
  }

  // Implements
  const superInterfaces = findChild(node, 'super_interfaces');
  const implementsNames: string[] = [];
  if (superInterfaces !== undefined) {
    const typeList = findChild(superInterfaces, 'type_list');
    if (typeList !== undefined) {
      for (const child of typeList.children) {
        if (child.type === 'type_identifier' || child.type === 'generic_type') {
          const base = child.type === 'generic_type' ? textOf(findChild(child, 'type_identifier')) : child.text;
          implementsNames.push(base);
        }
      }
    }
  }

  const body = findChild(node, 'class_body');
  const methods: ParsedMethod[] = [];
  if (body !== undefined) {
    for (const child of body.children) {
      if (child.type === 'method_declaration') {
        methods.push(parseMethod(child));
      }
    }
  }

  return {
    name: typeParams.length > 0 ? `${name}${typeParams}` : name,
    isAbstract: false,
    extends: [],
    implements: implementsNames,
    methods,
    properties,
    decorators,
    description,
  };
};

const parseInterfaceDeclaration = (node: SyntaxNode): ParsedInterface => {
  const nameNode = findChild(node, 'identifier');
  const name = textOf(nameNode);
  const typeParams = extractTypeParameters(node);
  const description = extractComment(node) ?? undefined;

  const extendsInterfaces = findChild(node, 'extends_interfaces');
  const extendsNames: string[] = [];
  if (extendsInterfaces !== undefined) {
    const typeList = findChild(extendsInterfaces, 'type_list');
    if (typeList !== undefined) {
      for (const child of typeList.children) {
        if (child.type === 'type_identifier' || child.type === 'generic_type') {
          const base = child.type === 'generic_type' ? textOf(findChild(child, 'type_identifier')) : child.text;
          extendsNames.push(base);
        }
      }
    }
  }

  const body = findChild(node, 'interface_body');
  const methods: ParsedMethod[] = [];
  const properties: ParsedProperty[] = [];
  if (body !== undefined) {
    for (const child of body.children) {
      if (child.type === 'method_declaration') {
        methods.push(parseMethod(child));
      } else if (child.type === 'constant_declaration') {
        properties.push(...parseProperty(child));
      }
    }
  }

  return {
    name: typeParams.length > 0 ? `${name}${typeParams}` : name,
    extends: extendsNames,
    properties,
    methods,
    description,
  };
};

const parseEnumDeclaration = (node: SyntaxNode): ParsedEnum => {
  const nameNode = findChild(node, 'identifier');
  const name = textOf(nameNode);
  const description = extractComment(node) ?? undefined;

  const body = findChild(node, 'enum_body');
  const members: string[] = [];
  if (body !== undefined) {
    const constants = findChildren(body, 'enum_constant');
    for (const constant of constants) {
      const constName = findChild(constant, 'identifier');
      if (constName !== undefined) {
        members.push(constName.text);
      }
    }
  }

  return { name, members, description };
};

const extractComment = (node: SyntaxNode): string | undefined => {
  let prev = node.previousNamedSibling;
  while (prev !== null && (prev.type === 'annotation' || prev.type === 'marker_annotation')) {
    prev = prev.previousNamedSibling;
  }
  if (prev !== null && (prev.type === 'block_comment' || prev.type === 'line_comment')) {
    return prev.text;
  }
  return undefined;
};

export class JavaAnalyzer implements Analyzer {
  readonly #projectPath: string;
  readonly #configPath: string | undefined;
  #parser: TreeSitterParser | undefined;

  constructor(projectPath: string, configPath?: string) {
    this.#projectPath = resolve(projectPath);
    this.#configPath = configPath;
  }

  #parseFile(parser: TreeSitterParser, filePath: string): ParsedModule {
    const source = readFileSync(filePath, 'utf-8');
    const tree: Tree = parser.parse(source);
    const rootNode = tree.rootNode;

    const imports: ParsedImport[] = [];
    const exports: ParsedExport[] = [];
    const functions: ParsedFunction[] = [];
    const classes: ParsedClass[] = [];
    const interfaces: ParsedInterface[] = [];
    const types: ParsedTypeAlias[] = [];
    const enums: ParsedEnum[] = [];

    for (const child of rootNode.children) {
      if (child.type === 'import_declaration') {
        const scopedId = findChild(child, 'scoped_identifier') ?? findChild(child, 'identifier');
        const importPath = textOf(scopedId);
        const isWildcard = child.children.some((c: SyntaxNode) => c.text === '*');
        const segments = importPath.split('.');
        const lastSegment = segments.at(-1) ?? '';
        const packagePart = segments.slice(0, -1).join('.');

        imports.push({
          specifier: isWildcard ? `${importPath}.*` : importPath,
          defaultImport: undefined,
          namedImports: isWildcard ? [] : [lastSegment],
          namespaceImport: isWildcard ? packagePart : undefined,
          isTypeOnly: false,
        });
      } else if (child.type === 'class_declaration') {
        const cls = parseClassDeclaration(child);
        classes.push(cls);
        const modifiers = extractModifiers(child);
        if (modifiers.includes('public')) {
          exports.push({ name: cls.name, isDefault: false, type: 'class', source: undefined });
        }
        processNestedDeclarations(child, classes, interfaces, enums);
      } else if (child.type === 'record_declaration') {
        const record = parseRecordDeclaration(child);
        classes.push(record);
        const modifiers = extractModifiers(child);
        if (modifiers.includes('public')) {
          exports.push({ name: record.name, isDefault: false, type: 'class', source: undefined });
        }
      } else if (child.type === 'interface_declaration') {
        const iface = parseInterfaceDeclaration(child);
        interfaces.push(iface);
        const modifiers = extractModifiers(child);
        if (modifiers.includes('public')) {
          exports.push({ name: iface.name, isDefault: false, type: 'interface', source: undefined });
        }
        processNestedDeclarations(child, classes, interfaces, enums);
      } else if (child.type === 'enum_declaration') {
        const enumDecl = parseEnumDeclaration(child);
        enums.push(enumDecl);
        const modifiers = extractModifiers(child);
        if (modifiers.includes('public')) {
          exports.push({ name: enumDecl.name, isDefault: false, type: 'enum', source: undefined });
        }
      }
    }

    return {
      filePath: relative(this.#projectPath, filePath),
      imports,
      exports,
      functions,
      classes,
      interfaces,
      types,
      constants: [],
      enums,
    };
  }

  analyzeFromEntrypoint(entrypoint: string): ProjectAnalysis {
    const config = parseProjectConfig(this.#projectPath, this.#configPath);
    const javaFiles = discoverJavaFiles(this.#projectPath, config.sourceDirectories);
    const resolvedEntrypoint = resolve(this.#projectPath, entrypoint);

    const diagnostics: AnalyzerDiagnostic[] = [];
    const modules: ParsedModule[] = [];

    if (this.#parser === undefined) {
      diagnostics.push({
        severity: 'error',
        category: 'analyzer',
        message: 'Parser not initialized. Use JavaAnalyzer.create() factory method.',
        filePath: undefined,
      });
      return {
        modules,
        entryPoints: [relative(this.#projectPath, resolvedEntrypoint)],
        projectRoot: this.#projectPath,
        diagnostics,
      };
    }

    for (const filePath of javaFiles) {
      try {
        const mod = this.#parseFile(this.#parser, filePath);
        modules.push(mod);
      } catch (err) {
        diagnostics.push({
          severity: 'warning',
          category: 'parse',
          message: `Failed to parse ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
          filePath,
        });
      }
    }

    return {
      modules,
      entryPoints: [relative(this.#projectPath, resolvedEntrypoint)],
      projectRoot: this.#projectPath,
      diagnostics,
    };
  }

  static async create(projectPath: string, configPath?: string): Promise<JavaAnalyzer> {
    const analyzer = new JavaAnalyzer(projectPath, configPath);
    analyzer.#parser = await TreeSitterParser.create(WASM_PATH);
    return analyzer;
  }
}

const processNestedDeclarations = (
  parentNode: SyntaxNode,
  classes: ParsedClass[],
  interfaces: ParsedInterface[],
  enums: ParsedEnum[],
): void => {
  const body = findChild(parentNode, 'class_body') ?? findChild(parentNode, 'interface_body');
  if (body === undefined) return;
  for (const child of body.children) {
    if (child.type === 'class_declaration') {
      classes.push(parseClassDeclaration(child));
    } else if (child.type === 'interface_declaration') {
      interfaces.push(parseInterfaceDeclaration(child));
    } else if (child.type === 'enum_declaration') {
      enums.push(parseEnumDeclaration(child));
    } else if (child.type === 'record_declaration') {
      classes.push(parseRecordDeclaration(child));
    }
  }
};
