/**
 * Builder pattern for TypedMind entities
 *
 * Provides a fluent API for creating complex entities with validation,
 * better type safety, and reduced boilerplate compared to direct object construction.
 */

import type { Description, EntityName, FilePath, FunctionSignature, Version } from './branded-types.ts';
import type { Result } from './result.ts';
import type { AnyEntity, ClassFileEntity, DTOEntity, DTOField, FileEntity, FunctionEntity, Position, ProgramEntity } from './types.ts';

// Base builder interface
interface BaseBuilder<T extends AnyEntity> {
  build(): Result<T, string>;
}

// Position utility
const createDefaultPosition = (): Position => ({ line: 0, column: 0 });

// Program Entity Builder
export class ProgramEntityBuilder implements BaseBuilder<ProgramEntity> {
  private data: Partial<ProgramEntity> = {
    type: 'Program',
    position: createDefaultPosition(),
    raw: '',
  };

  static create(): ProgramEntityBuilder {
    return new ProgramEntityBuilder();
  }

  name(name: EntityName): this {
    this.data.name = name;
    return this;
  }

  entry(entryPoint: EntityName): this {
    this.data.entry = entryPoint;
    return this;
  }

  version(version: Version): this {
    this.data.version = version;
    return this;
  }

  purpose(purpose: Description): this {
    this.data.purpose = purpose;
    return this;
  }

  exports(exports: EntityName[]): this {
    this.data.exports = exports;
    return this;
  }

  position(position: Position): this {
    this.data.position = position;
    return this;
  }

  raw(raw: string): this {
    this.data.raw = raw;
    return this;
  }

  comment(comment: string): this {
    this.data.comment = comment;
    return this;
  }

  build(): Result<ProgramEntity, string> {
    if (!this.data.name) {
      return { _tag: 'failure', error: 'Program name is required' };
    }
    if (!this.data.entry) {
      return { _tag: 'failure', error: 'Program entry point is required' };
    }

    return {
      _tag: 'success',
      value: {
        type: 'Program',
        name: this.data.name,
        entry: this.data.entry,
        position: this.data.position || createDefaultPosition(),
        raw: this.data.raw || '',
        ...(this.data.version && { version: this.data.version }),
        ...(this.data.purpose && { purpose: this.data.purpose }),
        ...(this.data.exports && { exports: this.data.exports }),
        ...(this.data.comment && { comment: this.data.comment }),
      },
    };
  }
}

// File Entity Builder
export class FileEntityBuilder implements BaseBuilder<FileEntity> {
  private data: Partial<FileEntity> = {
    type: 'File',
    position: createDefaultPosition(),
    raw: '',
    imports: [],
    exports: [],
  };

  static create(): FileEntityBuilder {
    return new FileEntityBuilder();
  }

  name(name: EntityName): this {
    this.data.name = name;
    return this;
  }

  path(path: FilePath): this {
    this.data.path = path;
    return this;
  }

  imports(imports: EntityName[]): this {
    this.data.imports = imports;
    return this;
  }

  addImport(importName: EntityName): this {
    if (!this.data.imports) this.data.imports = [];
    this.data.imports.push(importName);
    return this;
  }

  exports(exports: EntityName[]): this {
    this.data.exports = exports;
    return this;
  }

  addExport(exportName: EntityName): this {
    if (!this.data.exports) this.data.exports = [];
    this.data.exports.push(exportName);
    return this;
  }

  purpose(purpose: Description): this {
    this.data.purpose = purpose;
    return this;
  }

  position(position: Position): this {
    this.data.position = position;
    return this;
  }

  raw(raw: string): this {
    this.data.raw = raw;
    return this;
  }

  comment(comment: string): this {
    this.data.comment = comment;
    return this;
  }

  build(): Result<FileEntity, string> {
    if (!this.data.name) {
      return { _tag: 'failure', error: 'File name is required' };
    }
    if (!this.data.path) {
      return { _tag: 'failure', error: 'File path is required' };
    }

    return {
      _tag: 'success',
      value: {
        type: 'File',
        name: this.data.name,
        path: this.data.path,
        imports: this.data.imports || [],
        exports: this.data.exports || [],
        position: this.data.position || createDefaultPosition(),
        raw: this.data.raw || '',
        ...(this.data.purpose && { purpose: this.data.purpose }),
        ...(this.data.comment && { comment: this.data.comment }),
      },
    };
  }
}

// Function Entity Builder
export class FunctionEntityBuilder implements BaseBuilder<FunctionEntity> {
  private data: Partial<FunctionEntity> = {
    type: 'Function',
    position: createDefaultPosition(),
    raw: '',
    calls: [],
    affects: [],
    consumes: [],
  };

  static create(): FunctionEntityBuilder {
    return new FunctionEntityBuilder();
  }

  name(name: EntityName): this {
    this.data.name = name;
    return this;
  }

  signature(signature: FunctionSignature): this {
    this.data.signature = signature;
    return this;
  }

  container(container: EntityName): this {
    this.data.container = container;
    return this;
  }

  description(description: Description): this {
    this.data.description = description;
    return this;
  }

  calls(calls: EntityName[]): this {
    this.data.calls = calls;
    return this;
  }

  addCall(call: EntityName): this {
    if (!this.data.calls) this.data.calls = [];
    this.data.calls.push(call);
    return this;
  }

  input(inputDTO: EntityName): this {
    this.data.input = inputDTO;
    return this;
  }

  output(outputDTO: EntityName): this {
    this.data.output = outputDTO;
    return this;
  }

  affects(affects: EntityName[]): this {
    this.data.affects = affects;
    return this;
  }

  addAffects(component: EntityName): this {
    if (!this.data.affects) this.data.affects = [];
    this.data.affects.push(component);
    return this;
  }

  consumes(consumes: EntityName[]): this {
    this.data.consumes = consumes;
    return this;
  }

  addConsumes(parameter: EntityName): this {
    if (!this.data.consumes) this.data.consumes = [];
    this.data.consumes.push(parameter);
    return this;
  }

  position(position: Position): this {
    this.data.position = position;
    return this;
  }

  raw(raw: string): this {
    this.data.raw = raw;
    return this;
  }

  comment(comment: string): this {
    this.data.comment = comment;
    return this;
  }

  build(): Result<FunctionEntity, string> {
    if (!this.data.name) {
      return { _tag: 'failure', error: 'Function name is required' };
    }
    if (!this.data.signature) {
      return { _tag: 'failure', error: 'Function signature is required' };
    }

    return {
      _tag: 'success',
      value: {
        type: 'Function',
        name: this.data.name,
        signature: this.data.signature,
        calls: this.data.calls || [],
        affects: this.data.affects || [],
        consumes: this.data.consumes || [],
        position: this.data.position || createDefaultPosition(),
        raw: this.data.raw || '',
        ...(this.data.container && { container: this.data.container }),
        ...(this.data.description && { description: this.data.description }),
        ...(this.data.input && { input: this.data.input }),
        ...(this.data.output && { output: this.data.output }),
        ...(this.data.comment && { comment: this.data.comment }),
      },
    };
  }
}

// DTO Entity Builder
export class DTOEntityBuilder implements BaseBuilder<DTOEntity> {
  private data: Partial<DTOEntity> = {
    type: 'DTO',
    position: createDefaultPosition(),
    raw: '',
    fields: [],
  };

  static create(): DTOEntityBuilder {
    return new DTOEntityBuilder();
  }

  name(name: EntityName): this {
    this.data.name = name;
    return this;
  }

  purpose(purpose: Description): this {
    this.data.purpose = purpose;
    return this;
  }

  fields(fields: DTOField[]): this {
    this.data.fields = fields;
    return this;
  }

  addField(field: DTOField): this {
    if (!this.data.fields) this.data.fields = [];
    this.data.fields.push(field);
    return this;
  }

  addFieldFromParts(name: string, type: string, description?: string, optional?: boolean): this {
    const field: DTOField = {
      name,
      type,
      ...(description && { description }),
      ...(optional && { optional }),
    };
    return this.addField(field);
  }

  position(position: Position): this {
    this.data.position = position;
    return this;
  }

  raw(raw: string): this {
    this.data.raw = raw;
    return this;
  }

  comment(comment: string): this {
    this.data.comment = comment;
    return this;
  }

  build(): Result<DTOEntity, string> {
    if (!this.data.name) {
      return { _tag: 'failure', error: 'DTO name is required' };
    }

    return {
      _tag: 'success',
      value: {
        type: 'DTO',
        name: this.data.name,
        fields: this.data.fields || [],
        position: this.data.position || createDefaultPosition(),
        raw: this.data.raw || '',
        ...(this.data.purpose && { purpose: this.data.purpose }),
        ...(this.data.comment && { comment: this.data.comment }),
      },
    };
  }
}

// ClassFile Entity Builder (most complex)
export class ClassFileEntityBuilder implements BaseBuilder<ClassFileEntity> {
  private data: Partial<ClassFileEntity> = {
    type: 'ClassFile',
    position: createDefaultPosition(),
    raw: '',
    implements: [],
    methods: [],
    imports: [],
    exports: [],
  };

  static create(): ClassFileEntityBuilder {
    return new ClassFileEntityBuilder();
  }

  name(name: EntityName): this {
    this.data.name = name;
    return this;
  }

  path(path: FilePath): this {
    this.data.path = path;
    return this;
  }

  extends(baseClass: EntityName): this {
    this.data.extends = baseClass;
    return this;
  }

  implements(interfaces: EntityName[]): this {
    this.data.implements = interfaces;
    return this;
  }

  addImplements(interfaceName: EntityName): this {
    if (!this.data.implements) this.data.implements = [];
    this.data.implements.push(interfaceName);
    return this;
  }

  methods(methods: EntityName[]): this {
    this.data.methods = methods;
    return this;
  }

  addMethod(method: EntityName): this {
    if (!this.data.methods) this.data.methods = [];
    this.data.methods.push(method);
    return this;
  }

  imports(imports: EntityName[]): this {
    this.data.imports = imports;
    return this;
  }

  addImport(importName: EntityName): this {
    if (!this.data.imports) this.data.imports = [];
    this.data.imports.push(importName);
    return this;
  }

  exports(exports: EntityName[]): this {
    this.data.exports = exports;
    return this;
  }

  addExport(exportName: EntityName): this {
    if (!this.data.exports) this.data.exports = [];
    this.data.exports.push(exportName);
    return this;
  }

  purpose(purpose: Description): this {
    this.data.purpose = purpose;
    return this;
  }

  position(position: Position): this {
    this.data.position = position;
    return this;
  }

  raw(raw: string): this {
    this.data.raw = raw;
    return this;
  }

  comment(comment: string): this {
    this.data.comment = comment;
    return this;
  }

  build(): Result<ClassFileEntity, string> {
    if (!this.data.name) {
      return { _tag: 'failure', error: 'ClassFile name is required' };
    }
    if (!this.data.path) {
      return { _tag: 'failure', error: 'ClassFile path is required' };
    }

    return {
      _tag: 'success',
      value: {
        type: 'ClassFile',
        name: this.data.name,
        path: this.data.path,
        implements: this.data.implements || [],
        methods: this.data.methods || [],
        imports: this.data.imports || [],
        exports: this.data.exports || [],
        position: this.data.position || createDefaultPosition(),
        raw: this.data.raw || '',
        ...(this.data.extends && { extends: this.data.extends }),
        ...(this.data.purpose && { purpose: this.data.purpose }),
        ...(this.data.comment && { comment: this.data.comment }),
      },
    };
  }
}

// Factory class for all builders
export class EntityBuilder {
  static program(): ProgramEntityBuilder {
    return ProgramEntityBuilder.create();
  }

  static file(): FileEntityBuilder {
    return FileEntityBuilder.create();
  }

  static function(): FunctionEntityBuilder {
    return FunctionEntityBuilder.create();
  }

  static dto(): DTOEntityBuilder {
    return DTOEntityBuilder.create();
  }

  static classFile(): ClassFileEntityBuilder {
    return ClassFileEntityBuilder.create();
  }

  // Convenience method to create any builder
  static create<T extends AnyEntity['type']>(
    type: T,
  ): T extends 'Program'
    ? ProgramEntityBuilder
    : T extends 'File'
      ? FileEntityBuilder
      : T extends 'Function'
        ? FunctionEntityBuilder
        : T extends 'DTO'
          ? DTOEntityBuilder
          : T extends 'ClassFile'
            ? ClassFileEntityBuilder
            : never {
    switch (type) {
      case 'Program':
        return EntityBuilder.program() as any;
      case 'File':
        return EntityBuilder.file() as any;
      case 'Function':
        return EntityBuilder.function() as any;
      case 'DTO':
        return EntityBuilder.dto() as any;
      case 'ClassFile':
        return EntityBuilder.classFile() as any;
      default:
        throw new Error(`Builder for entity type '${type}' not implemented yet`);
    }
  }
}

// Type-safe builder creation helper
export const createEntityBuilder = EntityBuilder.create;
