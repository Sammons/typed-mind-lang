import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
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
} from '@sammons/typed-mind-tree-sitter-common';
import { TreeSitterParser } from '@sammons/typed-mind-tree-sitter-common';
import type { Node } from 'web-tree-sitter';
import { resolveEntrypointFiles, resolveProject } from './python-project.ts';

const WASM_PATH = new URL('../grammar/tree-sitter-python.wasm', import.meta.url).pathname;

/** Names that indicate a class is a data-transfer type. */
const DTO_BASE_CLASSES = new Set(['BaseModel', 'TypedDict']);
const DTO_DECORATORS = new Set(['dataclass']);

/** Names that indicate a class is an enum. */
const ENUM_BASE_CLASSES = new Set(['Enum', 'IntEnum', 'StrEnum', 'Flag', 'IntFlag']);

/** Names that indicate a class is a protocol / interface. */
const PROTOCOL_BASE_CLASSES = new Set(['Protocol']);

/** Check whether an identifier is UPPERCASE (constant naming convention). */
const isUpperCase = (name: string): boolean => /^[A-Z][A-Z0-9_]*$/.test(name);

/** Extract the text of a type annotation node. */
const typeText = (node: Node | null | undefined): string => {
  if (!node) return '';
  return node.text;
};

/** Get the base classes from a class_definition's argument_list. */
const getBaseClasses = (classNode: Node): string[] => {
  const argList = classNode.children.find((c: Node) => c.type === 'argument_list');
  if (!argList) return [];
  return argList.namedChildren.filter((c: Node) => c.type === 'identifier' || c.type === 'attribute').map((c: Node) => c.text);
};

/** Get the class name identifier from a class_definition. */
const getClassName = (classNode: Node): string => {
  const nameNode = classNode.children.find((c: Node) => c.type === 'identifier');
  return nameNode?.text ?? '<anonymous>';
};

/** Get decorators from a decorated_definition node. */
const getDecorators = (decoratedNode: Node): string[] => {
  return decoratedNode.namedChildren
    .filter((c: Node) => c.type === 'decorator')
    .map((c: Node) => {
      // Decorator text includes the '@', strip it
      const inner = c.namedChildren[0];
      return inner?.text ?? c.text.slice(1);
    });
};

/** Extract parameters from a parameters node, stripping `self` and `cls`. */
const parseParameters = (paramsNode: Node | undefined): ParsedParameter[] => {
  if (!paramsNode) return [];
  const params: ParsedParameter[] = [];
  for (const child of paramsNode.namedChildren) {
    if (child.type === 'identifier') {
      const name = child.text;
      if (name === 'self' || name === 'cls') continue;
      params.push({ name, type: '', isOptional: false, hasDefaultValue: false });
    } else if (child.type === 'typed_parameter') {
      const splat = child.namedChildren.find((c: Node) => c.type === 'list_splat_pattern' || c.type === 'dictionary_splat_pattern');
      const nameNode = (splat ?? child).namedChildren.find((c: Node) => c.type === 'identifier');
      const typeNode = child.namedChildren.find((c: Node) => c.type === 'type');
      const name = nameNode?.text ?? '';
      if (name === 'self' || name === 'cls') continue;
      params.push({
        name,
        type: typeText(typeNode),
        isOptional: splat !== undefined,
        hasDefaultValue: false,
        ...(splat === undefined ? {} : { isRest: true }),
      });
    } else if (child.type === 'typed_default_parameter') {
      const nameNode = child.namedChildren.find((c: Node) => c.type === 'identifier');
      const typeNode = child.namedChildren.find((c: Node) => c.type === 'type');
      const name = nameNode?.text ?? '';
      if (name === 'self' || name === 'cls') continue;
      params.push({ name, type: typeText(typeNode), isOptional: true, hasDefaultValue: true });
    } else if (child.type === 'default_parameter') {
      const nameNode = child.namedChildren.find((c: Node) => c.type === 'identifier');
      const name = nameNode?.text ?? '';
      if (name === 'self' || name === 'cls') continue;
      params.push({ name, type: '', isOptional: true, hasDefaultValue: true });
    } else if (child.type === 'list_splat_pattern' || child.type === 'dictionary_splat_pattern') {
      const nameNode = child.namedChildren.find((c: Node) => c.type === 'identifier');
      const name = nameNode?.text ?? child.text;
      params.push({ name, type: '', isOptional: true, hasDefaultValue: false, isRest: true });
    }
  }
  return params;
};

/** Build a signature string from a function definition. */
const buildSignature = (funcNode: Node, name: string): string => {
  const paramsNode = funcNode.children.find((c: Node) => c.type === 'parameters');
  const returnTypeNode = funcNode.children.find((c: Node) => c.type === 'type');
  const isAsync = funcNode.children.some((c: Node) => c.type === 'async');

  const params = parseParameters(paramsNode);
  const paramStr = params.map((p) => (p.type ? `${p.name}: ${p.type}` : p.name)).join(', ');
  const returnStr = returnTypeNode ? ` -> ${returnTypeNode.text}` : '';
  const asyncStr = isAsync ? 'async ' : '';
  return `${asyncStr}${name}(${paramStr})${returnStr}`;
};

/** Parse a function_definition into a ParsedFunction. */
const parseFunction = (funcNode: Node, decorators: readonly string[]): ParsedFunction => {
  const nameNode = funcNode.children.find((c: Node) => c.type === 'identifier');
  const name = nameNode?.text ?? '<anonymous>';
  const paramsNode = funcNode.children.find((c: Node) => c.type === 'parameters');
  const returnTypeNode = funcNode.children.find((c: Node) => c.type === 'type');
  const isAsync = funcNode.children.some((c: Node) => c.type === 'async');

  return {
    name,
    signature: buildSignature(funcNode, name),
    parameters: parseParameters(paramsNode),
    returnType: typeText(returnTypeNode),
    isAsync,
    description: undefined,
    decorators: [...decorators],
  };
};

/** Parse a method within a class body. */
const parseMethod = (funcNode: Node, decorators: readonly string[]): ParsedMethod => {
  const nameNode = funcNode.children.find((c: Node) => c.type === 'identifier');
  const name = nameNode?.text ?? '<anonymous>';
  const paramsNode = funcNode.children.find((c: Node) => c.type === 'parameters');
  const returnTypeNode = funcNode.children.find((c: Node) => c.type === 'type');
  const isAsync = funcNode.children.some((c: Node) => c.type === 'async');

  const isStatic = decorators.includes('staticmethod');
  const isClassmethod = decorators.includes('classmethod');
  const isPrivate = name.startsWith('_') && !name.startsWith('__');
  const isAbstract = decorators.includes('abstractmethod') || decorators.includes('abc.abstractmethod');

  return {
    name,
    signature: buildSignature(funcNode, name),
    isStatic: isStatic || isClassmethod,
    isPrivate,
    isProtected: false,
    isAbstract,
    parameters: parseParameters(paramsNode),
    returnType: typeText(returnTypeNode),
    isAsync,
    accessorKind: decorators.includes('property') ? 'get' : undefined,
  };
};

/** Parse class properties from annotated assignments in the class body. */
const parseClassProperties = (blockNode: Node): ParsedProperty[] => {
  const properties: ParsedProperty[] = [];
  for (const stmt of blockNode.namedChildren) {
    if (stmt.type !== 'expression_statement') continue;
    const inner = stmt.namedChildren[0];
    if (inner?.type !== 'assignment') continue;

    const nameNode = inner.namedChildren.find((c: Node) => c.type === 'identifier');
    const typeNode = inner.namedChildren.find((c: Node) => c.type === 'type');
    if (!nameNode || !typeNode) continue;

    const name = nameNode.text;
    if (name.startsWith('__') && name.endsWith('__')) continue;

    properties.push({
      name,
      type: typeNode.text,
      isReadonly: false,
      isStatic: false,
      isPrivate: name.startsWith('_') && !name.startsWith('__'),
      isProtected: false,
      isOptional: false,
    });
  }
  return properties;
};

/** Parse enum members from a class body. */
const parseEnumMembers = (blockNode: Node): string[] => {
  const members: string[] = [];
  for (const stmt of blockNode.namedChildren) {
    if (stmt.type !== 'expression_statement') continue;
    const inner = stmt.namedChildren[0];
    if (inner?.type !== 'assignment') continue;
    const nameNode = inner.children.find((c: Node) => c.type === 'identifier' && c.isNamed);
    if (nameNode) members.push(nameNode.text);
  }
  return members;
};

/** Parse __all__ from an assignment: `__all__ = ["Name1", "Name2"]`. */
const parseAllExports = (node: Node): string[] | undefined => {
  if (node.type !== 'assignment') return undefined;
  const nameNode = node.children.find((c: Node) => c.type === 'identifier');
  if (nameNode?.text !== '__all__') return undefined;

  const listNode = node.children.find((c: Node) => c.type === 'list');
  if (!listNode) return undefined;

  return listNode.namedChildren
    .filter((c: Node) => c.type === 'string')
    .map((c: Node) => {
      const text = c.text;
      if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        return text.slice(1, -1);
      }
      return text;
    });
};

/** Parse a single Python module. */
const parseModule = (parser: TreeSitterParser, filePath: string, projectRoot: string): ParsedModule => {
  const content = readFileSync(resolve(projectRoot, filePath), 'utf-8');
  const tree = parser.parse(content);
  const root = tree.rootNode;

  const imports: ParsedImport[] = [];
  const exports: ParsedExport[] = [];
  const functions: ParsedFunction[] = [];
  const classes: ParsedClass[] = [];
  const interfaces: ParsedInterface[] = [];
  const types: ParsedTypeAlias[] = [];
  const constants: ParsedConstant[] = [];
  const enums: ParsedEnum[] = [];

  let allExports: string[] | undefined;

  const processClassDefinition = (classNode: Node, decorators: readonly string[]) => {
    const name = getClassName(classNode);
    const baseClasses = getBaseClasses(classNode);
    const blockNode = classNode.children.find((c: Node) => c.type === 'block');

    // Enum
    if (baseClasses.some((base) => ENUM_BASE_CLASSES.has(base))) {
      const members = blockNode ? parseEnumMembers(blockNode) : [];
      enums.push({ name, members, description: undefined });
      return;
    }

    // Protocol (interface)
    if (baseClasses.some((base) => PROTOCOL_BASE_CLASSES.has(base))) {
      const methods: ParsedMethod[] = [];
      const properties = blockNode ? parseClassProperties(blockNode) : [];
      if (blockNode) {
        for (const child of blockNode.namedChildren) {
          if (child.type === 'function_definition') {
            methods.push(parseMethod(child, []));
          } else if (child.type === 'decorated_definition') {
            const decs = getDecorators(child);
            const funcDef = child.namedChildren.find((c: Node) => c.type === 'function_definition');
            if (funcDef) methods.push(parseMethod(funcDef, decs));
          }
        }
      }
      interfaces.push({
        name,
        extends: baseClasses.filter((b) => !PROTOCOL_BASE_CLASSES.has(b)),
        properties,
        methods,
        description: undefined,
      });
      return;
    }

    // Regular class or DTO
    const methods: ParsedMethod[] = [];
    const properties = blockNode ? parseClassProperties(blockNode) : [];

    if (blockNode) {
      for (const child of blockNode.namedChildren) {
        if (child.type === 'function_definition') {
          methods.push(parseMethod(child, []));
        } else if (child.type === 'decorated_definition') {
          const decs = getDecorators(child);
          const funcDef = child.namedChildren.find((c: Node) => c.type === 'function_definition');
          if (funcDef) methods.push(parseMethod(funcDef, decs));
        }
      }
    }

    const isDto = decorators.some((d) => DTO_DECORATORS.has(d)) || baseClasses.some((base) => DTO_BASE_CLASSES.has(base));

    const extendsClasses = baseClasses.filter(
      (b) => !DTO_BASE_CLASSES.has(b) && !PROTOCOL_BASE_CLASSES.has(b) && !ENUM_BASE_CLASSES.has(b) && b !== 'object',
    );

    classes.push({
      name,
      isAbstract: decorators.includes('abstractmethod') || decorators.includes('ABC'),
      extends: extendsClasses,
      implements: [],
      methods,
      properties,
      decorators: [...decorators],
      description: isDto ? 'dataclass' : undefined,
    });
  };

  for (const child of root.namedChildren) {
    switch (child.type) {
      case 'import_statement': {
        const names = child.namedChildren.filter((c: Node) => c.type === 'dotted_name' || c.type === 'aliased_import');
        for (const nameNode of names) {
          const specifier = nameNode.type === 'aliased_import' ? (nameNode.namedChildren[0]?.text ?? '') : nameNode.text;
          imports.push({
            specifier,
            defaultImport: undefined,
            namedImports: [specifier],
            namespaceImport: undefined,
            isTypeOnly: false,
          });
        }
        break;
      }
      case 'import_from_statement': {
        const moduleNode = child.namedChildren.find((c: Node) => c.type === 'dotted_name' || c.type === 'relative_import');
        const specifier = moduleNode?.text ?? '';
        const importedNames = child.namedChildren
          .filter((c: Node) => (c.type === 'dotted_name' || c.type === 'aliased_import') && c !== moduleNode)
          .map((c: Node) => (c.type === 'aliased_import' ? (c.namedChildren[0]?.text ?? '') : c.text));

        const hasWildcard = child.children.some((c: Node) => c.type === 'wildcard_import');

        imports.push({
          specifier,
          defaultImport: undefined,
          namedImports: hasWildcard ? ['*'] : importedNames,
          namespaceImport: hasWildcard ? '*' : undefined,
          isTypeOnly: false,
        });
        break;
      }
      case 'function_definition': {
        functions.push(parseFunction(child, []));
        break;
      }
      case 'decorated_definition': {
        const decorators = getDecorators(child);
        const innerDef = child.namedChildren.find((c: Node) => c.type === 'class_definition' || c.type === 'function_definition');
        if (innerDef?.type === 'class_definition') {
          processClassDefinition(innerDef, decorators);
        } else if (innerDef?.type === 'function_definition') {
          functions.push(parseFunction(innerDef, decorators));
        }
        break;
      }
      case 'class_definition': {
        processClassDefinition(child, []);
        break;
      }
      case 'expression_statement': {
        const inner = child.namedChildren[0];
        if (!inner) break;

        if (inner.type === 'assignment') {
          const allExportsList = parseAllExports(inner);
          if (allExportsList) {
            allExports = allExportsList;
            break;
          }

          const constNameNode = inner.children.find((c: Node) => c.type === 'identifier' && c.isNamed);
          const constTypeNode = inner.children.find((c: Node) => c.type === 'type');
          if (constNameNode && isUpperCase(constNameNode.text)) {
            const eqIndex = inner.children.findIndex((c: Node) => c.type === '=');
            const valueNode = eqIndex >= 0 ? inner.children[eqIndex + 1] : undefined;
            constants.push({
              name: constNameNode.text,
              type: typeText(constTypeNode),
              value: valueNode?.text,
            });
          }
        }
        break;
      }
      case 'type_alias_statement': {
        const typeChildren = child.namedChildren.filter((c: Node) => c.type === 'type');
        const nameType = typeChildren[0];
        const valueType = typeChildren[1];
        if (nameType) {
          types.push({
            name: nameType.text,
            type: valueType?.text ?? '',
            description: undefined,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  // Build exports from __all__ or from top-level definitions
  if (allExports) {
    for (const name of allExports) {
      const fn = functions.find((f) => f.name === name);
      const cls = classes.find((c) => c.name === name);
      const iface = interfaces.find((i) => i.name === name);
      const en = enums.find((e) => e.name === name);
      const tp = types.find((t) => t.name === name);
      const cn = constants.find((c) => c.name === name);

      let type: ParsedExport['type'] = 'variable';
      if (fn) type = 'function';
      else if (cls) type = 'class';
      else if (iface) type = 'interface';
      else if (en) type = 'enum';
      else if (tp) type = 'type';
      else if (cn) type = 'constant';

      exports.push({ name, isDefault: false, type, source: undefined });
    }
  } else {
    for (const fn of functions) {
      if (!fn.name.startsWith('_')) {
        exports.push({ name: fn.name, isDefault: false, type: 'function', source: undefined });
      }
    }
    for (const cls of classes) {
      if (!cls.name.startsWith('_')) {
        exports.push({ name: cls.name, isDefault: false, type: 'class', source: undefined });
      }
    }
    for (const iface of interfaces) {
      if (!iface.name.startsWith('_')) {
        exports.push({ name: iface.name, isDefault: false, type: 'interface', source: undefined });
      }
    }
    for (const en of enums) {
      if (!en.name.startsWith('_')) {
        exports.push({ name: en.name, isDefault: false, type: 'enum', source: undefined });
      }
    }
    for (const tp of types) {
      if (!tp.name.startsWith('_')) {
        exports.push({ name: tp.name, isDefault: false, type: 'type', source: undefined });
      }
    }
    for (const cn of constants) {
      if (!cn.name.startsWith('_')) {
        exports.push({ name: cn.name, isDefault: false, type: 'constant', source: undefined });
      }
    }
  }

  return { filePath, imports, exports, functions, classes, interfaces, types, constants, enums };
};

export class PythonAnalyzer implements Analyzer {
  readonly #projectPath: string;
  #parser: TreeSitterParser | undefined;

  constructor(projectPath: string, _configPath?: string) {
    this.#projectPath = resolve(projectPath);
  }

  static async create(projectPath: string, configPath?: string): Promise<PythonAnalyzer> {
    const analyzer = new PythonAnalyzer(projectPath, configPath);
    analyzer.#parser = await TreeSitterParser.create(WASM_PATH);
    return analyzer;
  }

  async #ensureParser(): Promise<TreeSitterParser> {
    if (!this.#parser) {
      this.#parser = await TreeSitterParser.create(WASM_PATH);
    }
    return this.#parser;
  }

  analyzeFromEntrypoint(entrypoint: string): ProjectAnalysis {
    if (!this.#parser) {
      throw new Error('PythonAnalyzer requires async WASM initialization. Call PythonAnalyzer.create() first.');
    }
    return this.#analyzeWithParser(this.#parser, entrypoint);
  }

  async analyzeFromEntrypointAsync(entrypoint: string): Promise<ProjectAnalysis> {
    const parser = await this.#ensureParser();
    return this.#analyzeWithParser(parser, entrypoint);
  }

  #analyzeWithParser(parser: TreeSitterParser, entrypoint: string): ProjectAnalysis {
    const projectInfo = resolveProject(this.#projectPath);
    const diagnostics: AnalyzerDiagnostic[] = [];

    let filesToAnalyze: string[];
    try {
      filesToAnalyze = [...resolveEntrypointFiles(this.#projectPath, entrypoint)];
    } catch {
      filesToAnalyze = [...projectInfo.pythonFiles];
      diagnostics.push({
        severity: 'warning',
        category: 'entrypoint',
        message: 'Could not resolve entrypoint imports; analyzing all Python files',
        filePath: entrypoint,
      });
    }

    if (filesToAnalyze.length === 0) {
      filesToAnalyze = [...projectInfo.pythonFiles];
    }

    const modules: ParsedModule[] = [];
    for (const filePath of filesToAnalyze) {
      try {
        modules.push(parseModule(parser, filePath, this.#projectPath));
      } catch (error) {
        diagnostics.push({
          severity: 'error',
          category: 'parse',
          message: `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
          filePath,
        });
      }
    }

    const entryPoints = [relative(this.#projectPath, resolve(this.#projectPath, entrypoint))];

    return {
      modules,
      entryPoints,
      projectRoot: this.#projectPath,
      diagnostics,
    };
  }
}
