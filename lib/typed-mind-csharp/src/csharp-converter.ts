// C# converter: transforms ProjectAnalysis into TypedMind EntityNode[].

import { readdirSync } from 'node:fs';
import {
  ClassFileNode,
  ClassNode,
  DependencyNode,
  DtoFieldNode,
  DtoNode,
  type EntityNode,
  FileNode,
  ProgramNode,
  parseTypeExprText,
  TypeDefNode,
} from '@sammons/typed-mind';
import {
  type ConversionError,
  type ConversionOptions,
  type ConversionResult,
  type ConversionWarning,
  type Converter,
  EmittedNameAllocator,
  emitTmd,
  type ParsedClass,
  type ParsedEnum,
  type ParsedInterface,
  type ParsedModule,
  type ProjectAnalysis,
  SYNTHETIC_SPAN,
  sortIntoLegacySectionOrder,
} from '@sammons/typed-mind-tree-sitter-common';
import { type PackageReference, parseCsproj } from './csharp-project.ts';

function isStructWithoutMethods(cls: ParsedClass): boolean {
  return cls.description === 'struct' && cls.methods.length === 0;
}

function isRecordLike(cls: ParsedClass): boolean {
  // Records are classes with properties but typically no custom methods beyond
  // auto-generated ones. For converter purposes, a record with zero user
  // methods is a DTO.
  return cls.methods.length === 0 && cls.properties.length > 0;
}

export class CSharpConverter implements Converter {
  readonly #options: ConversionOptions;
  readonly #names: EmittedNameAllocator;

  constructor(options: ConversionOptions) {
    this.#options = options;
    this.#names = new EmittedNameAllocator();
  }

  convert(analysis: ProjectAnalysis): ConversionResult {
    const entities: EntityNode[] = [];
    const warnings: ConversionWarning[] = [];
    const errors: ConversionError[] = [];

    // Collect package references from .csproj files if available
    const packageRefs = this.#collectPackageReferences(analysis);

    // Generate Program entity if enabled
    if (this.#options.generatePrograms) {
      const programName = this.#names.reserve('program', ['CSharpProject']);
      const entryName = analysis.entryPoints[0] ?? 'Program.cs';
      entities.push(
        new ProgramNode({
          name: programName,
          span: SYNTHETIC_SPAN,
          raw: `${programName} v${this.#options.programVersion ?? '1.0.0'} -> ${entryName}`,
          sourceForm: 'shortform',
          entry: entryName,
          version: this.#options.programVersion ?? '1.0.0',
        }),
      );
    }

    // Generate Dependency entities from package references
    for (const ref of packageRefs) {
      const depName = this.#names.reserve(`dep:${ref.name}`, [ref.name]);
      const depArgs = {
        name: depName,
        span: SYNTHETIC_SPAN,
        raw: ref.version !== undefined ? `${depName} "${ref.name}" v${ref.version}` : `${depName} "${ref.name}"`,
        sourceForm: 'shortform' as const,
        purpose: `NuGet package: ${ref.name}`,
        ...(ref.version !== undefined ? { version: ref.version } : {}),
      };
      entities.push(new DependencyNode(depArgs));
    }

    // Process each module (file)
    for (const mod of analysis.modules) {
      this.#processModule(mod, entities, warnings);
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

  #processModule(mod: ParsedModule, entities: EntityNode[], _warnings: ConversionWarning[]): void {
    const filePath = mod.filePath;

    // Determine if this is a single-class file (ClassFile fusion)
    const publicClasses = mod.classes.filter((c) => !this.#shouldSkipClass(c));
    const isSingleClassFile = publicClasses.length === 1 && mod.interfaces.length === 0 && mod.enums.length === 0;

    // Create File entity if the file has multiple types
    if (!isSingleClassFile && (publicClasses.length > 0 || mod.interfaces.length > 0 || mod.enums.length > 0)) {
      const fileImports = mod.imports.map((i) => i.specifier);
      const fileExports = mod.exports.map((e) => e.name);
      const fileName = this.#names.reserve(`file:${filePath}`, [this.#fileBaseName(filePath)]);

      entities.push(
        new FileNode({
          name: fileName,
          span: SYNTHETIC_SPAN,
          raw: `${fileName} #: ${filePath}`,
          sourceForm: 'shortform',
          path: filePath,
          imports: fileImports,
          exports: fileExports,
          reExports: [],
        }),
      );
    }

    // Process classes
    for (const cls of publicClasses) {
      if (isStructWithoutMethods(cls) || isRecordLike(cls)) {
        this.#emitDto(cls, filePath, entities);
      } else if (isSingleClassFile && publicClasses[0] === cls) {
        this.#emitClassFile(cls, mod, filePath, entities);
      } else {
        this.#emitClass(cls, entities);
      }
    }

    // Process interfaces
    for (const iface of mod.interfaces) {
      this.#emitInterface(iface, entities);
    }

    // Process enums
    for (const enumDecl of mod.enums) {
      this.#emitEnum(enumDecl, entities);
    }

    // Process type aliases (delegates)
    for (const typeAlias of mod.types) {
      const aliasName = this.#names.reserve(`type:${typeAlias.name}`, [typeAlias.name]);
      const result = parseTypeExprText(typeAlias.type);
      if (result.typeExpr !== undefined) {
        entities.push(
          new TypeDefNode({
            name: aliasName,
            span: SYNTHETIC_SPAN,
            raw: `${aliasName} = ${typeAlias.type}`,
            sourceForm: 'shortform',
            variant: 'alias',
            aliasType: result.typeExpr,
          }),
        );
      }
    }
  }

  #emitClassFile(cls: ParsedClass, mod: ParsedModule, filePath: string, entities: EntityNode[]): void {
    const className = this.#names.reserve(`class:${cls.name}`, [cls.name]);
    const methods = this.#filterMethods(cls).map((m) => m.name);
    const imports = mod.imports.map((i) => i.specifier);
    const exports = [className];
    const implementsList = cls.implements.map((i) => {
      const baseName = i.includes('<') ? i.substring(0, i.indexOf('<')) : i;
      return baseName;
    });

    const extendsBase = cls.extends.length > 0 ? cls.extends[0] : undefined;
    entities.push(
      new ClassFileNode({
        name: className,
        span: SYNTHETIC_SPAN,
        raw: `${className} #: ${filePath}`,
        sourceForm: 'shortform',
        path: filePath,
        implements: implementsList,
        methods,
        imports,
        exports,
        ...(extendsBase !== undefined ? { extends: extendsBase } : {}),
      }),
    );
  }

  #emitClass(cls: ParsedClass, entities: EntityNode[]): void {
    const className = this.#names.reserve(`class:${cls.name}`, [cls.name]);
    const methods = this.#filterMethods(cls).map((m) => m.name);
    const implementsList = cls.implements.map((i) => {
      const baseName = i.includes('<') ? i.substring(0, i.indexOf('<')) : i;
      return baseName;
    });

    const extendsBase = cls.extends.length > 0 ? cls.extends[0] : undefined;
    const purpose = cls.isAbstract ? 'abstract class' : undefined;
    entities.push(
      new ClassNode({
        name: className,
        span: SYNTHETIC_SPAN,
        raw: `${className} : ${implementsList.join(', ')} { ${methods.join(', ')} }`,
        sourceForm: 'shortform',
        implements: implementsList,
        methods,
        ...(extendsBase !== undefined ? { extends: extendsBase } : {}),
        ...(purpose !== undefined ? { purpose } : {}),
      }),
    );
  }

  #emitInterface(iface: ParsedInterface, entities: EntityNode[]): void {
    const ifaceName = this.#names.reserve(`class:${iface.name}`, [iface.name]);
    const methods = iface.methods.map((m) => m.name);
    const implementsList = iface.extends;

    entities.push(
      new ClassNode({
        name: ifaceName,
        span: SYNTHETIC_SPAN,
        raw: `${ifaceName} : ${implementsList.join(', ')} { ${methods.join(', ')} }`,
        sourceForm: 'shortform',
        implements: [...implementsList],
        methods,
        purpose: 'interface',
      }),
    );
  }

  #emitDto(cls: ParsedClass, _filePath: string, entities: EntityNode[]): void {
    const dtoName = this.#names.reserve(`dto:${cls.name}`, [cls.name]);
    const fields = cls.properties
      .filter((p) => !p.isPrivate || this.#options.includePrivateMembers)
      .map((p) => {
        const typeResult = parseTypeExprText(p.type);
        return new DtoFieldNode({
          name: p.name,
          type: p.type,
          typeExpr: typeResult.typeExpr,
          optionalityMarker: p.isOptional ? 'question' : 'none',
          span: SYNTHETIC_SPAN,
        });
      });

    entities.push(
      new DtoNode({
        name: dtoName,
        span: SYNTHETIC_SPAN,
        raw: `${dtoName} { ${fields.map((f) => `${f.name}: ${f.type}`).join(', ')} }`,
        sourceForm: 'shortform',
        fields,
        purpose: cls.description === 'struct' ? 'struct' : 'record',
      }),
    );
  }

  #emitEnum(enumDecl: ParsedEnum, entities: EntityNode[]): void {
    const enumName = this.#names.reserve(`enum:${enumDecl.name}`, [enumDecl.name]);

    entities.push(
      new TypeDefNode({
        name: enumName,
        span: SYNTHETIC_SPAN,
        raw: `${enumName} = ${enumDecl.members.join(' | ')}`,
        sourceForm: 'shortform',
        variant: 'enum',
        members: enumDecl.members,
      }),
    );
  }

  #filterMethods(cls: ParsedClass): ParsedClass['methods'] {
    if (this.#options.includePrivateMembers) return cls.methods;
    return cls.methods.filter((m) => !m.isPrivate);
  }

  #shouldSkipClass(_cls: ParsedClass): boolean {
    return false;
  }

  #fileBaseName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] ?? filePath;
    return fileName.replace(/\.cs$/, '');
  }

  #collectPackageReferences(analysis: ProjectAnalysis): PackageReference[] {
    const seen = new Set<string>();
    const refs: PackageReference[] = [];

    try {
      const entries = readdirSync(analysis.projectRoot);
      for (const entry of entries) {
        if (entry.endsWith('.csproj')) {
          const info = parseCsproj(`${analysis.projectRoot}/${entry}`);
          for (const ref of info.packageReferences) {
            if (!seen.has(ref.name)) {
              seen.add(ref.name);
              refs.push(ref);
            }
          }
        }
      }
    } catch {
      // No .csproj files found — proceed without dependencies
    }

    return refs;
  }
}
