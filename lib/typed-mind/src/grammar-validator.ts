import { ENTITY_TYPE_NAMES, type EntityTypeName } from './parser-patterns.ts';
import type { AnyEntity, EntityType } from './types.ts';

export interface GrammarValidationError {
  entity: string;
  type: EntityType;
  field: string;
  expected: string;
  actual: string | undefined;
  message: string;
}

export interface GrammarValidationResult {
  valid: boolean;
  errors: GrammarValidationError[];
}

export class GrammarValidator {
  private errors: GrammarValidationError[] = [];

  validateEntity(entity: AnyEntity): GrammarValidationResult {
    this.errors = [];

    // Validate common required fields
    this.validateRequiredField(entity, 'name', 'string');
    this.validateRequiredField(entity, 'type', 'string');
    this.validateRequiredField(entity, 'position', 'object');
    this.validateRequiredField(entity, 'raw', 'string');

    // Validate entity type is valid
    if (!ENTITY_TYPE_NAMES.includes(entity.type as EntityTypeName)) {
      this.addError(
        entity,
        'type',
        'valid entity type',
        entity.type,
        `Invalid entity type: ${entity.type}. Must be one of: ${ENTITY_TYPE_NAMES.join(', ')}`,
      );
    }

    // Validate entity-specific fields
    switch (entity.type) {
      case 'Program':
        this.validateProgramEntity(entity);
        break;
      case 'File':
        this.validateFileEntity(entity);
        break;
      case 'Function':
        this.validateFunctionEntity(entity);
        break;
      case 'Class':
        this.validateClassEntity(entity);
        break;
      case 'Constants':
        this.validateConstantsEntity(entity);
        break;
      case 'DTO':
        this.validateDTOEntity(entity);
        break;
      case 'Asset':
        this.validateAssetEntity(entity);
        break;
      case 'UIComponent':
        this.validateUIComponentEntity(entity);
        break;
      case 'RunParameter':
        this.validateRunParameterEntity(entity);
        break;
      case 'Dependency':
        this.validateDependencyEntity(entity);
        break;
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
    };
  }

  private validateProgramEntity(entity: AnyEntity): void {
    this.validateRequiredField(entity, 'entry', 'string');
    this.validateOptionalField(entity, 'version', 'string', /^[\d.]+$/);
    this.validateOptionalField(entity, 'purpose', 'string');
  }

  private validateFileEntity(entity: AnyEntity): void {
    this.validateRequiredField(entity, 'path', 'string');
    this.validateOptionalField(entity, 'imports', 'array');
    this.validateOptionalField(entity, 'exports', 'array');
    this.validateOptionalField(entity, 'purpose', 'string');
  }

  private validateFunctionEntity(entity: AnyEntity): void {
    this.validateRequiredField(entity, 'signature', 'string');
    this.validateOptionalField(entity, 'calls', 'array');
    this.validateOptionalField(entity, 'description', 'string');
    this.validateOptionalField(entity, 'input', 'string');
    this.validateOptionalField(entity, 'output', 'string');
    this.validateOptionalField(entity, 'affects', 'array');
    this.validateOptionalField(entity, 'consumes', 'array');
  }

  private validateClassEntity(entity: AnyEntity): void {
    this.validateOptionalField(entity, 'implements', 'array');
    this.validateOptionalField(entity, 'methods', 'array');
    this.validateOptionalField(entity, 'extends', 'string');
    this.validateOptionalField(entity, 'path', 'string');
    this.validateOptionalField(entity, 'imports', 'array');
    this.validateOptionalField(entity, 'purpose', 'string');
  }

  private validateConstantsEntity(entity: AnyEntity): void {
    this.validateRequiredField(entity, 'path', 'string');
    this.validateOptionalField(entity, 'schema', 'string');
    this.validateOptionalField(entity, 'purpose', 'string');
  }

  private validateDTOEntity(entity: AnyEntity): void {
    this.validateRequiredField(entity, 'fields', 'array');
    this.validateOptionalField(entity, 'purpose', 'string');

    // Validate each field
    if ('fields' in entity && Array.isArray(entity.fields)) {
      entity.fields.forEach((field, index) => {
        if (!field.name || typeof field.name !== 'string') {
          this.addError(entity, `fields[${index}].name`, 'string', typeof field.name, `DTO field at index ${index} must have a name`);
        }
        if (!field.type || typeof field.type !== 'string') {
          this.addError(entity, `fields[${index}].type`, 'string', typeof field.type, `DTO field '${field.name}' must have a type`);
        }
        if (field.description !== undefined && typeof field.description !== 'string') {
          this.addError(
            entity,
            `fields[${index}].description`,
            'string',
            typeof field.description,
            `DTO field '${field.name}' description must be a string`,
          );
        }
        if (field.optional !== undefined && typeof field.optional !== 'boolean') {
          this.addError(
            entity,
            `fields[${index}].optional`,
            'boolean',
            typeof field.optional,
            `DTO field '${field.name}' optional flag must be a boolean`,
          );
        }
      });
    }
  }

  private validateAssetEntity(entity: AnyEntity): void {
    this.validateRequiredField(entity, 'description', 'string');
    this.validateOptionalField(entity, 'containsProgram', 'string');
  }

  private validateUIComponentEntity(entity: AnyEntity): void {
    this.validateRequiredField(entity, 'purpose', 'string');
    this.validateOptionalField(entity, 'contains', 'array');
    this.validateOptionalField(entity, 'containedBy', 'array');
    this.validateOptionalField(entity, 'affectedBy', 'array');
    this.validateOptionalField(entity, 'root', 'boolean');
  }

  private validateRunParameterEntity(entity: AnyEntity): void {
    this.validateRequiredField(entity, 'paramType', 'string', /^(env|iam|runtime|config)$/);
    this.validateRequiredField(entity, 'description', 'string');
    this.validateOptionalField(entity, 'consumedBy', 'array');
    this.validateOptionalField(entity, 'required', 'boolean');
    this.validateOptionalField(entity, 'defaultValue', 'string');
  }

  private validateDependencyEntity(entity: AnyEntity): void {
    this.validateRequiredField(entity, 'purpose', 'string');
    this.validateOptionalField(entity, 'importedBy', 'array');
    this.validateOptionalField(entity, 'version', 'string');
  }

  private validateRequiredField(entity: AnyEntity, field: string, expectedType: string, pattern?: RegExp): void {
    if (!(field in entity)) {
      this.addError(entity, field, expectedType, 'undefined', `Required field '${field}' is missing`);
      return;
    }

    const value = this.getEntityFieldValue(entity, field);
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      this.addError(entity, field, expectedType, actualType, `Field '${field}' must be of type ${expectedType}`);
      return;
    }

    if (pattern && typeof value === 'string' && !pattern.test(value)) {
      this.addError(entity, field, `string matching ${pattern}`, value, `Field '${field}' does not match required pattern ${pattern}`);
    }
  }

  private validateOptionalField(entity: AnyEntity, field: string, expectedType: string, pattern?: RegExp): void {
    if (!(field in entity)) {
      return; // Optional field is missing, which is fine
    }

    const value = this.getEntityFieldValue(entity, field);
    if (value === undefined || value === null) {
      return; // Optional field can be undefined/null
    }

    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      this.addError(entity, field, expectedType, actualType, `Optional field '${field}' must be of type ${expectedType} when present`);
      return;
    }

    if (pattern && typeof value === 'string' && !pattern.test(value)) {
      this.addError(
        entity,
        field,
        `string matching ${pattern}`,
        value,
        `Optional field '${field}' does not match required pattern ${pattern}`,
      );
    }
  }

  private addError(entity: AnyEntity, field: string, expected: string, actual: string | undefined, message: string): void {
    this.errors.push({
      entity: entity.name,
      type: entity.type,
      field,
      expected,
      actual,
      message,
    });
  }

  // Batch validation for multiple entities
  validateEntities(entities: Map<string, AnyEntity>): GrammarValidationResult {
    const allErrors: GrammarValidationError[] = [];

    for (const [_, entity] of entities) {
      const result = this.validateEntity(entity);
      allErrors.push(...result.errors);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  // Format errors for display
  formatErrors(errors: GrammarValidationError[]): string {
    if (errors.length === 0) {
      return 'No grammar validation errors found.';
    }

    const errorMessages = errors.map((error) => `  - ${error.entity} (${error.type}): ${error.message}`);

    return `Grammar validation errors found:\n${errorMessages.join('\n')}`;
  }

  /**
   * Type-safe field access helper to replace (entity as any)[field]
   */
  private getEntityFieldValue(entity: AnyEntity, field: string): unknown {
    // Use index signature access with proper type checking
    const entityRecord = entity as unknown as Record<string, unknown>;
    return entityRecord[field];
  }
}
