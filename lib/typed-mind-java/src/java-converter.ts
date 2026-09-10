import {
  ClassFileNode,
  ClassNode,
  DependencyNode,
  DtoFieldNode,
  DtoNode,
  type EntityNode,
  parseTypeExprText,
  ProgramNode,
  TypeDefNode,
  type TypeExprNode,
} from '@sammons/typed-mind';
import {
  type ConversionOptions,
  type ConversionResult,
  type ConversionWarning,
  type Converter,
  EmittedNameAllocator,
  emitTmd,
  fixupEntitiesForRoundTrip,
  type ParsedClass,
  type ParsedModule,
  type ProjectAnalysis,
  SYNTHETIC_SPAN,
} from '@sammons/typed-mind-tree-sitter-common';
import type { JavaDependency } from './java-project.ts';

const JAVA_TYPE_NORMALIZATION: ReadonlyMap<string, string> = new Map([
  ['String', 'string'],
  ['Integer', 'number'],
  ['int', 'number'],
  ['Long', 'number'],
  ['long', 'number'],
  ['Double', 'number'],
  ['double', 'number'],
  ['Float', 'number'],
  ['float', 'number'],
  ['Short', 'number'],
  ['short', 'number'],
  ['Byte', 'number'],
  ['byte', 'number'],
  ['Character', 'string'],
  ['char', 'string'],
  ['Boolean', 'boolean'],
  ['Object', 'any'],
  ['Void', 'void'],
]);

const normalizeJavaType = (typeText: string): string => {
  return JAVA_TYPE_NORMALIZATION.get(typeText) ?? typeText;
};

const makeTypeExpr = (typeText: string): TypeExprNode => {
  const normalized = normalizeJavaType(typeText);
  const result = parseTypeExprText(normalized);
  return result.typeExpr;
};

// A class with only fields and no methods is a data-transfer object.
const isDataOnlyClass = (cls: ParsedClass): boolean => cls.methods.length === 0 && cls.properties.length > 0;

// Strip type parameters from name for entity identity.
const baseName = (name: string): string => {
  const idx = name.indexOf('<');
  return idx >= 0 ? name.slice(0, idx) : name;
};

export class JavaConverter implements Converter {
  readonly #options: ConversionOptions;
  readonly #nameAllocator: EmittedNameAllocator;

  constructor(options: ConversionOptions) {
    this.#options = options;
    this.#nameAllocator = new EmittedNameAllocator();
  }

  convert(analysis: ProjectAnalysis): ConversionResult {
    this.#nameAllocator.clear();
    const entities: EntityNode[] = [];
    const warnings: ConversionWarning[] = [];

    try {
      // Generate Program entity if enabled
      if (this.#options.generatePrograms && analysis.entryPoints.length > 0) {
        const programName = this.#nameAllocator.reserve('program', ['JavaProject']);
        const entryName = analysis.entryPoints[0] ?? '';
        const programArgs: ConstructorParameters<typeof ProgramNode>[0] = {
          name: programName,
          span: SYNTHETIC_SPAN,
          raw: '',
          sourceForm: 'shortform',
          entry: entryName,
        };
        if (this.#options.programVersion !== undefined) {
          programArgs.version = this.#options.programVersion;
        } else {
          programArgs.version = '1.0.0';
        }
        entities.push(new ProgramNode(programArgs));
      }

      for (const mod of analysis.modules) {
        this.#convertModule(mod, entities, warnings);
      }
    } catch (err) {
      return {
        success: false,
        entities,
        tmdContent: entities.length > 0 ? emitTmd(entities) : '',
        errors: [
          {
            message: `Conversion failed: ${err instanceof Error ? err.message : String(err)}`,
            filePath: undefined,
          },
        ],
        warnings,
      };
    }

    fixupEntitiesForRoundTrip(entities);

    return {
      success: true,
      entities,
      tmdContent: emitTmd(entities),
      errors: [],
      warnings,
    };
  }

  #convertModule(mod: ParsedModule, entities: EntityNode[], _warnings: ConversionWarning[]): void {
    const filePath = mod.filePath;

    for (const cls of mod.classes) {
      if (isDataOnlyClass(cls)) {
        this.#convertDto(cls, filePath, entities);
      } else {
        this.#convertClass(cls, mod, filePath, entities);
      }
    }

    for (const iface of mod.interfaces) {
      this.#convertInterface(iface, entities);
    }

    for (const enumDecl of mod.enums) {
      this.#convertEnum(enumDecl, filePath, entities);
    }
  }

  #convertClass(cls: ParsedClass, mod: ParsedModule, filePath: string, entities: EntityNode[]): void {
    const name = baseName(cls.name);
    const entityName = this.#nameAllocator.reserve(`class:${filePath}:${name}`, [name]);

    const methods = cls.methods.filter((m) => {
      if (this.#options.includePrivateMembers) return true;
      return !m.isPrivate;
    });

    const methodNames = methods.map((m) => m.name);

    const importNames = mod.imports
      .map((imp) => {
        if (imp.namedImports.length > 0) return imp.namedImports[0] ?? '';
        return '';
      })
      .filter((n) => n.length > 0);

    const exportNames = mod.exports.map((exp) => exp.name);

    const implementsNames = cls.implements;
    const extendsName = cls.extends.length > 0 ? cls.extends[0] : undefined;

    entities.push(
      new ClassFileNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: '',
        sourceForm: 'shortform',
        path: filePath,
        imports: importNames,
        exports: exportNames,
        methods: methodNames,
        implements: implementsNames,
        extends: extendsName,
        purpose: cls.description !== undefined ? collapseJavadoc(cls.description) : undefined,
      }),
    );
  }

  #convertInterface(iface: ParsedInterface, entities: EntityNode[]): void {
    const name = baseName(iface.name);
    const entityName = this.#nameAllocator.reserve(`interface:${name}`, [name]);

    const methods = iface.methods.filter((m) => {
      if (this.#options.includePrivateMembers) return true;
      return !m.isPrivate;
    });

    const methodNames = methods.map((m) => m.name);

    entities.push(
      new ClassNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: '',
        sourceForm: 'shortform',
        methods: methodNames,
        implements: [],
        purpose: iface.description !== undefined ? collapseJavadoc(iface.description) : undefined,
      }),
    );
  }

  #convertEnum(enumDecl: ParsedEnum, filePath: string, entities: EntityNode[]): void {
    const entityName = this.#nameAllocator.reserve(`enum:${filePath}:${enumDecl.name}`, [enumDecl.name]);

    entities.push(
      new TypeDefNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: '',
        sourceForm: 'shortform',
        variant: 'enum',
        members: enumDecl.members,
        purpose: enumDecl.description !== undefined ? collapseJavadoc(enumDecl.description) : undefined,
      }),
    );
  }

  #convertDto(cls: ParsedClass, filePath: string, entities: EntityNode[]): void {
    const name = baseName(cls.name);
    const entityName = this.#nameAllocator.reserve(`dto:${filePath}:${name}`, [name]);

    const fields = cls.properties
      .filter((p) => {
        if (this.#options.includePrivateMembers) return true;
        return !p.isPrivate;
      })
      .map(
        (p) => {
          const normalizedType = normalizeJavaType(p.type);
          return new DtoFieldNode({
            name: p.name,
            type: normalizedType,
            typeExpr: makeTypeExpr(p.type),
            optionalityMarker: p.isOptional ? 'question' : 'none',
            span: SYNTHETIC_SPAN,
          });
        },
      );

    entities.push(
      new DtoNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: '',
        sourceForm: 'shortform',
        fields,
        purpose: cls.description !== undefined ? collapseJavadoc(cls.description) : undefined,
      }),
    );
  }

  convertDependencies(deps: readonly JavaDependency[]): EntityNode[] {
    const entities: EntityNode[] = [];
    for (const dep of deps) {
      if (dep.scope === 'test') continue;
      const name = `${dep.groupId}:${dep.artifactId}`;
      const entityName = this.#nameAllocator.reserve(`dep:${name}`, [dep.artifactId, name]);
      entities.push(
        new DependencyNode({
          name: entityName,
          span: SYNTHETIC_SPAN,
          raw: '',
          sourceForm: 'shortform',
          purpose: `${dep.groupId}:${dep.artifactId}`,
          version: dep.version.length > 0 ? dep.version : undefined,
        }),
      );
    }
    return entities;
  }
}

const collapseJavadoc = (raw: string): string => {
  const stripped = raw
    .replace(/^\/\*\*\s*/, '')
    .replace(/\s*\*\/\s*$/, '')
    .replace(/^\s*\*\s?/gm, '')
    .trim();
  const firstParagraph = stripped.split(/\n\s*\n/)[0] ?? '';
  return firstParagraph.replace(/\s+/g, ' ').trim();
};

// Re-export ParsedEnum from the tree-sitter-common types for use in the converter
type ParsedEnum = import('@sammons/typed-mind-tree-sitter-common').ParsedEnum;
type ParsedInterface = import('@sammons/typed-mind-tree-sitter-common').ParsedInterface;
