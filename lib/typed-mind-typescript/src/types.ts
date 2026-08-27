import type { EntityNode } from '@sammons/typed-mind';
import * as ts from 'typescript';

export interface ParsedFunction {
  readonly name: string;
  readonly signature: string;
  readonly parameters: readonly ParsedParameter[];
  readonly returnType: string;
  readonly isAsync: boolean;
  readonly description: string | undefined;
  readonly decorators: readonly string[];
}

export interface ParsedParameter {
  readonly name: string;
  readonly type: string;
  readonly isOptional: boolean;
  readonly hasDefaultValue: boolean;
}

export interface ParsedClass {
  readonly name: string;
  readonly isAbstract: boolean;
  readonly extends: readonly string[];
  readonly implements: readonly string[];
  readonly methods: readonly ParsedMethod[];
  readonly properties: readonly ParsedProperty[];
  readonly decorators: readonly string[];
  readonly description: string | undefined;
}

export interface ParsedMethod {
  readonly name: string;
  readonly signature: string;
  readonly isStatic: boolean;
  readonly isPrivate: boolean;
  readonly isProtected: boolean;
  readonly isAbstract: boolean;
  readonly parameters: readonly ParsedParameter[];
  readonly returnType: string;
  readonly isAsync: boolean;
  // X-AN-8: get/set pairs on the same name fold into one method entry.
  // undefined for a plain method (not an accessor).
  readonly accessorKind: 'get' | 'set' | 'both' | undefined;
}

export interface ParsedProperty {
  readonly name: string;
  readonly type: string;
  readonly isReadonly: boolean;
  readonly isStatic: boolean;
  readonly isPrivate: boolean;
  readonly isProtected: boolean;
  readonly isOptional: boolean;
}

export interface ParsedInterface {
  readonly name: string;
  readonly extends: readonly string[];
  readonly properties: readonly ParsedProperty[];
  readonly methods: readonly ParsedMethod[];
  readonly description: string | undefined;
}

export interface ParsedModule {
  readonly filePath: string;
  readonly imports: readonly ParsedImport[];
  readonly exports: readonly ParsedExport[];
  readonly functions: readonly ParsedFunction[];
  readonly classes: readonly ParsedClass[];
  readonly interfaces: readonly ParsedInterface[];
  readonly types: readonly ParsedTypeAlias[];
  readonly constants: readonly ParsedConstant[];
  // X-AN-2 — literal specifiers found in dynamic `import(...)` calls in this
  // module. Followed by the traversal queue the same way static imports are.
  readonly dynamicImportSpecifiers: readonly string[];
}

export interface ParsedImport {
  readonly specifier: string;
  readonly defaultImport: string | undefined;
  readonly namedImports: readonly string[];
  readonly namespaceImport: string | undefined;
  readonly isTypeOnly: boolean;
}

export interface ParsedExport {
  readonly name: string;
  readonly isDefault: boolean;
  // X-AN-3: 'namespace-reexport' models `export * from '<source>'` — `name`
  // is the literal marker '*', `source` is the target module specifier. The
  // converter's export-registry phase folds the target module's own exports
  // in when resolving an import against a module whose export list carries
  // this marker (transitively, with a visited-set cycle guard).
  readonly type: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'variable' | 'namespace-reexport';
  readonly source: string | undefined; // Re-export source
}

export interface ParsedTypeAlias {
  readonly name: string;
  readonly type: string;
  readonly description: string | undefined;
}

export interface ParsedConstant {
  readonly name: string;
  readonly type: string;
  readonly value: string | undefined;
  readonly isEnum: boolean;
  readonly enumValues: readonly { name: string; value?: string }[] | undefined;
  readonly isConst?: boolean;
}

export interface TypeScriptProjectAnalysis {
  readonly modules: readonly ParsedModule[];
  readonly entryPoints: readonly string[];
  readonly projectConfig: ts.CompilerOptions;
  // X-DIAG-1: extraction diagnostics substrate. Populated by
  // TypeScriptAnalyzer during traversal/resolution — never silently
  // discarded (I-11/I-13 degrade-never-discard).
  readonly diagnostics: readonly AnalyzerDiagnostic[];
  // X-AN-1 leaf check (module-graph.json golden): the exact resolved edge
  // list for this analysis run, one record per resolved import/re-export.
  readonly moduleGraph: readonly ModuleGraphEdge[];
}

// X-DIAG-1 — analyzer-level diagnostics. Every silence mode named in the
// Diamond Doc §7 produces one of these instead of a bare `continue`/`return
// null`: unresolvable imports, non-literal dynamic imports, skipped
// modules, and (Q1) the entrypoint-outside-file-set case.
export interface AnalyzerDiagnostic {
  readonly severity: 'error' | 'warning';
  readonly category:
    | 'entrypoint-not-in-program'
    | 'unresolvable-import'
    | 'non-literal-dynamic-import'
    | 'skipped-module'
    | 'zero-entities';
  readonly message: string;
  readonly filePath: string | undefined;
  readonly specifier: string | undefined;
}

// X-AN-1 — one record per resolved import/re-export edge. `target` is
// project-root-relative when internal, and the raw resolved
// node_modules-relative package specifier when external. This is the exact
// edge-list the module-graph.json golden asserts against (count summaries
// are explicitly rejected as a check — see RFC-TM-9 §1 Rejected
// Alternatives).
export interface ModuleGraphEdge {
  readonly sourceModule: string;
  readonly specifier: string;
  readonly resolvedTarget: string | undefined;
  readonly classification: 'internal' | 'external' | 'unresolved';
}

export interface ConversionOptions {
  readonly preferClassFile: boolean;
  readonly includePrivateMembers: boolean;
  readonly generatePrograms: boolean;
  readonly programVersion: string | undefined;
  readonly ignorePatterns: readonly string[];
}

export interface ConversionResult {
  readonly success: boolean;
  readonly entities: readonly EntityNode[];
  readonly tmdContent: string;
  readonly errors: readonly ConversionError[];
  readonly warnings: readonly ConversionWarning[];
}

export interface ConversionError {
  readonly message: string;
  readonly filePath: string | undefined;
  readonly line: number | undefined;
  readonly column: number | undefined;
}

export interface ConversionWarning {
  readonly message: string;
  readonly filePath: string | undefined;
  readonly suggestion: string | undefined;
}

export interface AssertionResult {
  readonly success: boolean;
  readonly deviations: readonly Deviation[];
  readonly missingEntities: readonly string[];
  readonly extraEntities: readonly string[];
}

export interface Deviation {
  readonly entityName: string;
  readonly property: string;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly severity: 'error' | 'warning';
}

// Type predicates for narrowing
export const isFunction = (node: ts.Node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node);

export const isClass = (node: ts.Node): node is ts.ClassDeclaration => ts.isClassDeclaration(node);

export const isInterface = (node: ts.Node): node is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(node);

export const isTypeAlias = (node: ts.Node): node is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(node);

export const isVariableStatement = (node: ts.Node): node is ts.VariableStatement => ts.isVariableStatement(node);

export const isExportDeclaration = (node: ts.Node): node is ts.ExportDeclaration => ts.isExportDeclaration(node);

export const isImportDeclaration = (node: ts.Node): node is ts.ImportDeclaration => ts.isImportDeclaration(node);

// Utility functions
export const createFilePath = (path: string): string => path;
export const createEntityName = (name: string): string => name;
