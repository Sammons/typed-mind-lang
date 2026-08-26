/**
 * Branded types for TypedMind - provides compile-time type safety for strings
 * that should not be interchangeable even if they have the same runtime type.
 *
 * This prevents bugs like passing a file path where an entity name is expected.
 */

// Brand utility type for creating branded types
type Brand<T, U> = T & { readonly __brand: U };

// Core branded types for TypedMind
export type EntityName = Brand<string, 'EntityName'>;
export type FilePath = Brand<string, 'FilePath'>;
export type FunctionSignature = Brand<string, 'FunctionSignature'>;
export type Version = Brand<string, 'Version'>;
export type Description = Brand<string, 'Description'>;
export type EntityTypeName = Brand<string, 'EntityTypeName'>;

// Type guards and constructors for branded types
export const EntityName = {
  create: (name: string): EntityName => {
    if (!name.trim()) {
      throw new Error('Entity name cannot be empty');
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(
        `Invalid entity name: ${name}. Must start with letter or underscore, followed by alphanumeric characters or underscores.`,
      );
    }
    return name as EntityName;
  },

  isValid: (name: string): name is EntityName => {
    return name.trim().length > 0 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  },

  unsafe: (name: string): EntityName => name as EntityName,
};

export const FilePath = {
  create: (path: string): FilePath => {
    if (!path.trim()) {
      throw new Error('File path cannot be empty');
    }
    return path as FilePath;
  },

  isValid: (path: string): path is FilePath => {
    return path.trim().length > 0;
  },

  unsafe: (path: string): FilePath => path as FilePath,
};

export const FunctionSignature = {
  create: (signature: string): FunctionSignature => {
    if (!signature.trim()) {
      throw new Error('Function signature cannot be empty');
    }
    return signature as FunctionSignature;
  },

  unsafe: (signature: string): FunctionSignature => signature as FunctionSignature,
};

export const Version = {
  create: (version: string): Version => {
    // Strip 'v' prefix if present
    const normalizedVersion = version.startsWith('v') ? version.slice(1) : version;
    if (!/^\d+(\.\d+)*(-[\w\-.]+)?$/.test(normalizedVersion)) {
      throw new Error(`Invalid version format: ${version}`);
    }
    return normalizedVersion as Version;
  },

  unsafe: (version: string): Version => version as Version,
};

export const Description = {
  create: (description: string): Description => {
    return description as Description;
  },

  unsafe: (description: string): Description => description as Description,
};

export const EntityTypeName = {
  create: (typeName: string): EntityTypeName => {
    const validTypes = [
      'Program',
      'File',
      'Function',
      'Class',
      'ClassFile',
      'Constants',
      'DTO',
      'Asset',
      'UIComponent',
      'RunParameter',
      'Dependency',
    ];
    if (!validTypes.includes(typeName)) {
      throw new Error(`Invalid entity type: ${typeName}. Must be one of: ${validTypes.join(', ')}`);
    }
    return typeName as EntityTypeName;
  },

  unsafe: (typeName: string): EntityTypeName => typeName as EntityTypeName,
};

// Helper type for extracting the branded value
export type Unbranded<T> = T extends Brand<infer U, any> ? U : T;

// Helper function to remove branding (for runtime use)
export const unbrand = <T>(value: T): Unbranded<T> => value as Unbranded<T>;
