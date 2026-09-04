import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import type {
  AnalyzerDiagnostic,
  ModuleGraphEdge,
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
  RecognizerName,
  SstHandlerReference,
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

// Gap 81 — one entry per project reachable through the tsconfig `references`
// graph, recorded while `unionFileNamesAcrossReferences` already walks it.
//
// A declared `references` entry is the author stating that the target is part
// of THIS compilation, which is why X-AN-1 unions its sources into the program
// in the first place. But a pnpm `workspace:*` sibling resolves through a
// node_modules link to the package's built `dist/index.d.ts`, so
// `ts.resolveModuleName` reports `isExternalLibraryImport: true` and the old
// classifier called a first-party package external. These three fields are
// what let `resolveImportPath` reverse the emit: a declaration file under
// `declarationOutputDir` maps back to the matching source under `rootDir`.
//
// `packageDir` is the referenced project's own directory, used for the
// unbuilt-sibling fallback (reading its package.json `types`/`main`).
// `declarationOutputDir` and `rootDir` are `undefined` when the tsconfig does
// not declare them — see `mapDeclarationToSource`, which declines to guess
// rather than mapping against an assumed default.
interface ReferencedProject {
  readonly packageDir: string;
  readonly declarationOutputDir: string | undefined;
  readonly rootDir: string | undefined;
}

// A parse-config-file host that reads from the real filesystem and reports
// diagnostics into an accumulator rather than to stderr, since a broken
// referenced tsconfig should surface as an AnalyzerDiagnostic, not a
// console line the caller can't see.
//
// Exported (issue #80) so the extraction ladder's own `checker/class-not-exported`
// rule (RFC-TM-4, frozen) is satisfied truthfully rather than by a checker
// exemption: this class carries no internal-only invariant that exporting it
// would break, and TypeScript's `implements` structural typing means the
// export costs nothing at the call site (`new CollectingParseConfigHost()`
// below is unaffected).
export class CollectingParseConfigHost implements ts.ParseConfigFileHost {
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
  // SST-referenced-module orphan flags (issue #52's own PR #74 closing
  // comment; LEAD RULING: exports-push per X-AN-11) — every SUCCESSFUL
  // `--recognize sst-handler` resolution, absolute-path-keyed for the
  // converter's `functionNameRemap` lookup. Independent of `moduleGraph`
  // (whose `resolvedTarget` is project-relative for display only).
  private readonly sstHandlerReferences: SstHandlerReference[] = [];

  private readonly projectPath: string;
  private readonly configPath?: string;
  // X-AN-10 — the CLI's --recognize flags, opt-in per RFC §6. Empty by
  // default: with no flag, recognizer scanning does not run at all, and
  // behavior is byte-identical to before this Quantum.
  private readonly recognizers: ReadonlySet<RecognizerName>;
  // RFC-TM-10 Q3 (D-LEG-6) — absolute paths the recognizer itself resolved
  // and pushed into `traverseQueue`. This is the STRICT tag the traversal
  // loop's standalone-parse fallback keys off of: only a path that reached
  // the queue THROUGH the recognizer gets the fallback. An ordinary
  // unresolvable import path is never added here, so it still falls through
  // to the existing `skipped-module` diagnostic unchanged — the fallback
  // does not weaken I-11's degrade-never-discard guarantee for the general
  // import-resolution path, it only extends reach for the one recognizer
  // that already proved (via `resolveSstHandlerString`'s own standalone
  // parse) that its target exists on disk outside `this.program`.
  private readonly recognizerResolvedPaths = new Set<string>();

  // Gap 81 — every project reachable through the tsconfig `references` graph,
  // collected by `unionFileNamesAcrossReferences` on the walk it already
  // performs. Keyed by realpath'd package directory so a symlinked
  // (`workspace:*`) and a direct resolution of the same package collapse to
  // one entry. Read only by `resolveImportPath`'s reverse-map.
  private readonly referencedProjects = new Map<string, ReferencedProject>();

  constructor(projectPath: string, configPath?: string, recognizers: readonly RecognizerName[] = []) {
    this.projectPath = projectPath;
    this.configPath = configPath;
    this.recognizers = new Set(recognizers);
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

      this.recordReferencedProject(referencedConfigPath, parsed.options);

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

  // Gap 81 — resolves a path to its realpath when it exists, and returns the
  // input unchanged when it does not. Every comparison in the reverse-map runs
  // on realpaths so a pnpm `workspace:*` symlink and the package's true
  // location compare equal. A referenced project that has not been built has
  // no `dist` directory on disk, so `outDir` cannot be realpath'd — hence the
  // pass-through rather than a throw.
  private realpathOrSelf(target: string): string {
    try {
      return fs.realpathSync(target);
    } catch {
      return target;
    }
  }

  // Gap 81 — records one referenced project's source/output layout.
  //
  // `declarationDir` wins over `outDir` when both are set, because that is
  // where `composite`/`declaration` projects actually emit the `.d.ts` a
  // consumer resolves to. When neither is set the emit layout is ambiguous
  // (TypeScript emits declarations next to their sources), so the field stays
  // `undefined` and `mapDeclarationToSource` declines to map rather than
  // guessing a directory that does not exist.
  private recordReferencedProject(referencedConfigPath: string, options: ts.CompilerOptions): void {
    const packageDir = this.realpathOrSelf(path.dirname(path.resolve(referencedConfigPath)));
    const declarationOutput = options.declarationDir || options.outDir;

    this.referencedProjects.set(packageDir, {
      packageDir,
      declarationOutputDir: declarationOutput === undefined ? undefined : this.realpathOrSelf(path.resolve(declarationOutput)),
      rootDir: options.rootDir === undefined ? undefined : this.realpathOrSelf(path.resolve(options.rootDir)),
    });
  }

  // Gap 81 — the reverse-map. Given a resolved declaration file, returns the
  // source file that produced it when the declaration lies under some
  // referenced project's declaration output directory, and `undefined`
  // otherwise.
  //
  // This is what makes the classification stop depending on whether the
  // sibling happened to be built: a `workspace:*` import lands on
  // `<outDir>/index.d.ts`, and the corresponding `<rootDir>/index.ts` is
  // already in the union program (X-AN-1 put it there), so redirecting the
  // resolution to it makes the edge traversable.
  //
  // Fails safe by construction. A genuine third-party package's realpath is
  // under `node_modules/<name>` inside the consuming project, never under a
  // referenced project's `outDir`, so `containsPath` never matches and the
  // caller keeps its external classification. A project missing `rootDir` or
  // `outDir` also returns `undefined` — declining to map is always safe,
  // because the pre-existing behaviour is what the caller falls back to.
  private mapDeclarationToSource(resolvedRealPath: string): string | undefined {
    for (const project of this.referencedProjects.values()) {
      const { declarationOutputDir, rootDir } = project;
      if (declarationOutputDir === undefined || rootDir === undefined) {
        continue;
      }
      if (!this.containsPath(declarationOutputDir, resolvedRealPath)) {
        continue;
      }

      const relativeToOutput = path.relative(declarationOutputDir, resolvedRealPath);
      const source = this.declarationRelativePathToSource(rootDir, relativeToOutput);
      if (source !== undefined) {
        return source;
      }
    }

    return undefined;
  }

  // Gap 81 — `dist/foo/bar.d.ts` -> `src/foo/bar.ts`, falling back to `.tsx`
  // (the extension a JSX-carrying project emits declarations from). Returns
  // `undefined` unless the candidate exists on disk, so a stale declaration
  // left over from a deleted source file never redirects a resolution at a
  // file that is not there.
  private declarationRelativePathToSource(rootDir: string, relativeToOutput: string): string | undefined {
    const declarationSuffix = '.d.ts';
    if (!relativeToOutput.endsWith(declarationSuffix)) {
      return undefined;
    }

    const withoutSuffix = relativeToOutput.slice(0, -declarationSuffix.length);
    for (const extension of ['.ts', '.tsx']) {
      const candidate = path.join(rootDir, `${withoutSuffix}${extension}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  // Gap 81 — true when `candidate` is `parent` itself or sits beneath it.
  // Uses `path.relative` rather than a `startsWith` prefix test so a sibling
  // directory whose name merely shares a prefix (`dist-browser` next to
  // `dist`) cannot match.
  private containsPath(parent: string, candidate: string): boolean {
    const relative = path.relative(parent, candidate);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  }

  // Gap 81, unbuilt-sibling fallback — a referenced project that has never
  // been built has no `dist`, so its package.json `types`/`main` entry points
  // at a file that does not exist and `ts.resolveModuleName` fails outright
  // (classification `'unresolved'`, no edge to traverse). Extraction must not
  // depend on the target having been built.
  //
  // So: find the referenced project whose package.json `name` matches the bare
  // specifier, read its DECLARED `types`/`main` path, and run that declared
  // path through the same outDir->rootDir mapping the built case uses. The
  // declared path is what the build WOULD produce, so mapping it yields the
  // same source file a built sibling would have redirected to.
  //
  // Returns `undefined` when the specifier names no referenced project, when
  // the package.json is unreadable, or when the mapped source is absent — the
  // caller then emits the existing unresolvable-import diagnostic rather than
  // silently dropping the edge.
  private resolveUnbuiltReferencedProject(importSpecifier: string): string | undefined {
    for (const project of this.referencedProjects.values()) {
      const manifestPath = path.join(project.packageDir, 'package.json');
      if (!fs.existsSync(manifestPath)) {
        continue;
      }

      const manifest = this.readPackageManifest(manifestPath);
      if (manifest === undefined || manifest.name !== importSpecifier) {
        continue;
      }

      const declaredEntry = manifest.types || manifest.main;
      if (declaredEntry === undefined) {
        continue;
      }

      const { declarationOutputDir, rootDir } = project;
      if (declarationOutputDir === undefined || rootDir === undefined) {
        continue;
      }

      // The declared entry is resolved against the package dir, then treated
      // exactly like a built declaration: `dist/index.js` and `dist/index.d.ts`
      // both normalize to the `dist/index.d.ts` shape the mapper expects.
      const declaredAbsolute = path.resolve(project.packageDir, declaredEntry);
      if (!this.containsPath(declarationOutputDir, declaredAbsolute)) {
        continue;
      }

      const relativeToOutput = path.relative(declarationOutputDir, declaredAbsolute);
      const declarationRelative = relativeToOutput.replace(/\.(d\.ts|js|mjs|cjs)$/, '.d.ts');
      const source = this.declarationRelativePathToSource(rootDir, declarationRelative);
      if (source !== undefined) {
        return source;
      }
    }

    return undefined;
  }

  private readPackageManifest(manifestPath: string): { name?: string; types?: string; main?: string } | undefined {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (typeof parsed !== 'object' || parsed === null) {
        return undefined;
      }
      const record = parsed as Record<string, unknown>;
      // Narrowing, not casting: each field is only carried forward when it is
      // actually a string, so a malformed manifest cannot inject a non-string
      // into the path joins above.
      return {
        name: typeof record['name'] === 'string' ? record['name'] : undefined,
        types: typeof record['types'] === 'string' ? record['types'] : undefined,
        main: typeof record['main'] === 'string' ? record['main'] : undefined,
      };
    } catch {
      return undefined;
    }
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
      sstHandlerReferences: this.sstHandlerReferences,
      projectRoot: path.resolve(this.projectPath),
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
      const currentPath = traverseQueue.shift();
      if (currentPath === undefined) {
        break;
      }

      if (visitedModules.has(currentPath)) {
        continue;
      }

      visitedModules.add(currentPath);

      // Get the source file from the TypeScript program
      let sourceFile = this.program.getSourceFile(currentPath);
      let standaloneParsed = false;

      // RFC-TM-10 Q3 (D-LEG-6) — a path the recognizer itself resolved
      // (`recognizerResolvedPaths`) is known-good on disk (the recognizer's
      // own `fs.existsSync` probe already confirmed it) but commonly lives
      // OUTSIDE `this.program`'s file set by design (a sibling
      // package/build target the root tsconfig excludes — the exact
      // webhookstorage `packages/functions` shape). `this.program` cannot
      // grow a new file post-construction, so this module is parsed
      // standalone, mirroring `resolveSstHandlerString`'s own
      // `parseFileForExportCheck` mechanism, and fed through the same
      // `analyzeModule` path every program-backed module uses. This branch
      // is STRICTLY gated on `recognizerResolvedPaths` membership — an
      // ordinary unresolvable import path is never in that set, so it still
      // falls through to the unchanged `skipped-module` diagnostic below.
      if ((!sourceFile || sourceFile.isDeclarationFile) && this.recognizerResolvedPaths.has(currentPath)) {
        sourceFile = this.parseFileForExportCheck(currentPath);
        standaloneParsed = sourceFile !== undefined;
      }

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
      if (standaloneParsed) {
        // Disclose the fidelity loss (lead-mandated guardrail, RFC-TM-10
        // Q3): a standalone-parsed module has no binding into
        // `this.checker`'s program, so `extractJSDocDescription`'s
        // `getSymbolAtLocation` call cannot resolve a symbol for ANY node in
        // this file — it always falls back to the checker-free
        // `ts.getJSDocCommentsAndTags` path (X-AN-6). That fallback still
        // finds a JSDoc comment when one is textually present, so this is
        // an informational disclosure of a narrowed extraction path, not a
        // functional failure.
        this.diagnostics.push({
          severity: 'warning',
          category: 'recognizer-module-standalone-parsed',
          message: `Module resolved by a recognizer is outside the TypeScript program's file set and was parsed standalone: ${currentPath}. Type-checker-backed JSDoc symbol resolution is unavailable for this module; JSDoc extraction falls back to a text-only scan.`,
          filePath: currentPath,
          specifier: undefined,
        });
      }
      const module = this.analyzeModule(sourceFile);
      modules.push(module);

      // X-AN-10 — opt-in recognizer scan. No-op (and no diagnostic
      // surface) when --recognize was not passed for this convention name,
      // matching the doc's "without the flag, behavior is unchanged."
      // RFC-TM-10 Q3 (D-LEG-6, lead ruling: traversal-enqueue) — a
      // successful resolution now also joins `traverseQueue`, under the
      // SAME `visitedModules` guard every other enqueue site in this loop
      // uses, so a handler string pointing at an already-traversed or
      // already-queued module never double-enqueues.
      if (this.recognizers.has('sst-handler')) {
        this.scanSstHandlerStrings(sourceFile, currentPath, traverseQueue, visitedModules);
      }

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
      sstHandlerReferences: this.sstHandlerReferences,
      // X-CONV-3 — the target project's root (absolute), so the converter
      // can relativize every emitted path against it instead of
      // `process.cwd()`.
      projectRoot: path.resolve(this.projectPath),
    } as const;
  }

  // X-AN-10 — the SST/Lambda `handler: "path/to/file.member"` convention.
  // Data-driven, one entry: a property literally named `handler` whose
  // initializer is a string literal. Algorithm per RFC-TM-9 §6: join the
  // string's path segment against the target project root; split at the
  // LAST `.` to separate the file path from the member name (the string
  // names the emitted JS artifact, e.g. `index.handler` compiles from
  // `index.ts`'s exported `handler`, not a literal `index.handler.ts`);
  // probe for the source file by appending `.ts`/`.tsx`/`.mts` to the path
  // segment. A probe that finds no file — or, once found, a member absent
  // from that module's own exports — surfaces an X-DIAG-1 warning naming
  // the string and the failed path; never silence. The resolved edge folds
  // into the SAME `moduleGraph` array the module-graph.json golden diffs,
  // per the doc's Q2 check line ("appears in that fixture's module-graph
  // golden"). RFC-TM-10 Q3 (D-LEG-6, lead ruling: traversal-enqueue) — a
  // successful resolution is ALSO pushed into `traverseQueue`, under the
  // same `visitedModules` guard the loop's other enqueue sites use, and
  // recorded in `recognizerResolvedPaths` so the traversal loop knows this
  // specific path is permitted to fall back to a standalone parse when
  // `this.program` does not contain it.
  private scanSstHandlerStrings(
    sourceFile: ts.SourceFile,
    currentPath: string,
    traverseQueue: string[],
    visitedModules: ReadonlySet<string>,
  ): void {
    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'handler' &&
        ts.isStringLiteralLike(node.initializer)
      ) {
        const resolvedPath = this.resolveSstHandlerString(node.initializer.text, currentPath);
        if (resolvedPath !== undefined) {
          this.recognizerResolvedPaths.add(resolvedPath);
          if (!visitedModules.has(resolvedPath)) {
            traverseQueue.push(resolvedPath);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }

  // Returns the resolved absolute path on success, `undefined` on either
  // failure branch (no source file found; member not exported) or a
  // non-match (no `.member` suffix). RFC-TM-10 Q3 widened this from `void`
  // so `scanSstHandlerStrings` can enqueue the resolution for real
  // traversal (D-LEG-6, lead ruling) instead of only recording it in
  // `moduleGraph`.
  private resolveSstHandlerString(rawValue: string, currentPath: string): string | undefined {
    const lastDot = rawValue.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === rawValue.length - 1) {
      // No `.member` suffix to split on — not the recognized shape at all;
      // this is not a failure of the convention, just a non-match, so no
      // diagnostic (a bare `handler: "foo"` with no member segment is not
      // an SST handler string).
      return undefined;
    }

    const filePathSegment = rawValue.slice(0, lastDot);
    const memberName = rawValue.slice(lastDot + 1);
    const joinedPath = path.join(this.projectPath, filePathSegment);

    const candidateExtensions = ['.ts', '.tsx', '.mts'];
    let resolvedAbsolutePath: string | undefined;
    for (const ext of candidateExtensions) {
      const candidate = `${joinedPath}${ext}`;
      if (fs.existsSync(candidate)) {
        resolvedAbsolutePath = candidate;
        break;
      }
    }

    if (resolvedAbsolutePath === undefined) {
      this.diagnostics.push({
        severity: 'warning',
        category: 'recognizer-not-found',
        message: `sst-handler recognizer: no source file found for handler string '${rawValue}' (probed ${candidateExtensions.map((ext) => `${filePathSegment}${ext}`).join(', ')})`,
        filePath: currentPath,
        specifier: rawValue,
      });
      this.moduleGraph.push({
        sourceModule: path.relative(this.projectPath, currentPath),
        specifier: rawValue,
        resolvedTarget: undefined,
        classification: 'unresolved',
      });
      return undefined;
    }

    // The resolved target is not necessarily part of this.program's file
    // set — the whole point of the recognizer is following a reference the
    // TS program's own module graph never sees (a different package/build
    // target, e.g. `packages/functions` when the root tsconfig excludes
    // `packages/` entirely, per the real webhookstorage clone's shape).
    // Parse it standalone rather than relying on `this.program.getSourceFile`.
    const resolvedSourceFile = this.parseFileForExportCheck(resolvedAbsolutePath);
    const memberIsExported = resolvedSourceFile !== undefined && this.sourceFileExportsMember(resolvedSourceFile, memberName);

    if (!memberIsExported) {
      this.diagnostics.push({
        severity: 'warning',
        category: 'recognizer-not-found',
        message: `sst-handler recognizer: '${memberName}' is not exported by ${path.relative(this.projectPath, resolvedAbsolutePath)} (from handler string '${rawValue}')`,
        filePath: currentPath,
        specifier: rawValue,
      });
      this.moduleGraph.push({
        sourceModule: path.relative(this.projectPath, currentPath),
        specifier: rawValue,
        resolvedTarget: undefined,
        classification: 'unresolved',
      });
      return undefined;
    }

    this.moduleGraph.push({
      sourceModule: path.relative(this.projectPath, currentPath),
      specifier: rawValue,
      resolvedTarget: path.relative(this.projectPath, resolvedAbsolutePath),
      classification: 'internal',
    });

    // SST-referenced-module orphan flags (issue #52's own PR #74 closing
    // comment; LEAD RULING: exports-push per X-AN-11) — record this
    // successful resolution keyed by the SOURCE module (the module
    // containing the `handler: "..."` string, e.g. the infra file), the
    // resolved TARGET's absolute path, and the resolved MEMBER name. The
    // converter uses `resolvedAbsolutePath`+`memberName` to look up the
    // target function's final (collision-resolved) entity name via
    // `functionNameRemap`, then folds that name into the Program entity
    // whose entry is `sourceModule` — the same mechanism X-AN-11 uses for
    // `selfInvokedFunctionNames`, extended to a cross-module reference.
    this.sstHandlerReferences.push({
      sourceModule: createFilePath(currentPath),
      resolvedAbsolutePath: createFilePath(resolvedAbsolutePath),
      memberName,
    });

    return resolvedAbsolutePath;
  }

  // Parses a resolved handler-string target standalone (not via
  // `this.program`), since the target commonly lives outside the analyzed
  // program's own file set — that is the exact shape the recognizer exists
  // to cover (a sibling package/build target the root tsconfig excludes).
  private parseFileForExportCheck(absolutePath: string): ts.SourceFile | undefined {
    let text: string;
    try {
      text = fs.readFileSync(absolutePath, 'utf-8');
    } catch {
      return undefined;
    }
    return ts.createSourceFile(absolutePath, text, ts.ScriptTarget.Latest, true);
  }

  // Checks whether `memberName` is exported (named or default) by
  // `sourceFile`, without pulling in the full `ParsedModule` machinery —
  // the recognizer only needs a yes/no existence check, not a parsed
  // export registry entry.
  private sourceFileExportsMember(sourceFile: ts.SourceFile, memberName: string): boolean {
    let found = false;
    const visit = (node: ts.Node): void => {
      if (found) {
        return;
      }
      if (this.hasExportModifier(node)) {
        if (isFunction(node) && node.name?.text === memberName) {
          found = true;
          return;
        }
        if (isClass(node) && node.name?.text === memberName) {
          found = true;
          return;
        }
        if (
          isVariableStatement(node) &&
          node.declarationList.declarations.some((decl) => ts.isIdentifier(decl.name) && decl.name.text === memberName)
        ) {
          found = true;
          return;
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
    return found;
  }

  private recordModuleGraphEdge(sourceModule: string, specifier: string, outcome: ResolutionOutcome): void {
    const projectRoot = this.projectPath;
    // Ladder rung (sammons/code-outline-cli) — an EXTERNAL edge used to keep
    // `outcome.resolvedPath` verbatim, i.e. an absolute machine-specific
    // path. That makes `module-graph.json` ungoldenable for any fixture with
    // an external edge (the golden would embed the authoring machine's home
    // directory) and leaks the developer's filesystem layout into extractor
    // output. A resolution INSIDE the project root relativizes exactly like
    // an internal edge — this is the pnpm `workspace:*` case, where the
    // sibling package resolves through a node_modules symlink back into the
    // same repo. A resolution genuinely outside the project root (a real npm
    // dependency) keeps only its `node_modules`-relative tail, which is the
    // portable, machine-independent identity of that package.
    const target = ((): string | undefined => {
      if (outcome.resolvedPath === undefined) {
        return undefined;
      }
      if (outcome.classification === 'internal') {
        return path.relative(projectRoot, outcome.resolvedPath);
      }
      const relativeToRoot = path.relative(projectRoot, outcome.resolvedPath);
      if (!relativeToRoot.startsWith('..') && !path.isAbsolute(relativeToRoot)) {
        return relativeToRoot;
      }
      const nodeModulesIndex = outcome.resolvedPath.lastIndexOf('node_modules');
      if (nodeModulesIndex !== -1) {
        return outcome.resolvedPath.slice(nodeModulesIndex);
      }
      return relativeToRoot;
    })();

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
    const enums: ParsedEnum[] = [];
    const dynamicImportSpecifiers: string[] = [];
    const selfInvokedFunctionNames: string[] = [];

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
        // X-AN-7 — a real TS enum gets its own ParsedEnum shape (see
        // types.ts), not a ParsedConstant with bolted-on isEnum/enumValues
        // fields the converter never read (A-g9's analyzer half). The
        // export type is 'type' (matching parseTypeAlias's registration),
        // not 'constant' — X-CONV-2 emits enums as TM-8's TypeDef entity
        // kind, the same converter-registry lane a type alias uses.
        const parsedEnum = this.parseEnum(node);
        enums.push(parsedEnum);

        if (this.hasExportModifier(node)) {
          exports.push({
            name: parsedEnum.name,
            isDefault: false,
            type: 'type',
            source: undefined,
          } as const);
        }
      } else if (ts.isIfStatement(node)) {
        // X-AN-11 — the `import.meta.url` self-invocation guard: `if
        // (import.meta.url === ...) { runWorker(); }`. Any `if` whose test
        // expression's source text mentions `import.meta.url` is treated as
        // this pattern; the function name(s) called in its `then` branch
        // are recorded as self-invoked graph roots. This is a syntactic
        // match on the well-known Node ESM idiom, not a semantic guarantee
        // — the doc's mechanism is "mark the invoked function as a root,"
        // which tolerates a false-positive match costing nothing (an
        // already-reachable function simply gains a redundant root marking).
        if (node.expression.getText(sourceFile).includes('import.meta.url')) {
          for (const calledName of this.collectCalledFunctionNames(node.thenStatement)) {
            selfInvokedFunctionNames.push(calledName);
          }
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
      enums,
      dynamicImportSpecifiers,
      selfInvokedFunctionNames,
      hasTopLevelCallbackRegistration: this.hasTopLevelCallbackRegistration(sourceFile),
    } as const;
  }

  // RC-F (issue #108) — `isPureTypesFile` (typescript-to-typedmind-
  // converter.ts) classified a route/handler module whose every handler is
  // an inline arrow callback (`accountRoutes.openapi(route, async (c) => {
  // ...})`, the Hono OpenAPI idiom, or the equivalent Express
  // `router.get(path, async (req, res) => {...})` shape) as "pure types,"
  // because `hasRealCode` only ever checked `module.classes`/
  // `module.functions` — both populated from top-level `function`/`class`
  // DECLARATIONS only. A registration call passing a function/arrow
  // expression as an argument has neither. Detected here (the analyzer,
  // which has AST access `ParsedModule` does not carry) rather than in the
  // converter: scans the module's TRUE top-level statements (not the full
  // recursive walk `visit` performs — a registration call nested inside
  // some OTHER function's body should not itself flip this flag; the issue
  // names the shape as a top-level statement) for an expression statement
  // whose call has at least one function-expression/arrow-function argument
  // with a non-empty body. `module.constants`/`module.types`/etc. still
  // exist alongside the registration calls in the real corpus fixture
  // (`createRoute`/`z`-built route-schema `const`s) — this flag only feeds
  // `hasRealCode`'s OR, it never replaces the existing checks.
  private hasTopLevelCallbackRegistration(sourceFile: ts.SourceFile): boolean {
    for (const statement of sourceFile.statements) {
      if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) {
        continue;
      }
      for (const argument of statement.expression.arguments) {
        if (
          (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) &&
          ts.isBlock(argument.body) &&
          argument.body.statements.length > 0
        ) {
          return true;
        }
        // An arrow function with a concise (non-block) body is still a real
        // callback (`() => doSomething()`), just never empty by
        // construction — no `.length > 0` guard needed for that shape.
        if (ts.isArrowFunction(argument) && !ts.isBlock(argument.body)) {
          return true;
        }
      }
    }
    return false;
  }

  // X-AN-11 — collects bare-identifier call targets (`runWorker()`, not
  // `obj.method()`) within a guard's `then` branch. A self-invocation guard
  // calls its entrypoint function directly by name; method-call targets are
  // out of scope for this pattern (the doc's mechanism is a Program.exports
  // entry, which names top-level functions, not class methods).
  private collectCalledFunctionNames(node: ts.Node): string[] {
    const names: string[] = [];
    const visit = (current: ts.Node): void => {
      if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) {
        names.push(current.expression.text);
      }
      ts.forEachChild(current, visit);
    };
    visit(node);
    return names;
  }

  // typedmind-diagnostic-legitimacy callgraph increment — collects
  // same-file call-edge targets from a function/arrow/function-expression's
  // OWN body: bare-identifier call targets (`foo()`, the same shape X-AN-11's
  // `collectCalledFunctionNames` already recognizes) plus `new` expression
  // targets (`new Bar()`) whose constructor expression is a bare identifier.
  // Deliberately conservative — recurses through every descendant (a direct
  // call/`new` can sit inside a nested callback, matching the ops-cli
  // `runBackfill`-inside-`.action()`-closure shape this increment targets),
  // but only ever records a BARE identifier: `obj.method()` call targets and
  // computed/member-expression `new` targets are out of scope by design,
  // since the converter can only resolve a call edge to a same-file
  // TOP-LEVEL declared function or class, never to a property access whose
  // owner is unknown at this layer. Unlike `collectCalledFunctionNames`,
  // this walk does not descend into a NESTED function/arrow/function-expression
  // body — a call inside a nested closure is still lexically inside the
  // outer function for the dispatch-table shape this increment cares about
  // (`.action(async (opts) => { ...await runBackfill(...) })` nested inside
  // a top-level function is unaffected either way since nested closures are
  // still part of the outer function's own descendant tree), but this
  // exclusion matters for the FUNCTION-declaration case: a function
  // expression assigned to a property and passed elsewhere should not have
  // its inner calls double-counted against the OUTER function once the
  // inner one is independently parsed as its own `ParsedFunction`. In
  // practice this only excludes named nested `function` declarations and
  // class expressions (both parsed independently elsewhere); anonymous
  // arrow/function-expression callbacks passed as call arguments (the
  // dispatch-table idiom) are NOT independently parsed as their own
  // top-level `ParsedFunction`, so they must stay in scope here — hence the
  // exclusion only applies to `ts.isFunctionDeclaration`/`ts.isClassDeclaration`,
  // never to anonymous arrow/function-expression nodes.
  private collectSameFileCallEdges(body: ts.Node): string[] {
    const names: string[] = [];
    const visit = (current: ts.Node): void => {
      if (ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current)) {
        // A nested named function/class declaration is parsed independently
        // as its own entity elsewhere in this analyzer; do not attribute its
        // internal calls to the outer function.
        return;
      }
      if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) {
        names.push(current.expression.text);
      } else if (ts.isNewExpression(current) && ts.isIdentifier(current.expression)) {
        names.push(current.expression.text);
      }
      ts.forEachChild(current, visit);
    };
    ts.forEachChild(body, visit);
    return names;
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
          // Fixture 75 (itp-maker `cli/itp-cli.ts:51`) — for an ALIASED
          // specifier (`{ doWork as doWorkAliased }`) TypeScript puts the
          // local alias in `element.name` and the ORIGINAL exported name
          // in `element.propertyName`. Recording only `element.name` fed
          // `resolveImportToEntity` a name the target module never
          // exports, so the lookup missed, no import edge was
          // contributed, and the imported file plus every entity it
          // exports were reported orphaned despite a real, used import.
          // The exported name is what the export registry is keyed by, so
          // that is what the import edge must carry.
          namedImports.push((element.propertyName ?? element.name).text);
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
      // typedmind-diagnostic-legitimacy callgraph increment — `node.body` is
      // `undefined` for an ambient/overload declaration (no implementation
      // to collect calls from); real declarations always carry a body.
      calledNames: node.body ? this.collectSameFileCallEdges(node.body) : [],
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
      // typedmind-diagnostic-legitimacy callgraph increment — an arrow
      // function's concise (non-block) body is itself a single expression,
      // which `collectSameFileCallEdges` still walks correctly (it starts
      // from `ts.forEachChild`, which recurses into an expression body's own
      // descendants the same way it does a block's statements).
      calledNames: this.collectSameFileCallEdges(node.body),
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
          extendsClasses.push(...clause.types.map((type) => this.getExtendsTargetName(type)));
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
    const name = ts.isPrivateIdentifier(node.name) ? node.name.text : (node.name as ts.Identifier).text;
    const isGet = ts.isGetAccessorDeclaration(node);
    const parameters = this.parseParameters(node.parameters);
    const returnType = isGet ? this.getTypeString(node.type) : 'void';
    const isStatic = this.hasStaticModifier(node);
    const isPrivate = this.hasPrivateModifier(node) || this.isPrivateIdentifierName(node.name);
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
          // Stays `getTypeString`, not `getExtendsTargetName`: an interface's
          // heritage clause is grammatically restricted to type references,
          // so it is unreachable by a CallExpression and needs no unwrap.
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

  // X-AN-7 (rfc-tm-9-diamond.md §4) — member-name list only, in declaration
  // order; member initializer expressions are dropped by design (see
  // ParsedEnum's doc comment in types.ts — TypeDefNode.members carries
  // names, not name/value pairs).
  private parseEnum(node: ts.EnumDeclaration): ParsedEnum {
    const name = node.name.text;
    const members = node.members.map((member) => member.name?.getText() ?? 'unknown');
    const description = this.extractJSDocDescription(node.name);

    return {
      name,
      members,
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
      const isConst = !!(node.declarationList.flags & ts.NodeFlags.Const);

      constants.push({
        name,
        type,
        value: value || undefined,
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
    const name = ts.isPrivateIdentifier(node.name) ? node.name.text : (node.name as ts.Identifier).text;
    const parameters = this.parseParameters(node.parameters);
    const returnType = this.getTypeString(node.type);
    const isStatic = this.hasStaticModifier(node);
    const isPrivate = this.hasPrivateModifier(node) || this.isPrivateIdentifierName(node.name);
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
    const name = ts.isPrivateIdentifier(node.name) ? node.name.text : (node.name as ts.Identifier).text;
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
      const isPrivate = this.hasPrivateModifier(node) || this.isPrivateIdentifierName(node.name);
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
    const isPrivate = this.hasPrivateModifier(node) || this.isPrivateIdentifierName(node.name);
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

  // RFC-TM-10 §5 (rfc-tm-10-diamond.md, D-LEG-5, issue #66) — REPLACES the
  // prior blind `(param.name as ts.Identifier).text` cast, which returns
  // `undefined` at runtime for a destructured parameter (an
  // ObjectBindingPattern/ArrayBindingPattern has no `.text`), and gets
  // stringified into the literal parameter name "undefined" by
  // buildFunctionSignature's template-string interpolation.
  //
  // Real destructuring branches now run BEFORE the identifier cast, so the
  // cast is provably safe at its remaining call site:
  //   - ObjectBindingPattern with 1-3 bound elements: join the elements' own
  //     bound property names (`e.propertyName ?? e.name`) with `_`
  //     (`{ current }` -> "current", `{ current, label }` ->
  //     "current_label") — short and stable.
  //   - ObjectBindingPattern with 4+ elements, or any ArrayBindingPattern
  //     (which carries no stable property-name signal): a positional
  //     synthetic name (`arg0`, `arg1`, ...) keyed by the parameter's own
  //     index in `parameters`.
  //   - Plain ts.Identifier: unchanged, the existing cast.
  private parseParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): ParsedParameter[] {
    return parameters.map((param, index) => ({
      name: this.getParameterName(param, index),
      type: this.getTypeString(param.type),
      isOptional: !!param.questionToken,
      hasDefaultValue: !!param.initializer,
    }));
  }

  private getParameterName(param: ts.ParameterDeclaration, index: number): string {
    if (ts.isObjectBindingPattern(param.name)) {
      const elements = param.name.elements.filter((element) => !ts.isOmittedExpression(element));
      const isSimple =
        elements.length >= 1 &&
        elements.length <= 3 &&
        elements.every(
          (element) => !element.dotDotDotToken && !ts.isObjectBindingPattern(element.name) && !ts.isArrayBindingPattern(element.name),
        );
      if (isSimple) {
        return elements.map((element) => (element.propertyName ?? element.name).getText()).join('_');
      }
      return `arg${index}`;
    }

    if (ts.isArrayBindingPattern(param.name)) {
      return `arg${index}`;
    }

    return (param.name as ts.Identifier).text;
  }

  private parseDecorators(node: ts.Node): string[] {
    const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
    if (!decorators) return [];

    return decorators.map((decorator) => {
      const expression = decorator.expression;
      return expression.getText();
    });
  }

  // Issue #86 (found during tm10-inc2's live ladder re-run) — `getTypeString`
  // embeds a parameter or return type's raw source text verbatim into the
  // `::` shortform signature line built here. When the type is authored
  // across multiple lines in the source TypeScript (the common style for an
  // inline object-literal type with 3+ fields, or a multi-line literal
  // union), the embedded newlines desync the grammar's single-line
  // signature production — the same class of defect D-LEG-4 fixed for
  // JSDoc descriptions via `collapseDescription`
  // (typescript-to-typedmind-converter.ts), never extended to
  // signature-embedded type text. This whitespace-collapses ONLY the text
  // that lands in the signature string; it does NOT touch `p.type` /
  // `returnType` themselves, which the converter still reads verbatim
  // (multi-line-aware) for DTO classification and inline-object-literal
  // synthesis (`extractInputDTO`/`extractOutputDTO`,
  // `isInlineObjectLiteralType`/`synthesizeInlineDTO`).
  private collapseSignatureType(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim();
  }

  private buildFunctionSignature(name: string, parameters: readonly ParsedParameter[], returnType: string, isAsync: boolean): string {
    const paramStr = parameters.map((p) => `${p.name}${p.isOptional ? '?' : ''}: ${this.collapseSignatureType(p.type)}`).join(', ');

    const asyncPrefix = isAsync ? 'async ' : '';
    return `${asyncPrefix}${name}(${paramStr}) => ${this.collapseSignatureType(returnType)}`;
  }

  private getTypeString(typeNode: ts.TypeNode | undefined): string {
    if (!typeNode) return 'any';
    return typeNode.getText();
  }

  // The single mixin-heritage helper, reconciling PR #152 (slat-harness,
  // fixture 66 — Lit + @lit-labs/signals, `class SlatLeaf extends
  // SignalWatcher(LitElement) {}`) and PR #153 (itp-maker, fixture 76 —
  // Lit + MobX, `class X extends withMobx(LitElement)`). Both rungs hit
  // the same defect from different corpora and each shipped a helper that
  // handled a case the other missed; this is the merged implementation.
  //
  // A heritage clause's type is an `ExpressionWithTypeArguments`. For a
  // MIXIN APPLICATION its `.expression` is a CallExpression, so
  // `getTypeString`'s bare `getText()` returned the literal call text
  // (`withMobx(LitElement)`). The converter emits that into the `<:`
  // inherit slot, where the grammar's `inherit_list` accepts only bare
  // entity names — one `Unparsable text: \`(LitElement)\`` finding per
  // mixin-based class. That finding is a PARSE failure, so it also halts
  // checking and masks every later diagnostic on the target.
  //
  // Unwrap-to-base is the design: the inheritance edge a mixin states is
  // `withMobx(LitElement)` IS-A `LitElement`, so naming the base argument
  // records the true edge instead of leaking syntax. Three properties,
  // each pinned by a test (see slat-harness-mixin-extends.test.ts and
  // slat-harness-mixin-heritage-controls.test.ts):
  //
  // 1. NON-CallExpression heritage is returned exactly as it was before
  //    either rung, via `getTypeString(typeNode)` on the whole type node —
  //    NOT `.expression.getText()`, which silently drops type arguments and
  //    would turn `extends Container<string>` into `Container`. The
  //    `ts.isCallExpression` guard is what keeps the ordinary path byte-
  //    identical to main's long-standing behavior.
  // 2. CallExpression heritage searches the ARGUMENTS for the base rather
  //    than assuming position 0: `find` skips a leading options object, so
  //    `Mix({ opt: 1 }, Base)` yields `Base`. An argument that is itself a
  //    CallExpression recurses, so nested applications `A(B(Base))` yield
  //    `Base`. Recursion runs before the identifier search at each level so
  //    a nested base outranks a sibling identifier argument.
  // 3. A zero-identifier mixin (`Mixin()`, or one whose only arguments are
  //    non-identifier expressions) has no nameable base, so the mixin's own
  //    callee name is used. That keeps the emitted line parsable but states
  //    an edge to the FACTORY rather than a base class, which the checker
  //    then reports as an illegal reference. Known gap, pinned by a test
  //    with this root cause rather than silently tolerated.
  private getExtendsTargetName(typeNode: ts.ExpressionWithTypeArguments): string {
    const expression = typeNode.expression;

    if (!ts.isCallExpression(expression)) {
      return this.getTypeString(typeNode);
    }

    const base = this.findMixinBaseExpression(expression);
    return base !== undefined ? base.getText() : this.mixinFactoryFallbackName(expression);
  }

  // Finds the base among a mixin call's arguments. Recurses into a nested
  // mixin application first (property 2's `A(B(Base))` case), then falls
  // back to the first plain identifier argument (property 2's
  // `Mix({ opt: 1 }, Base)` case). Returns undefined when no argument
  // names anything (property 3).
  private findMixinBaseExpression(call: ts.CallExpression): ts.Expression | undefined {
    for (const argument of call.arguments) {
      if (ts.isCallExpression(argument)) {
        const nested = this.findMixinBaseExpression(argument);
        if (nested !== undefined) {
          return nested;
        }
      }
    }

    return call.arguments.find((argument) => ts.isIdentifier(argument));
  }

  private mixinFactoryFallbackName(call: ts.CallExpression): string {
    return ts.isIdentifier(call.expression) ? call.expression.text : 'unknown';
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

  // X-CONV-1 — ES2022 hard-private members (`#getTypedMind`) carry no
  // `private` keyword modifier at all; their privacy is expressed entirely
  // by the `#`-prefixed `PrivateIdentifier` name. `hasPrivateModifier` only
  // recognizes the keyword form, so every call site that classifies a class
  // member's privacy also checks this — a member is private if either the
  // keyword is present OR its name is a PrivateIdentifier.
  private isPrivateIdentifierName(name: ts.PropertyName | ts.BindingName | undefined): boolean {
    return name !== undefined && ts.isPrivateIdentifier(name);
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
      // Gap 81 — the referenced sibling exists but has not been built, so its
      // package.json `types` names a file that is not on disk yet and module
      // resolution fails. Map the DECLARED output path back to source before
      // conceding: extraction quality must not depend on build state. Still
      // `'unresolved'` when the specifier names no referenced project, which
      // keeps the caller's existing unresolvable-import diagnostic intact.
      const unbuiltSource = this.resolveUnbuiltReferencedProject(importSpecifier);
      if (unbuiltSource !== undefined) {
        return { resolvedPath: unbuiltSource, classification: 'internal' };
      }
      return { resolvedPath: undefined, classification: 'unresolved' };
    }

    const resolvedPath = resolvedModule.resolvedFileName;
    const isExternal = resolvedModule.isExternalLibraryImport === true || resolvedPath.includes('node_modules');

    if (isExternal) {
      // Gap 81 — a tsconfig `references` entry declares the target to be part
      // of this compilation, and X-AN-1 already unions its sources into the
      // program on that basis. Classifying those same files external
      // contradicts the traversal the analyzer performs. So before honoring
      // the external verdict, check whether the resolution lands in a
      // referenced project's declaration output and, if it does, redirect it
      // to the source that produced it.
      //
      // A genuine third-party package never realpaths under a referenced
      // project's outDir, so this leaves real npm dependencies external.
      const sourcePath = this.mapDeclarationToSource(this.realpathOrSelf(resolvedPath));
      if (sourcePath !== undefined) {
        return { resolvedPath: sourcePath, classification: 'internal' };
      }
    }

    return {
      resolvedPath,
      classification: isExternal ? 'external' : 'internal',
    };
  }
}
