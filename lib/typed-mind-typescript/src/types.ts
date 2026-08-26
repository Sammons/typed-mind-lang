import type { AnyEntity } from '@sammons/typed-mind';
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
  readonly type: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'variable';
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
  readonly entities: readonly AnyEntity[];
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
