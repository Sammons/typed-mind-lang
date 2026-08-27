import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import type {
  AnalyzerDiagnostic,
  ModuleGraphEdge,
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
import { createFilePath, isClass, isExportDeclaration, isFunction, isInterface, isTypeAlias, isVariableStatement } from './types.ts';

// X-AN-1 — resolution outcome for one specifier, resolved via
// `ts.resolveModuleName` against the union program's own compiler options.
// Replaces the hand-rolled `fs.existsSync` probing entirely: no
// `startsWith('.')` guard anywhere in this resolution path (the RFC's
// negative check), so `paths`-aliased and NodeNext `.js`-suffixed
// specifiers resolve through the same call as everything else.
interface ResolutionOutcome {
  readonly resolvedPath: string | undefined;
  readonly classification: 'internal' | 'external' | 'unresolved';
}

// A parse-config-file host that reads from the real filesystem and reports
// diagnostics into an accumulator rather than to stderr, since a broken
// referenced tsconfig should surface as an AnalyzerDiagnostic, not a
// console line the caller can't see.
class CollectingParseConfigHost implements ts.ParseConfigFileHost {
  useCaseSensitiveFileNames = ts.sys.useCaseSensitiveFileNames;
  readonly diagnostics: ts.Diagnostic[] = [];

  readDirectory = ts.sys.readDirectory;
  fileExists = ts.sys.fileExists;
  readFile = ts.sys.readFile;

  getCurrentDirectory(): string {
    return ts.sys.getCurrentDirectory();
  }

  onUnRecoverableConfigFileDiagnostic(diagnostic: ts.Diagnostic): void {
    this.diagnostics.push(diagnostic);
  }
}

export class TypeScriptAnalyzer {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private compilerOptions: ts.CompilerOptions;
  private readonly moduleResolutionCache: ts.ModuleResolutionCache;
  private readonly diagnostics: AnalyzerDiagnostic[] = [];
  private readonly moduleGraph: ModuleGraphEdge[] = [];

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

    // X-AN-1 — config-graph union program: `ts.resolveModuleName` can only
    // resolve into files the program already knows about, and passing
    // `projectReferences` to `ts.createProgram` attaches reference metadata
    // WITHOUT pulling the referenced projects' sources into the program's
    // file set (RFC-TM-9 §1, Rejected Alternatives — this was the r2 review
    // finding, not an assumption). So: starting from the target tsconfig,
    // recursively parse each referenced tsconfig via
    // `ts.getParsedCommandLineOfConfigFile`, union the `fileNames` across
    // the reference graph (visited-set on config paths, cycle-safe), and
    // build one `ts.createProgram` over the union with a shared compiler
    // host. `composite: true` on referenced configs is honored as parsed.
    const unionFileNames = this.unionFileNamesAcrossReferences(configFilePath, config.fileNames || [], config.projectReferences);

    this.compilerOptions = compilerOptions;
    this.program = ts.createProgram(unionFileNames, compilerOptions);
    this.checker = this.program.getTypeChecker();
    this.moduleResolutionCache = ts.createModuleResolutionCache(ts.sys.getCurrentDirectory(), (fileName) => fileName, compilerOptions);
  }

  // Recursively walks `references` in each parsed tsconfig, unioning every
  // reachable project's `fileNames` into one flat list. `visitedConfigs` is
  // keyed by the resolved absolute config path so a reference cycle (two
  // packages referencing each other) terminates instead of looping.
  private unionFileNamesAcrossReferences(
    rootConfigPath: string,
    rootFileNames: readonly string[],
    rootReferences: readonly ts.ProjectReference[] | undefined,
    visitedConfigs: Set<string> = new Set(),
  ): string[] {
    const normalizedRoot = path.resolve(rootConfigPath);
    if (visitedConfigs.has(normalizedRoot)) {
      return [];
    }
    visitedConfigs.add(normalizedRoot);

    const union = new Set<string>(rootFileNames);

    for (const reference of rootReferences || []) {
      const referencedConfigPath = this.resolveProjectReferencePath(reference.path, path.dirname(normalizedRoot));
      if (!referencedConfigPath || visitedConfigs.has(path.resolve(referencedConfigPath))) {
        continue;
      }

      const host = new CollectingParseConfigHost();
      const parsed = ts.getParsedCommandLineOfConfigFile(referencedConfigPath, undefined, host);

      if (!parsed) {
        this.diagnostics.push({
          severity: 'warning',
          category: 'skipped-module',
          message: `Failed to parse referenced tsconfig: ${referencedConfigPath}`,
          filePath: referencedConfigPath,
          specifier: undefined,
        });
        continue;
      }

      for (const fileName of parsed.fileNames) {
        union.add(fileName);
      }

      const nested = this.unionFileNamesAcrossReferences(referencedConfigPath, parsed.fileNames, parsed.projectReferences, visitedConfigs);
      for (const fileName of nested) {
        union.add(fileName);
      }
    }

    return Array.from(union);
  }

  private resolveProjectReferencePath(referencePath: string, fromDir: string): string | undefined {
    const resolved = path.resolve(fromDir, referencePath);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const candidate = path.join(resolved, 'tsconfig.json');
      return fs.existsSync(candidate) ? candidate : undefined;
    }
    return fs.existsSync(resolved) ? resolved : undefined;
  }

  analyze(): TypeScriptProjectAnalysis {
    const sourceFiles = this.program.getSourceFiles().filter((file) => !file.isDeclarationFile && !file.fileName.includes('node_modules'));

    const modules = sourceFiles.map((file) => this.analyzeModule(file));
    const entryPoints = this.detectEntryPoints(modules);

    if (modules.length === 0) {
      this.diagnostics.push({
        severity: 'error',
        category: 'zero-entities',
        message: 'Analysis produced zero modules: no source files matched the program.',
        filePath: undefined,
        specifier: undefined,
      });
    }

    return {
      modules,
      entryPoints,
      projectConfig: this.program.getCompilerOptions(),
      diagnostics: this.diagnostics,
      moduleGraph: this.moduleGraph,
    } as const;
  }

  analyzeFromEntrypoint(absoluteEntryPath: string): TypeScriptProjectAnalysis {
    if (!fs.existsSync(absoluteEntryPath)) {
      throw new Error(`Entry point file not found: ${absoluteEntryPath}`);
    }

    // X-DIAG-1 — an entrypoint outside the program's file set (e.g. a
    // tsconfig `include` miss) is a descriptive error, not a silent
    // "Found 0 modules". Checked before the traversal loop starts.
    const entrySourceFile = this.program.getSourceFile(absoluteEntryPath);
    if (!entrySourceFile) {
      const message = `Entry point exists on disk but is not included by this tsconfig's include/files configuration: ${absoluteEntryPath}. Add it to 'include' or pass a different --project.`;
      this.diagnostics.push({
        severity: 'error',
        category: 'entrypoint-not-in-program',
        message,
        filePath: absoluteEntryPath,
        specifier: undefined,
      });
      throw new Error(message);
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
        if (currentPath !== absoluteEntryPath) {
          this.diagnostics.push({
            severity: 'warning',
            category: 'skipped-module',
            message: `Module not found in program, skipped: ${currentPath}`,
            filePath: currentPath,
            specifier: undefined,
          });
        }
        continue;
      }

      // Analyze this module
      const module = this.analyzeModule(sourceFile);
      modules.push(module);

      // Add imported modules to the traversal queue
      for (const importSpec of module.imports) {
        const outcome = this.resolveImportPath(currentPath, importSpec.specifier);
        this.recordModuleGraphEdge(currentPath, importSpec.specifier, outcome);
        if (outcome.resolvedPath && outcome.classification === 'internal' && !visitedModules.has(outcome.resolvedPath)) {
          traverseQueue.push(outcome.resolvedPath);
        } else if (outcome.classification === 'unresolved') {
          this.diagnostics.push({
            severity: 'warning',
            category: 'unresolvable-import',
            message: `Could not resolve import specifier '${importSpec.specifier}' from ${currentPath}`,
            filePath: currentPath,
            specifier: importSpec.specifier,
          });
        }
      }

      // Add re-exported modules to the traversal queue.
      // Both named re-exports (export { X } from './module') and X-AN-3's
      // star re-exports (export * from './module', type: 'namespace-reexport')
      // carry a `source` and are followed the same way.
      for (const exportSpec of module.exports) {
        if (exportSpec.source) {
          const outcome = this.resolveImportPath(currentPath, exportSpec.source);
          this.recordModuleGraphEdge(currentPath, exportSpec.source, outcome);
          if (outcome.resolvedPath && outcome.classification === 'internal' && !visitedModules.has(outcome.resolvedPath)) {
            traverseQueue.push(outcome.resolvedPath);
          } else if (outcome.classification === 'unresolved') {
            this.diagnostics.push({
              severity: 'warning',
              category: 'unresolvable-import',
              message: `Could not resolve re-export source '${exportSpec.source}' from ${currentPath}`,
              filePath: currentPath,
              specifier: exportSpec.source,
            });
          }
        }
      }

      // X-AN-2 — dynamic import() targets discovered during the visitor
      // walk also join the traversal queue, mirroring static imports.
      for (const dynamicSpecifier of module.dynamicImportSpecifiers) {
        const outcome = this.resolveImportPath(currentPath, dynamicSpecifier);
        this.recordModuleGraphEdge(currentPath, dynamicSpecifier, outcome);
        if (outcome.resolvedPath && outcome.classification === 'internal' && !visitedModules.has(outcome.resolvedPath)) {
          traverseQueue.push(outcome.resolvedPath);
        } else if (outcome.classification === 'unresolved') {
          this.diagnostics.push({
            severity: 'warning',
            category: 'unresolvable-import',
            message: `Could not resolve dynamic import specifier '${dynamicSpecifier}' from ${currentPath}`,
            filePath: currentPath,
            specifier: dynamicSpecifier,
          });
        }
      }
    }

    if (modules.length === 0) {
      this.diagnostics.push({
        severity: 'error',
        category: 'zero-entities',
        message: `Traversal from entrypoint ${absoluteEntryPath} produced zero modules.`,
        filePath: absoluteEntryPath,
        specifier: undefined,
      });
    }

    return {
      modules,
      entryPoints: [createFilePath(absoluteEntryPath)],
      projectConfig: this.program.getCompilerOptions(),
      diagnostics: this.diagnostics,
      moduleGraph: this.moduleGraph,
    } as const;
  }

  private recordModuleGraphEdge(sourceModule: string, specifier: string, outcome: ResolutionOutcome): void {
    const projectRoot = this.projectPath;
    const target =
      outcome.resolvedPath && outcome.classification === 'internal'
        ? path.relative(projectRoot, outcome.resolvedPath)
        : outcome.resolvedPath;

    this.moduleGraph.push({
      sourceModule: path.relative(projectRoot, sourceModule),
      specifier,
      resolvedTarget: target,
      classification: outcome.classification,
    });
  }

  private resolveConfigPath(): string {
    if (this.configPath) {
      return path.resolve(this.configPath);
    }

    const searchPath = path.resolve(this.projectPath);
    return ts.findConfigFile(searchPath, ts.sys.fileExists, 'tsconfig.json') || path.join(searchPath, 'tsconfig.json');
  }

  // Normalizes both branches (missing tsconfig vs. a real parsed one) to
  // the same shape: `compilerOptions`/`fileNames`/`projectReferences`.
  // `ts.parseJsonConfigFileContent`'s result is a `ts.ParsedCommandLine`,
  // whose compiler-options field is named `.options`, not
  // `.compilerOptions` — this normalization is what makes `paths`/`baseUrl`
  // actually reach `this.compilerOptions` in the constructor (census gap 6's
  // root cause was `paths` never being consulted at all; this is the fix
  // that makes the round-trip work, not merely the round-trip itself).
  private loadTsConfig(configPath: string): {
    config: { compilerOptions: ts.CompilerOptions; fileNames: string[]; projectReferences: readonly ts.ProjectReference[] | undefined };
    error?: ts.Diagnostic;
  } {
    if (!fs.existsSync(configPath)) {
      return {
        config: {
          compilerOptions: ts.getDefaultCompilerOptions(),
          fileNames: this.getSourceFiles(this.projectPath),
          projectReferences: undefined,
        },
      };
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      return {
        config: { compilerOptions: ts.getDefaultCompilerOptions(), fileNames: [], projectReferences: undefined },
        error: configFile.error,
      };
    }

    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));

    return {
      config: {
        compilerOptions: parsedConfig.options,
        fileNames: parsedConfig.fileNames,
        projectReferences: parsedConfig.projectReferences,
      },
    };
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
    const dynamicImportSpecifiers: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        imports.push(this.parseImport(node));
      } else if (this.isDynamicImportCall(node)) {
        // X-AN-2 — dynamic import() calls. A literal specifier is recorded
        // as a discovered edge that joins the traversal queue like a static
        // import; a non-literal specifier (a computed path) cannot be
        // followed, so it surfaces as a diagnostic instead of silence.
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteralLike(argument)) {
          dynamicImportSpecifiers.push(argument.text);
        } else {
          this.diagnostics.push({
            severity: 'warning',
            category: 'non-literal-dynamic-import',
            message: `Dynamic import() with a non-literal specifier at ${sourceFile.fileName}:${this.lineOf(sourceFile, node)}`,
            filePath: sourceFile.fileName,
            specifier: undefined,
          });
        }
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
        // X-AN-5 (site one) — before treating declarations as constants,
        // check each initializer for an arrow function / function
        // expression. Matches parse through the function path and are
        // registered as 'function' exports instead of 'constant'.
        const { functions: arrowFunctions, constants: plainConstants } = this.parseVariableStatement(node);
        functions.push(...arrowFunctions);
        constants.push(...plainConstants);

        if (this.hasExportModifier(node)) {
          for (const func of arrowFunctions) {
            exports.push({
              name: func.name,
              isDefault: false,
              type: 'function',
              source: undefined,
            } as const);
          }
          for (const constant of plainConstants) {
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

    // X-AN-8 — fold get/set accessor pairs discovered on classes during
    // `parseClass` into a single accessorKind: 'both' entry per name. The
    // per-class fold happens inside parseClass itself (it owns the member
    // loop); nothing left to do here.

    return {
      filePath: createFilePath(sourceFile.fileName),
      imports,
      exports,
      functions,
      classes,
      interfaces,
      types,
      constants,
      dynamicImportSpecifiers,
    } as const;
  }

  private lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  private isDynamicImportCall(node: ts.Node): node is ts.CallExpression {
    return ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
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

    // X-AN-3 — `export * from 'module'`: record a distinct
    // namespace-reexport edge instead of discarding it. The traversal queue
    // follows `source` exactly as it already does for named re-exports; the
    // converter's export-registry phase folds the target module's exports
    // in transitively (visited-set cycle guard, mirroring
    // `visitedModules`).
    if (!node.exportClause && node.moduleSpecifier) {
      const source = (node.moduleSpecifier as ts.StringLiteral).text;
      return [
        {
          name: '*',
          isDefault: false,
          type: 'namespace-reexport',
          source,
        },
      ];
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
    const description = node.name ? this.extractJSDocDescription(node.name) : this.extractJSDocDescriptionFallback(node);

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

  // X-AN-5 (site one, arrow/function-expression parse path) — shared by
  // parseVariableStatement's arrow-const branch. Parses a `ts.ArrowFunction`
  // or `ts.FunctionExpression` through the same path as parseFunction:
  // parameters, return type, and signature all reuse the same builders, but
  // the name comes from the variable's binding name (arrow functions are
  // anonymous) rather than from the function node itself.
  private parseArrowOrFunctionExpression(name: string, node: ts.ArrowFunction | ts.FunctionExpression, nameNode: ts.Node): ParsedFunction {
    const parameters = this.parseParameters(node.parameters);
    const returnType = this.getTypeString(node.type);
    const isAsync = this.hasAsyncModifier(node);
    const signature = this.buildFunctionSignature(name, parameters, returnType, isAsync);
    const description = this.extractJSDocDescription(nameNode);

    return {
      name,
      signature,
      parameters,
      returnType,
      isAsync,
      description: description || undefined,
      decorators: [],
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
    const description = node.name ? this.extractJSDocDescription(node.name) : this.extractJSDocDescriptionFallback(node);

    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          extendsClasses.push(...clause.types.map((type) => this.getTypeString(type)));
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          implementsInterfaces.push(...clause.types.map((type) => this.getTypeString(type)));
        }
      }
    }

    // X-AN-8 — get/set accessors are folded into one logical method entry
    // per name: a get/set pair on the same name yields accessorKind: 'both'.
    // Track by a (name, isStatic) key — a static and an instance accessor
    // sharing a name are two distinct class members, not one pair, and
    // folding them together would silently merge unrelated entries. Track
    // which half (get/set) has actually been seen per key, rather than
    // inferring "already populated" from a sentinel return value: a setter
    // always parses to returnType 'void' and a getter's OWN return type can
    // legitimately be 'void' too, so a sentinel check on the value gets the
    // setter-before-getter ordering wrong and silently drops the getter's
    // real return type.
    interface AccessorFold {
      readonly method: ParsedMethod;
      readonly hasGet: boolean;
      readonly hasSet: boolean;
    }
    const accessorsByKey = new Map<string, AccessorFold>();

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member)) {
        methods.push(this.parseMethod(member));
      } else if (ts.isPropertyDeclaration(member)) {
        const { property, arrowMethod } = this.parseProperty(member);
        if (arrowMethod) {
          // X-AN-5 (site two) — a class-property arrow joins the class's
          // method list (with its signature) instead of the property list.
          methods.push(arrowMethod);
        } else if (property) {
          properties.push(property);
        }
      } else if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
        const isGet = ts.isGetAccessorDeclaration(member);
        const parsedAccessor = this.parseAccessor(member);
        const key = `${parsedAccessor.isStatic ? 'static:' : 'instance:'}${parsedAccessor.name}`;
        const existing = accessorsByKey.get(key);

        if (existing) {
          // Only the getter half carries a meaningful return type and only
          // the setter half carries a meaningful parameter — pick each
          // field from whichever half actually produced it, using the
          // hasGet/hasSet flags (not a value sentinel) as the source of
          // truth, so order never matters.
          const returnType = isGet ? parsedAccessor.returnType : existing.hasGet ? existing.method.returnType : parsedAccessor.returnType;
          const parameters = isGet ? (existing.hasSet ? existing.method.parameters : parsedAccessor.parameters) : parsedAccessor.parameters;
          // The folded entry's own `signature` string must be rebuilt from
          // the merged parameters/returnType, not inherited from whichever
          // half parsed first — otherwise a direct reader of `signature`
          // sees the same stale-half bug the returnType/parameters merge
          // above exists to fix.
          const signature = this.buildFunctionSignature(parsedAccessor.name, parameters, returnType, false);

          accessorsByKey.set(key, {
            method: { ...existing.method, accessorKind: 'both', parameters, returnType, signature },
            hasGet: existing.hasGet || isGet,
            hasSet: existing.hasSet || !isGet,
          });
        } else {
          accessorsByKey.set(key, { method: parsedAccessor, hasGet: isGet, hasSet: !isGet });
        }
      }
    }

    methods.push(...Array.from(accessorsByKey.values()).map((fold) => fold.method));

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

  private parseAccessor(node: ts.GetAccessorDeclaration | ts.SetAccessorDeclaration): ParsedMethod {
    const name = (node.name as ts.Identifier).text;
    const isGet = ts.isGetAccessorDeclaration(node);
    const parameters = this.parseParameters(node.parameters);
    const returnType = isGet ? this.getTypeString(node.type) : 'void';
    const isStatic = this.hasStaticModifier(node);
    const isPrivate = this.hasPrivateModifier(node);
    const isProtected = this.hasProtectedModifier(node);
    const signature = this.buildFunctionSignature(name, parameters, returnType, false);

    return {
      name,
      signature,
      isStatic,
      isPrivate,
      isProtected,
      isAbstract: false,
      parameters,
      returnType,
      isAsync: false,
      accessorKind: isGet ? 'get' : 'set',
    } as const;
  }

  private parseInterface(node: ts.InterfaceDeclaration): ParsedInterface {
    const name = node.name.text;
    const extendsInterfaces: string[] = [];
    const properties: ParsedProperty[] = [];
    const methods: ParsedMethod[] = [];
    const description = this.extractJSDocDescription(node.name);

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
    const description = this.extractJSDocDescription(node.name);

    return {
      name,
      type,
      description: description || undefined,
    } as const;
  }

  private parseVariableStatement(node: ts.VariableStatement): { functions: ParsedFunction[]; constants: ParsedConstant[] } {
    const functions: ParsedFunction[] = [];
    const constants: ParsedConstant[] = [];

    for (const declaration of node.declarationList.declarations) {
      const name = declaration.name.getText();
      const initializer = declaration.initializer;

      // X-AN-5 (site one) — an arrow function or function expression bound
      // to a const/let/var is a function, not data. Route through the
      // shared arrow-parse path instead of building a ParsedConstant.
      if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
        functions.push(this.parseArrowOrFunctionExpression(name, initializer, declaration.name));
        continue;
      }

      const type = this.getTypeString(declaration.type) || this.inferTypeFromInitializer(initializer);
      const value = initializer?.getText();
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

    return { functions, constants };
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
      accessorKind: undefined,
    } as const;
  }

  private parseProperty(node: ts.PropertyDeclaration): { property: ParsedProperty | undefined; arrowMethod: ParsedMethod | undefined } {
    const name = (node.name as ts.Identifier).text;
    const initializer = node.initializer;

    // X-AN-5 (site two) — a class-property arrow (`handleClick = () => {}`)
    // is a method, not a property. `parseProperty`'s original omission was
    // reading only the declared type and modifiers, never the initializer —
    // this is the same root cause as site one (FAQ Q7 in the Diamond Doc),
    // fixed the same way: inspect the initializer before classifying.
    if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
      const parameters = this.parseParameters(initializer.parameters);
      const returnType = this.getTypeString(initializer.type);
      const isStatic = this.hasStaticModifier(node);
      const isPrivate = this.hasPrivateModifier(node);
      const isProtected = this.hasProtectedModifier(node);
      const isAsync = this.hasAsyncModifier(initializer);
      const signature = this.buildFunctionSignature(name, parameters, returnType, isAsync);

      return {
        property: undefined,
        arrowMethod: {
          name,
          signature,
          isStatic,
          isPrivate,
          isProtected,
          isAbstract: false,
          parameters,
          returnType,
          isAsync,
          accessorKind: undefined,
        },
      };
    }

    const type = this.getTypeString(node.type);
    const isReadonly = this.hasReadonlyModifier(node);
    const isStatic = this.hasStaticModifier(node);
    const isPrivate = this.hasPrivateModifier(node);
    const isProtected = this.hasProtectedModifier(node);
    const isOptional = !!node.questionToken;

    return {
      property: {
        name,
        type,
        isReadonly,
        isStatic,
        isPrivate,
        isProtected,
        isOptional,
      },
      arrowMethod: undefined,
    };
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
      accessorKind: undefined,
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

  // X-AN-6 — JSDoc extraction fix. `getSymbolAtLocation` needs an
  // identifier-shaped location: the census's isolated probe proved that
  // passing the whole declaration node returns `undefined` in the general
  // case, while passing `node.name` retrieves the doc comment from the same
  // checker instance. Every call site now passes the name node explicitly.
  private extractJSDocDescription(nameNode: ts.Node): string | undefined {
    const symbol = this.checker.getSymbolAtLocation(nameNode);
    if (!symbol) return this.extractJSDocDescriptionFallback(nameNode);

    const jsDocTags = symbol.getJsDocTags();
    const descriptionTag = jsDocTags.find((tag) => tag.name === 'description');

    const resolved =
      descriptionTag?.text?.map((text) => text.text).join('') ||
      symbol
        .getDocumentationComment(this.checker)
        .map((comment) => comment.text)
        .join('');

    return resolved || this.extractJSDocDescriptionFallback(nameNode);
  }

  // Fallback for declarations with no bindable name node (anonymous
  // default exports) — a checker-free path via `ts.getJSDocCommentsAndTags`
  // that works even when there is no symbol to resolve.
  private extractJSDocDescriptionFallback(node: ts.Node): string | undefined {
    const tagsAndComments = ts.getJSDocCommentsAndTags(node);
    for (const entry of tagsAndComments) {
      if (ts.isJSDoc(entry) && entry.comment) {
        return typeof entry.comment === 'string' ? entry.comment : entry.comment.map((part) => part.text).join('');
      }
    }
    return undefined;
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

  // X-AN-1 — replaces the hand-rolled `resolveImportPath`. Per-specifier
  // resolution is `ts.resolveModuleName(specifier, fromPath, compilerOptions,
  // ts.sys)`. A result landing outside `node_modules` with
  // `isExternalLibraryImport: false` is an internal edge; a `node_modules`
  // result or a failed resolution classifies as external/unresolved.
  //
  // Negative check (RFC-TM-9 §1): no `startsWith('.')` guard anywhere in
  // this path — classification comes from the resolution OUTCOME
  // (isExternalLibraryImport / packageId / resolution failure), never from
  // the specifier's own shape. This is what lets `paths`-aliased bare
  // specifiers resolve into the project instead of being discarded before
  // resolution starts.
  private resolveImportPath(fromPath: string, importSpecifier: string): ResolutionOutcome {
    const result = ts.resolveModuleName(importSpecifier, fromPath, this.compilerOptions, ts.sys, this.moduleResolutionCache);

    const resolvedModule = result.resolvedModule;
    if (!resolvedModule) {
      return { resolvedPath: undefined, classification: 'unresolved' };
    }

    const resolvedPath = resolvedModule.resolvedFileName;
    const isExternal = resolvedModule.isExternalLibraryImport === true || resolvedPath.includes('node_modules');

    return {
      resolvedPath,
      classification: isExternal ? 'external' : 'internal',
    };
  }
}
