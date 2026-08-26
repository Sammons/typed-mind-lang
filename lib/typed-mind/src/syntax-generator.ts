import { ENTITY_PATTERNS, GENERAL_PATTERNS } from './parser-patterns.ts';
import type { Result } from './result.ts';
import type {
  AnyEntity,
  AssetEntity,
  ClassEntity,
  ClassFileEntity,
  ConstantsEntity,
  DependencyEntity,
  DTOEntity,
  FileEntity,
  FunctionEntity,
  ProgramEntity,
  RunParameterEntity,
  UIComponentEntity,
} from './types.ts';

/**
 * Syntax format types
 */
export type SyntaxFormat = 'shortform' | 'longform' | 'mixed';

/**
 * Configuration for syntax generation
 */
export interface SyntaxGeneratorOptions {
  readonly preserveComments?: boolean;
  readonly indentSize?: number;
  readonly preserveEmptyLines?: boolean;
}

/**
 * Error types for syntax generation
 */
export interface SyntaxGenerationError {
  readonly message: string;
  readonly entity?: string;
  readonly line?: number;
}

/**
 * Result type for format detection
 */
export interface FormatDetectionResult {
  readonly format: SyntaxFormat;
  readonly shortformLines: number;
  readonly longformLines: number;
  readonly totalLines: number;
  readonly confidence: number; // 0-1, how confident we are in the detection
}

/**
 * Type-safe syntax generator following Matt Pocock patterns
 */
export class SyntaxGenerator {
  private readonly options: Required<SyntaxGeneratorOptions>;

  constructor(options: SyntaxGeneratorOptions = {}) {
    this.options = {
      preserveComments: true,
      indentSize: 2,
      preserveEmptyLines: true,
      ...options,
    };
  }

  /**
   * Detect the primary format of DSL content
   */
  detectFormat(content: string): FormatDetectionResult {
    const lines = content.split('\n');
    let shortformLines = 0;
    let longformLines = 0;
    let totalSignificantLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      totalSignificantLines++;

      // Check for longform patterns first (more specific)
      if (GENERAL_PATTERNS.LONGFORM_DECLARATION.test(trimmed)) {
        longformLines++;
        continue;
      }

      // Check for shortform entity declarations
      if (GENERAL_PATTERNS.ENTITY_DECLARATION.test(trimmed)) {
        // Additional checks for specific shortform patterns
        if (this.isShortformEntityLine(trimmed)) {
          shortformLines++;
          continue;
        }
      }

      // Check for continuation lines (could be either format)
      if (GENERAL_PATTERNS.CONTINUATION.test(line)) {
      }
    }

    // Determine format based on prevalence
    const shortformRatio = totalSignificantLines > 0 ? shortformLines / totalSignificantLines : 0;
    const longformRatio = totalSignificantLines > 0 ? longformLines / totalSignificantLines : 0;

    let format: SyntaxFormat;
    let confidence: number;

    if (shortformLines === 0 && longformLines === 0) {
      format = 'shortform'; // Default to shortform for pure continuation files
      confidence = 0.5;
    } else if (longformLines === 0 && shortformLines > 0) {
      format = 'shortform';
      confidence = 1.0;
    } else if (shortformLines === 0 && longformLines > 0) {
      format = 'longform';
      confidence = 1.0;
    } else if (shortformRatio > 0.6) {
      format = 'shortform';
      confidence = shortformRatio;
    } else if (longformRatio > 0.6) {
      format = 'longform';
      confidence = longformRatio;
    } else {
      format = 'mixed';
      confidence = 1.0 - Math.abs(shortformRatio - longformRatio);
    }

    return {
      format,
      shortformLines,
      longformLines,
      totalLines: totalSignificantLines,
      confidence,
    };
  }

  /**
   * Toggle format of DSL content
   */
  toggleFormat(content: string): Result<string, SyntaxGenerationError> {
    const detection = this.detectFormat(content);

    // Determine target format
    const targetFormat: SyntaxFormat = detection.format === 'longform' ? 'shortform' : 'longform';

    return this.convertToFormat(content, targetFormat);
  }

  /**
   * Convert DSL content to specific format
   */
  convertToFormat(content: string, targetFormat: SyntaxFormat): Result<string, SyntaxGenerationError> {
    try {
      // For mixed format, we need to parse and regenerate everything
      // This is a simplified approach - in a real implementation, we'd want
      // to integrate with the DSLParser to get the full entity graph

      if (targetFormat === 'shortform') {
        return this.convertToShortform(content);
      } else {
        return this.convertToLongform(content);
      }
    } catch (error) {
      return {
        _tag: 'failure',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during syntax conversion',
        },
      };
    }
  }

  /**
   * Generate shortform syntax from entities
   */
  toShortform(entities: Map<string, AnyEntity>): Result<string, SyntaxGenerationError> {
    try {
      const lines: string[] = [];

      // Sort entities by type for consistent output
      const sortedEntities = Array.from(entities.values()).sort((a, b) => {
        const typeOrder = this.getEntityTypeOrder(a.type);
        const typeOrderB = this.getEntityTypeOrder(b.type);
        if (typeOrder !== typeOrderB) {
          return typeOrder - typeOrderB;
        }
        return a.name.localeCompare(b.name);
      });

      for (const entity of sortedEntities) {
        const entityLines = this.entityToShortform(entity);
        if (entityLines._tag === 'failure') {
          return entityLines;
        }

        lines.push(...entityLines.value);

        // Add empty line between entities for readability
        if (this.options.preserveEmptyLines) {
          lines.push('');
        }
      }

      return {
        _tag: 'success',
        value: lines.join('\n').trim(),
      };
    } catch (error) {
      return {
        _tag: 'failure',
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate shortform syntax',
        },
      };
    }
  }

  /**
   * Generate longform syntax from entities
   */
  toLongform(entities: Map<string, AnyEntity>): Result<string, SyntaxGenerationError> {
    try {
      const lines: string[] = [];

      const sortedEntities = Array.from(entities.values()).sort((a, b) => {
        const typeOrder = this.getEntityTypeOrder(a.type);
        const typeOrderB = this.getEntityTypeOrder(b.type);
        if (typeOrder !== typeOrderB) {
          return typeOrder - typeOrderB;
        }
        return a.name.localeCompare(b.name);
      });

      for (const entity of sortedEntities) {
        const entityLines = this.entityToLongform(entity);
        if (entityLines._tag === 'failure') {
          return entityLines;
        }

        lines.push(...entityLines.value);

        if (this.options.preserveEmptyLines) {
          lines.push('');
        }
      }

      return {
        _tag: 'success',
        value: lines.join('\n').trim(),
      };
    } catch (error) {
      return {
        _tag: 'failure',
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate longform syntax',
        },
      };
    }
  }

  // Private helper methods

  private isShortformEntityLine(line: string): boolean {
    const patterns = [
      ENTITY_PATTERNS.PROGRAM,
      ENTITY_PATTERNS.FILE,
      ENTITY_PATTERNS.FUNCTION,
      ENTITY_PATTERNS.CLASS,
      ENTITY_PATTERNS.CLASS_FILE,
      ENTITY_PATTERNS.CONSTANTS,
      ENTITY_PATTERNS.DTO_WITH_PURPOSE,
      ENTITY_PATTERNS.DTO_SIMPLE,
      ENTITY_PATTERNS.ASSET,
      ENTITY_PATTERNS.UI_COMPONENT,
      ENTITY_PATTERNS.RUN_PARAMETER,
      ENTITY_PATTERNS.DEPENDENCY,
    ];

    return patterns.some((pattern) => pattern.test(line));
  }

  private getEntityTypeOrder(type: string): number {
    const order = {
      Program: 0,
      File: 1,
      ClassFile: 2,
      Class: 3,
      Function: 4,
      DTO: 5,
      Constants: 6,
      Asset: 7,
      UIComponent: 8,
      RunParameter: 9,
      Dependency: 10,
    };
    return order[type as keyof typeof order] ?? 99;
  }

  private convertToShortform(content: string): Result<string, SyntaxGenerationError> {
    // This is a simplified conversion that handles basic cases
    // In a full implementation, this would parse the content first
    const lines = content.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments (will be preserved as-is)
      if (!trimmed || trimmed.startsWith('#')) {
        if (this.options.preserveComments || this.options.preserveEmptyLines) {
          result.push(line);
        }
        continue;
      }

      // For now, just pass through - full implementation would convert longform to shortform
      result.push(line);
    }

    return {
      _tag: 'success',
      value: result.join('\n'),
    };
  }

  private convertToLongform(content: string): Result<string, SyntaxGenerationError> {
    // This is a simplified conversion that handles basic cases
    const lines = content.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        if (this.options.preserveComments || this.options.preserveEmptyLines) {
          result.push(line);
        }
        continue;
      }

      // For now, just pass through - full implementation would convert shortform to longform
      result.push(line);
    }

    return {
      _tag: 'success',
      value: result.join('\n'),
    };
  }

  private entityToShortform(entity: AnyEntity): Result<string[], SyntaxGenerationError> {
    try {
      const lines: string[] = [];

      // Add comment if present
      if (entity.comment && this.options.preserveComments) {
        lines.push(`# ${entity.comment}`);
      }

      switch (entity.type) {
        case 'Program':
          lines.push(...this.programToShortform(entity as ProgramEntity));
          break;
        case 'File':
          lines.push(...this.fileToShortform(entity as FileEntity));
          break;
        case 'Function':
          lines.push(...this.functionToShortform(entity as FunctionEntity));
          break;
        case 'Class':
          lines.push(...this.classToShortform(entity as ClassEntity));
          break;
        case 'ClassFile':
          lines.push(...this.classFileToShortform(entity as ClassFileEntity));
          break;
        case 'Constants':
          lines.push(...this.constantsToShortform(entity as ConstantsEntity));
          break;
        case 'DTO':
          lines.push(...this.dtoToShortform(entity as DTOEntity));
          break;
        case 'Asset':
          lines.push(...this.assetToShortform(entity as AssetEntity));
          break;
        case 'UIComponent':
          lines.push(...this.uiComponentToShortform(entity as UIComponentEntity));
          break;
        case 'RunParameter':
          lines.push(...this.runParameterToShortform(entity as RunParameterEntity));
          break;
        case 'Dependency':
          lines.push(...this.dependencyToShortform(entity as DependencyEntity));
          break;
        default:
          return {
            _tag: 'failure',
            error: {
              message: `Unknown entity type: ${(entity as AnyEntity).type}`,
              entity: (entity as AnyEntity).name,
            },
          };
      }

      return {
        _tag: 'success',
        value: lines,
      };
    } catch (error) {
      return {
        _tag: 'failure',
        error: {
          message: error instanceof Error ? error.message : 'Failed to convert entity to shortform',
          entity: entity.name,
        },
      };
    }
  }

  private entityToLongform(entity: AnyEntity): Result<string[], SyntaxGenerationError> {
    try {
      const lines: string[] = [];

      switch (entity.type) {
        case 'Program':
          lines.push(...this.programToLongform(entity as ProgramEntity));
          break;
        case 'File':
          lines.push(...this.fileToLongform(entity as FileEntity));
          break;
        case 'Function':
          lines.push(...this.functionToLongform(entity as FunctionEntity));
          break;
        case 'Class':
          lines.push(...this.classToLongform(entity as ClassEntity));
          break;
        case 'ClassFile':
          lines.push(...this.classFileToLongform(entity as ClassFileEntity));
          break;
        case 'Constants':
          lines.push(...this.constantsToLongform(entity as ConstantsEntity));
          break;
        case 'DTO':
          lines.push(...this.dtoToLongform(entity as DTOEntity));
          break;
        case 'Asset':
          lines.push(...this.assetToLongform(entity as AssetEntity));
          break;
        case 'UIComponent':
          lines.push(...this.uiComponentToLongform(entity as UIComponentEntity));
          break;
        case 'RunParameter':
          lines.push(...this.runParameterToLongform(entity as RunParameterEntity));
          break;
        case 'Dependency':
          lines.push(...this.dependencyToLongform(entity as DependencyEntity));
          break;
        default:
          return {
            _tag: 'failure',
            error: {
              message: `Unknown entity type: ${(entity as AnyEntity).type}`,
              entity: (entity as AnyEntity).name,
            },
          };
      }

      return {
        _tag: 'success',
        value: lines,
      };
    } catch (error) {
      return {
        _tag: 'failure',
        error: {
          message: error instanceof Error ? error.message : 'Failed to convert entity to longform',
          entity: entity.name,
        },
      };
    }
  }

  // Shortform entity converters

  private programToShortform(entity: ProgramEntity): string[] {
    const lines: string[] = [];

    let line = `${entity.name} -> ${entity.entry}`;
    if (entity.purpose) {
      line += ` "${entity.purpose}"`;
    }
    if (entity.version) {
      line += ` v${entity.version}`;
    }
    lines.push(line);

    if (entity.exports && entity.exports.length > 0) {
      lines.push(`  -> [${entity.exports.join(', ')}]`);
    }

    return lines;
  }

  private fileToShortform(entity: FileEntity): string[] {
    const lines: string[] = [];

    lines.push(`${entity.name} @ ${entity.path}:`);

    if (entity.purpose) {
      lines.push(`  "${entity.purpose}"`);
    }

    if (entity.imports && entity.imports.length > 0) {
      lines.push(`  <- [${entity.imports.join(', ')}]`);
    }

    if (entity.exports && entity.exports.length > 0) {
      lines.push(`  -> [${entity.exports.join(', ')}]`);
    }

    return lines;
  }

  private functionToShortform(entity: FunctionEntity): string[] {
    const lines: string[] = [];

    lines.push(`${entity.name} :: ${entity.signature}`);

    if (entity.description) {
      lines.push(`  "${entity.description}"`);
    }

    if (entity.input) {
      lines.push(`  <- ${entity.input}`);
    }

    if (entity.output) {
      lines.push(`  -> ${entity.output}`);
    }

    if (entity.calls && entity.calls.length > 0) {
      lines.push(`  ~> [${entity.calls.join(', ')}]`);
    }

    if (entity.affects && entity.affects.length > 0) {
      lines.push(`  ~ [${entity.affects.join(', ')}]`);
    }

    if (entity.consumes && entity.consumes.length > 0) {
      lines.push(`  $< [${entity.consumes.join(', ')}]`);
    }

    return lines;
  }

  private classToShortform(entity: ClassEntity): string[] {
    const lines: string[] = [];

    let line = `${entity.name} <:`;
    if (entity.extends) {
      line += ` ${entity.extends}`;
      if (entity.implements.length > 0) {
        line += `, ${entity.implements.join(', ')}`;
      }
    } else if (entity.implements.length > 0) {
      line += ` ${entity.implements.join(', ')}`;
    }
    lines.push(line);

    if (entity.purpose) {
      lines.push(`  "${entity.purpose}"`);
    }

    if (entity.methods && entity.methods.length > 0) {
      lines.push(`  => [${entity.methods.join(', ')}]`);
    }

    return lines;
  }

  private classFileToShortform(entity: ClassFileEntity): string[] {
    const lines: string[] = [];

    let line = `${entity.name} #: ${entity.path}`;
    if (entity.extends) {
      line += ` <: ${entity.extends}`;
      if (entity.implements.length > 0) {
        line += `, ${entity.implements.join(', ')}`;
      }
    } else if (entity.implements.length > 0) {
      line += ` <: ${entity.implements.join(', ')}`;
    }
    lines.push(line);

    if (entity.purpose) {
      lines.push(`  "${entity.purpose}"`);
    }

    if (entity.imports && entity.imports.length > 0) {
      lines.push(`  <- [${entity.imports.join(', ')}]`);
    }

    if (entity.methods && entity.methods.length > 0) {
      lines.push(`  => [${entity.methods.join(', ')}]`);
    }

    if (entity.exports && entity.exports.length > 0) {
      lines.push(`  -> [${entity.exports.join(', ')}]`);
    }

    return lines;
  }

  private constantsToShortform(entity: ConstantsEntity): string[] {
    const lines: string[] = [];

    let line = `${entity.name} ! ${entity.path}`;
    if (entity.schema) {
      line += ` : ${entity.schema}`;
    }
    lines.push(line);

    if (entity.purpose) {
      lines.push(`  "${entity.purpose}"`);
    }

    return lines;
  }

  private dtoToShortform(entity: DTOEntity): string[] {
    const lines: string[] = [];

    let line = `${entity.name} %`;
    if (entity.purpose) {
      line += ` "${entity.purpose}"`;
    }
    lines.push(line);

    for (const field of entity.fields) {
      let fieldLine = `  - ${field.name}`;
      if (field.optional && field.description) {
        // If optional and has description, use the ? syntax
        fieldLine += '?';
      }
      fieldLine += `: ${field.type}`;
      if (field.description) {
        fieldLine += ` "${field.description}"`;
      }
      if (field.optional) {
        if (!field.description) {
          // If optional but no description, just add (optional)
          fieldLine += ' (optional)';
        } else {
          // If optional and has description, add (optional) after description
          fieldLine += ' (optional)';
        }
      }
      lines.push(fieldLine);
    }

    return lines;
  }

  private assetToShortform(entity: AssetEntity): string[] {
    const lines: string[] = [];

    lines.push(`${entity.name} ~ "${entity.description}"`);

    if (entity.containsProgram) {
      lines.push(`  >> ${entity.containsProgram}`);
    }

    return lines;
  }

  private uiComponentToShortform(entity: UIComponentEntity): string[] {
    const lines: string[] = [];

    const marker = entity.root ? '&!' : '&';
    lines.push(`${entity.name} ${marker} "${entity.purpose}"`);

    if (entity.contains && entity.contains.length > 0) {
      lines.push(`  > [${entity.contains.join(', ')}]`);
    }

    if (entity.containedBy && entity.containedBy.length > 0) {
      lines.push(`  < [${entity.containedBy.join(', ')}]`);
    }

    return lines;
  }

  private runParameterToShortform(entity: RunParameterEntity): string[] {
    const lines: string[] = [];

    let line = `${entity.name} $${entity.paramType} "${entity.description}"`;
    if (entity.required) {
      line += ' (required)';
    }
    lines.push(line);

    if (entity.defaultValue) {
      lines.push(`  = "${entity.defaultValue}"`);
    }

    return lines;
  }

  private dependencyToShortform(entity: DependencyEntity): string[] {
    const lines: string[] = [];

    let line = `${entity.name} ^ "${entity.purpose}"`;
    if (entity.version) {
      line += ` v${entity.version}`;
    }
    lines.push(line);

    if (entity.exports && entity.exports.length > 0) {
      lines.push(`  -> [${entity.exports.join(', ')}]`);
    }

    return lines;
  }

  // Longform entity converters (simplified for now)

  private programToLongform(entity: ProgramEntity): string[] {
    const lines: string[] = [];

    lines.push(`program ${entity.name} {`);
    lines.push(`  type: Program`);
    lines.push(`  entry: ${entity.entry}`);

    if (entity.purpose) {
      lines.push(`  purpose: "${entity.purpose}"`);
    }

    if (entity.version) {
      lines.push(`  version: ${entity.version}`);
    }

    if (entity.exports && entity.exports.length > 0) {
      lines.push(`  exports: [${entity.exports.join(', ')}]`);
    }

    lines.push('}');

    return lines;
  }

  private fileToLongform(entity: FileEntity): string[] {
    const lines: string[] = [];

    lines.push(`file ${entity.name} {`);
    lines.push(`  type: File`);
    lines.push(`  path: ${entity.path}`);

    if (entity.purpose) {
      lines.push(`  purpose: "${entity.purpose}"`);
    }

    if (entity.imports && entity.imports.length > 0) {
      lines.push(`  imports: [${entity.imports.join(', ')}]`);
    }

    if (entity.exports && entity.exports.length > 0) {
      lines.push(`  exports: [${entity.exports.join(', ')}]`);
    }

    lines.push('}');

    return lines;
  }

  private functionToLongform(entity: FunctionEntity): string[] {
    const lines: string[] = [];

    lines.push(`function ${entity.name} {`);
    lines.push(`  type: Function`);
    lines.push(`  signature: ${entity.signature}`);

    if (entity.description) {
      lines.push(`  description: "${entity.description}"`);
    }

    if (entity.input) {
      lines.push(`  input: ${entity.input}`);
    }

    if (entity.output) {
      lines.push(`  output: ${entity.output}`);
    }

    if (entity.calls && entity.calls.length > 0) {
      lines.push(`  calls: [${entity.calls.join(', ')}]`);
    }

    if (entity.affects && entity.affects.length > 0) {
      lines.push(`  affects: [${entity.affects.join(', ')}]`);
    }

    if (entity.consumes && entity.consumes.length > 0) {
      lines.push(`  consumes: [${entity.consumes.join(', ')}]`);
    }

    lines.push('}');

    return lines;
  }

  private classToLongform(entity: ClassEntity): string[] {
    const lines: string[] = [];

    lines.push(`class ${entity.name} {`);
    lines.push(`  type: Class`);

    if (entity.extends) {
      lines.push(`  extends: ${entity.extends}`);
    }

    if (entity.implements.length > 0) {
      lines.push(`  implements: [${entity.implements.join(', ')}]`);
    }

    if (entity.purpose) {
      lines.push(`  purpose: "${entity.purpose}"`);
    }

    if (entity.methods && entity.methods.length > 0) {
      lines.push(`  methods: [${entity.methods.join(', ')}]`);
    }

    lines.push('}');

    return lines;
  }

  private classFileToLongform(entity: ClassFileEntity): string[] {
    const lines: string[] = [];

    lines.push(`classfile ${entity.name} {`);
    lines.push(`  type: ClassFile`);
    lines.push(`  path: ${entity.path}`);

    if (entity.extends) {
      lines.push(`  extends: ${entity.extends}`);
    }

    if (entity.implements.length > 0) {
      lines.push(`  implements: [${entity.implements.join(', ')}]`);
    }

    if (entity.purpose) {
      lines.push(`  purpose: "${entity.purpose}"`);
    }

    if (entity.imports && entity.imports.length > 0) {
      lines.push(`  imports: [${entity.imports.join(', ')}]`);
    }

    if (entity.methods && entity.methods.length > 0) {
      lines.push(`  methods: [${entity.methods.join(', ')}]`);
    }

    if (entity.exports && entity.exports.length > 0) {
      lines.push(`  exports: [${entity.exports.join(', ')}]`);
    }

    lines.push('}');

    return lines;
  }

  private constantsToLongform(entity: ConstantsEntity): string[] {
    const lines: string[] = [];

    lines.push(`constants ${entity.name} {`);
    lines.push(`  type: Constants`);
    lines.push(`  path: ${entity.path}`);

    if (entity.schema) {
      lines.push(`  schema: ${entity.schema}`);
    }

    if (entity.purpose) {
      lines.push(`  purpose: "${entity.purpose}"`);
    }

    lines.push('}');

    return lines;
  }

  private dtoToLongform(entity: DTOEntity): string[] {
    const lines: string[] = [];

    lines.push(`dto ${entity.name} {`);
    lines.push(`  type: DTO`);

    if (entity.purpose) {
      lines.push(`  purpose: "${entity.purpose}"`);
    }

    if (entity.fields.length > 0) {
      lines.push(`  fields: {`);
      for (const field of entity.fields) {
        const fieldLine = `    ${field.name}: {`;
        lines.push(fieldLine);
        lines.push(`      type: ${field.type}`);
        if (field.description) {
          lines.push(`      description: "${field.description}"`);
        }
        if (field.optional) {
          lines.push(`      optional: true`);
        }
        lines.push(`    }`);
      }
      lines.push(`  }`);
    }

    lines.push('}');

    return lines;
  }

  private assetToLongform(entity: AssetEntity): string[] {
    const lines: string[] = [];

    lines.push(`asset ${entity.name} {`);
    lines.push(`  type: Asset`);
    lines.push(`  description: "${entity.description}"`);

    if (entity.containsProgram) {
      lines.push(`  containsProgram: ${entity.containsProgram}`);
    }

    lines.push('}');

    return lines;
  }

  private uiComponentToLongform(entity: UIComponentEntity): string[] {
    const lines: string[] = [];

    lines.push(`component ${entity.name} {`);
    lines.push(`  type: UIComponent`);
    lines.push(`  purpose: "${entity.purpose}"`);

    if (entity.root) {
      lines.push(`  root: true`);
    }

    if (entity.contains && entity.contains.length > 0) {
      lines.push(`  contains: [${entity.contains.join(', ')}]`);
    }

    if (entity.containedBy && entity.containedBy.length > 0) {
      lines.push(`  containedBy: [${entity.containedBy.join(', ')}]`);
    }

    lines.push('}');

    return lines;
  }

  private runParameterToLongform(entity: RunParameterEntity): string[] {
    const lines: string[] = [];

    lines.push(`parameter ${entity.name} {`);
    lines.push(`  type: RunParameter`);
    lines.push(`  paramType: ${entity.paramType}`);
    lines.push(`  description: "${entity.description}"`);

    if (entity.required) {
      lines.push(`  required: true`);
    }

    if (entity.defaultValue) {
      lines.push(`  defaultValue: "${entity.defaultValue}"`);
    }

    lines.push('}');

    return lines;
  }

  private dependencyToLongform(entity: DependencyEntity): string[] {
    const lines: string[] = [];

    lines.push(`dependency ${entity.name} {`);
    lines.push(`  type: Dependency`);
    lines.push(`  purpose: "${entity.purpose}"`);

    if (entity.version) {
      lines.push(`  version: ${entity.version}`);
    }

    if (entity.exports && entity.exports.length > 0) {
      lines.push(`  exports: [${entity.exports.join(', ')}]`);
    }

    lines.push('}');

    return lines;
  }
}

/**
 * Convenience function for format toggle
 */
export const toggleSyntaxFormat = (content: string, options?: SyntaxGeneratorOptions): Result<string, SyntaxGenerationError> => {
  const generator = new SyntaxGenerator(options);
  return generator.toggleFormat(content);
};

/**
 * Convenience function for format detection
 */
export const detectSyntaxFormat = (content: string): FormatDetectionResult => {
  const generator = new SyntaxGenerator();
  return generator.detectFormat(content);
};
