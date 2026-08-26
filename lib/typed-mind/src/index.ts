import { dirname } from 'node:path';
import type { FilePath } from './branded-types.ts';
import { ErrorFormatter } from './formatter.ts';
import { ImportResolver } from './import-resolver.ts';
import { DSLParser } from './parser.ts';
import type { Result } from './result.ts';
import { type SyntaxGenerationError, SyntaxGenerator } from './syntax-generator.ts';
import type { AnyEntity, ProgramGraph, ValidationError, ValidationResult } from './types.ts';
import { DSLValidator } from './validator.ts';

// Export branded types
export * from './branded-types.ts';
// Export EntityBuilder
export * from './entity-builder.ts';
// Export EntityMap
export * from './entity-map.ts';

// Export error types
export * from './error-types.ts';
export { ErrorFormatter } from './formatter.ts';
export { GrammarDocGenerator } from './grammar-doc-generator.ts';
export { type GrammarValidationError, type GrammarValidationResult, GrammarValidator } from './grammar-validator.ts';
export { LongformParser } from './longform-parser.ts';
export { DSLParser, type ParseError, type ParseResult } from './parser.ts';
export { CONTINUATION_PATTERNS, ENTITY_PATTERNS, GENERAL_PATTERNS, PATTERN_DESCRIPTIONS } from './parser-patterns.ts';
// Export Result types
export * from './result.ts';
export {
  detectSyntaxFormat,
  type FormatDetectionResult,
  type SyntaxFormat,
  type SyntaxGenerationError,
  SyntaxGenerator,
  type SyntaxGeneratorOptions,
  toggleSyntaxFormat,
} from './syntax-generator.ts';
// Export all types explicitly for better TypeScript experience
export type {
  AnyEntity,
  AssetEntity,
  ClassEntity,
  ClassFileEntity,
  ConstantsEntity,
  DependencyEntity,
  DTOEntity,
  DTOField,
  Entity,
  // Core types
  EntityType,
  FileEntity,
  FunctionEntity,
  FunctionEntityWithDependencies,
  // Import/Graph types
  ImportStatement,
  Position,
  // Entity types
  ProgramEntity,
  ProgramGraph,
  Reference,
  ReferenceType,
  RunParameterEntity,
  UIComponentEntity,
  // Validation types
  ValidationError,
  ValidationResult,
} from './types.ts';
export { DSLValidator } from './validator.ts';

// Enhanced DSLChecker with better type safety
export interface DSLCheckerOptions {
  readonly skipOrphanCheck?: boolean;
  readonly validateGrammar?: boolean;
  readonly strictMode?: boolean;
}

// Generic constraints for DSLChecker operations
export type CheckerInput = string;
export type CheckerFilePath = string | FilePath;

export class DSLChecker<TOptions extends DSLCheckerOptions = DSLCheckerOptions> {
  private readonly parser = new DSLParser();
  private readonly validator: DSLValidator;
  private readonly formatter = new ErrorFormatter();
  private readonly importResolver = new ImportResolver();
  private readonly syntaxGenerator = new SyntaxGenerator();
  private readonly options: TOptions;

  constructor(options: TOptions = {} as TOptions) {
    this.options = options;
    this.validator = new DSLValidator(options);
  }

  /**
   * Get the current options
   */
  getOptions(): TOptions {
    return this.options;
  }

  /**
   * Type-safe check method with branded types support
   */
  check<TInput extends CheckerInput>(input: TInput, filePath?: CheckerFilePath): ValidationResult {
    const parseResult = this.parser.parse(input);
    const allEntities = new Map(parseResult.entities);
    const allErrors: ValidationError[] = [];

    // Resolve imports if any exist and filePath is provided
    if (parseResult.imports.length > 0 && filePath) {
      const basePath = dirname(filePath);
      const { resolvedEntities, errors } = this.importResolver.resolveImports(parseResult.imports, basePath);

      // Merge resolved entities
      for (const [name, entity] of resolvedEntities) {
        if (allEntities.has(name)) {
          allErrors.push({
            position: entity.position,
            message: `Entity '${name}' conflicts with imported entity`,
            severity: 'error',
          });
        } else {
          allEntities.set(name, entity);
        }
      }

      allErrors.push(...errors);
    }

    const result = this.validator.validate(allEntities, parseResult);
    result.errors.push(...allErrors);
    result.valid = result.errors.length === 0;

    if (!result.valid) {
      const lines = input.split('\n');
      for (const error of result.errors) {
        console.error(this.formatter.format(error, lines));
      }
    }

    return result;
  }

  /**
   * Enhanced check method that returns Result type for functional error handling
   */
  checkSafe<TInput extends CheckerInput>(input: TInput, filePath?: CheckerFilePath): Result<ProgramGraph, ValidationError[]> {
    const result = this.check(input, typeof filePath === 'string' ? filePath : undefined);

    if (result.valid) {
      const graph = this.parse(input, typeof filePath === 'string' ? filePath : undefined);
      return { _tag: 'success', value: graph };
    } else {
      return { _tag: 'failure', error: result.errors };
    }
  }

  /**
   * Type-safe parse method with branded types support
   */
  parse<TInput extends CheckerInput>(input: TInput, filePath?: CheckerFilePath): ProgramGraph {
    const parseResult = this.parser.parse(input);
    const allEntities = new Map(parseResult.entities);

    // Resolve imports if any exist and filePath is provided
    if (parseResult.imports.length > 0 && filePath) {
      const basePath = dirname(filePath);
      const { resolvedEntities } = this.importResolver.resolveImports(parseResult.imports, basePath);

      // Merge resolved entities
      for (const [name, entity] of resolvedEntities) {
        if (!allEntities.has(name)) {
          allEntities.set(name, entity);
        }
      }
    }

    const dependencies = this.buildDependencyGraph(allEntities);

    return {
      entities: allEntities,
      dependencies,
      imports: parseResult.imports,
    };
  }

  /**
   * Toggle the syntax format of DSL content between shortform and longform
   */
  toggleFormat<TInput extends CheckerInput>(input: TInput, filePath?: CheckerFilePath): Result<string, SyntaxGenerationError> {
    // Detect current format
    const detection = this.syntaxGenerator.detectFormat(input);

    // Determine target format
    const targetFormat: 'shortform' | 'longform' = detection.format === 'longform' ? 'shortform' : 'longform';

    // Parse entities and convert to target format
    try {
      const graph = this.parse(input, filePath);

      if (targetFormat === 'shortform') {
        return this.syntaxGenerator.toShortform(graph.entities);
      } else {
        return this.syntaxGenerator.toLongform(graph.entities);
      }
    } catch (error) {
      return {
        _tag: 'failure',
        error: {
          message: error instanceof Error ? error.message : 'Failed to parse content for format conversion',
        },
      };
    }
  }

  /**
   * Convert DSL content to shortform syntax using parsed entities
   */
  toShortform<TInput extends CheckerInput>(input: TInput, filePath?: CheckerFilePath): Result<string, SyntaxGenerationError> {
    const graph = this.parse(input, filePath);
    return this.syntaxGenerator.toShortform(graph.entities);
  }

  /**
   * Convert DSL content to longform syntax using parsed entities
   */
  toLongform<TInput extends CheckerInput>(input: TInput, filePath?: CheckerFilePath): Result<string, SyntaxGenerationError> {
    const graph = this.parse(input, filePath);
    return this.syntaxGenerator.toLongform(graph.entities);
  }

  /**
   * Detect the primary syntax format of DSL content
   */
  detectFormat<TInput extends CheckerInput>(input: TInput) {
    return this.syntaxGenerator.detectFormat(input);
  }

  private buildDependencyGraph(entities: Map<string, AnyEntity>): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const [name, entity] of entities) {
      const deps: string[] = [];

      if ('imports' in entity) {
        deps.push(...entity.imports.filter((imp) => !imp.includes('*')));
      }
      if ('calls' in entity) {
        deps.push(...entity.calls);
      }
      if (entity.type === 'Program') {
        deps.push(entity.entry);
      }

      graph.set(name, deps);
    }

    return graph;
  }
}
