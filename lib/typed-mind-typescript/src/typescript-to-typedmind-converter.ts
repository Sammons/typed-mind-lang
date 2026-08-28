import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ClassFileNode,
  ClassNode,
  ConstantsNode,
  DependencyNode,
  DtoFieldNode,
  DtoNode,
  type EntityKind,
  type EntityNode,
  FileNode,
  FunctionNode,
  ProgramNode,
  parseTypeExprText,
  type Span,
  SyntaxEmitter,
} from '@sammons/typed-mind';
import type {
  ConversionError,
  ConversionOptions,
  ConversionResult,
  ConversionWarning,
  ParsedClass,
  ParsedExport,
  ParsedFunction,
  ParsedInterface,
  ParsedModule,
  TypeScriptProjectAnalysis,
} from './types.ts';
import { createEntityName } from './types.ts';

// RFC-TM-6 §3 (rfc-tm-6-diamond.md, M8 disposition) — converter-built nodes
// have no source text, so every node shares one zero-width synthetic span.
// I-6 (token-accurate diagnostic spans) governs positions derived from real
// source; this converter emits no source-backed diagnostics, so I-6 does not
// apply here by declaration — the column-1 tripwire's scope (lib/typed-mind
// src/checker, src/emitter, src/pipeline) must not extend to this package.
const SYNTHETIC_SPAN: Span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

// RFC-TM-6 §3 — the converter pre-sorts its synthetic entity list into the
// legacy private emitter's eight-bucket section order (Program, Dependency,
// File, ClassFile, Class, Function, DTO, Constants) before emission, so
// checked-in `.tmd` diffs keep their structure even though the shared
// SyntaxEmitter (unlike the now-deleted private emitter) has no notion of
// section grouping — it emits entities in list order, blank-line separated.
const LEGACY_SECTION_ORDER: readonly EntityKind[] = ['Program', 'Dependency', 'File', 'ClassFile', 'Class', 'Function', 'DTO', 'Constants'];

const sortIntoLegacySectionOrder = (entities: readonly EntityNode[]): EntityNode[] => {
  const rank = new Map(LEGACY_SECTION_ORDER.map((kind, index) => [kind, index]));
  return [...entities].sort(
    (a, b) => (rank.get(a.kind) ?? LEGACY_SECTION_ORDER.length) - (rank.get(b.kind) ?? LEGACY_SECTION_ORDER.length),
  );
};

// Two-pass architecture data structures
interface ExportRegistry {
  [moduleSpecifier: string]: {
    defaultExport?: string;
    namedExports: Set<string>;
    namespaceExport?: string;
    filePath: string;
  };
}

interface EntityInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'constant';
  sourceFile: string;
  exported: boolean;
}

interface EntityRegistry {
  functions: Map<string, EntityInfo>;
  classes: Map<string, EntityInfo>;
  interfaces: Map<string, EntityInfo>;
  types: Map<string, EntityInfo>;
  constants: Map<string, EntityInfo>;
  files: Map<string, EntityInfo>;
}

export class TypeScriptToTypedMindConverter {
  // RFC-TM-6 §3 (rfc-tm-6-diamond.md) — the shared SyntaxEmitter replaces the
  // converter's now-deleted private TMD-content emitter.
  private readonly emitter = new SyntaxEmitter();
  private readonly options: Required<ConversionOptions>;
  private readonly errors: ConversionError[] = [];
  private readonly warnings: ConversionWarning[] = [];
  private readonly entities: EntityNode[] = [];
  private readonly entityNames = new Set<string>();
  private readonly dependencies = new Map<string, DependencyNode>();
  private readonly externalTypeToPackage = new Map<string, string>(); // Maps external types to their package
  private entryPoints = new Set<string>();

  // Two-pass architecture registries
  private readonly exportRegistry: ExportRegistry = {};
  private readonly entityRegistry: EntityRegistry = {
    functions: new Map(),
    classes: new Map(),
    interfaces: new Map(),
    types: new Map(),
    constants: new Map(),
    files: new Map(),
  };

  constructor(options: Partial<ConversionOptions> = {}) {
    this.options = {
      preferClassFile: true,
      includePrivateMembers: false,
      generatePrograms: true,
      programVersion: '1.0.0',
      ignorePatterns: ['node_modules/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
      ...options,
    };
  }

  convert(analysis: TypeScriptProjectAnalysis): ConversionResult {
    this.reset();

    try {
      // Filter modules based on ignore patterns
      const filteredModules = this.filterModules(analysis.modules);

      // Store entry points for reference during conversion
      this.entryPoints = new Set(analysis.entryPoints.map((ep) => this.getRelativePath(ep)));

      // Convert TypeScript constructs to TypedMind entities
      this.convertModules(filteredModules);

      // Generate program entities if requested (after other entities are created)
      if (this.options.generatePrograms) {
        this.generatePrograms(analysis.entryPoints, filteredModules);
      }

      // RFC-TM-6 §3 — pre-sort into the legacy section order so checked-in
      // `.tmd` diffs keep their structure, then emit through the shared
      // SyntaxEmitter (the `# Section` header comments are the named,
      // accepted EMITTER-STRUCTURE regression — SyntaxEmitter has no
      // comment-synthesis surface, per the RFC's Rejected Alternatives).
      const sortedEntities = sortIntoLegacySectionOrder(this.entities);
      const tmdContent = this.emitter.emitShortform({ entities: sortedEntities, imports: [], diagnostics: [] });

      return {
        success: this.errors.length === 0,
        entities: sortedEntities,
        tmdContent,
        errors: [...this.errors],
        warnings: [...this.warnings],
      } as const;
    } catch (error) {
      this.addError(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);

      return {
        success: false,
        entities: [],
        tmdContent: '',
        errors: [...this.errors],
        warnings: [...this.warnings],
      } as const;
    }
  }

  private reset(): void {
    this.errors.length = 0;
    this.warnings.length = 0;
    this.entities.length = 0;
    this.entityNames.clear();
    this.dependencies.clear();
    this.externalTypeToPackage.clear();
    this.entryPoints.clear();

    // Clear two-pass registries
    Object.keys(this.exportRegistry).forEach((key) => delete this.exportRegistry[key]);
    this.entityRegistry.functions.clear();
    this.entityRegistry.classes.clear();
    this.entityRegistry.interfaces.clear();
    this.entityRegistry.types.clear();
    this.entityRegistry.constants.clear();
    this.entityRegistry.files.clear();
  }

  private addEntityName(entityName: string, _context: string): void {
    this.entityNames.add(entityName);
  }

  private filterModules(modules: readonly ParsedModule[]): ParsedModule[] {
    return modules.filter((module) => {
      const relativePath = path.relative(process.cwd(), module.filePath);
      return !this.options.ignorePatterns.some((pattern) => this.matchesPattern(relativePath, pattern));
    });
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob matching - could be enhanced with a proper glob library
    const regex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.');

    return new RegExp(`^${regex}$`).test(filePath);
  }

  private convertModules(modules: ParsedModule[]): void {
    // PHASE 1: Collection and Export Registration

    // 1.1: Extract all dependencies first
    for (const module of modules) {
      this.extractDependencies(module);
    }

    // 1.2: Build complete export registry for all modules
    for (const module of modules) {
      this.registerModuleExports(module);
    }

    // 1.3: Collect all entities information without processing imports
    for (const module of modules) {
      this.collectModuleEntities(module);
    }

    // PHASE 2: Processing with Complete Knowledge

    // Separate pure types files from regular files for proper ordering
    const pureTypesFiles: ParsedModule[] = [];
    const regularFiles: ParsedModule[] = [];

    for (const module of modules) {
      if (this.isPureTypesFile(module)) {
        pureTypesFiles.push(module);
      } else {
        regularFiles.push(module);
      }
    }

    // 2.1: Process regular modules first (now imports can be resolved)
    for (const module of regularFiles) {
      this.processModule(module);
    }

    // 2.2: Process pure types files last
    for (const module of pureTypesFiles) {
      this.processModule(module);
    }

    // 2.3: Add dependencies to entities
    this.entities.push(...this.dependencies.values());
  }

  private extractDependencies(module: ParsedModule): void {
    for (const imp of module.imports) {
      // Only create dependency entities for external packages (not internal imports)
      if (this.isExternalPackage(imp.specifier)) {
        this.createDependencyEntity(imp.specifier);

        // Track which types come from this external package
        if (imp.namedImports) {
          for (const namedImport of imp.namedImports) {
            this.externalTypeToPackage.set(namedImport, imp.specifier);
          }
        }
        if (imp.defaultImport) {
          this.externalTypeToPackage.set(imp.defaultImport, imp.specifier);
        }
      }
    }
  }

  private createDependencyEntity(specifier: string): void {
    if (this.dependencies.has(specifier)) {
      return; // Already exists
    }

    const entityName = this.createDependencyName(specifier);
    const version = this.extractVersionFromPackageJson(specifier);
    const purpose = this.derivePurpose(specifier);

    const dependencyEntity = new DependencyNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} ^ "${purpose}"${version ? ` v${version}` : ''}`,
      sourceForm: 'shortform',
      purpose,
      version,
    });

    this.dependencies.set(specifier, dependencyEntity);
    this.entityNames.add(entityName);
  }

  // PHASE 1 METHODS: Collection and Export Registration

  private registerModuleExports(module: ParsedModule): void {
    const moduleExports = {
      namedExports: new Set<string>(),
      filePath: module.filePath,
    } as ExportRegistry[string];

    // Register all exports from this module
    for (const exp of module.exports) {
      if (exp.isDefault) {
        moduleExports.defaultExport = exp.name;
      } else {
        moduleExports.namedExports.add(exp.name);
      }

      // Handle re-exports: if export has a source, treat it as import-then-export
      if (exp.source) {
        this.processReExport(module, exp);
      }
    }

    // Register this module under multiple keys for easier resolution
    const relativePath = this.getRelativePath(module.filePath);
    const withoutExt = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    const fileName = path.basename(module.filePath, path.extname(module.filePath));
    const dirPath = path.dirname(withoutExt);

    // Register under various possible import specifier formats:
    const specifiers = [
      withoutExt, // 'src/types/user'
      withoutExt.startsWith('./') ? withoutExt : `./${withoutExt}`, // './src/types/user'
      `./${fileName}`, // './user'
      `../${fileName}`, // '../user' (from sibling directories)
      fileName, // 'user' (bare name)
      `../types/${fileName}`, // '../types/user' (common relative import)
      `./types/${fileName}`, // './types/user' (from root)
      `types/${fileName}`, // 'types/user' (from root without ./)
    ];

    // Add relative paths from common source directories
    if (dirPath.includes('types')) {
      specifiers.push(`../types/${fileName}`);
      specifiers.push(`./types/${fileName}`);
    }
    if (dirPath.includes('services')) {
      specifiers.push(`../services/${fileName}`);
      specifiers.push(`./services/${fileName}`);
    }

    for (const specifier of specifiers) {
      this.exportRegistry[specifier] = moduleExports;
    }
  }

  private processReExport(module: ParsedModule, reExport: ParsedExport): void {
    // Re-export: export { X } from './module' is equivalent to:
    // 1. import { X } from './module'
    // 2. export { X }

    // For now, just log that we found a re-export
    // The actual handling will be done when we process imports/dependencies
    // during the second phase when we have full access to the analysis

    // Add a warning if the re-export source might not be included
    if (!this.isExternalPackage(reExport.source!)) {
      const sourceModulePath = this.resolveModulePath(reExport.source!, path.dirname(module.filePath));
      if (!sourceModulePath || !fs.existsSync(sourceModulePath)) {
        this.warnings.push({
          message: `Re-export source module not found: ${reExport.source} (re-exporting ${reExport.name})`,
          filePath: module.filePath,
          suggestion: undefined,
        });
      }
    }
  }

  private resolveModulePath(specifier: string, basePath: string): string | null {
    // Handle relative paths
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const fullPath = path.resolve(basePath, specifier);

      // Try common TypeScript extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const withExt = fullPath + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }

      // Try as directory with index file
      for (const ext of extensions) {
        const indexPath = path.join(fullPath, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
    }

    return null;
  }

  private collectModuleEntities(module: ParsedModule): void {
    const sourceFile = module.filePath;

    // Collect all functions
    for (const func of module.functions) {
      const entityInfo: EntityInfo = {
        name: func.name,
        type: 'function',
        sourceFile,
        exported: this.isFunctionExported(func, module),
      };
      this.entityRegistry.functions.set(func.name, entityInfo);
    }

    // Collect all classes
    for (const cls of module.classes) {
      const entityInfo: EntityInfo = {
        name: cls.name,
        type: 'class',
        sourceFile,
        exported: module.exports.some((exp) => exp.name === cls.name),
      };
      this.entityRegistry.classes.set(cls.name, entityInfo);
    }

    // Collect all interfaces
    for (const iface of module.interfaces) {
      const entityInfo: EntityInfo = {
        name: iface.name,
        type: 'interface',
        sourceFile,
        exported: module.exports.some((exp) => exp.name === iface.name),
      };
      this.entityRegistry.interfaces.set(iface.name, entityInfo);
    }

    // Collect all type aliases
    for (const type of module.types) {
      const entityInfo: EntityInfo = {
        name: type.name,
        type: 'type',
        sourceFile,
        exported: module.exports.some((exp) => exp.name === type.name),
      };
      this.entityRegistry.types.set(type.name, entityInfo);
    }

    // Collect all constants
    for (const constant of module.constants) {
      const entityInfo: EntityInfo = {
        name: constant.name,
        type: 'constant',
        sourceFile,
        exported: this.isConstantExported(constant, module),
      };
      this.entityRegistry.constants.set(constant.name, entityInfo);
    }
  }

  // PHASE 2 METHODS: Processing with Complete Knowledge

  private processModule(module: ParsedModule): void {
    // This replaces the old convertModule method but with complete export registry available
    const fileName = path.basename(module.filePath, path.extname(module.filePath));
    const entityName = this.sanitizeEntityName(fileName);

    // Check if this module is an entry point that needs special handling
    const isEntryPoint = this.isModuleEntryPoint(module);

    // Check if this is a pure types/constants file
    const isPureTypesFile = this.isPureTypesFile(module);

    // Decide whether to create separate entities or use ClassFile fusion
    const hasClasses = module.classes.length > 0;
    const hasFunctions = module.functions.length > 0;
    const hasExports = module.exports.length > 0;

    if (isPureTypesFile) {
      // For pure types/constants files, only create the individual type/constant entities
      this.convertTypesAndConstants(module);
    } else if (this.options.preferClassFile && hasClasses && (hasFunctions || hasExports) && !isEntryPoint) {
      // Use ClassFile fusion for service/controller patterns (but not for entry points)
      this.convertToClassFile(module, entityName);
    } else {
      // Create separate File entity and other entities (always for entry points)
      this.convertToSeparateEntities(module, entityName);
    }
  }

  private createDependencyName(specifier: string): string {
    // Handle scoped packages like @sammons/typed-mind-renderer
    if (specifier.startsWith('@')) {
      const sanitized = this.sanitizeEntityName(specifier.replace('@', '').replace('/', '_'));
      // For @sammons/typed-mind -> SammonsTypedMind
      // For @sammons/typed-mind-renderer -> SammonsTypedMindRenderer
      return sanitized;
    }

    // Handle Node.js built-ins and regular packages
    return this.sanitizeEntityName(specifier);
  }

  private extractVersionFromPackageJson(specifier: string): string | undefined {
    try {
      // Try to find package.json in the project
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return undefined;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };

      const version = dependencies[specifier];
      if (version) {
        // Clean version string (remove ^ ~ etc.)
        return version.replace(/^[\^~>=<]+/, '');
      }
    } catch {
      // Ignore errors - version is optional
    }
    return undefined;
  }

  private derivePurpose(specifier: string): string {
    // Known Node.js built-ins
    const nodeBuiltins: Record<string, string> = {
      fs: 'File system operations',
      path: 'Path manipulation utilities',
      util: 'Node.js utility functions',
      os: 'Operating system utilities',
      crypto: 'Cryptographic functionality',
      http: 'HTTP client and server',
      https: 'HTTPS client and server',
      url: 'URL parsing utilities',
      querystring: 'Query string utilities',
      events: 'Event emitter',
      stream: 'Streaming data',
      buffer: 'Binary data handling',
      child_process: 'Spawn child processes',
      cluster: 'Multi-process support',
      dns: 'DNS lookup utilities',
      net: 'TCP networking',
      readline: 'Read input line-by-line',
      tls: 'TLS/SSL support',
      vm: 'Virtual machine context',
      zlib: 'Compression utilities',
    };

    if (nodeBuiltins[specifier]) {
      return nodeBuiltins[specifier];
    }

    // Common packages
    const knownPackages: Record<string, string> = {
      typescript: 'TypeScript compiler',
      react: 'React UI library',
      express: 'Web application framework',
      lodash: 'JavaScript utility library',
      axios: 'HTTP client library',
      moment: 'Date manipulation library',
      uuid: 'UUID generation library',
      bcrypt: 'Password hashing library',
      jsonwebtoken: 'JSON Web Token library',
      mongoose: 'MongoDB object modeling',
      sequelize: 'SQL ORM library',
      dotenv: 'Environment variable loader',
      cors: 'CORS middleware',
      helmet: 'Security headers middleware',
      winston: 'Logging library',
      jest: 'Testing framework',
      vitest: 'Testing framework',
      eslint: 'JavaScript linter',
      prettier: 'Code formatter',
    };

    if (knownPackages[specifier]) {
      return knownPackages[specifier];
    }

    // Handle scoped packages
    if (specifier.startsWith('@')) {
      const packageName = specifier.split('/')[1] || specifier;
      return `${packageName.replace(/-/g, ' ')} library`;
    }

    // Fallback
    return `${specifier.replace(/-/g, ' ')} library`;
  }

  private isPureTypesFile(module: ParsedModule): boolean {
    // A file is considered "pure types" if it only exports types, interfaces, and constants
    // and doesn't have any classes or functions (except type-only exports)
    const hasRealCode = module.classes.length > 0 || module.functions.length > 0;
    const hasTypesOrConstants = module.types.length > 0 || module.interfaces.length > 0 || module.constants.length > 0;

    return !hasRealCode && hasTypesOrConstants;
  }

  private convertTypesAndConstants(module: ParsedModule): void {
    // Convert all type aliases FIRST (they become Constants entities with their exact names)
    for (const typeAlias of module.types) {
      if (this.isTypeAliasExported(typeAlias, module)) {
        this.convertTypeAliasToDTO(typeAlias);
      }
    }

    // Then convert interfaces to DTOs
    for (const iface of module.interfaces) {
      if (this.isInterfaceExported(iface, module)) {
        this.convertInterfaceToDTO(iface);
      }
    }

    // Finally convert constants
    for (const constant of module.constants) {
      if (this.isConstantExported(constant, module)) {
        this.createConstantEntity(constant, module);
      }
    }
  }

  private isInterfaceExported(iface: { name: string }, module: ParsedModule): boolean {
    return module.exports.some((exp) => exp.name === iface.name && exp.type === 'interface');
  }

  private isTypeAliasExported(typeAlias: { name: string }, module: ParsedModule): boolean {
    return module.exports.some((exp) => exp.name === typeAlias.name && exp.type === 'type');
  }

  private convertToClassFile(module: ParsedModule, baseName: string): void {
    // Find the primary class (usually the one that matches the filename)
    const primaryClass = module.classes.find((cls) => cls.name.toLowerCase() === baseName.toLowerCase()) || module.classes[0];

    if (!primaryClass) {
      this.addWarning(`No primary class found in ${module.filePath}`);
      this.convertToSeparateEntities(module, baseName);
      return;
    }

    const entityName = createEntityName(primaryClass.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.entityNames.add(entityName);

    const classFileEntity = new ClassFileNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} #: ${this.getRelativePath(module.filePath)}`,
      sourceForm: 'shortform',
      path: this.getRelativePath(module.filePath),
      extends: primaryClass.extends[0] || undefined, // TypedMind supports single inheritance
      implements: [...primaryClass.extends.slice(1), ...primaryClass.implements],
      methods: this.convertMethods(primaryClass),
      imports: this.convertImports(module.imports, module.exports),
      exports: this.convertExports(module, entityName),
      purpose: primaryClass.description || undefined,
    });

    this.entities.push(classFileEntity);

    // Convert other classes as separate entities
    for (const cls of module.classes) {
      if (cls !== primaryClass) {
        this.convertClass(cls, this.getRelativePath(module.filePath));
      }
    }

    // Only convert functions that are exported
    for (const func of module.functions) {
      if (this.isFunctionExported(func, module)) {
        this.convertFunction(func, this.getRelativePath(module.filePath));
      }
    }

    // Convert interfaces as DTOs
    for (const iface of module.interfaces) {
      if (this.isInterfaceExported(iface, module)) {
        this.convertInterfaceToDTO(iface);
      }
    }

    // Convert all type aliases (both object-like and union types)
    for (const typeAlias of module.types) {
      if (this.isTypeAliasExported(typeAlias, module)) {
        this.convertTypeAliasToDTO(typeAlias);
      }
    }

    // Convert constants - create individual entities for exported constants
    this.convertConstants(module);
  }

  private convertToSeparateEntities(module: ParsedModule, baseName: string): void {
    // Create File entity
    const fileEntityName = createEntityName(`${baseName}File`);

    if (!this.entityNames.has(fileEntityName)) {
      this.entityNames.add(fileEntityName);

      const fileEntity = new FileNode({
        name: fileEntityName,
        span: SYNTHETIC_SPAN,
        raw: `${fileEntityName} @ ${this.getRelativePath(module.filePath)}:`,
        sourceForm: 'shortform',
        path: this.getRelativePath(module.filePath),
        imports: this.convertImports(module.imports, module.exports),
        exports: this.convertExports(module),
      });

      this.entities.push(fileEntity);
    }

    // Convert other entities
    for (const cls of module.classes) {
      this.convertClass(cls, this.getRelativePath(module.filePath));
    }

    // Only convert functions that are exported
    for (const func of module.functions) {
      if (this.isFunctionExported(func, module)) {
        this.convertFunction(func, this.getRelativePath(module.filePath));
      }
    }

    for (const iface of module.interfaces) {
      if (this.isInterfaceExported(iface, module)) {
        this.convertInterfaceToDTO(iface);
      }
    }

    // Convert all type aliases (both object-like and union types)
    for (const typeAlias of module.types) {
      if (this.isTypeAliasExported(typeAlias, module)) {
        this.convertTypeAliasToDTO(typeAlias);
      }
    }

    // Convert constants - create individual entities for exported constants
    this.convertConstants(module);
  }

  private convertClass(cls: ParsedClass, sourceFile?: string): void {
    const entityName = createEntityName(cls.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.entityNames.add(entityName);

    // sourceFile is not carried on ClassNode: RFC-TM-3 §2.2 drops the legacy
    // `container`/`path` fields for Class (dead per the honest-fields table —
    // the File->Class lookahead heuristic's product is a ClassFileNode).
    void sourceFile;

    const classEntity = new ClassNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} <: ${cls.extends.join(', ')}`,
      sourceForm: 'shortform',
      extends: cls.extends[0] || undefined, // TypedMind supports single inheritance
      implements: [...cls.extends.slice(1), ...cls.implements],
      methods: this.convertMethods(cls),
      purpose: cls.description || undefined,
    });

    this.entities.push(classEntity);
  }

  private convertFunction(func: ParsedFunction, sourceFile?: string): void {
    const entityName = createEntityName(func.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.entityNames.add(entityName);

    // sourceFile is not carried on FunctionNode: RFC-TM-3 §2.2 drops the
    // legacy `container` field for Function (dead).
    void sourceFile;

    // Extract input/output DTOs from signature
    const inputDTO = this.extractInputDTO(func);
    const outputDTO = this.extractOutputDTO(func);

    const functionEntity = new FunctionNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} :: ${func.signature}`,
      sourceForm: 'shortform',
      signature: func.signature,
      calls: [], // Will be populated by analyzing function bodies if needed
      pendingDependencies: [],
      description: func.description || undefined,
      input: inputDTO,
      output: outputDTO,
    });

    this.entities.push(functionEntity);
  }

  private convertInterfaceToDTO(iface: ParsedInterface): void {
    const entityName = createEntityName(iface.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.addEntityName(entityName, 'convertInterfaceToDTO');

    const fields = iface.properties.map((prop) => {
      const type = this.sanitizeFieldType(prop.type);
      return new DtoFieldNode({
        name: prop.name,
        type,
        // RFC-TM-8 §2 (rfc-tm-8-diamond.md, X-TYPE-2): the converter builds a
        // synthetic DtoFieldNode from an already-sanitized type string, not a
        // parsed CST subtree — parseTypeExprText (the same hand-rolled parser
        // the longform `type:` quoted-string value reuses) gives it a real
        // TypeExprNode instead of leaving the field's structure unpopulated.
        typeExpr: parseTypeExprText(type).typeExpr,
        optionalityMarker: prop.isOptional ? 'question' : 'none',
        span: SYNTHETIC_SPAN,
      });
    });

    const dtoEntity = new DtoNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} %`,
      sourceForm: 'shortform',
      fields,
      purpose: iface.description || undefined,
    });

    this.entities.push(dtoEntity);
  }

  private convertTypeAliasToDTO(typeAlias: { name: string; type: string; description?: string }): void {
    const entityName = createEntityName(typeAlias.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    // Handle union type aliases (like EntityType)
    if (typeAlias.type.includes('|')) {
      // Convert union type to Constants entity since it's like an enum
      this.convertTypeAliasToConstants(typeAlias);
      return;
    }

    // Convert object-like type aliases to DTOs
    if (this.isObjectLikeType(typeAlias.type)) {
      this.addEntityName(entityName, 'convertTypeAliasToDTO-objectLike');

      const dtoEntity = new DtoNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: `${entityName} %`,
        sourceForm: 'shortform',
        fields: this.parseTypeToFields(typeAlias.type),
        purpose: typeAlias.description || undefined,
      });

      this.entities.push(dtoEntity);
      return;
    }

    // For simple type aliases, create a Constants entity
    this.convertTypeAliasToConstants(typeAlias);
  }

  private convertConstants(module: ParsedModule): void {
    if (module.constants.length === 0) {
      return;
    }

    // Create individual Constants entities for each exported constant
    for (const constant of module.constants) {
      if (this.isConstantExported(constant, module)) {
        this.createConstantEntity(constant, module);
      }
    }
  }

  private createConstantEntity(constant: { name: string; type: string; value?: string }, module: ParsedModule): void {
    const entityName = createEntityName(constant.name);

    if (this.entityNames.has(entityName)) {
      // Skip if already created - avoid duplicates
      return;
    }

    this.entityNames.add(entityName);

    // Use the real path - multiple constants can share the same file path
    const realPath = this.getRelativePath(module.filePath);

    const constantsEntity = new ConstantsNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} ! ${realPath}`,
      sourceForm: 'shortform',
      path: realPath,
      // Add schema information if we can infer it from the type
      schema: constant.type && constant.type !== 'any' ? this.convertTypeToSchema(constant.type) : undefined,
    });

    this.entities.push(constantsEntity);
  }

  private convertTypeAliasToConstants(typeAlias: { name: string; type: string; description?: string }): void {
    const entityName = createEntityName(typeAlias.name);
    if (this.entityNames.has(entityName)) {
      return;
    }

    this.addEntityName(entityName, 'convertTypeAliasToConstants');

    // Use the real path - multiple constants can share the same file path
    const realPath = `src/types.ts`;
    const constantsEntity = new ConstantsNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} ! ${realPath} : ${typeAlias.name}`,
      sourceForm: 'shortform',
      path: realPath,
      schema: typeAlias.name,
      purpose: typeAlias.description || undefined,
    });

    this.entities.push(constantsEntity);
  }

  private generatePrograms(entryPoints: readonly string[], modules: ParsedModule[]): void {
    if (entryPoints.length === 0) {
      this.addWarning('No entry points detected, generating a default program');

      // Create a default program pointing to the first module
      if (modules.length > 0) {
        const firstModule = modules[0];
        if (firstModule) {
          this.createProgramEntity('DefaultApp', firstModule.filePath);
        }
      }
      return;
    }

    for (const entryPoint of entryPoints) {
      const fileName = path.basename(entryPoint, path.extname(entryPoint));
      const programName = this.deriveProgramName(fileName);
      this.createProgramEntity(programName, entryPoint);
    }
  }

  private createProgramEntity(programName: string, entryFilePath: string): void {
    const entityName = createEntityName(programName);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate program name: ${entityName}`);
      return;
    }

    this.entityNames.add(entityName);

    // Find the actual entity that will be created for this entry file
    const entryEntityName = this.findEntryEntityName(entryFilePath);

    // Extract public exports from the entry point for library support
    const publicExports = this.extractPublicExportsFromEntrypoint(entryFilePath);

    const programEntity = new ProgramNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} -> ${entryEntityName} v${this.options.programVersion}`,
      sourceForm: 'shortform',
      entry: entryEntityName,
      version: this.options.programVersion,
      exports: publicExports.length > 0 ? publicExports : undefined,
    });

    this.entities.push(programEntity);
  }

  private extractPublicExportsFromEntrypoint(entryFilePath: string): string[] {
    const relativePath = this.getRelativePath(entryFilePath);

    // Look up exports from this entry file in our export registry
    const moduleExports =
      this.exportRegistry[relativePath] ||
      this.exportRegistry[relativePath.replace(/\.(ts|tsx|js|jsx)$/, '')] ||
      this.exportRegistry[`./${relativePath}`] ||
      this.exportRegistry[`./${relativePath.replace(/\.(ts|tsx|js|jsx)$/, '')}`];

    if (!moduleExports) {
      return [];
    }

    const publicExports: string[] = [];

    // Add default export if it exists
    if (moduleExports.defaultExport) {
      publicExports.push(moduleExports.defaultExport);
    }

    // Add all named exports
    for (const namedExport of moduleExports.namedExports) {
      publicExports.push(namedExport);
    }

    // Add namespace export if it exists
    if (moduleExports.namespaceExport) {
      publicExports.push(moduleExports.namespaceExport);
    }

    return publicExports;
  }

  private convertMethods(cls: ParsedClass): string[] {
    const methods = cls.methods.filter((method) => {
      if (!this.options.includePrivateMembers && method.isPrivate) {
        return false;
      }
      return true;
    });

    return methods.map((method) => method.name);
  }

  private convertImports(imports: readonly any[], moduleExports?: readonly ParsedExport[]): string[] {
    const importNames: string[] = [];

    // Process regular imports
    for (const imp of imports) {
      if (this.isExternalPackage(imp.specifier)) {
        // For external packages, add the dependency entity name
        const dependencyName = this.createDependencyName(imp.specifier);
        if (this.dependencies.has(imp.specifier)) {
          importNames.push(dependencyName);
        }
      } else {
        // For internal imports, add the specific imported entity names
        // Now using the complete export registry for proper resolution

        if (imp.defaultImport) {
          const entityName = this.resolveImportToEntity(imp.defaultImport, imp.specifier);
          if (entityName) {
            importNames.push(entityName);
          }
        }

        if (imp.namespaceImport) {
          // Create a class-like entity for the namespace import
          this.createNamespaceEntity(imp.namespaceImport, imp.specifier);
          const entityName = this.resolveImportToEntity(imp.namespaceImport, imp.specifier);
          if (entityName) {
            importNames.push(entityName);
          }
        }

        for (const namedImport of imp.namedImports) {
          const entityName = this.resolveImportToEntity(namedImport, imp.specifier);
          if (entityName) {
            importNames.push(entityName);
          }
        }
      }
    }

    // Process re-exports as imports (export { X } from './module' means import { X })
    if (moduleExports) {
      for (const reExport of moduleExports) {
        if (reExport.source && !this.isExternalPackage(reExport.source)) {
          // Treat re-export as an import of the entity from the source module
          const entityName = this.resolveImportToEntity(reExport.name, reExport.source);
          if (entityName) {
            importNames.push(entityName);
          }
        }
      }
    }

    return importNames;
  }

  private resolveImportToEntity(importName: string, specifier: string): string | undefined {
    // Handle external packages
    if (this.isExternalPackage(specifier)) {
      const dependencyName = this.createDependencyName(specifier);
      if (this.dependencies.has(specifier)) {
        return dependencyName;
      }
      return undefined;
    }

    // Handle internal imports using the export registry
    const moduleExports = this.exportRegistry[specifier];
    if (!moduleExports) {
      return undefined;
    }

    // Check if this import name is actually exported by the target module
    const isExported =
      moduleExports.defaultExport === importName ||
      moduleExports.namedExports.has(importName) ||
      moduleExports.namespaceExport === importName;

    if (!isExported) {
      return undefined;
    }

    // Now check if we have the entity in our registry
    const entityName = createEntityName(importName);

    // Check all entity types for this name
    const foundInFunctions = this.entityRegistry.functions.has(importName);
    const foundInClasses = this.entityRegistry.classes.has(importName);
    const foundInInterfaces = this.entityRegistry.interfaces.has(importName);
    const foundInTypes = this.entityRegistry.types.has(importName);
    const foundInConstants = this.entityRegistry.constants.has(importName);

    if (foundInFunctions || foundInClasses || foundInInterfaces || foundInTypes || foundInConstants) {
      return entityName;
    }

    // Check if it's already in our created entity names (this covers DTOs converted from interfaces)
    if (this.entityNames.has(entityName)) {
      return entityName;
    }

    // For type imports from ./types, they should resolve to Constants entities
    // But defer until they're actually created
    if (specifier.includes('types') && this.isTypeOrConstantName(importName)) {
      return undefined;
    }

    return undefined;
  }

  private isTypeOrConstantName(name: string): boolean {
    // Check if this looks like a type alias or constant
    const typeAliasNames = ['EntityType', 'ReferenceType', 'AnyEntity', 'EntityTypeName'];
    const constantNames = ['ENTITY_PATTERNS', 'CONTINUATION_PATTERNS', 'GENERAL_PATTERNS', 'ENTITY_TYPE_NAMES', 'PATTERN_DESCRIPTIONS'];

    return typeAliasNames.includes(name) || constantNames.includes(name);
  }

  private convertExports(module: ParsedModule, excludeName?: string): string[] {
    const exportNames: string[] = [];
    const seenNames = new Set<string>();

    for (const exp of module.exports) {
      if (exp.name !== excludeName && this.isValidEntityName(exp.name) && !seenNames.has(exp.name) && !this.isReExport(exp)) {
        exportNames.push(exp.name);
        seenNames.add(exp.name);
      }
    }

    return exportNames;
  }

  private isReExport(exportItem: any): boolean {
    // Check if this export has a source (indicating it's a re-export)
    return exportItem.source !== undefined;
  }

  private isConstantExported(constant: { name: string }, module: ParsedModule): boolean {
    return module.exports.some((exp) => exp.name === constant.name && exp.type === 'constant');
  }

  private extractInputDTO(func: ParsedFunction): string | undefined {
    // Look for single parameter that looks like a DTO
    if (func.parameters.length === 1) {
      const param = func.parameters[0];
      if (param && this.isDTOLikeType(param.type)) {
        // If this is an external type, add it to the dependency's exports
        this.addExternalTypeToDepExports(param.type);
        return param.type;
      }
    }
    return undefined;
  }

  private extractOutputDTO(func: ParsedFunction): string | undefined {
    const returnType = func.returnType.replace(/^Promise<(.+)>$/, '$1');
    if (this.isDTOLikeType(returnType)) {
      // If this is an external type, add it to the dependency's exports
      this.addExternalTypeToDepExports(returnType);
      return returnType;
    }
    return undefined;
  }

  private isObjectLikeType(type: string): boolean {
    return type.includes('{') || type.includes('Record<') || type.includes('Map<');
  }

  private isDTOLikeType(type: string): boolean {
    // Check if type looks like a custom DTO (not primitive)
    const primitives = ['string', 'number', 'boolean', 'void', 'any', 'unknown', 'null', 'undefined'];
    const cleaned = type.replace(/\[\]$/, ''); // Remove array suffix
    return !primitives.includes(cleaned.toLowerCase()) && cleaned.charAt(0).toUpperCase() === cleaned.charAt(0);
  }

  private addExternalTypeToDepExports(typeName: string): void {
    // Clean the type name (remove array suffixes, Promise wrapper, etc.)
    const cleanedType = typeName.replace(/\[\]$/, '').replace(/^Promise<(.+)>$/, '$1');

    // Check if this type is from an external package
    const packageName = this.externalTypeToPackage.get(cleanedType);
    if (packageName) {
      // Find the dependency entity
      const depEntity = this.dependencies.get(packageName);
      if (depEntity) {
        // DependencyNode.exports is readonly (EntityNode fields are populated
        // once at construction, never written back — no_side_effects rule).
        // Add the type to a rebuilt node's exports if not already there.
        const existingExports = depEntity.exports ?? [];
        if (!existingExports.includes(cleanedType)) {
          this.dependencies.set(
            packageName,
            new DependencyNode({
              name: depEntity.name,
              span: depEntity.span,
              raw: depEntity.raw,
              sourceForm: depEntity.sourceForm,
              purpose: depEntity.purpose,
              version: depEntity.version,
              exports: [...existingExports, cleanedType],
            }),
          );
        }
      }
    }
  }

  private parseTypeToFields(type: string): DtoFieldNode[] {
    // Simple parsing - could be enhanced with proper TypeScript type parsing
    const fields: DtoFieldNode[] = [];

    if (type.startsWith('{') && type.endsWith('}')) {
      const content = type.slice(1, -1);
      const properties = this.parseObjectProperties(content);

      for (const prop of properties) {
        const propType = this.sanitizeFieldType(prop.type);
        fields.push(
          new DtoFieldNode({
            name: prop.name,
            type: propType,
            // See the convertInterfaceToDTO construction site's comment
            // (rfc-tm-8-diamond.md §2, X-TYPE-2) for why parseTypeExprText.
            typeExpr: parseTypeExprText(propType).typeExpr,
            optionalityMarker: prop.optional ? 'question' : 'none',
            span: SYNTHETIC_SPAN,
          }),
        );
      }
    }

    return fields;
  }

  private sanitizeFieldType(fieldType: string): string {
    // Fix discriminated union issues - convert 'Function' type to string literal
    if (fieldType === 'Function') {
      return 'string'; // Functions should be string literals in DTOs
    }

    // Convert literal union types to string
    if (fieldType.includes("'") && fieldType.includes('|')) {
      return 'string'; // Union of string literals -> string
    }

    // Convert entity types to string literals (they're usually discriminated unions)
    const entityTypePattern = /^'(Program|File|Function|Class|ClassFile|Constants|DTO|Asset|UIComponent|RunParameter|Dependency)'$/;
    if (entityTypePattern.test(fieldType)) {
      return 'string';
    }

    // Clean up the type string
    return fieldType.trim();
  }

  private convertTypeToSchema(type: string): string {
    // Convert TypeScript types to schema names
    if (type.includes('[]')) {
      return 'Array';
    }
    if (type.includes('Record<')) {
      return 'Record';
    }
    if (type.includes('Map<')) {
      return 'Map';
    }
    if (type.includes('{') && type.includes('}')) {
      return 'Object';
    }

    return type;
  }

  private parseObjectProperties(content: string): Array<{ name: string; type: string; optional: boolean }> {
    // Very simple parser - would need enhancement for complex types
    const properties: Array<{ name: string; type: string; optional: boolean }> = [];
    const lines = content.split(/[;,\n]/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(/^(\w+)(\?)?\s*:\s*(.+)$/);
      if (match?.[1] && match[3]) {
        properties.push({
          name: match[1],
          type: match[3],
          optional: !!match[2],
        });
      }
    }

    return properties;
  }

  private getRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath);
  }

  private sanitizeEntityName(name: string): string {
    // Convert to PascalCase and remove invalid characters
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^(\d)/, '_$1') // Ensure doesn't start with number
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  private isValidEntityName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private deriveProgramName(fileName: string): string {
    const base = this.sanitizeEntityName(fileName);
    return base.endsWith('App') ? base : `${base}App`;
  }

  private addError(message: string, filePath?: string): void {
    const error: ConversionError = {
      message,
      filePath: filePath || undefined,
      line: undefined,
      column: undefined,
    };
    this.errors.push(error);
  }

  private addWarning(message: string, filePath?: string, suggestion?: string): void {
    const warning: ConversionWarning = {
      message,
      filePath: filePath || undefined,
      suggestion: suggestion || undefined,
    };
    this.warnings.push(warning);
  }

  private isFunctionExported(func: ParsedFunction, module: ParsedModule): boolean {
    // Check if function is in module exports
    return module.exports.some((exp) => exp.name === func.name);
  }

  private isExternalPackage(specifier: string): boolean {
    // Check if it's a Node.js built-in or external package
    return !specifier.startsWith('.') && !specifier.startsWith('/');
  }

  private isModuleEntryPoint(module: ParsedModule): boolean {
    // Check if this module's file path matches any entry point
    const relativePath = this.getRelativePath(module.filePath);
    return this.entryPoints.has(relativePath);
  }

  private findEntryEntityName(entryFilePath: string): string {
    const relativePath = this.getRelativePath(entryFilePath);

    // Look for a File entity (Programs can only reference File entities)
    const matchingFileEntity = this.entities.find((entity) => {
      if (entity.kind === 'File' && 'path' in entity) {
        return entity.path === relativePath;
      }
      return false;
    });

    if (matchingFileEntity) {
      return matchingFileEntity.name;
    }

    // Since we force File entity creation for entry points in convertModule,
    // this should always find a File entity. Fallback to predictable name.
    const fileName = path.basename(entryFilePath, path.extname(entryFilePath));
    return this.sanitizeEntityName(`${fileName}File`);
  }

  private createNamespaceEntity(namespaceName: string, specifier: string): void {
    const entityName = createEntityName(namespaceName);

    // Don't create if it already exists
    if (this.entityNames.has(entityName)) {
      return;
    }

    this.entityNames.add(entityName);

    // For external packages, check if it's a known namespace with methods
    const methods = this.extractNamespaceMethods(namespaceName, specifier);

    const namespaceEntity = new ClassNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} <: NamespaceImport`,
      sourceForm: 'shortform',
      extends: undefined,
      implements: ['NamespaceImport'], // Mark as namespace import
      methods: methods,
      purpose: `Namespace import: ${namespaceName} from ${specifier}`,
    });

    this.entities.push(namespaceEntity);
  }

  private extractNamespaceMethods(_namespaceName: string, specifier: string): string[] {
    // For external packages, we might know common methods
    const knownNamespaceMethods: Record<string, string[]> = {
      path: ['join', 'resolve', 'dirname', 'basename', 'extname', 'relative'],
      fs: ['readFile', 'writeFile', 'exists', 'mkdir', 'readdir'],
      util: ['promisify', 'inspect', 'format', 'deprecate'],
      crypto: ['createHash', 'randomBytes', 'createCipher'],
      os: ['platform', 'arch', 'type', 'release', 'hostname'],
    };

    // Check if it's a known Node.js namespace
    if (this.isExternalPackage(specifier)) {
      const packageMethods = knownNamespaceMethods[specifier];
      if (packageMethods) {
        return [...packageMethods];
      }
    }

    // For internal modules, try to extract methods from export registry
    const moduleExports = this.exportRegistry[specifier];
    if (moduleExports) {
      return Array.from(moduleExports.namedExports);
    }

    // Default fallback - we'll add common methods that might be called
    return ['default']; // Most namespaces have at least some callable methods
  }
}
