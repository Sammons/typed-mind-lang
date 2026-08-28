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
  // X-AN-7 — real TS `enum` declarations, kept separate from `constants`
  // (see ParsedEnum above).
  readonly enums: readonly ParsedEnum[];
  // X-AN-2 — literal specifiers found in dynamic `import(...)` calls in this
  // module. Followed by the traversal queue the same way static imports are.
  readonly dynamicImportSpecifiers: readonly string[];
  // X-AN-11 — function names invoked inside an `import.meta.url`
  // self-invocation guard (`if (import.meta.url === ...) { runWorker(); }`).
  // The analyzer marks these as real graph roots; the converter pushes each
  // name into the entrypoint's generated ProgramNode.exports (an existing,
  // language-optional field) so the checker's orphan rule — which unions
  // Program.exports into its referenced-names set — sees an honest edge
  // instead of a false "orphaned" finding on a function that IS the
  // program's own entry action.
  readonly selfInvokedFunctionNames: readonly string[];
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
  readonly isConst?: boolean;
}

// RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-AN-7) — a real TS `enum` declaration
// gets its own analyzer shape, distinct from `ParsedConstant`. Previously a
// `ts.EnumDeclaration` was pushed onto `ParsedModule.constants` carrying
// `isEnum`/`enumValues` fields the converter never read (A-g9's analyzer
// half) — the member list was captured then silently dropped downstream.
// `ParsedEnum` is the converter's (X-CONV-2) single source for TM-8's
// `TypeDefNode` enum variant: `members` here is the ordered member-name
// list only (no values) because `TypeDefNode.members` (type-def-node.ts) is
// `readonly string[]`, not a name/value pair — member initializer
// expressions (`Active = 'active'`) are not part of the frozen TypeDef
// shape and are intentionally not carried past this analyzer boundary.
export interface ParsedEnum {
  readonly name: string;
  readonly members: readonly string[];
  readonly description: string | undefined;
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
  // X-CONV-3: the target project's root directory (the tsconfig's
  // directory), absolute. The converter's `getRelativePath` relativizes
  // every emitted entity path against this field, never `process.cwd()` —
  // so extraction produces the same paths whether the CLI runs from inside
  // or outside the target project.
  readonly projectRoot: string;
}

// X-DIAG-1 — analyzer-level diagnostics. Every silence mode named in the
// Diamond Doc §7 produces one of these instead of a bare `continue`/`return
// null`: unresolvable imports, non-literal dynamic imports, skipped
// modules, and (Q1) the entrypoint-outside-file-set case. Q2 adds
// 'recognizer-not-found' for X-AN-10's convention-table recognizer: a
// probe that finds no source file, or a member absent from the resolved
// module's exports, surfaces this instead of silence (RFC §6).
export interface AnalyzerDiagnostic {
  readonly severity: 'error' | 'warning';
  readonly category:
    | 'entrypoint-not-in-program'
    | 'unresolvable-import'
    | 'non-literal-dynamic-import'
    | 'skipped-module'
    | 'zero-entities'
    | 'recognizer-not-found';
  readonly message: string;
  readonly filePath: string | undefined;
  readonly specifier: string | undefined;
}

// X-AN-10 — the CLI's --recognize flag names, one per convention-table
// entry. This mission ships exactly one: 'sst-handler' recognizes a
// `handler: "path/to/file.member"` property (the SST/Lambda convention).
// The table is the containment boundary per the Diamond Doc §6 — a second
// convention name requires its own review and its own fixture, not an
// addition to this union in isolation.
export type RecognizerName = 'sst-handler';

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

// RFC-TM-9 §9 (rfc-tm-9-diamond.md, X-SUPP-6) — the enumerated set of
// machine-readable suppression reasons the converter is allowed to emit.
// Closed by design ("unlimited auto-suppression is forbidden — a reason
// outside the enumerated list is a converter error"): a new reason class
// requires its own RFC review and its own fixture, the same containment
// discipline X-AN-10's recognizer table already uses (RecognizerName).
//   - 'generated-single-file-scope': the census's one true-dead adjudication
//     class (`CstBlockKw`-shaped) — an exported entity whose export is never
//     imported by any OTHER traced module. The converter can detect this
//     deterministically from its own cross-file import graph (the same
//     fact `checker/orphaned-entity` computes).
//
// 'test-only-consumer' REMOVED per RFC-TM-10 §9 (D-LEG-9, lead ruling): PR
// #58 (RFC-TM-9 Q3) disclosed zero live trigger conditions — the analyzer's
// `ignorePatterns` excludes test files from traversal before it starts, so
// the converter never observes a "consumed only by a test" signal. I-17 (no
// dead suppression reasons) requires either a live trigger or removal; the
// lead ruling chose removal over growing a new excluded-file-scan analyzer
// capability. Re-add only when a real trigger exists.
export type SuppressionReason = 'generated-single-file-scope';

export interface ConversionResult {
  readonly success: boolean;
  readonly entities: readonly EntityNode[];
  readonly tmdContent: string;
  readonly errors: readonly ConversionError[];
  readonly warnings: readonly ConversionWarning[];
  // X-SUPP-6 — the exact count of suppressions this conversion emitted, by
  // reason. The CLI prints this; ladder fixtures assert exact counts.
  readonly suppressionCounts: Readonly<Record<SuppressionReason, number>>;
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
