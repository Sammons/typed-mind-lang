import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import type {
  ParsedClass,
  ParsedConstant,
  ParsedExport,
  ParsedFunction,
  ParsedImport,
  ParsedInterface,
  ParsedMethod,
  ParsedModule,
  ParsedParameter,
  ParsedProperty,
  ParsedTypeAlias,
  TypeScriptProjectAnalysis,
} from './types.ts';
import {
  createFilePath,
  isClass,
  isExportDeclaration,
  isFunction,
  isImportDeclaration,
  isInterface,
  isTypeAlias,
  isVariableStatement,
} from './types.ts';

export class TypeScriptAnalyzer {
  private program: ts.Program;
  private checker: ts.TypeChecker;

  private readonly projectPath: string;
  private readonly configPath?: string;

  constructor(projectPath: string, configPath?: string) {
    this.projectPath = projectPath;
    this.configPath = configPath;
    const configFilePath = this.resolveConfigPath();
    const { config, error } = this.loadTsConfig(configFilePath);

    if (error) {
      throw new Error(`Failed to load tsconfig.json: ${error.messageText}`);
    }

    const compilerOptions: ts.CompilerOptions = {
      ...config.compilerOptions,
      noEmit: true,
      skipLibCheck: true,
    };

    this.program = ts.createProgram(config.fileNames || [], compilerOptions);

    this.checker = this.program.getTypeChecker();
  }

  analyze(): TypeScriptProjectAnalysis {
    const sourceFiles = this.program.getSourceFiles().filter((file) => !file.isDeclarationFile && !file.fileName.includes('node_modules'));

    const modules = sourceFiles.map((file) => this.analyzeModule(file));
    const entryPoints = this.detectEntryPoints(modules);

    return {
      modules,
      entryPoints,
      projectConfig: this.program.getCompilerOptions(),
    } as const;
  }

  analyzeFromEntrypoint(absoluteEntryPath: string): TypeScriptProjectAnalysis {
    if (!fs.existsSync(absoluteEntryPath)) {
      throw new Error(`Entry point file not found: ${absoluteEntryPath}`);
    }

    // Traverse dependency graph starting from entrypoint
    const visitedModules = new Set<string>();
    const modules: ParsedModule[] = [];
    const traverseQueue: string[] = [absoluteEntryPath];

    while (traverseQueue.length > 0) {
      const currentPath = traverseQueue.shift()!;

      if (visitedModules.has(currentPath)) {
        continue;
      }

      visitedModules.add(currentPath);

      // Get the source file from the TypeScript program
      const sourceFile = this.program.getSourceFile(currentPath);
      if (!sourceFile || sourceFile.isDeclarationFile) {
        continue;
      }

      // Analyze this module
      const module = this.analyzeModule(sourceFile);
      modules.push(module);

      // Add imported modules to the traversal queue
      for (const importSpec of module.imports) {
        const resolvedPath = this.resolveImportPath(currentPath, importSpec.specifier);
        if (resolvedPath && !visitedModules.has(resolvedPath)) {
          traverseQueue.push(resolvedPath);
        }
      }

      // Add re-exported modules to the traversal queue
      // Re-exports (export { X } from './module') should also include the source modules
      for (const exportSpec of module.exports) {
        if (exportSpec.source) {
          const resolvedPath = this.resolveImportPath(currentPath, exportSpec.source);
          if (resolvedPath && !visitedModules.has(resolvedPath)) {
            traverseQueue.push(resolvedPath);
          }
        }
      }
    }

    return {
      modules,
      entryPoints: [createFilePath(absoluteEntryPath)],
      projectConfig: this.program.getCompilerOptions(),
    } as const;
  }

  private resolveConfigPath(): string {
    if (this.configPath) {
      return path.resolve(this.configPath);
    }

    const searchPath = path.resolve(this.projectPath);
    return ts.findConfigFile(searchPath, ts.sys.fileExists, 'tsconfig.json') || path.join(searchPath, 'tsconfig.json');
  }

  private loadTsConfig(configPath: string): { config: any; error?: ts.Diagnostic } {
    if (!fs.existsSync(configPath)) {
      return {
        config: {
          compilerOptions: ts.getDefaultCompilerOptions(),
          fileNames: this.getSourceFiles(this.projectPath),
        },
      };
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      return { config: {}, error: configFile.error };
    }

    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));

    return { config: parsedConfig };
  }

  private getSourceFiles(dir: string): string[] {
    const files: string[] = [];

    const traverse = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory() && entry.name !== 'node_modules') {
          traverse(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    };

    traverse(dir);
    return files;
  }

  private analyzeModule(sourceFile: ts.SourceFile): ParsedModule {
    const imports: ParsedImport[] = [];
    const exports: ParsedExport[] = [];
    const functions: ParsedFunction[] = [];
    const classes: ParsedClass[] = [];
    const interfaces: ParsedInterface[] = [];
    const types: ParsedTypeAlias[] = [];
    const constants: ParsedConstant[] = [];

    const visit = (node: ts.Node) => {
      if (isImportDeclaration(node)) {
        imports.push(this.parseImport(node));
      } else if (isExportDeclaration(node)) {
        exports.push(...this.parseExportDeclaration(node));
      } else if (isFunction(node)) {
        const func = this.parseFunction(node);
        functions.push(func);

        if (this.hasExportModifier(node)) {
          exports.push({
            name: func.name,
            isDefault: this.hasDefaultModifier(node),
            type: 'function',
            source: undefined,
          } as const);
        }
      } else if (isClass(node)) {
        const cls = this.parseClass(node);
        classes.push(cls);

        if (this.hasExportModifier(node)) {
          exports.push({
            name: cls.name,
            isDefault: this.hasDefaultModifier(node),
            type: 'class',
            source: undefined,
          } as const);
        }
      } else if (isInterface(node)) {
        const iface = this.parseInterface(node);
        interfaces.push(iface);

        if (this.hasExportModifier(node)) {
          exports.push({
            name: iface.name,
            isDefault: false,
            type: 'interface',
            source: undefined,
          } as const);
        }
      } else if (isTypeAlias(node)) {
        const typeAlias = this.parseTypeAlias(node);
        types.push(typeAlias);

        if (this.hasExportModifier(node)) {
          exports.push({
            name: typeAlias.name,
            isDefault: false,
            type: 'type',
            source: undefined,
          } as const);
        }
      } else if (isVariableStatement(node)) {
        const consts = this.parseVariableStatement(node);
        constants.push(...consts);

        if (this.hasExportModifier(node)) {
          for (const constant of consts) {
            exports.push({
              name: constant.name,
              isDefault: false,
              type: 'constant',
              source: undefined,
            } as const);
          }
        }
      } else if (ts.isEnumDeclaration(node)) {
        // Handle enums as constants
        const enumName = node.name.text;
        constants.push({
          name: enumName,
          type: 'enum',
          value: undefined,
          isEnum: true,
          enumValues: node.members.map((member) => {
            const name = member.name?.getText() || 'unknown';
            const value = member.initializer?.getText();
            return { name, value };
          }),
          isConst: false,
        });

        if (this.hasExportModifier(node)) {
          exports.push({
            name: enumName,
            isDefault: false,
            type: 'constant',
            source: undefined,
          } as const);
        }
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);

    return {
      filePath: createFilePath(sourceFile.fileName),
      imports,
      exports,
      functions,
      classes,
      interfaces,
      types,
      constants,
    } as const;
  }

  private parseImport(node: ts.ImportDeclaration): ParsedImport {
    const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
    const importClause = node.importClause;

    if (!importClause) {
      return {
        specifier,
        defaultImport: undefined,
        namedImports: [],
        namespaceImport: undefined,
        isTypeOnly: false,
      } as const;
    }

    const namedImports: string[] = [];
    let defaultImport: string | undefined;
    let namespaceImport: string | undefined;

    if (importClause.name) {
      defaultImport = importClause.name.text;
    }

    if (importClause.namedBindings) {
      if (ts.isNamespaceImport(importClause.namedBindings)) {
        namespaceImport = importClause.namedBindings.name.text;
      } else if (ts.isNamedImports(importClause.namedBindings)) {
        for (const element of importClause.namedBindings.elements) {
          namedImports.push(element.name.text);
        }
      }
    }

    return {
      specifier,
      defaultImport: defaultImport || undefined,
      namedImports,
      namespaceImport: namespaceImport || undefined,
      isTypeOnly: importClause.isTypeOnly || false,
    } as const;
  }

  private parseExportDeclaration(node: ts.ExportDeclaration): ParsedExport[] {
    const exports: ParsedExport[] = [];

    // Handle export * from 'module'
    if (!node.exportClause && node.moduleSpecifier) {
      // For export *, we don't know what's being exported
      // This will be resolved later by the import resolver
      return [];
    }

    // Handle export { name1, name2 } from 'module'
    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      const source = node.moduleSpecifier ? (node.moduleSpecifier as ts.StringLiteral).text : undefined;

      return node.exportClause.elements.map((element) => ({
        name: element.name.text,
        isDefault: false,
        type: this.inferExportType(element.name.text, source),
        source: source || undefined,
      }));
    }

    return exports;
  }

  private inferExportType(name: string, _source?: string): 'function' | 'class' | 'interface' | 'type' | 'constant' | 'variable' {
    // Try to infer the type based on naming conventions
    if (name.endsWith('Entity') || name.endsWith('DTO')) {
      return 'interface';
    }
    if (name.endsWith('Type') || name.endsWith('Types')) {
      return 'type';
    }
    if (name.match(/^[A-Z_][A-Z0-9_]*$/)) {
      // ALL_CAPS suggests constant
      return 'constant';
    }
    if (name.charAt(0) === name.charAt(0).toUpperCase()) {
      // PascalCase suggests class/interface
      return 'class';
    }
    return 'variable';
  }

  private parseFunction(node: ts.FunctionDeclaration): ParsedFunction {
    const name = node.name?.text || '<anonymous>';
    const parameters = this.parseParameters(node.parameters);
    const returnType = this.getTypeString(node.type);
    const isAsync = this.hasAsyncModifier(node);
    const decorators = this.parseDecorators(node);
    const signature = this.buildFunctionSignature(name, parameters, returnType, isAsync);
    const description = this.extractJSDocDescription(node);

    return {
      name,
      signature,
      parameters,
      returnType,
      isAsync,
      description: description || undefined,
      decorators,
    } as const;
  }

  private parseClass(node: ts.ClassDeclaration): ParsedClass {
    const name = node.name?.text || '<anonymous>';
    const isAbstract = this.hasAbstractModifier(node);
    const extendsClasses: string[] = [];
    const implementsInterfaces: string[] = [];
    const methods: ParsedMethod[] = [];
    const properties: ParsedProperty[] = [];
    const decorators = this.parseDecorators(node);
    const description = this.extractJSDocDescription(node);

    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          extendsClasses.push(...clause.types.map((type) => this.getTypeString(type)));
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          implementsInterfaces.push(...clause.types.map((type) => this.getTypeString(type)));
        }
      }
    }

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member)) {
        methods.push(this.parseMethod(member));
      } else if (ts.isPropertyDeclaration(member)) {
        properties.push(this.parseProperty(member));
      }
    }

    return {
      name,
      isAbstract,
      extends: extendsClasses,
      implements: implementsInterfaces,
      methods,
      properties,
      decorators,
      description: description || undefined,
    } as const;
  }

  private parseInterface(node: ts.InterfaceDeclaration): ParsedInterface {
    const name = node.name.text;
    const extendsInterfaces: string[] = [];
    const properties: ParsedProperty[] = [];
    const methods: ParsedMethod[] = [];
    const description = this.extractJSDocDescription(node);

    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          extendsInterfaces.push(...clause.types.map((type) => this.getTypeString(type)));
        }
      }
    }

    for (const member of node.members) {
      if (ts.isPropertySignature(member)) {
        const prop = this.parsePropertySignature(member);
        properties.push(prop);
      } else if (ts.isMethodSignature(member)) {
        const method = this.parseMethodSignature(member);
        methods.push(method);
      }
    }

    return {
      name,
      extends: extendsInterfaces,
      properties,
      methods,
      description: description || undefined,
    } as const;
  }

  private parseTypeAlias(node: ts.TypeAliasDeclaration): ParsedTypeAlias {
    const name = node.name.text;
    const type = this.getTypeString(node.type);
    const description = this.extractJSDocDescription(node);

    return {
      name,
      type,
      description: description || undefined,
    } as const;
  }

  private parseVariableStatement(node: ts.VariableStatement): ParsedConstant[] {
    const constants: ParsedConstant[] = [];

    for (const declaration of node.declarationList.declarations) {
      const name = declaration.name.getText();
      const type = this.getTypeString(declaration.type) || this.inferTypeFromInitializer(declaration.initializer);
      const value = declaration.initializer?.getText();
      const isEnum = false; // Will be handled separately for actual enums
      const isConst = !!(node.declarationList.flags & ts.NodeFlags.Const);

      constants.push({
        name,
        type,
        value: value || undefined,
        isEnum,
        enumValues: undefined,
        isConst,
      } as const);
    }

    return constants;
  }

  private inferTypeFromInitializer(initializer?: ts.Expression): string {
    if (!initializer) {
      return 'any';
    }

    switch (initializer.kind) {
      case ts.SyntaxKind.StringLiteral:
        return 'string';
      case ts.SyntaxKind.NumericLiteral:
        return 'number';
      case ts.SyntaxKind.TrueKeyword:
      case ts.SyntaxKind.FalseKeyword:
        return 'boolean';
      case ts.SyntaxKind.ObjectLiteralExpression:
        return 'object';
      case ts.SyntaxKind.ArrayLiteralExpression:
        return 'array';
      default:
        return 'any';
    }
  }

  private parseMethod(node: ts.MethodDeclaration): ParsedMethod {
    const name = (node.name as ts.Identifier).text;
    const parameters = this.parseParameters(node.parameters);
    const returnType = this.getTypeString(node.type);
    const isStatic = this.hasStaticModifier(node);
    const isPrivate = this.hasPrivateModifier(node);
    const isProtected = this.hasProtectedModifier(node);
    const isAbstract = this.hasAbstractModifier(node);
    const isAsync = this.hasAsyncModifier(node);
    const signature = this.buildFunctionSignature(name, parameters, returnType, isAsync);

    return {
      name,
      signature,
      isStatic,
      isPrivate,
      isProtected,
      isAbstract,
      parameters,
      returnType,
      isAsync,
    } as const;
  }

  private parseProperty(node: ts.PropertyDeclaration): ParsedProperty {
    const name = (node.name as ts.Identifier).text;
    const type = this.getTypeString(node.type);
    const isReadonly = this.hasReadonlyModifier(node);
    const isStatic = this.hasStaticModifier(node);
    const isPrivate = this.hasPrivateModifier(node);
    const isProtected = this.hasProtectedModifier(node);
    const isOptional = !!node.questionToken;

    return {
      name,
      type,
      isReadonly,
      isStatic,
      isPrivate,
      isProtected,
      isOptional,
    } as const;
  }

  private parsePropertySignature(node: ts.PropertySignature): ParsedProperty {
    const name = (node.name as ts.Identifier).text;
    const type = this.getTypeString(node.type);
    const isOptional = !!node.questionToken;

    return {
      name,
      type,
      isReadonly: false,
      isStatic: false,
      isPrivate: false,
      isProtected: false,
      isOptional,
    } as const;
  }

  private parseMethodSignature(node: ts.MethodSignature): ParsedMethod {
    const name = (node.name as ts.Identifier).text;
    const parameters = this.parseParameters(node.parameters);
    const returnType = this.getTypeString(node.type);
    const isAsync = false; // Method signatures don't have async modifier
    const signature = this.buildFunctionSignature(name, parameters, returnType, isAsync);

    return {
      name,
      signature,
      isStatic: false,
      isPrivate: false,
      isProtected: false,
      isAbstract: false,
      parameters,
      returnType,
      isAsync,
    } as const;
  }

  private parseParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): ParsedParameter[] {
    return parameters.map((param) => ({
      name: (param.name as ts.Identifier).text,
      type: this.getTypeString(param.type),
      isOptional: !!param.questionToken,
      hasDefaultValue: !!param.initializer,
    }));
  }

  private parseDecorators(node: ts.Node): string[] {
    const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
    if (!decorators) return [];

    return decorators.map((decorator) => {
      const expression = decorator.expression;
      return expression.getText();
    });
  }

  private buildFunctionSignature(name: string, parameters: readonly ParsedParameter[], returnType: string, isAsync: boolean): string {
    const paramStr = parameters.map((p) => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`).join(', ');

    const asyncPrefix = isAsync ? 'async ' : '';
    return `${asyncPrefix}${name}(${paramStr}) => ${returnType}`;
  }

  private getTypeString(typeNode: ts.TypeNode | undefined): string {
    if (!typeNode) return 'any';
    return typeNode.getText();
  }

  private hasExportModifier(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.ExportKeyword);
  }

  private hasDefaultModifier(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.DefaultKeyword);
  }

  private hasAsyncModifier(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.AsyncKeyword);
  }

  private hasAbstractModifier(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.AbstractKeyword);
  }

  private hasStaticModifier(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.StaticKeyword);
  }

  private hasPrivateModifier(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.PrivateKeyword);
  }

  private hasProtectedModifier(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.ProtectedKeyword);
  }

  private hasReadonlyModifier(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.ReadonlyKeyword);
  }

  private hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return modifiers?.some((modifier) => modifier.kind === kind) || false;
  }

  private extractJSDocDescription(node: ts.Node): string | undefined {
    const symbol = this.checker.getSymbolAtLocation(node);
    if (!symbol) return undefined;

    const jsDocTags = symbol.getJsDocTags();
    const descriptionTag = jsDocTags.find((tag) => tag.name === 'description');

    return (
      descriptionTag?.text?.map((text) => text.text).join('') ||
      symbol
        .getDocumentationComment(this.checker)
        .map((comment) => comment.text)
        .join('')
    );
  }

  private detectEntryPoints(modules: readonly ParsedModule[]): string[] {
    const entryPoints: string[] = [];

    // Look for files named index.ts, main.ts, app.ts, or server.ts
    const entryFilePatterns = ['index.ts', 'main.ts', 'app.ts', 'server.ts'];

    for (const module of modules) {
      const fileName = path.basename(module.filePath);
      if (entryFilePatterns.includes(fileName)) {
        entryPoints.push(module.filePath);
      }
    }

    // If no obvious entry points, look for files with main functions
    if (entryPoints.length === 0) {
      for (const module of modules) {
        const hasMainFunction = module.functions.some((fn) => fn.name === 'main' || fn.name === 'start' || fn.name === 'bootstrap');
        if (hasMainFunction) {
          entryPoints.push(module.filePath);
        }
      }
    }

    return entryPoints;
  }

  private resolveImportPath(fromPath: string, importSpecifier: string): string | null {
    // Skip external modules (not relative imports)
    if (!importSpecifier.startsWith('.')) {
      return null;
    }

    const fromDir = path.dirname(fromPath);
    const resolvedPath = path.resolve(fromDir, importSpecifier);

    // Try different extensions if the import doesn't have one
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    // First try exact match
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }

    // Try with extensions
    for (const ext of extensions) {
      const pathWithExt = resolvedPath + ext;
      if (fs.existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }

    // Try index files in directory
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
    }

    return null;
  }
}
