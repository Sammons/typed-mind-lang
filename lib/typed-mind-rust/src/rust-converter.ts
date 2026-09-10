import { basename } from 'node:path';
import {
  ClassNode,
  ConstantsNode,
  DependencyNode,
  DtoFieldNode,
  DtoNode,
  type EntityNode,
  FileNode,
  FunctionNode,
  ProgramNode,
  parseTypeExprText,
  TypeDefNode,
} from '@sammons/typed-mind';
import type {
  ConversionError,
  ConversionOptions,
  ConversionResult,
  ConversionWarning,
  ParsedClass,
  ParsedEnum,
  ParsedFunction,
  ParsedInterface,
  ParsedModule,
  ParsedTypeAlias,
  ProjectAnalysis,
} from '@sammons/typed-mind-tree-sitter-common';
import {
  type Converter,
  collapseDescription,
  EmittedNameAllocator,
  emitTmd,
  SYNTHETIC_SPAN,
  sortIntoLegacySectionOrder,
} from '@sammons/typed-mind-tree-sitter-common';
import type { RustAnalyzer } from './rust-analyzer.ts';

export class RustConverter implements Converter {
  readonly #options: ConversionOptions;
  readonly #nameAllocator = new EmittedNameAllocator();
  readonly #analyzer: RustAnalyzer | undefined;

  constructor(options: ConversionOptions, analyzer?: RustAnalyzer) {
    this.#options = options;
    this.#analyzer = analyzer;
  }

  convert(analysis: ProjectAnalysis): ConversionResult {
    const entities: EntityNode[] = [];
    const errors: ConversionError[] = [];
    const warnings: ConversionWarning[] = [];

    try {
      // Program entity (from Cargo.toml metadata).
      if (this.#options.generatePrograms && this.#analyzer !== undefined) {
        const cargo = this.#analyzer.cargoProject;
        const entryFile = analysis.entryPoints[0];
        if (entryFile !== undefined) {
          const programName = this.#reserveName(cargo.name);
          const version = this.#options.programVersion ?? (cargo.version.length > 0 ? cargo.version : undefined);
          if (version !== undefined) {
            entities.push(
              new ProgramNode({
                name: programName,
                entry: entryFile,
                purpose: `Rust ${cargo.isLibrary ? 'library' : 'binary'} crate`,
                version,
                span: SYNTHETIC_SPAN,
                raw: '',
                sourceForm: 'shortform',
              }),
            );
          } else {
            entities.push(
              new ProgramNode({
                name: programName,
                entry: entryFile,
                purpose: `Rust ${cargo.isLibrary ? 'library' : 'binary'} crate`,
                span: SYNTHETIC_SPAN,
                raw: '',
                sourceForm: 'shortform',
              }),
            );
          }
        }
      }

      // Dependency entities (from Cargo.toml [dependencies]).
      if (this.#analyzer !== undefined) {
        for (const dep of this.#analyzer.cargoProject.dependencies) {
          const depName = this.#reserveName(dep.name);
          if (dep.version !== undefined) {
            entities.push(
              new DependencyNode({
                name: depName,
                purpose: 'Rust crate dependency',
                version: dep.version,
                span: SYNTHETIC_SPAN,
                raw: '',
                sourceForm: 'shortform',
              }),
            );
          } else {
            entities.push(
              new DependencyNode({
                name: depName,
                purpose: 'Rust crate dependency',
                span: SYNTHETIC_SPAN,
                raw: '',
                sourceForm: 'shortform',
              }),
            );
          }
        }
      }

      // Process each module (file).
      for (const mod of analysis.modules) {
        this.#convertModule(mod, entities, warnings);
      }
    } catch (err) {
      errors.push({
        message: err instanceof Error ? err.message : String(err),
        filePath: undefined,
      });
    }

    const sorted = sortIntoLegacySectionOrder(entities);
    const tmdContent = emitTmd(sorted);

    return {
      success: errors.length === 0,
      entities: sorted,
      tmdContent,
      errors,
      warnings,
    };
  }

  #reserveName(name: string): string {
    return this.#nameAllocator.reserve(name, [name]);
  }

  #convertModule(mod: ParsedModule, entities: EntityNode[], warnings: ConversionWarning[]): void {
    const filePath = mod.filePath;
    const moduleName = this.#moduleNameFromPath(filePath);

    // File entity.
    const importNames = mod.imports.flatMap((imp) => imp.namedImports);
    const exportNames = mod.exports.map((exp) => exp.name);
    const fileName = this.#reserveName(moduleName);

    entities.push(
      new FileNode({
        name: fileName,
        path: filePath,
        imports: importNames,
        exports: exportNames,
        reExports: [],
        span: SYNTHETIC_SPAN,
        raw: '',
        sourceForm: 'shortform',
      }),
    );

    // Structs -> Class or DTO.
    for (const cls of mod.classes) {
      this.#convertStruct(cls, entities, warnings);
    }

    // Enums -> TypeDef (variant: 'enum').
    for (const en of mod.enums) {
      this.#convertEnum(en, entities);
    }

    // Traits -> Class (abstract).
    for (const iface of mod.interfaces) {
      this.#convertTrait(iface, entities);
    }

    // Module-level functions -> Function.
    for (const fn of mod.functions) {
      this.#convertFunction(fn, entities);
    }

    // Type aliases -> TypeDef (variant: 'alias').
    for (const typeAlias of mod.types) {
      this.#convertTypeAlias(typeAlias, entities);
    }

    // Constants -> Constants.
    if (mod.constants.length > 0) {
      this.#convertConstants(filePath, entities);
    }
  }

  #convertStruct(cls: ParsedClass, entities: EntityNode[], _warnings: ConversionWarning[]): void {
    const hasMethods = cls.methods.length > 0;
    const entityName = this.#reserveName(cls.name);
    const purpose = cls.description !== undefined ? collapseDescription(cls.description) : undefined;

    if (hasMethods) {
      // Struct with impl methods -> ClassNode.
      // cls.methods is ParsedMethod[] — extract names for the ClassNode.
      const methodNames: string[] = cls.methods.map((m) => m.name);
      const base = {
        name: entityName,
        implements: [...cls.implements],
        methods: methodNames,
        span: SYNTHETIC_SPAN,
        raw: '' as const,
        sourceForm: 'shortform' as const,
      };
      const extendsName = cls.extends.length > 0 ? cls.extends[0] : undefined;
      if (purpose !== undefined && extendsName !== undefined) {
        entities.push(new ClassNode({ ...base, extends: extendsName, purpose }));
      } else if (purpose !== undefined) {
        entities.push(new ClassNode({ ...base, purpose }));
      } else if (extendsName !== undefined) {
        entities.push(new ClassNode({ ...base, extends: extendsName }));
      } else {
        entities.push(new ClassNode(base));
      }
    } else {
      // Struct without methods -> DtoNode.
      const fields = cls.properties.map((prop) => {
        const parsed = parseTypeExprText(prop.type);
        return new DtoFieldNode({
          name: prop.name,
          type: prop.type,
          typeExpr: parsed.typeExpr,
          optionalityMarker: prop.isOptional ? 'question' : 'none',
          span: SYNTHETIC_SPAN,
        });
      });

      if (purpose !== undefined) {
        entities.push(new DtoNode({ name: entityName, fields, purpose, span: SYNTHETIC_SPAN, raw: '', sourceForm: 'shortform' }));
      } else {
        entities.push(new DtoNode({ name: entityName, fields, span: SYNTHETIC_SPAN, raw: '', sourceForm: 'shortform' }));
      }
    }
  }

  #convertEnum(en: ParsedEnum, entities: EntityNode[]): void {
    const entityName = this.#reserveName(en.name);
    const purpose = en.description !== undefined ? collapseDescription(en.description) : undefined;

    if (purpose !== undefined) {
      entities.push(
        new TypeDefNode({
          name: entityName,
          variant: 'enum',
          members: en.members,
          purpose,
          span: SYNTHETIC_SPAN,
          raw: '',
          sourceForm: 'shortform',
        }),
      );
    } else {
      entities.push(
        new TypeDefNode({ name: entityName, variant: 'enum', members: en.members, span: SYNTHETIC_SPAN, raw: '', sourceForm: 'shortform' }),
      );
    }
  }

  #convertTrait(iface: ParsedInterface, entities: EntityNode[]): void {
    const entityName = this.#reserveName(iface.name);
    const methodNames: string[] = iface.methods.map((m) => m.name);
    const purpose = iface.description !== undefined ? collapseDescription(iface.description) : undefined;

    if (purpose !== undefined) {
      entities.push(
        new ClassNode({
          name: entityName,
          implements: [],
          methods: methodNames,
          purpose,
          span: SYNTHETIC_SPAN,
          raw: '',
          sourceForm: 'shortform',
        }),
      );
    } else {
      entities.push(
        new ClassNode({
          name: entityName,
          implements: [],
          methods: methodNames,
          span: SYNTHETIC_SPAN,
          raw: '',
          sourceForm: 'shortform',
        }),
      );
    }
  }

  #convertFunction(fn: ParsedFunction, entities: EntityNode[]): void {
    const entityName = this.#reserveName(fn.name);
    const description = fn.description !== undefined ? collapseDescription(fn.description) : undefined;

    if (description !== undefined) {
      entities.push(
        new FunctionNode({
          name: entityName,
          signature: fn.signature,
          calls: [],
          pendingDependencies: [],
          description,
          span: SYNTHETIC_SPAN,
          raw: '',
          sourceForm: 'shortform',
        }),
      );
    } else {
      entities.push(
        new FunctionNode({
          name: entityName,
          signature: fn.signature,
          calls: [],
          pendingDependencies: [],
          span: SYNTHETIC_SPAN,
          raw: '',
          sourceForm: 'shortform',
        }),
      );
    }
  }

  #convertTypeAlias(typeAlias: ParsedTypeAlias, entities: EntityNode[]): void {
    const entityName = this.#reserveName(typeAlias.name);
    const parsed = parseTypeExprText(typeAlias.type);
    const purpose = typeAlias.description !== undefined ? collapseDescription(typeAlias.description) : undefined;

    if (purpose !== undefined) {
      entities.push(
        new TypeDefNode({
          name: entityName,
          variant: 'alias',
          aliasType: parsed.typeExpr,
          purpose,
          span: SYNTHETIC_SPAN,
          raw: '',
          sourceForm: 'shortform',
        }),
      );
    } else {
      entities.push(
        new TypeDefNode({
          name: entityName,
          variant: 'alias',
          aliasType: parsed.typeExpr,
          span: SYNTHETIC_SPAN,
          raw: '',
          sourceForm: 'shortform',
        }),
      );
    }
  }

  #convertConstants(filePath: string, entities: EntityNode[]): void {
    // Group all constants from this file into one Constants entity.
    const moduleName = this.#moduleNameFromPath(filePath);
    const entityName = this.#reserveName(`${moduleName}_constants`);

    entities.push(
      new ConstantsNode({
        name: entityName,
        path: filePath,
        span: SYNTHETIC_SPAN,
        raw: '',
        sourceForm: 'shortform',
      }),
    );
  }

  #moduleNameFromPath(filePath: string): string {
    // `src/models.rs` -> `models`, `src/lib.rs` -> `lib`
    return basename(filePath, '.rs');
  }
}
