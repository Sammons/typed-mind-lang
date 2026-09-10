import type { EntityNode } from '@sammons/typed-mind';

export interface ParsedModule {
  readonly filePath: string;
  readonly imports: readonly ParsedImport[];
  readonly exports: readonly ParsedExport[];
  readonly functions: readonly ParsedFunction[];
  readonly classes: readonly ParsedClass[];
  readonly interfaces: readonly ParsedInterface[];
  readonly types: readonly ParsedTypeAlias[];
  readonly constants: readonly ParsedConstant[];
  readonly enums: readonly ParsedEnum[];
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
  readonly type: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'variable' | 'enum' | 'namespace-reexport';
  readonly source: string | undefined;
}

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
  readonly isRest?: boolean;
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

export interface ParsedTypeAlias {
  readonly name: string;
  readonly type: string;
  readonly description: string | undefined;
}

export interface ParsedConstant {
  readonly name: string;
  readonly type: string;
  readonly value: string | undefined;
}

export interface ParsedEnum {
  readonly name: string;
  readonly members: readonly string[];
  readonly description: string | undefined;
}

// Result types (language-agnostic)
export interface ProjectAnalysis {
  readonly modules: readonly ParsedModule[];
  readonly entryPoints: readonly string[];
  readonly projectRoot: string;
  readonly diagnostics: readonly AnalyzerDiagnostic[];
}

export interface AnalyzerDiagnostic {
  readonly severity: 'error' | 'warning';
  readonly category: string;
  readonly message: string;
  readonly filePath: string | undefined;
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
  readonly code: string;
  readonly entityName: string;
  readonly property: string;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly severity: 'error' | 'warning';
  readonly suggestion: string;
}

export interface ConversionOptions {
  readonly includePrivateMembers: boolean;
  readonly generatePrograms: boolean;
  readonly programVersion: string | undefined;
  readonly ignorePatterns: readonly string[];
}
