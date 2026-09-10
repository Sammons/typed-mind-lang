import { basename, dirname } from 'node:path';
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
  TypeDefNode,
  type TypeExprNode,
} from '@sammons/typed-mind';
import {
  type ConversionOptions,
  type ConversionResult,
  type Converter,
  EmittedNameAllocator,
  emitTmd,
  type ProjectAnalysis,
  SYNTHETIC_SPAN,
} from '@sammons/typed-mind-tree-sitter-common';

/** Names of decorator-based DTOs (dataclass, etc.). */
const DTO_DECORATORS = new Set(['dataclass']);

/** Base classes that indicate a DTO pattern. */
const DTO_BASE_CLASSES = new Set(['BaseModel', 'TypedDict']);

/** Build an opaque TypeExprNode from a raw type string. */
const opaqueType = (text: string): TypeExprNode => ({
  kind: 'opaque',
  text: text || 'Any',
  span: SYNTHETIC_SPAN,
});

/** Build a named TypeExprNode. */
const namedType = (name: string): TypeExprNode => ({
  kind: 'named',
  name,
  span: SYNTHETIC_SPAN,
});

export class PythonConverter implements Converter {
  readonly #options: ConversionOptions;
  readonly #names: EmittedNameAllocator;

  constructor(options: ConversionOptions) {
    this.#options = options;
    this.#names = new EmittedNameAllocator();
  }

  convert(analysis: ProjectAnalysis): ConversionResult {
    this.#names.clear();
    const entities: EntityNode[] = [];
    const errors: { message: string; filePath: string | undefined }[] = [];
    const warnings: { message: string; filePath: string | undefined; suggestion: string | undefined }[] = [];

    try {
      for (const mod of analysis.modules) {
        const isInitPy = basename(mod.filePath) === '__init__.py';
        const modulePath = mod.filePath;

        // Enums -> TypeDefNode
        for (const en of mod.enums) {
          const name = this.#names.reserve(`enum:${en.name}`, [en.name]);
          entities.push(
            new TypeDefNode({
              name,
              variant: 'enum',
              members: en.members,
              span: SYNTHETIC_SPAN,
              raw: `${name} enum [${en.members.join(', ')}]`,
              sourceForm: 'shortform',
            }),
          );
        }

        // Classes
        for (const cls of mod.classes) {
          const isDto = cls.decorators.some((d) => DTO_DECORATORS.has(d)) || cls.extends.some((base) => DTO_BASE_CLASSES.has(base));

          if (isDto) {
            const name = this.#names.reserve(`dto:${cls.name}`, [cls.name]);
            const fields = cls.properties.map(
              (prop) =>
                new DtoFieldNode({
                  name: prop.name,
                  type: prop.type || 'Any',
                  typeExpr: prop.type ? opaqueType(prop.type) : namedType('Any'),
                  optionalityMarker: prop.isOptional ? 'question' : 'none',
                  span: SYNTHETIC_SPAN,
                }),
            );
            entities.push(
              new DtoNode({
                name,
                fields,
                span: SYNTHETIC_SPAN,
                raw: `${name} { ${fields.map((f) => `${f.name}: ${f.type}`).join(', ')} }`,
                sourceForm: 'shortform',
              }),
            );
          } else {
            const name = this.#names.reserve(`class:${cls.name}`, [cls.name]);
            const publicMethods = cls.methods.filter((m) => !m.isPrivate && m.name !== '__init__');
            const methodNames = publicMethods.map((m) => m.name);

            const extendsValue = cls.extends.length > 0 ? cls.extends[0] : undefined;

            entities.push(
              new ClassNode({
                name,
                methods: methodNames,
                implements: cls.implements,
                ...(extendsValue !== undefined ? { extends: extendsValue } : {}),
                span: SYNTHETIC_SPAN,
                raw: `${name} [${methodNames.join(', ')}]`,
                sourceForm: 'shortform',
                calls: [],
              }),
            );
          }
        }

        // Interfaces (Protocol classes)
        for (const iface of mod.interfaces) {
          const name = this.#names.reserve(`class:${iface.name}`, [iface.name]);
          const publicMethods = iface.methods.filter((m) => !m.isPrivate);
          const methodNames = publicMethods.map((m) => m.name);

          const extendsValue = iface.extends.length > 0 ? iface.extends[0] : undefined;

          entities.push(
            new ClassNode({
              name,
              methods: methodNames,
              implements: [],
              ...(extendsValue !== undefined ? { extends: extendsValue } : {}),
              span: SYNTHETIC_SPAN,
              raw: `${name} [${methodNames.join(', ')}]`,
              sourceForm: 'shortform',
              calls: [],
            }),
          );
        }

        // Module-level functions
        for (const fn of mod.functions) {
          if (fn.name.startsWith('_')) continue;
          const name = this.#names.reserve(`func:${fn.name}`, [fn.name]);
          entities.push(
            new FunctionNode({
              name,
              signature: fn.signature,
              calls: [],
              pendingDependencies: [],
              span: SYNTHETIC_SPAN,
              raw: `${name} ${fn.signature}`,
              sourceForm: 'shortform',
            }),
          );
        }

        // Module-level UPPERCASE constants
        if (mod.constants.length > 0) {
          const moduleName = basename(mod.filePath, '.py');
          const constantsName = this.#names.reserve(`constants:${moduleName}`, [
            `${moduleName.charAt(0).toUpperCase()}${moduleName.slice(1)}Constants`,
            `${moduleName}Constants`,
          ]);
          entities.push(
            new ConstantsNode({
              name: constantsName,
              path: modulePath,
              span: SYNTHETIC_SPAN,
              raw: `${constantsName} #: ${modulePath}`,
              sourceForm: 'shortform',
            }),
          );
        }

        // Type aliases
        for (const typeAlias of mod.types) {
          const name = this.#names.reserve(`type:${typeAlias.name}`, [typeAlias.name]);
          entities.push(
            new TypeDefNode({
              name,
              variant: 'alias',
              aliasType: opaqueType(typeAlias.type),
              span: SYNTHETIC_SPAN,
              raw: `${name} alias ${typeAlias.type}`,
              sourceForm: 'shortform',
            }),
          );
        }

        // __init__.py -> FileNode as package boundary
        if (isInitPy) {
          const packageDir = dirname(modulePath);
          const packageName = basename(packageDir) || basename(modulePath, '.py');
          const name = this.#names.reserve(`file:${modulePath}`, [`${packageName}_init`, packageName]);

          const importNames = mod.imports.flatMap((imp) => imp.namedImports);
          const exportNames = mod.exports.map((exp) => exp.name);

          entities.push(
            new FileNode({
              name,
              path: modulePath,
              imports: importNames,
              exports: exportNames,
              reExports: [],
              span: SYNTHETIC_SPAN,
              raw: `${name} #: ${modulePath}`,
              sourceForm: 'shortform',
            }),
          );
        }
      }

      // Dependencies from third-party imports
      const thirdPartyImports = new Set<string>();
      for (const mod of analysis.modules) {
        for (const imp of mod.imports) {
          if (imp.specifier.startsWith('.')) continue;
          const topLevel = imp.specifier.split('.')[0] ?? '';
          if (!isStdlib(topLevel)) {
            thirdPartyImports.add(topLevel);
          }
        }
      }

      for (const dep of thirdPartyImports) {
        const name = this.#names.reserve(`dep:${dep}`, [dep]);
        entities.push(
          new DependencyNode({
            name,
            purpose: `${dep} dependency`,
            span: SYNTHETIC_SPAN,
            raw: `${name} "${dep} dependency"`,
            sourceForm: 'shortform',
          }),
        );
      }

      // Generate program entity
      if (this.#options.generatePrograms && analysis.entryPoints.length > 0) {
        const entryPoint = analysis.entryPoints[0] ?? '';
        const programName = this.#names.reserve('program:main', ['PythonProject']);
        entities.push(
          new ProgramNode({
            name: programName,
            version: this.#options.programVersion ?? '1.0.0',
            entry: basename(entryPoint, '.py'),
            span: SYNTHETIC_SPAN,
            raw: `${programName} v${this.#options.programVersion ?? '1.0.0'} -> ${basename(entryPoint, '.py')}`,
            sourceForm: 'shortform',
          }),
        );
      }

      const tmdContent = emitTmd(entities);

      return {
        success: true,
        entities,
        tmdContent,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        message: `Conversion failed: ${error instanceof Error ? error.message : String(error)}`,
        filePath: undefined,
      });
      return {
        success: false,
        entities,
        tmdContent: entities.length > 0 ? emitTmd(entities) : '',
        errors,
        warnings,
      };
    }
  }
}

/** Python standard library modules (heuristic, covers the most common ones). */
const STDLIB_MODULES = new Set([
  'abc',
  'argparse',
  'ast',
  'asyncio',
  'base64',
  'builtins',
  'collections',
  'concurrent',
  'contextlib',
  'copy',
  'csv',
  'dataclasses',
  'datetime',
  'decimal',
  'enum',
  'errno',
  'functools',
  'glob',
  'hashlib',
  'html',
  'http',
  'importlib',
  'inspect',
  'io',
  'itertools',
  'json',
  'logging',
  'math',
  'multiprocessing',
  'numbers',
  'operator',
  'os',
  'pathlib',
  'pickle',
  'platform',
  'pprint',
  're',
  'shutil',
  'signal',
  'socket',
  'sqlite3',
  'ssl',
  'string',
  'struct',
  'subprocess',
  'sys',
  'tempfile',
  'textwrap',
  'threading',
  'time',
  'traceback',
  'types',
  'typing',
  'typing_extensions',
  'unittest',
  'urllib',
  'uuid',
  'warnings',
  'xml',
  'zipfile',
]);

const isStdlib = (name: string): boolean => STDLIB_MODULES.has(name);
