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
  SuppressionNode,
  SyntaxEmitter,
  TypeDefNode,
  type TypeExprNode,
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
  SuppressionReason,
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

// RFC-TM-10 §4 (rfc-tm-10-diamond.md, D-LEG-4, issue #60, LEAD RULING:
// collapse never truncate) — the analyzer (X-AN-6) extracts a JSDoc
// comment's full multi-paragraph text correctly; the converter previously
// emitted that raw multi-line text verbatim into a single-line grammar
// production (the `string` token excludes newlines, `grammar.js:1159`),
// desyncing the parser on the first embedded blank line. This pure
// function collapses to the grammar's single-line shape WITHOUT truncating
// to a sentence: split on the JSDoc paragraph boundary (a blank line), keep
// the ENTIRE first paragraph however long, whitespace-normalize it to one
// line. Every purpose/description assignment site routes through this.
const collapseDescription = (raw: string): string => {
  const [firstParagraph] = raw.split(/\n\s*\n/);
  return (firstParagraph ?? '').replace(/\s+/g, ' ').trim();
};

// RFC-TM-10 follow-up (issue #77) — `extractInputDTO`/`extractOutputDTO`
// classify a type as DTO-like BY KIND (`isDTOLikeType`, D-LEG-1/D-LEG-5), but
// the grammar's `input_name`/`output_name` productions
// (`grammar.js:811,815`) accept ONLY a bare `entity_name` token
// (`grammar.js:1155`, `/[A-Za-z_]\w*/`). A DTO-like type is not always a
// bare identifier: a union with `null`/`undefined`
// (`HydratedTenantRecord | null`), an array suffix (`OrganizationApiKey[]`),
// a generic-argument suffix (`MiddlewareHandler<IngestEnv>`,
// `Record<string, unknown>`), or a bare function type (`() => void`) are all
// DTO-like by `isDTOLikeType`'s elimination branch but illegal in the
// bare-identifier-only slot. This guard is the mechanical check that
// prevents assigning any of those shapes to `input`/`output`: exactly the
// same regex the grammar itself uses for `entity_name`, applied before the
// emission, not re-derived heuristically.
const isBareEntityName = (type: string): boolean => /^[A-Za-z_]\w*$/.test(type);

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
  // RFC-TM-10 Q3 amendment (lead-authorized, X-CONV-4 extension) — a
  // top-level function that collided on its bare name and was renamed to
  // `<baseName>__<name>` by `convertFunction`. `convertExports` consults
  // this so a File/ClassFile's `exports:` list names the FUNCTION'S ACTUAL
  // emitted entity name, not its raw source name — otherwise the export
  // list would reference a name no entity carries, producing a dangling
  // reference the checker would flag. Keyed by `${modulePath}::${rawName}`
  // (NOT bare raw name alone — the live webhookstorage clone has four
  // different modules each independently exporting a function named
  // `handler`, so a bare-name key would collide across modules the same
  // way the entity names themselves did). Scoped to the current `convert()`
  // call, cleared in `reset()` like every other per-run map here.
  private readonly functionNameRemap = new Map<string, string>();
  private readonly dependencies = new Map<string, DependencyNode>();
  private readonly externalTypeToPackage = new Map<string, string>(); // Maps external types to their package
  private entryPoints = new Set<string>();
  // X-CONV-5 — builtin `extends` targets (`Error`, `Map`, `EventEmitter`,
  // ...) synthesized as stub ClassNode entities on demand. Keyed by
  // entity name so a target referenced from multiple classes/modules gets
  // exactly one stub, following the existing Node-builtins purpose-map
  // precedent (`derivePurpose`'s `nodeBuiltins` table).
  private readonly builtinExtendsStubNames = new Set<string>();
  // RFC-TM-10 §3 (rfc-tm-10-diamond.md, D-LEG-3, issue #61, LEAD RULING: no
  // new sigil). A namespace-qualified `implements` target (`ts.ParseConfigFileHost`)
  // is unrepresentable by the grammar's `entity_name` token (no `.` accepted)
  // — `ensureNamespaceImplementsStub` sanitizes it to a valid identifier and
  // synthesizes a bare stub ClassNode, mirroring `builtinExtendsStubNames`'s
  // idempotent one-stub-per-name discipline so a target referenced by
  // multiple classes shares one stub. Deliberately UNBOUNDED (unlike the
  // curated `KNOWN_AMBIENT_EXTENDS_TARGETS` allowlist below) because
  // `implements` targets are structural — they can never introduce a real
  // inheritance edge the checker's unknown-base-class/circular-inheritance
  // rules police.
  private readonly namespaceImplementsStubNames = new Set<string>();
  // RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) — predicts, at Phase 1
  // registration time, whether a `types`-registry name will end up a
  // DtoNode (object-like type alias, `imports.to`-legal) or a TypeDefNode
  // (enum, or non-object-like alias, `imports.to`-ILLEGAL per TM-8's frozen
  // scope — "No other reference verb changes" beyond `schema.to`,
  // rfc-tm-8-diamond.md §5). `resolveImportToEntity` consults this so a
  // File's `imports`/`exports` list never names a TypeDef, which the
  // checker rejects outright (`checker/reference-to-illegal`). The
  // prediction reuses `isObjectLikeType` — the SAME pure function Phase 2's
  // `convertTypeAliasToDTO` branches on — so it cannot diverge from the
  // actual emitted kind. Enums always predict TypeDef (X-CONV-2 never
  // routes an enum to DTO).
  private readonly typesRegistryPredictedKind = new Map<string, 'DTO' | 'TypeDef'>();
  // X-CONV-3 — the target project's root, supplied by the analysis this
  // convert() call is processing. `getRelativePath`/`filterModules`
  // relativize against this, never `process.cwd()`, so extraction produces
  // identical paths whether the CLI runs from inside or outside the target
  // project. Set at the top of `convert()`; a fresh `TypeScriptAnalyzer`
  // property per analysis, matching the rest of this class's per-conversion
  // reset discipline.
  private projectRoot: string = process.cwd();

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
    // X-CONV-3 — every relativization this conversion performs targets the
    // analysis's own project root, not this process's cwd.
    this.projectRoot = analysis.projectRoot;

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
      // X-SUPP-6 — computed after every entity exists (the detection walks
      // the FULL cross-file import graph, so it must run after
      // convertModules/generatePrograms, not per-module).
      const suppressions = this.computeSuppressions(sortedEntities);
      const tmdContent = this.emitter.emitShortform({
        entities: sortedEntities,
        imports: [],
        suppressions,
        diagnostics: [],
      });

      return {
        success: this.errors.length === 0,
        entities: sortedEntities,
        tmdContent,
        errors: [...this.errors],
        warnings: [...this.warnings],
        suppressionCounts: this.countSuppressionsByReason(suppressions),
      } as const;
    } catch (error) {
      this.addError(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);

      // X-CONV-4/I-13 — degrade, never discard. Whatever entities were
      // collected onto `this.entities` before the exception are still real,
      // still-valid partial output; emitting them (instead of the prior
      // `entities: [], tmdContent: ''` total discard) is what makes a
      // mid-conversion failure survivable — the operator gets a partial
      // `.tmd` plus the error, not nothing. `success: false` and a nonzero
      // CLI exit still apply (see cli.ts) so a partial result can never be
      // mistaken for a clean one. The emit itself is defensively guarded:
      // a second failure while degrading must not re-throw past this
      // method — that would turn "degrade" back into "discard".
      let sortedEntities: readonly EntityNode[] = [];
      let tmdContent = '';
      try {
        sortedEntities = sortIntoLegacySectionOrder(this.entities);
        tmdContent = this.emitter.emitShortform({ entities: sortedEntities, imports: [], suppressions: [], diagnostics: [] });
      } catch (emitError) {
        this.addError(`Partial-output emission also failed: ${emitError instanceof Error ? emitError.message : String(emitError)}`);
        sortedEntities = [...this.entities];
      }

      return {
        success: false,
        entities: sortedEntities,
        tmdContent,
        errors: [...this.errors],
        warnings: [...this.warnings],
        // X-SUPP-6 — a degraded/partial conversion emits zero suppressions:
        // the cross-file import graph a suppression's absence-of-reference
        // claim depends on is exactly what a mid-conversion failure leaves
        // incomplete, so asserting "unmodelable but correct" here would be
        // unfounded rather than degraded.
        suppressionCounts: this.emptySuppressionCounts(),
      } as const;
    }
  }

  private emptySuppressionCounts(): Record<SuppressionReason, number> {
    // RFC-TM-10 §9 (D-LEG-9) — 'test-only-consumer' removed from
    // SuppressionReason (types.ts); see that type's comment for the
    // removal rationale.
    return { 'generated-single-file-scope': 0 };
  }

  private countSuppressionsByReason(suppressions: readonly SuppressionNode[]): Record<SuppressionReason, number> {
    const counts = this.emptySuppressionCounts();
    for (const suppression of suppressions) {
      // SuppressionNode.reason is a bare `string` (lib/typed-mind's
      // ast/suppression-node.ts — no enumerated reason type exists at that
      // layer). The cast is safe here because this converter is the ONLY
      // producer of every suppression it counts: `computeSuppressions`
      // (below) never constructs a SuppressionNode with a reason outside
      // `SuppressionReason`'s sole member (narrowed from two per RFC-TM-10
      // §9, D-LEG-9), so every value flowing into this loop is provably it.
      const reason = suppression.reason as SuppressionReason;
      counts[reason] = (counts[reason] ?? 0) + 1;
    }
    return counts;
  }

  // RFC-TM-9 §9 (rfc-tm-9-diamond.md, X-SUPP-6) — "the extractor emits a
  // suppression only for enumerated graph shapes that are correct in source
  // but unmodelable." The one reason this Quantum can trigger deterministically
  // is 'generated-single-file-scope' (the census's CstBlockKw class): "only
  // self-references inside its own generated file... no cross-file import
  // exists anywhere" (extraction-gap-census-language.md). The converter's
  // OWN Phase-1 registry (`entityRegistry.classes`, populated in
  // `collectModuleEntities` from `module.exports`) already records whether a
  // class was ever exported from its declaring module — a non-exported
  // TypeScript symbol is, by the language's own scoping rules, categorically
  // unreachable from any other file, so it cannot have a real cross-file
  // consumer for the checker's orphan rule to find. `convertToSeparateEntities`
  // (unlike the function/interface/type/enum/constant lanes, which all gate
  // on export status before converting) unconditionally promotes EVERY class
  // to a top-level entity regardless of export — this is what puts a
  // module-private class in the graph as a real, checker-visible orphan
  // candidate while carrying the same "used only within its own file" shape
  // the census adjudicated as checker-right-but-suppressible.
  //
  // Scope discipline: only 'Class'-kind entities are checked against this
  // signal (the one lane with the unconditional-conversion gap); every other
  // kind already gates on export before an entity is created at all, so a
  // non-exported symbol of those kinds never reaches `entities` in the first
  // place — there is nothing here for them to match. Program/Dependency/
  // File/ClassFile are never suppression targets (orphan-file has its own
  // code the checker uses; Program/Dependency are exempt orphan candidates
  // by the checker's own rule). X-AN-10/X-AN-11 shapes are excluded by
  // design (they are modelable via real edges, never suppressed — doc §6/§9).
  private computeSuppressions(entities: readonly EntityNode[]): SuppressionNode[] {
    const suppressions: SuppressionNode[] = [];
    for (const entity of entities) {
      if (entity.kind !== 'Class') {
        continue;
      }
      const registryEntry = this.entityRegistry.classes.get(entity.name);
      if (registryEntry === undefined || registryEntry.exported) {
        continue;
      }
      const reason: SuppressionReason = 'generated-single-file-scope';
      suppressions.push(
        new SuppressionNode({
          target: entity.name,
          code: 'checker/orphaned-entity',
          reason,
          span: SYNTHETIC_SPAN,
          raw: `suppress ${entity.name} checker/orphaned-entity "${reason}"`,
        }),
      );
    }
    return suppressions;
  }

  private reset(): void {
    this.errors.length = 0;
    this.warnings.length = 0;
    this.entities.length = 0;
    this.entityNames.clear();
    this.functionNameRemap.clear();
    this.dependencies.clear();
    this.externalTypeToPackage.clear();
    this.entryPoints.clear();
    this.builtinExtendsStubNames.clear();
    this.namespaceImplementsStubNames.clear();
    this.typesRegistryPredictedKind.clear();

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
      const relativePath = this.getRelativePath(module.filePath);
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

    // Separate pure types files from regular files for proper ordering.
    // X-CONV-3 — a declared entry point is NEVER routed through the
    // pure-types path, even when its own module shape (e.g. `export const
    // app = new Hono()`, a plain constant with no classes/functions) would
    // otherwise qualify as "pure types". `isPureTypesFile` only inspects the
    // module's own shape and has no entry-point awareness; entry points are
    // forced to `convertToSeparateEntities` below (`isModuleEntryPoint`
    // already gates the ClassFile-fusion branch inside `processModule` the
    // same way — this is that same forcing rule applied one level up, where
    // the pure-types/regular split happens before `processModule` runs).
    const pureTypesFiles: ParsedModule[] = [];
    const regularFiles: ParsedModule[] = [];

    for (const module of modules) {
      if (this.isPureTypesFile(module) && !this.isModuleEntryPoint(module)) {
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
      // See `typesRegistryPredictedKind`'s field comment.
      this.typesRegistryPredictedKind.set(type.name, this.isObjectLikeType(type.type) ? 'DTO' : 'TypeDef');
    }

    // X-AN-7/X-CONV-2 — collect real TS enums into the SAME registry bucket
    // as type aliases (they share the 'type' export lane; see the analyzer's
    // export-registration comment). Without this, `resolveImportToEntity`'s
    // registry membership check (functions/classes/interfaces/types/
    // constants) never finds an enum name, so an import of an enum-typed
    // symbol silently drops from the importing File's `imports` list —
    // exactly the dropped-import-edge shape the census's gap 1/A-g1 family
    // catalogs, and precisely what would make `checkOrphans` misreport an
    // actually-consumed TypeDef as orphaned.
    for (const enumDef of module.enums ?? []) {
      const entityInfo: EntityInfo = {
        name: enumDef.name,
        type: 'type',
        sourceFile,
        exported: module.exports.some((exp) => exp.name === enumDef.name),
      };
      this.entityRegistry.types.set(enumDef.name, entityInfo);
      this.typesRegistryPredictedKind.set(enumDef.name, 'TypeDef');
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

    // Check if this is a pure types/constants file. X-CONV-3 — an entry
    // point is never treated as pure-types here either, so a script-shaped
    // entrypoint (a plain constant initializer, no classes/functions) still
    // gets its File entity even if this method is reached directly instead
    // of through `convertModules`'s pre-partitioned `regularFiles` list.
    const isPureTypesFile = this.isPureTypesFile(module) && !isEntryPoint;

    // Decide whether to create separate entities or use ClassFile fusion
    const hasClasses = module.classes.length > 0;
    const hasFunctions = module.functions.length > 0;
    const hasExports = module.exports.length > 0;

    // RFC-TM-10 Q3 amendment (lead-authorized, X-CONV-4 extension) —
    // reserve this module's function entity names exactly once here, before
    // EITHER downstream path (`convertToClassFile`, which may itself
    // fall back to `convertToSeparateEntities`) builds an entity whose
    // `exports:` list needs the final, possibly-disambiguated name. `pure
    // types/constants` files have no functions by definition
    // (`isPureTypesFile`), so this is a no-op for that branch.
    if (!isPureTypesFile) {
      this.reserveFunctionEntityNames(module, entityName);
    }

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
    // A file is considered "pure types" if it only exports types, interfaces,
    // enums, and constants and doesn't have any classes or functions (except
    // type-only exports). X-AN-7/X-CONV-2 — a file containing ONLY a real TS
    // `enum` (e.g. `export enum Status { ... }`, no classes/functions) must
    // classify as pure-types the same way a type-alias-only file already
    // does; without `module.enums` here, 14-enum's `src/status.ts` would
    // fall through to `convertToSeparateEntities` and gain a redundant File
    // entity a types-only source file should not have.
    const hasRealCode = module.classes.length > 0 || module.functions.length > 0;
    const hasTypesOrConstants =
      module.types.length > 0 || module.interfaces.length > 0 || module.constants.length > 0 || (module.enums?.length ?? 0) > 0;

    return !hasRealCode && hasTypesOrConstants;
  }

  private convertTypesAndConstants(module: ParsedModule): void {
    // Convert all type aliases FIRST (they become TypeDef/DTO entities with their exact names)
    for (const typeAlias of module.types) {
      if (this.isTypeAliasExported(typeAlias, module)) {
        this.convertTypeAliasToDTO(typeAlias);
      }
    }

    // X-AN-7/X-CONV-2 — enums emit as TM-8's TypeDef entity kind (variant:
    // 'enum'), the same lane as type aliases, not the Constants lane.
    for (const enumDef of module.enums ?? []) {
      if (this.isEnumExported(enumDef, module)) {
        this.convertEnumToTypeDef(enumDef);
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

  // X-AN-7 registers a real enum's export as `type: 'type'` (typescript-
  // analyzer.ts), matching the type-alias export lane — see that change's
  // comment for why 'type' rather than 'constant'.
  private isEnumExported(enumDef: { name: string }, module: ParsedModule): boolean {
    return module.exports.some((exp) => exp.name === enumDef.name && exp.type === 'type');
  }

  // X-CONV-5 — a class extending a global ambient builtin (`class
  // NotionApiError extends Error`) has no declared entity for the checker's
  // every-reference-resolves rule to find; `checkInheritanceChains` rejects
  // any `extends` target `context.byName` doesn't contain, and `extends.to`
  // (valid-references.ts) only admits `['Class', 'ClassFile']` — a
  // Dependency-kind stub fails that check (verified: `Cannot use 'extends'
  // to reference Dependency`), so the stub must be a ClassNode. Zero
  // checker change: this only ever adds a declared entity the existing
  // reference-legality rule already accepts.
  //
  // Scope discipline: the doc names this a fix for "ambient-global `extends`
  // targets (`Error`, `Map`, `EventEmitter`, ...)" — a curated allowlist,
  // the same shape as `derivePurpose`'s `nodeBuiltins` table, NOT a catch-all
  // for every unresolvable extends target. A class extending a genuinely
  // undeclared, non-builtin base (a real bug in the source, or an
  // intentionally-incomplete test fixture) must still fail the checker's
  // `unknown-base-class` finding exactly as before this Quantum — silently
  // stubbing arbitrary unresolved names would mask that real error class,
  // which is not what the census gap or the doc's Solution ask for.
  private static readonly KNOWN_AMBIENT_EXTENDS_TARGETS: ReadonlyMap<string, string> = new Map([
    ['Error', 'Ambient global error type'],
    ['Map', 'Ambient global keyed-collection type'],
    ['Set', 'Ambient global unique-value collection type'],
    ['Array', 'Ambient global indexed-collection type'],
    ['EventEmitter', 'Ambient Node.js event-emitter type'],
    ['Promise', 'Ambient global asynchronous-value type'],
  ]);

  // Returns the stub's entity name when `extendsTarget` is a KNOWN ambient
  // builtin that needed one synthesized (idempotent — a target referenced
  // by multiple classes shares one stub), or undefined when the target
  // already resolves to a real declared entity, or is not in the known
  // ambient-builtins allowlist (in which case no stub is created and the
  // checker's existing unresolved-extends error stands).
  private ensureBuiltinExtendsStub(extendsTarget: string | undefined): string | undefined {
    if (extendsTarget === undefined || extendsTarget.length === 0) {
      return undefined;
    }

    const purpose = TypeScriptToTypedMindConverter.KNOWN_AMBIENT_EXTENDS_TARGETS.get(extendsTarget);
    if (purpose === undefined) {
      return undefined;
    }

    const entityName = createEntityName(extendsTarget);
    if (this.entityRegistry.classes.has(extendsTarget) || this.entityRegistry.interfaces.has(extendsTarget)) {
      // A real class/interface in the analyzed source happens to share a
      // name with a known ambient builtin (e.g. a project defines its own
      // `Error` class) — the real declared entity wins, no stub needed.
      return undefined;
    }

    if (!this.builtinExtendsStubNames.has(entityName)) {
      this.builtinExtendsStubNames.add(entityName);
      this.entityNames.add(entityName);

      // No methods list: the stub represents an opaque ambient type, not a
      // modeled API surface — `classToShortform` omits the `=> [...]` line
      // entirely when `methods` is empty, so this emits as a bare `<:`
      // declaration with no unparsable empty-bracket continuation.
      const stubEntity = new ClassNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: `${entityName} <:`,
        sourceForm: 'shortform',
        extends: undefined,
        implements: [],
        methods: [],
        purpose,
      });

      this.entities.push(stubEntity);
    }

    return entityName;
  }

  // RFC-TM-10 §3 (D-LEG-3, issue #61, LEAD RULING: no new sigil, `<:`
  // mapping with representable qualified names). A namespace-qualified
  // `implements` target's text contains a `.` (`ts.ParseConfigFileHost`) —
  // the grammar's `entity_name` token accepts no dot, so the converter must
  // not emit it verbatim. `sanitizeEntityName` already strips non-
  // `[a-zA-Z0-9_]` characters (including `.`) and PascalCases the remainder
  // (`ts.ParseConfigFileHost` -> `TsParseConfigFileHost`), the same
  // deterministic transform X-CONV-4 already proved collision-safe. The
  // stub is a bare ClassNode (zero methods, matching X-CONV-5's own
  // zero-methods emission shape) so it never introduces a real inheritance
  // edge the checker's unknown-base-class/circular-inheritance rules
  // police — an `implements` target is structural, not a base class.
  private ensureNamespaceImplementsStub(target: string): string {
    const entityName = this.sanitizeEntityName(target);

    if (!this.namespaceImplementsStubNames.has(entityName)) {
      this.namespaceImplementsStubNames.add(entityName);
      this.entityNames.add(entityName);

      const stubEntity = new ClassNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: `${entityName} <:`,
        sourceForm: 'shortform',
        extends: undefined,
        implements: [],
        methods: [],
        purpose: 'Ambient namespace-qualified interface (auto-stubbed)',
      });

      this.entities.push(stubEntity);
    }

    return entityName;
  }

  // Converts a class's raw `implements` target list (which may include
  // TypedMind's own convention of folding secondary `extends` targets into
  // `implements`, per `cls.extends.slice(1)` at the call site) into the
  // grammar-representable list: a namespace-qualified target (contains `.`)
  // is replaced by its sanitized stub's entity name; a bare identifier
  // target passes through unchanged.
  private convertImplementsList(secondaryExtends: readonly string[], implementsTargets: readonly string[]): string[] {
    return [...secondaryExtends, ...implementsTargets].map((target) =>
      target.includes('.') ? this.ensureNamespaceImplementsStub(target) : target,
    );
  }

  // Collects the namespace-implements stub names newly needed by a module's
  // own classes, so the caller (mirroring `collectBuiltinExtendsStubImports`)
  // can fold them into that module's File/ClassFile `imports` list — a stub
  // is otherwise unreferenced by any import edge, which would leave it
  // orphaned by the checker's orphan rule (`implements` is never counted as
  // a reference, per check-orphans.ts).
  private collectNamespaceImplementsStubImports(classes: readonly ParsedClass[]): string[] {
    const stubNames: string[] = [];
    for (const cls of classes) {
      for (const target of cls.implements) {
        if (target.includes('.')) {
          stubNames.push(this.ensureNamespaceImplementsStub(target));
        }
      }
    }
    return stubNames;
  }

  // Collects the builtin-extends stub names newly needed by a module's own
  // classes, so the caller can fold them into that module's File/ClassFile
  // `imports` list. A stub is otherwise unreferenced by any import edge
  // (nothing in source literally imports `Error`), which would leave it
  // orphaned by the checker's orphan rule (`extends`/`implements` are never
  // counted as references, per check-orphans.ts) — folding the stub into
  // the owning file's declared imports is what gives the checker's
  // reachability computation an honest edge to find, mirroring how a real
  // TS `extends Error` clause is itself a live reference to the global.
  private collectBuiltinExtendsStubImports(classes: readonly ParsedClass[]): string[] {
    const stubNames: string[] = [];
    for (const cls of classes) {
      const stubName = this.ensureBuiltinExtendsStub(cls.extends[0]);
      if (stubName !== undefined) {
        stubNames.push(stubName);
      }
    }
    return stubNames;
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

    // X-CONV-5 — synthesize a stub for the primary class's own extends
    // target (if it's an unmodelled builtin) plus any other class in this
    // module, before building this ClassFile's imports/exports lists. The
    // stub needs to appear in SOME file's `exports` (checkClassAndFunction
    // Exports requires every ClassNode to be exported by a file — ClassFile
    // is exempt via self-export, but a builtin stub is a plain ClassNode)
    // and in an import list somewhere so the orphan check sees a real
    // reference edge (extends is never counted as one). This ClassFile is
    // the only entity in this module with an honest claim to the ambient
    // global its source references, so it both imports and exports it.
    const primaryStubName = this.ensureBuiltinExtendsStub(primaryClass.extends[0]);
    const otherStubNames = this.collectBuiltinExtendsStubImports(module.classes.filter((cls) => cls !== primaryClass));
    // D-LEG-3 — namespace-qualified `implements` targets (`ts.Foo`) get the
    // same stub-import-folding treatment as builtin-extends targets: a stub
    // is otherwise unreferenced by any import edge, so it needs folding into
    // this ClassFile's imports/exports the same way `stubNames` already does
    // for builtin-extends stubs above.
    const primaryImplementsStubNames = this.collectNamespaceImplementsStubImports([primaryClass]);
    const otherImplementsStubNames = this.collectNamespaceImplementsStubImports(module.classes.filter((cls) => cls !== primaryClass));
    const stubNames = [
      ...(primaryStubName !== undefined ? [primaryStubName] : []),
      ...otherStubNames,
      ...primaryImplementsStubNames,
      ...otherImplementsStubNames,
    ];

    const classFileEntity = new ClassFileNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} #: ${this.getRelativePath(module.filePath)}`,
      sourceForm: 'shortform',
      path: this.getRelativePath(module.filePath),
      extends: primaryClass.extends[0] || undefined, // TypedMind supports single inheritance
      implements: this.convertImplementsList(primaryClass.extends.slice(1), primaryClass.implements),
      methods: this.convertMethods(primaryClass),
      imports: [...this.convertImports(module.imports, module.exports), ...stubNames],
      exports: [...this.convertExports(module, entityName), ...stubNames],
      purpose: primaryClass.description ? collapseDescription(primaryClass.description) : undefined,
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
        this.convertFunction(func, module.filePath);
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

    // X-AN-7/X-CONV-2 — enums emit as TM-8's TypeDef entity kind.
    for (const enumDef of module.enums ?? []) {
      if (this.isEnumExported(enumDef, module)) {
        this.convertEnumToTypeDef(enumDef);
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

      // X-CONV-5 — synthesize stubs for any of this module's classes that
      // extend an unmodelled builtin. `checkClassAndFunctionExports`
      // requires every ClassNode to appear in SOME file's `exports`
      // (check-exports.ts), and the orphan check needs a real import edge
      // to avoid flagging the stub (check-orphans.ts never counts
      // `extends`). The owning file both exports and imports its own
      // stub — it is the file that vouches for the ambient global its
      // source references (the stub isn't a member of this module, but
      // this module is the only place with an honest claim to it).
      // D-LEG-3 — same stub-import-folding treatment for namespace-qualified
      // `implements` targets as the builtin-extends stubs above.
      const stubNames = [
        ...this.collectBuiltinExtendsStubImports(module.classes),
        ...this.collectNamespaceImplementsStubImports(module.classes),
      ];

      const fileEntity = new FileNode({
        name: fileEntityName,
        span: SYNTHETIC_SPAN,
        raw: `${fileEntityName} @ ${this.getRelativePath(module.filePath)}:`,
        sourceForm: 'shortform',
        path: this.getRelativePath(module.filePath),
        imports: [...this.convertImports(module.imports, module.exports), ...stubNames],
        exports: [...this.convertExports(module), ...stubNames],
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
        this.convertFunction(func, module.filePath);
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

    // X-AN-7/X-CONV-2 — enums emit as TM-8's TypeDef entity kind.
    for (const enumDef of module.enums ?? []) {
      if (this.isEnumExported(enumDef, module)) {
        this.convertEnumToTypeDef(enumDef);
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
      implements: this.convertImplementsList(cls.extends.slice(1), cls.implements),
      methods: this.convertMethods(cls),
      purpose: cls.description ? collapseDescription(cls.description) : undefined,
    });

    this.entities.push(classEntity);
  }

  // RFC-TM-10 Q3 amendment (lead-authorized, D-LEG-6's live-clone check
  // binding): a real multi-target SST-handler codebase (the webhookstorage
  // clone) has multiple modules independently exporting a function literally
  // named `handler` (`packages/functions/src/api/index.ts`,
  // `.../auth/provision-tenant.ts`, `.../auth/teardown-tenant.ts`,
  // `.../auth/deletion-verification.ts`) — traversal-enqueue is the first
  // mechanism that ever traverses more than one of these together, so this
  // bare-name collision was latent, never triggered, before Q3. Called as a
  // PRE-PASS before either module-conversion path (`convertToClassFile`/
  // `convertToSeparateEntities`) builds its File/ClassFile entity — the
  // export list needs the FINAL emitted name before it can be built, so the
  // remap must exist before that point, not after `convertFunction` runs.
  // `baseName` is the module's own sanitized name (the same value used to
  // derive `<baseName>File`). On the FIRST occurrence of a name (globally,
  // across the whole conversion — `this.entityNames` is checked, not a
  // per-module set), the name stays BARE: this is the narrow half of the
  // guardrail, an uncollided function name is unaffected. Only on a
  // DETECTED collision is `<baseName>__<name>` recorded, reusing
  // `deriveProgramName`'s exact collision-proof rationale (X-CONV-4,
  // RFC-TM-9 §4): `sanitizeEntityName` collapses every run of underscores to
  // one and never re-inserts a separator when joining PascalCase parts, so
  // no sanitized identifier can ever contain `__` — a literal `__` separator
  // is provably outside `sanitizeEntityName`'s codomain and cannot collide
  // with any real entity name derived from source. Deterministic, no
  // runtime probe, no nondeterministic suffix (both rejected for the
  // identical reason in RFC-TM-9's own Rejected Alternatives for the Class
  // case). This pre-pass only RESERVES names in `this.entityNames` for
  // functions that will actually be converted (mirrors
  // `isFunctionExported`'s own filter) — it does not create entities.
  private reserveFunctionEntityNames(module: ParsedModule, baseName: string): void {
    for (const func of module.functions) {
      if (!this.isFunctionExported(func, module)) {
        continue;
      }
      const remapKey = `${module.filePath}::${func.name}`;
      const bareName = createEntityName(func.name);
      const finalName = this.entityNames.has(bareName) ? createEntityName(`${baseName}__${func.name}`) : bareName;
      this.functionNameRemap.set(remapKey, finalName);
      this.entityNames.add(finalName);
    }
  }

  private convertFunction(func: ParsedFunction, moduleFilePath: string): void {
    const remapKey = `${moduleFilePath}::${func.name}`;
    const entityName = this.functionNameRemap.get(remapKey);

    // `reserveFunctionEntityNames` runs as a pre-pass before every call site
    // that reaches `convertFunction` (`convertToClassFile`,
    // `convertToSeparateEntities`), reserving this exact key. A missing
    // entry means a call path that skipped the pre-pass — defensive, not
    // expected to fire: report it the same way every other name collision
    // in this converter reports, rather than silently emitting a bare,
    // possibly-colliding name.
    if (entityName === undefined) {
      this.addError(`Duplicate entity name: ${createEntityName(func.name)}`);
      return;
    }

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
      description: func.description ? collapseDescription(func.description) : undefined,
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
      // RFC-TM-8 §2 (rfc-tm-8-diamond.md, X-TYPE-2): the converter builds a
      // synthetic DtoFieldNode from an already-sanitized type string, not a
      // parsed CST subtree — parseTypeExprText (the same hand-rolled parser
      // the longform `type:` quoted-string value reuses) gives it a real
      // TypeExprNode instead of leaving the field's structure unpopulated.
      const typeExpr = parseTypeExprText(type).typeExpr;
      // D-LEG-2 (rfc-tm-10-diamond.md §2, issue #65) — every TypeExprNode
      // reachable from a DTO field is walked for a generic-argument
      // external type needing a Dependency-exports stub.
      this.walkGenericArgsForExternalStubs(typeExpr);
      return new DtoFieldNode({
        name: prop.name,
        type,
        typeExpr,
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
      purpose: iface.description ? collapseDescription(iface.description) : undefined,
    });

    this.entities.push(dtoEntity);
  }

  private convertTypeAliasToDTO(typeAlias: { name: string; type: string; description?: string }): void {
    const entityName = createEntityName(typeAlias.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    // Convert object-like type aliases to DTOs (unchanged by X-CONV-2 —
    // this shape stays a DTO regardless of the TM-8 TypeDef surface).
    if (this.isObjectLikeType(typeAlias.type)) {
      this.addEntityName(entityName, 'convertTypeAliasToDTO-objectLike');

      const dtoEntity = new DtoNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: `${entityName} %`,
        sourceForm: 'shortform',
        fields: this.parseTypeToFields(typeAlias.type),
        purpose: typeAlias.description ? collapseDescription(typeAlias.description) : undefined,
      });

      this.entities.push(dtoEntity);
      return;
    }

    // RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) — every other shape (union
    // type aliases like `EntityType`, and simple aliases to a named type or
    // primitive) is TM-8's TypeDef entity kind, `variant: 'alias'`, replacing
    // the deleted converter path that emitted a self-referential Constants
    // schema (`Name ! path : Name`, which the checker rejected by the
    // language's own design — L-g3/A-g9). The aliased type becomes a real
    // TypeExprNode via
    // the same hand-rolled parser DtoFieldNode construction already uses
    // (parseTypeExprText), so a DTO field typed by this alias resolves
    // through the checker's schema-position rules (valid-references.ts
    // `schema.to` includes 'TypeDef') instead of tripping
    // `Cannot use 'schema' to reference <kind>`.
    this.addEntityName(entityName, 'convertTypeAliasToDTO-alias');

    const aliasType = parseTypeExprText(typeAlias.type).typeExpr;
    // D-LEG-2 (rfc-tm-10-diamond.md §2, issue #65) — walk the alias's
    // TypeExprNode for any generic-argument external type needing a
    // Dependency-exports stub.
    this.walkGenericArgsForExternalStubs(aliasType);

    const typeDefEntity = new TypeDefNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} = ${typeAlias.type}`,
      sourceForm: 'shortform',
      variant: 'alias',
      aliasType,
      purpose: typeAlias.description ? collapseDescription(typeAlias.description) : undefined,
    });

    this.entities.push(typeDefEntity);
  }

  // RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) — a real TS `enum` emits as
  // TM-8's TypeDef entity kind, `variant: 'enum'`, carrying the member-name
  // list from X-AN-7's ParsedEnum. Replaces the pre-TM-9 path where an enum
  // fell through to the generic Constants lane with its member list dropped
  // entirely (the analyzer captured `isEnum`/`enumValues` but the converter
  // never read them — confirmed zero references before this Quantum).
  private convertEnumToTypeDef(enumDef: { name: string; members: readonly string[]; description?: string }): void {
    const entityName = createEntityName(enumDef.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.addEntityName(entityName, 'convertEnumToTypeDef');

    const typeDefEntity = new TypeDefNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} = enum [${enumDef.members.join(', ')}]`,
      sourceForm: 'shortform',
      variant: 'enum',
      members: enumDef.members,
      purpose: enumDef.description ? collapseDescription(enumDef.description) : undefined,
    });

    this.entities.push(typeDefEntity);
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

  private generatePrograms(entryPoints: readonly string[], modules: ParsedModule[]): void {
    if (entryPoints.length === 0) {
      this.addWarning('No entry points detected, generating a default program');

      // Create a default program pointing to the first module
      if (modules.length > 0) {
        const firstModule = modules[0];
        if (firstModule) {
          this.createProgramEntity('DefaultApp', firstModule.filePath, firstModule.selfInvokedFunctionNames);
        }
      }
      return;
    }

    for (const entryPoint of entryPoints) {
      const fileName = path.basename(entryPoint, path.extname(entryPoint));
      const programName = this.deriveProgramName(fileName);
      const entryModule = modules.find((module) => module.filePath === entryPoint);
      this.createProgramEntity(programName, entryPoint, entryModule?.selfInvokedFunctionNames ?? []);
    }
  }

  private createProgramEntity(programName: string, entryFilePath: string, selfInvokedFunctionNames: readonly string[] = []): void {
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

    // X-AN-11 — fold the entrypoint's self-invoked function names (from the
    // `import.meta.url` guard) into the same Program.exports list. This is
    // the honest-fact fix: the guarded function IS a real graph root, and
    // Program.exports is the existing, language-optional field the checker's
    // orphan rule already unions into its referenced-names set
    // (check-orphans.ts's `collectReferencedNames`) — no FileNode change,
    // no checker change, per the doc's negative check.
    const allPublicExports = Array.from(new Set([...publicExports, ...selfInvokedFunctionNames]));

    const programEntity = new ProgramNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} -> ${entryEntityName} v${this.options.programVersion}`,
      sourceForm: 'shortform',
      entry: entryEntityName,
      version: this.options.programVersion,
      exports: allPublicExports.length > 0 ? allPublicExports : undefined,
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

    // RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) — a `types`-registry name
    // predicted to become a TypeDef is EXCLUDED from import/export
    // resolution: TM-8 froze `imports.to`/`exports.to` without TypeDef
    // ("no other reference verb changes" beyond `schema.to` —
    // rfc-tm-8-diamond.md §5), so naming a TypeDef in a File's `imports` or
    // `exports` list is `checker/reference-to-illegal` by design. A
    // predicted-DTO type alias (object-like shape) is unaffected — DTO IS
    // `imports.to`-legal, matching its pre-existing behavior.
    if (this.typesRegistryPredictedKind.get(importName) === 'TypeDef') {
      return undefined;
    }

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
        // RFC-TM-10 Q3 amendment (lead-authorized, X-CONV-4 extension) — a
        // top-level function renamed by `reserveFunctionEntityNames`/
        // `convertFunction` on a bare-name collision must be named by its
        // ACTUAL emitted entity name here too, or this File/ClassFile's
        // `exports:` list would reference a name no entity carries.
        // `functionNameRemap` returns `undefined` for every export that
        // isn't a renamed function (constants, classes, interfaces, ...),
        // which is exactly when the raw `exp.name` is already correct.
        const remapped = this.functionNameRemap.get(`${module.filePath}::${exp.name}`);
        exportNames.push(remapped ?? exp.name);
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
        // D-LEG-2 (issue #65) — walk the type's structured TypeExprNode for
        // any generic-argument external type (`Pick<S3Client, "send">`)
        // that also needs a Dependency-exports stub, on the same path
        // D-LEG-1 (below) proves is DTO-like.
        this.walkGenericArgsForExternalStubs(parseTypeExprText(param.type).typeExpr);
        // issue #77 — `isDTOLikeType` proves the type is DTO-like BY KIND,
        // but the `input` field is emitted verbatim into the grammar's
        // bare-`entity_name`-only `input_name` slot (grammar.js:811,
        // `/[A-Za-z_]\w*/`). A DTO-like type whose text carries a union
        // (`| null`), an array suffix (`[]`), a generic-argument suffix
        // (`<Args>`), or a function-type shape (`() => void`) is a real,
        // legal TypeScript type but not a legal `entity_name` token — same
        // disclosed-loss trade D-LEG-1/D-LEG-5 already accepted for
        // Class-kind/literal-union/inline-object types above: leave `input`
        // undefined rather than emit text the grammar cannot parse. The type
        // stays visible in `entity.signature` regardless (emitted verbatim,
        // `emit-shortform.ts`), so only the machine-checked graph edge is
        // lost, not the DSL reader's visibility into the real type.
        return isBareEntityName(param.type) ? param.type : undefined;
      }
    }
    return undefined;
  }

  private extractOutputDTO(func: ParsedFunction): string | undefined {
    const returnType = func.returnType.replace(/^Promise<(.+)>$/, '$1');
    if (this.isDTOLikeType(returnType)) {
      // If this is an external type, add it to the dependency's exports
      this.addExternalTypeToDepExports(returnType);
      // D-LEG-2 (issue #65) — same generic-argument walk as extractInputDTO
      // above; this is the FUNCTION-SIGNATURE path issue #65's evidence
      // (`Pick<S3Client, "send">` in outbound-delivery's return type) lives
      // on, per the Diamond's revised §2 (the r0 draft's walk never reached
      // this call site).
      this.walkGenericArgsForExternalStubs(parseTypeExprText(returnType).typeExpr);
      // issue #77 — same bare-`entity_name` guard as extractInputDTO above,
      // applied to the `output_name` grammar slot (grammar.js:815).
      return isBareEntityName(returnType) ? returnType : undefined;
    }
    return undefined;
  }

  private isObjectLikeType(type: string): boolean {
    return type.includes('{') || type.includes('Record<') || type.includes('Map<');
  }

  // RFC-TM-10 §1 (rfc-tm-10-diamond.md, D-LEG-1, issue #59) — REPLACES the
  // prior single-heuristic `charAt(0).toUpperCase() === charAt(0)` check,
  // which had two proven false-positive faces: a quoted-string-union-literal
  // type (`"empty" | "processed"`) starts with `"`, trivially passing the
  // check; a Class/ClassFile-kind reference (`CheckContext`, `LinkIndex`)
  // also passes the uppercase check — both routed through the DTO-only
  // `input`/`output` continuation grammar the checker correctly rejects.
  //
  // The fix consults classification the converter already computes instead
  // of re-deriving semantic kind from the type string's surface characters:
  //   - A name resolving against `entityRegistry.classes` is Class/ClassFile
  //     kind — NOT DTO-like. `extractInputDTO`/`extractOutputDTO` then leave
  //     `input`/`output` `undefined` (a disclosed, accepted loss of the
  //     cross-reference EDGE — `FunctionNode` has no other reference-capable
  //     field per `VALID_REFERENCES.input.to`/`.output.to`'s frozen
  //     `['DTO']`-only table, RFC-TM-4 — the type stays visible in the
  //     signature TEXT regardless, `entity.signature` always emits
  //     verbatim).
  //   - A name resolving against `entityRegistry.interfaces` is the
  //     ORIGINAL true positive this heuristic exists to serve (a real
  //     `interface CreateUserRequest` parameter/return type) — DTO-like,
  //     unchanged from before this fix.
  //   - A type text starting with `"` (string-literal or string-literal-
  //     union) parses via `parseTypeExprText`; a top-level `kind` of
  //     `'literal'` or a `'union'` of only literal members is NOT DTO-like
  //     for the same reason as the Class-kind case (`"empty" | "processed"`
  //     is not a DTO reference).
  //   - Everything else that isn't a bare primitive is DTO-like by
  //     elimination — the same fallback the heuristic approximated, now
  //     gated by classification instead of a first-character guess.
  private isDTOLikeType(type: string): boolean {
    const primitives = ['string', 'number', 'boolean', 'void', 'any', 'unknown', 'null', 'undefined'];
    const cleaned = type.replace(/\[\]$/, ''); // Remove array suffix
    if (primitives.includes(cleaned.toLowerCase())) {
      return false;
    }

    // Class/ClassFile-kind reference: leave input/output undefined, per
    // this item's disclosed-loss rationale above.
    if (this.entityRegistry.classes.has(cleaned)) {
      return false;
    }

    // Interface-kind reference: the ORIGINAL true positive, still DTO-like.
    if (this.entityRegistry.interfaces.has(cleaned)) {
      return true;
    }

    // A quoted-string-literal or string-literal-union type is a structured
    // literal/union of literals, not a DTO reference.
    if (cleaned.startsWith('"') || cleaned.startsWith("'")) {
      const parsed = parseTypeExprText(cleaned).typeExpr;
      if (parsed.kind === 'literal') {
        return false;
      }
      if (parsed.kind === 'union' && parsed.members.every((member) => member.kind === 'literal')) {
        return false;
      }
    }

    // RFC-TM-10 §5 amendment (rfc-tm-10-diamond.md, D-LEG-5, issue #66) — a
    // THIRD false-positive face of the original `charAt(0).toUpperCase()`
    // heuristic, found by D-LEG-5's own fixture after D-LEG-1 landed: an
    // inline object-literal type (`{ current?: string }`, no enclosing
    // Class/Interface name to resolve) starts with `{`, which is not a
    // letter — `'{'.toUpperCase() === '{'` is trivially true, the same
    // vacuous-pass shape D-LEG-1 already fixed for `"`. Routing this text
    // through `input`/`output` is worse than the disclosed-loss cases above:
    // the grammar's `input_name`/`output_name` productions
    // (`grammar.js:811-812` et al.) accept only a bare `entity_name` token
    // ([A-Za-z_]\w*), so an inline object-literal type in that position is
    // UNPARSABLE, not merely duplicated (confirmed:
    // `tests/ladder/q2-destructured-params.test.ts` reproduces
    // `syntax/error: unparsable text` on this exact shape). Leaving
    // input/output undefined is the same accepted trade D-LEG-1 already made
    // for Class-kind and literal-union types — the type stays visible in the
    // signature TEXT (`entity.signature` always emits verbatim), only the
    // machine-checked edge is gone. The richer fix (synthesize a named
    // inline-DTO stub for an object-literal parameter/return type, mirroring
    // D-LEG-2's external-stub mechanism) is out of this item's scope — see
    // issue #72.
    if (cleaned.startsWith('{')) {
      return false;
    }

    // DTO-like by elimination: not a primitive, not a known Class, not a
    // literal/literal-union, not an inline object-literal — matches the
    // heuristic's original fallback, gated by classification instead of a
    // surface-character guess.
    return cleaned.charAt(0).toUpperCase() === cleaned.charAt(0);
  }

  // RFC-TM-10 §2 (rfc-tm-10-diamond.md, D-LEG-2, issue #65) — a walk
  // distinct from `ensureBuiltinExtendsStub`'s `extends`-triggered
  // allowlist mechanism. Once a `TypeExprNode` exists for a DTO field, a
  // function parameter, or a return type (via `parseTypeExprText`), every
  // `generic`-kind node's `args` is walked for a `named`-kind argument whose
  // name resolves via `externalTypeToPackage` to an external package import
  // — `Pick<S3Client, "send">`'s `S3Client` argument, not `Pick` itself
  // (`Pick` is a builtin generic, matches the checker's own PRIMITIVES
  // allowlist, check-dto-fields.ts:30-49) and not `"send"` (a literal, no
  // stub needed). Reuses `addExternalTypeToDepExports`'s existing
  // rebuild-and-append `DependencyNode.exports` mechanism directly — no new
  // stub-synthesis function, closing the latent duplication risk between
  // this item and D-LEG-1's independently-authored issue.
  private walkGenericArgsForExternalStubs(node: TypeExprNode): void {
    switch (node.kind) {
      case 'generic':
        for (const arg of node.args) {
          if (arg.kind === 'named') {
            this.addExternalTypeToDepExports(arg.name);
          } else {
            this.walkGenericArgsForExternalStubs(arg);
          }
        }
        return;
      case 'union':
      case 'intersection':
        for (const member of node.members) {
          this.walkGenericArgsForExternalStubs(member);
        }
        return;
      case 'array':
        this.walkGenericArgsForExternalStubs(node.element);
        return;
      case 'named':
      case 'literal':
      case 'opaque':
        return;
      default: {
        const exhaustive: never = node;
        void exhaustive;
        return;
      }
    }
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
        // See the convertInterfaceToDTO construction site's comment
        // (rfc-tm-8-diamond.md §2, X-TYPE-2) for why parseTypeExprText.
        const typeExpr = parseTypeExprText(propType).typeExpr;
        // D-LEG-2 (rfc-tm-10-diamond.md §2, issue #65) — walk this field's
        // TypeExprNode for any generic-argument external type needing a
        // Dependency-exports stub.
        this.walkGenericArgsForExternalStubs(typeExpr);
        fields.push(
          new DtoFieldNode({
            name: prop.name,
            type: propType,
            typeExpr,
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
    // X-CONV-3 — relativize against the target project root (the tsconfig's
    // directory), never `process.cwd()`. The prior `process.cwd()`-based
    // implementation produced different emitted paths depending on where
    // the CLI happened to be invoked from — a correctness bug, since the
    // extracted `.tmd`'s paths are meant to describe the target project's
    // own layout, not the operator's shell location.
    return path.relative(this.projectRoot, filePath);
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
    // X-CONV-4 — collision-proof naming. The prior `endsWith('App') ? base :
    // `${base}App`` scheme produces bare `App` for `App.tsx`, colliding with
    // the real exported `App` component (census gap 6, issue #45's crash
    // case). `<Base>__App` is provably outside `sanitizeEntityName`'s
    // codomain: that function collapses every run of underscores to a
    // single one and never re-inserts a separator when joining
    // PascalCase-cased parts (`'_+' -> '_'` then `split('_').join('')` —
    // see its own comment), so no sanitized identifier can ever contain
    // `__`. A literal `__` separator therefore cannot collide with any real
    // entity name derived from source, without needing a runtime collision
    // probe or a nondeterministic suffix (both rejected in the Diamond
    // Doc's Rejected Alternatives — `App2`/`AppProgram` are not
    // collision-proof against adversarial real names).
    const base = this.sanitizeEntityName(fileName);
    return `${base}__App`;
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
