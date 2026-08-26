/**
 * Type-safe EntityMap wrapper for managing TypedMind entities
 *
 * This provides better type safety than raw Map<string, AnyEntity> usage
 * and includes validation and utility methods for entity management.
 */

import { EntityName } from './branded-types.ts';
import type { Result } from './result.ts';
import type {
  AnyEntity,
  AssetEntity,
  ClassEntity,
  ClassFileEntity,
  ConstantsEntity,
  DependencyEntity,
  DTOEntity,
  EntityType,
  FileEntity,
  FunctionEntity,
  ProgramEntity,
  RunParameterEntity,
  UIComponentEntity,
} from './types.ts';

// Entity type mapping for type-safe retrieval
export type EntityTypeMap = {
  Program: ProgramEntity;
  File: FileEntity;
  Function: FunctionEntity;
  Class: ClassEntity;
  ClassFile: ClassFileEntity;
  Constants: ConstantsEntity;
  DTO: DTOEntity;
  Asset: AssetEntity;
  UIComponent: UIComponentEntity;
  RunParameter: RunParameterEntity;
  Dependency: DependencyEntity;
};

// Error types for EntityMap operations
export interface EntityMapError {
  readonly kind: 'entity_map_error';
  readonly type: 'duplicate_entity' | 'entity_not_found' | 'type_mismatch' | 'invalid_name';
  readonly entityName: EntityName;
  readonly expectedType?: EntityType;
  readonly actualType?: EntityType;
  readonly message: string;
}

// Type-safe EntityMap class
export class EntityMap {
  private readonly entities = new Map<string, AnyEntity>();
  private readonly typeIndex = new Map<EntityType, Set<string>>();

  constructor(initialEntities?: Map<string, AnyEntity> | EntityMap) {
    if (initialEntities instanceof EntityMap) {
      // Copy from another EntityMap
      this.entities = new Map(initialEntities.entities);
      this.typeIndex = new Map();
      for (const [type, names] of initialEntities.typeIndex) {
        this.typeIndex.set(type, new Set(names));
      }
    } else if (initialEntities instanceof Map) {
      // Copy from a regular Map
      for (const [, entity] of initialEntities) {
        this.set(entity);
      }
    }
  }

  /**
   * Add an entity to the map
   */
  set(entity: AnyEntity): Result<void, EntityMapError> {
    const entityName = entity.name;

    // Check for duplicate names
    if (this.entities.has(entityName)) {
      return {
        _tag: 'failure',
        error: {
          kind: 'entity_map_error',
          type: 'duplicate_entity',
          entityName: EntityName.unsafe(entityName),
          message: `Entity '${entityName}' already exists`,
        },
      };
    }

    // Add to main map
    this.entities.set(entityName, entity);

    // Update type index
    const typeSet = this.typeIndex.get(entity.type) ?? new Set();
    typeSet.add(entityName);
    this.typeIndex.set(entity.type, typeSet);

    return { _tag: 'success', value: undefined };
  }

  /**
   * Get an entity by name with optional type checking
   */
  get<T extends EntityType>(
    name: EntityName | string,
    expectedType?: T,
  ): Result<T extends EntityType ? EntityTypeMap[T] : AnyEntity, EntityMapError> {
    const entityName = typeof name === 'string' ? name : name;
    const entity = this.entities.get(entityName);

    if (!entity) {
      return {
        _tag: 'failure',
        error: {
          kind: 'entity_map_error',
          type: 'entity_not_found',
          entityName: EntityName.unsafe(entityName),
          message: `Entity '${entityName}' not found`,
        },
      };
    }

    if (expectedType && entity.type !== expectedType) {
      return {
        _tag: 'failure',
        error: {
          kind: 'entity_map_error',
          type: 'type_mismatch',
          entityName: EntityName.unsafe(entityName),
          expectedType,
          actualType: entity.type,
          message: `Expected entity '${entityName}' to be of type '${expectedType}', but got '${entity.type}'`,
        },
      };
    }

    return { _tag: 'success', value: entity as any };
  }

  /**
   * Get an entity unsafely (throws on missing)
   */
  getUnsafe(name: EntityName | string): AnyEntity {
    const entityName = typeof name === 'string' ? name : name;
    const entity = this.entities.get(entityName);
    if (!entity) {
      throw new Error(`Entity '${entityName}' not found`);
    }
    return entity;
  }

  /**
   * Get a typed entity unsafely
   */
  getTypedUnsafe<T extends EntityType>(name: EntityName | string, expectedType: T): EntityTypeMap[T] {
    const entity = this.getUnsafe(name);
    if (entity.type !== expectedType) {
      throw new Error(`Expected entity '${name}' to be of type '${expectedType}', but got '${entity.type}'`);
    }
    return entity as EntityTypeMap[T];
  }

  /**
   * Check if an entity exists
   */
  has(name: EntityName | string): boolean {
    const entityName = typeof name === 'string' ? name : name;
    return this.entities.has(entityName);
  }

  /**
   * Check if an entity exists with a specific type
   */
  hasOfType(name: EntityName | string, type: EntityType): boolean {
    const entity = this.entities.get(typeof name === 'string' ? name : name);
    return entity?.type === type || false;
  }

  /**
   * Remove an entity
   */
  delete(name: EntityName | string): boolean {
    const entityName = typeof name === 'string' ? name : name;
    const entity = this.entities.get(entityName);

    if (!entity) {
      return false;
    }

    // Remove from main map
    this.entities.delete(entityName);

    // Remove from type index
    const typeSet = this.typeIndex.get(entity.type);
    if (typeSet) {
      typeSet.delete(entityName);
      if (typeSet.size === 0) {
        this.typeIndex.delete(entity.type);
      }
    }

    return true;
  }

  /**
   * Get all entities of a specific type
   */
  getByType<T extends EntityType>(type: T): EntityTypeMap[T][] {
    const names = this.typeIndex.get(type) ?? new Set();
    return Array.from(names)
      .map((name) => this.entities.get(name)!)
      .filter((entity) => entity.type === type) as EntityTypeMap[T][];
  }

  /**
   * Get all entity names of a specific type
   */
  getNamesOfType(type: EntityType): EntityName[] {
    const names = this.typeIndex.get(type) ?? new Set();
    return Array.from(names).map((name) => EntityName.unsafe(name));
  }

  /**
   * Get all entities
   */
  getAll(): AnyEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get all entity names
   */
  getAllNames(): EntityName[] {
    return Array.from(this.entities.keys()).map((name) => EntityName.unsafe(name));
  }

  /**
   * Get entity count
   */
  size(): number {
    return this.entities.size;
  }

  /**
   * Get entity count by type
   */
  sizeByType(type: EntityType): number {
    return this.typeIndex.get(type)?.size ?? 0;
  }

  /**
   * Check if the map is empty
   */
  isEmpty(): boolean {
    return this.entities.size === 0;
  }

  /**
   * Clear all entities
   */
  clear(): void {
    this.entities.clear();
    this.typeIndex.clear();
  }

  /**
   * Create a new EntityMap with filtered entities
   */
  filter(predicate: (entity: AnyEntity) => boolean): EntityMap {
    const filtered = new EntityMap();
    for (const entity of this.entities.values()) {
      if (predicate(entity)) {
        filtered.set(entity);
      }
    }
    return filtered;
  }

  /**
   * Transform to a regular Map (for compatibility)
   */
  toMap(): Map<string, AnyEntity> {
    return new Map(this.entities);
  }

  /**
   * Create an EntityMap from a regular Map
   */
  static fromMap(map: Map<string, AnyEntity>): Result<EntityMap, EntityMapError[]> {
    const entityMap = new EntityMap();
    const errors: EntityMapError[] = [];

    for (const entity of map.values()) {
      const result = entityMap.set(entity);
      if (result._tag === 'failure') {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return { _tag: 'failure', error: errors };
    }

    return { _tag: 'success', value: entityMap };
  }

  /**
   * Merge another EntityMap into this one
   */
  merge(other: EntityMap): Result<void, EntityMapError[]> {
    const errors: EntityMapError[] = [];

    for (const entity of other.getAll()) {
      const result = this.set(entity);
      if (result._tag === 'failure') {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return { _tag: 'failure', error: errors };
    }

    return { _tag: 'success', value: undefined };
  }

  /**
   * Find entities that reference a specific entity
   */
  findReferencesToEntity(targetName: EntityName | string): AnyEntity[] {
    const target = typeof targetName === 'string' ? targetName : targetName;
    const referencing: AnyEntity[] = [];

    for (const entity of this.entities.values()) {
      // Check various reference fields
      const checkArrayField = (field: string[]) => field.includes(target);

      if ('imports' in entity && entity.imports && checkArrayField(entity.imports)) {
        referencing.push(entity);
      }
      if ('exports' in entity && entity.exports && checkArrayField(entity.exports)) {
        referencing.push(entity);
      }
      if ('calls' in entity && entity.calls && checkArrayField(entity.calls)) {
        referencing.push(entity);
      }
      if ('affects' in entity && entity.affects && checkArrayField(entity.affects)) {
        referencing.push(entity);
      }
      if ('consumes' in entity && entity.consumes && checkArrayField(entity.consumes)) {
        referencing.push(entity);
      }
      if ('contains' in entity && entity.contains && checkArrayField(entity.contains)) {
        referencing.push(entity);
      }
    }

    return referencing;
  }
}
