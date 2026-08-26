/**
 * Strongly-typed error system for TypedMind using discriminated unions
 *
 * This replaces the weak ValidationError interface with specific error types
 * that provide better type safety and IntelliSense support.
 */

import type { EntityName, EntityTypeName } from './branded-types.ts';
import type { Position } from './types.ts';

// Base error structure
interface BaseError {
  readonly position: Position;
  readonly severity: 'error' | 'warning' | 'info';
  readonly suggestion?: string;
}

// Parsing errors
export interface ParseError extends BaseError {
  readonly kind: 'parse';
  readonly type: 'invalid_syntax' | 'unexpected_token' | 'missing_required_field';
  readonly raw: string;
  readonly expected?: string;
}

// Entity validation errors
export interface EntityValidationError extends BaseError {
  readonly kind: 'entity_validation';
  readonly entityName: EntityName;
  readonly entityType: EntityTypeName;
  readonly type:
    | 'missing_entity'
    | 'duplicate_entity'
    | 'invalid_reference'
    | 'orphaned_entity'
    | 'naming_conflict'
    | 'circular_dependency';
  readonly details: {
    readonly referencedEntity?: EntityName;
    readonly referenceType?: string;
    readonly conflictingEntity?: EntityName;
    readonly circularPath?: EntityName[];
  };
}

// Import/Export errors
export interface ImportExportError extends BaseError {
  readonly kind: 'import_export';
  readonly type: 'import_not_found' | 'export_not_found' | 'circular_import' | 'duplicate_import';
  readonly importPath?: string;
  readonly entityName?: EntityName;
  readonly alias?: string;
}

// Type system errors
export interface TypeSystemError extends BaseError {
  readonly kind: 'type_system';
  readonly type: 'invalid_type' | 'type_mismatch' | 'unsupported_operation';
  readonly expectedType?: string;
  readonly actualType?: string;
  readonly operation?: string;
}

// Grammar/Syntax errors
export interface GrammarError extends BaseError {
  readonly kind: 'grammar';
  readonly type: 'invalid_pattern' | 'malformed_entity' | 'unsupported_syntax';
  readonly pattern?: string;
  readonly context?: string;
}

// Function-specific errors
export interface FunctionError extends BaseError {
  readonly kind: 'function';
  readonly functionName: EntityName;
  readonly type: 'invalid_signature' | 'missing_input_dto' | 'missing_output_dto' | 'invalid_call' | 'recursive_call_without_base_case';
  readonly signature?: string;
  readonly calledFunction?: EntityName;
}

// DTO-specific errors
export interface DTOError extends BaseError {
  readonly kind: 'dto';
  readonly dtoName: EntityName;
  readonly type: 'invalid_field_type' | 'function_in_dto' | 'missing_field_description' | 'circular_reference';
  readonly fieldName?: string;
  readonly fieldType?: string;
}

// UI Component errors
export interface UIComponentError extends BaseError {
  readonly kind: 'ui_component';
  readonly componentName: EntityName;
  readonly type: 'circular_containment' | 'orphaned_component' | 'invalid_containment' | 'multiple_roots';
  readonly parentComponent?: EntityName;
  readonly childComponent?: EntityName;
}

// Runtime parameter errors
export interface RunParameterError extends BaseError {
  readonly kind: 'run_parameter';
  readonly parameterName: EntityName;
  readonly type: 'invalid_parameter_type' | 'missing_description' | 'orphaned_parameter' | 'conflicting_default';
  readonly parameterType?: string;
  readonly defaultValue?: string;
}

// Asset errors
export interface AssetError extends BaseError {
  readonly kind: 'asset';
  readonly assetName: EntityName;
  readonly type: 'missing_description' | 'invalid_program_reference' | 'orphaned_asset';
  readonly programName?: EntityName;
}

// Program structure errors
export interface ProgramStructureError extends BaseError {
  readonly kind: 'program_structure';
  readonly type: 'missing_program' | 'multiple_programs' | 'invalid_entry_point' | 'unreachable_entity';
  readonly programName?: EntityName;
  readonly entryPoint?: EntityName;
  readonly unreachableEntity?: EntityName;
}

// Union of all error types
export type TypedMindError =
  | ParseError
  | EntityValidationError
  | ImportExportError
  | TypeSystemError
  | GrammarError
  | FunctionError
  | DTOError
  | UIComponentError
  | RunParameterError
  | AssetError
  | ProgramStructureError;

// Error constructors for easy creation
export const TypedMindErrors = {
  parse: {
    invalidSyntax: (position: Position, raw: string, expected?: string): ParseError => ({
      kind: 'parse',
      type: 'invalid_syntax',
      position,
      severity: 'error',
      raw,
      ...(expected && { expected }),
    }),

    unexpectedToken: (position: Position, raw: string, suggestion?: string): ParseError => ({
      kind: 'parse',
      type: 'unexpected_token',
      position,
      severity: 'error',
      raw,
      ...(suggestion && { suggestion }),
    }),

    missingRequiredField: (position: Position, raw: string, field: string): ParseError => ({
      kind: 'parse',
      type: 'missing_required_field',
      position,
      severity: 'error',
      raw,
      expected: field,
    }),
  },

  entity: {
    missingEntity: (
      position: Position,
      entityName: EntityName,
      entityType: EntityTypeName,
      referencedEntity: EntityName,
    ): EntityValidationError => ({
      kind: 'entity_validation',
      type: 'missing_entity',
      position,
      severity: 'error',
      entityName,
      entityType,
      details: { referencedEntity },
    }),

    duplicateEntity: (
      position: Position,
      entityName: EntityName,
      entityType: EntityTypeName,
      conflictingEntity: EntityName,
    ): EntityValidationError => ({
      kind: 'entity_validation',
      type: 'duplicate_entity',
      position,
      severity: 'error',
      entityName,
      entityType,
      details: { conflictingEntity },
    }),

    circularDependency: (
      position: Position,
      entityName: EntityName,
      entityType: EntityTypeName,
      circularPath: EntityName[],
    ): EntityValidationError => ({
      kind: 'entity_validation',
      type: 'circular_dependency',
      position,
      severity: 'error',
      entityName,
      entityType,
      details: { circularPath },
    }),
  },

  function: {
    invalidSignature: (position: Position, functionName: EntityName, signature: string): FunctionError => ({
      kind: 'function',
      type: 'invalid_signature',
      position,
      severity: 'error',
      functionName,
      signature,
    }),

    invalidCall: (position: Position, functionName: EntityName, calledFunction: EntityName): FunctionError => ({
      kind: 'function',
      type: 'invalid_call',
      position,
      severity: 'error',
      functionName,
      calledFunction,
    }),
  },

  dto: {
    functionInDTO: (position: Position, dtoName: EntityName, fieldName: string): DTOError => ({
      kind: 'dto',
      type: 'function_in_dto',
      position,
      severity: 'error',
      dtoName,
      fieldName,
    }),

    invalidFieldType: (position: Position, dtoName: EntityName, fieldName: string, fieldType: string): DTOError => ({
      kind: 'dto',
      type: 'invalid_field_type',
      position,
      severity: 'error',
      dtoName,
      fieldName,
      fieldType,
    }),
  },

  uiComponent: {
    circularContainment: (position: Position, componentName: EntityName, parentComponent: EntityName): UIComponentError => ({
      kind: 'ui_component',
      type: 'circular_containment',
      position,
      severity: 'error',
      componentName,
      parentComponent,
    }),
  },

  program: {
    missingProgram: (position: Position): ProgramStructureError => ({
      kind: 'program_structure',
      type: 'missing_program',
      position,
      severity: 'error',
    }),

    multiplePrograms: (position: Position, programName: EntityName): ProgramStructureError => ({
      kind: 'program_structure',
      type: 'multiple_programs',
      position,
      severity: 'warning',
      programName,
    }),
  },
} as const;

// Type predicate functions for narrowing error types
export const isParseError = (error: TypedMindError): error is ParseError => error.kind === 'parse';

export const isEntityValidationError = (error: TypedMindError): error is EntityValidationError => error.kind === 'entity_validation';

export const isFunctionError = (error: TypedMindError): error is FunctionError => error.kind === 'function';

export const isDTOError = (error: TypedMindError): error is DTOError => error.kind === 'dto';

export const isUIComponentError = (error: TypedMindError): error is UIComponentError => error.kind === 'ui_component';

export const isProgramStructureError = (error: TypedMindError): error is ProgramStructureError => error.kind === 'program_structure';

// Result type for validation operations
export interface TypedValidationResult {
  readonly valid: boolean;
  readonly errors: readonly TypedMindError[];
}
