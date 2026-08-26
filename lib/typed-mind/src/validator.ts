import type {
  AnyEntity,
  ClassEntity,
  FileEntity,
  FunctionEntity,
  FunctionEntityWithDependencies,
  UIComponentEntity,
  AssetEntity,
  RunParameterEntity,
  ConstantsEntity,
  DependencyEntity,
  DTOEntity,
  ProgramEntity,
  ValidationError,
  ValidationResult,
  EntityType,
  ReferenceType,
} from './types.ts';
import type { ParseResult } from './parser.ts';

export interface ValidatorOptions {
  skipOrphanCheck?: boolean;
}

export class DSLValidator {
  private errors: ValidationError[] = [];
  private options: ValidatorOptions;

  // Define which entity types can be referenced by which reference types
  private static readonly VALID_REFERENCES: Record<ReferenceType, { from: EntityType[]; to: EntityType[] }> = {
    imports: {
      from: ['File', 'Class', 'ClassFile'],
      to: ['Function', 'Class', 'ClassFile', 'Constants', 'DTO', 'Asset', 'UIComponent', 'RunParameter', 'File', 'Dependency'],
    },
    exports: {
      from: ['File', 'ClassFile', 'Program', 'Dependency'],
      to: ['Function', 'Class', 'ClassFile', 'Constants', 'DTO', 'Asset', 'UIComponent', 'File'],
    },
    calls: {
      from: ['Function'],
      to: ['Function', 'Class'], // Class is allowed because of method calls
    },
    extends: {
      from: ['Class', 'ClassFile'],
      to: ['Class', 'ClassFile'],
    },
    implements: {
      from: ['Class', 'ClassFile'],
      to: ['Class', 'ClassFile'], // In TypedMind, interfaces are represented as Classes
    },
    contains: {
      from: ['UIComponent'],
      to: ['UIComponent'],
    },
    containedBy: {
      from: ['UIComponent'],
      to: ['UIComponent'],
    },
    affects: {
      from: ['Function'],
      to: ['UIComponent'],
    },
    affectedBy: {
      from: ['UIComponent'],
      to: ['Function'],
    },
    consumes: {
      from: ['Function'],
      to: ['RunParameter', 'Asset', 'Dependency', 'Constants'],
    },
    consumedBy: {
      from: ['RunParameter'],
      to: ['Function'],
    },
    input: {
      from: ['Function'],
      to: ['DTO'],
    },
    output: {
      from: ['Function'],
      to: ['DTO'],
    },
    entry: {
      from: ['Program'],
      to: ['File'],
    },
    containsProgram: {
      from: ['Asset'],
      to: ['Program'],
    },
    schema: {
      from: ['Constants'],
      to: ['Class', 'DTO'], // Schema can reference a type definition
    },
  };

  constructor(options: ValidatorOptions = {}) {
    this.options = options;
  }

  validate(entities: Map<string, AnyEntity>, optionsOrParseResult?: ValidatorOptions | ParseResult): ValidationResult {
    this.errors = [];

    // Handle both old signature (parseResult) and new signature (options)
    let parseResult: ParseResult | undefined;
    if (optionsOrParseResult && 'entities' in optionsOrParseResult) {
      // It's a ParseResult (old signature)
      parseResult = optionsOrParseResult as ParseResult;
      // Don't override options if they were set in constructor
    } else if (optionsOrParseResult) {
      // It's ValidatorOptions (new signature) - merge with constructor options
      this.options = { ...this.options, ...(optionsOrParseResult as ValidatorOptions) };
    }
    // If no options passed, keep constructor options

    // First populate referencedBy fields
    this.populateReferencedBy(entities);

    // Check naming conflicts from parser
    if (parseResult?.namingConflicts) {
      this.processNamingConflicts(parseResult.namingConflicts);
    }

    this.checkNamingConflicts(entities);
    if (!this.options.skipOrphanCheck) {
      this.checkOrphans(entities);
    }
    this.checkImports(entities);
    this.checkCircularDeps(entities);
    this.checkCircularUIComponentContainment(entities);
    this.checkInheritanceChains(entities);
    this.checkEntryPoint(entities);
    this.checkUniquePaths(entities);
    this.checkClassAndFunctionExports(entities);
    this.checkDuplicateExports(entities);
    this.checkMethodCalls(entities);
    this.checkUndefinedExports(entities);
    this.checkFunctionDTOs(entities);
    this.checkFunctionDependencies(entities);
    this.checkDTOFieldTypes(entities);
    this.checkUIComponentRelationships(entities);
    this.checkFunctionUIComponentAffects(entities);
    this.checkAssetProgramRelationships(entities);
    this.checkUIComponentContainment(entities);
    this.checkFunctionConsumption(entities);

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
    };
  }

  private processNamingConflicts(namingConflicts: Array<{ name: string; existingEntity: AnyEntity; newEntity: AnyEntity }>): void {
    for (const conflict of namingConflicts) {
      const { name, existingEntity, newEntity } = conflict;

      // Check if this is a Class-File conflict specifically
      if (
        (existingEntity.type === 'Class' && newEntity.type === 'File') ||
        (existingEntity.type === 'File' && newEntity.type === 'Class')
      ) {
        const fileEntity = existingEntity.type === 'File' ? existingEntity : newEntity;
        const classEntity = existingEntity.type === 'Class' ? existingEntity : newEntity;

        // Add error for both entities
        this.addError({
          position: classEntity.position,
          message: `Entity name '${name}' is used by both a File and a Class. Consider using the #: operator for class-file fusion.`,
          severity: 'error',
          suggestion: `Replace with: ${name} #: ${fileEntity.path} <: BaseClass`,
        });

        this.addError({
          position: fileEntity.position,
          message: `Entity name '${name}' is used by both a File and a Class. Consider using the #: operator for class-file fusion.`,
          severity: 'error',
          suggestion: `Replace with: ${name} #: ${fileEntity.path} <: BaseClass`,
        });
      } else {
        // Other naming conflicts
        this.addError({
          position: newEntity.position,
          message: `Duplicate entity name '${name}' found in multiple ${existingEntity.type}, ${newEntity.type} entities`,
          severity: 'error',
          suggestion: 'Entity names must be unique across the entire codebase',
        });
      }
    }
  }

  private checkNamingConflicts(entities: Map<string, AnyEntity>): void {
    // Group entities by name to detect naming conflicts
    const nameGroups = new Map<string, AnyEntity[]>();

    for (const entity of entities.values()) {
      const name = entity.name;
      if (!nameGroups.has(name)) {
        nameGroups.set(name, []);
      }
      nameGroups.get(name)!.push(entity);
    }

    // Check for Class-File naming conflicts
    for (const [name, entitiesWithSameName] of nameGroups) {
      if (entitiesWithSameName.length > 1) {
        const hasClass = entitiesWithSameName.some((e) => e.type === 'Class');
        const hasFile = entitiesWithSameName.some((e) => e.type === 'File');

        if (hasClass && hasFile) {
          // Find the class and file entities
          const classEntity = entitiesWithSameName.find((e) => e.type === 'Class');
          const fileEntity = entitiesWithSameName.find((e) => e.type === 'File');

          if (classEntity && fileEntity) {
            this.addError({
              position: classEntity.position,
              message: `Entity name '${name}' is used by both a File and a Class. Consider using the #: operator for class-file fusion.`,
              severity: 'error',
              suggestion: `Replace with: ${name} #: ${fileEntity.path} <: BaseClass`,
            });

            this.addError({
              position: fileEntity.position,
              message: `Entity name '${name}' is used by both a File and a Class. Consider using the #: operator for class-file fusion.`,
              severity: 'error',
              suggestion: `Replace with: ${name} #: ${fileEntity.path} <: BaseClass`,
            });
          }
        } else {
          // Other naming conflicts (not Class-File specific)
          const [first] = entitiesWithSameName;
          if (first) {
            this.addError({
              position: first.position,
              message: `Duplicate entity name '${name}' found in multiple ${entitiesWithSameName.map((e) => e.type).join(', ')} entities`,
              severity: 'error',
              suggestion: 'Entity names must be unique across the entire codebase',
            });
          }
        }
      }
    }
  }

  private checkOrphans(entities: Map<string, AnyEntity>): void {
    const referenced = new Set<string>();

    // Find all referenced entities
    for (const entity of entities.values()) {
      if ('imports' in entity) {
        for (const imp of entity.imports) {
          if (!imp.includes('*')) {
            referenced.add(imp);
          }
        }
      }
      // NOTE: Exports are NOT automatically considered as referenced.
      // An entity is only referenced if it's actually imported, called, or used by another entity.
      // Simply being exported doesn't mean it's used - that would be the definition of an orphan.
      if ('calls' in entity) {
        for (const call of entity.calls) {
          referenced.add(call);
        }
      }
      if ('methods' in entity) {
        for (const method of entity.methods) {
          referenced.add(method);
        }
      }
      if (entity.type === 'Program') {
        referenced.add(entity.entry);
        // Track program exports as referenced (they're part of public API)
        const program = entity as ProgramEntity;
        if (program.exports) {
          for (const exp of program.exports) {
            referenced.add(exp);
          }
        }
      }
      if ('consumes' in entity) {
        for (const param of entity.consumes) {
          referenced.add(param);
        }
      }
      // Track Function input/output DTOs
      if (entity.type === 'Function') {
        const funcEntity = entity as FunctionEntity;
        if (funcEntity.input) {
          referenced.add(funcEntity.input);
        }
        if (funcEntity.output) {
          referenced.add(funcEntity.output);
        }
      }
      // Track UIComponent contains
      if (entity.type === 'UIComponent') {
        const uiEntity = entity as UIComponentEntity;
        if (uiEntity.contains) {
          for (const child of uiEntity.contains) {
            referenced.add(child);
          }
        }
      }
      // Track Asset contains program
      if (entity.type === 'Asset') {
        const assetEntity = entity as AssetEntity;
        if (assetEntity.containsProgram) {
          referenced.add(assetEntity.containsProgram);
        }
      }
    }

    // Check for orphans with improved file consumption logic
    for (const [name, entity] of entities) {
      if (!referenced.has(name) && entity.type !== 'Program' && entity.type !== 'Dependency') {
        // Special handling for Files - they are consumed if ANY of their exports are imported
        if (entity.type === 'File') {
          if (!this.isFileConsumed(entity as FileEntity, entities)) {
            this.addError({
              position: entity.position,
              message: `Orphaned file '${name}' - none of its exports are imported`,
              severity: 'error',
              suggestion: 'Remove this file or import its exports somewhere',
            });
          }
        } else {
          this.addError({
            position: entity.position,
            message: `Orphaned entity '${name}'`,
            severity: 'error',
            suggestion: 'Remove or reference this entity',
          });
        }
      }
    }
  }

  private isFileConsumed(fileEntity: FileEntity, allEntities: Map<string, AnyEntity>): boolean {
    // Check if any export from this file is imported elsewhere
    for (const exportName of fileEntity.exports || []) {
      if (this.isEntityImported(exportName, allEntities)) {
        return true; // File is consumed through this export
      }
    }
    return false;
  }

  private isEntityImported(entityName: string, allEntities: Map<string, AnyEntity>): boolean {
    // Check if this entity name appears in any imports
    for (const entity of allEntities.values()) {
      if ('imports' in entity) {
        for (const imp of entity.imports) {
          if (imp === entityName) {
            return true;
          }
          // Handle wildcard imports
          if (imp.includes('*')) {
            const base = imp.split('*')[0] as string;
            if (entityName.startsWith(base)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  private checkImports(entities: Map<string, AnyEntity>): void {
    for (const entity of entities.values()) {
      if (!('imports' in entity)) continue;

      for (const imp of entity.imports) {
        // Handle wildcards
        if (imp.includes('*')) {
          const base = imp.split('*')[0] as string;
          const hasMatch = Array.from(entities.keys()).some((name) => name.startsWith(base));

          if (!hasMatch) {
            this.addError({
              position: entity.position,
              message: `No entities match import pattern '${imp}'`,
              severity: 'error',
            });
          }
        } else if (!entities.has(imp)) {
          // Check if it's a Dependency entity
          const isDependency = Array.from(entities.values()).some((e) => e.type === 'Dependency' && e.name === imp);

          if (!isDependency) {
            // Fuzzy match for suggestions
            const suggestion = this.findSimilar(imp, entities);
            const error: ValidationError = {
              position: entity.position,
              message: `Import '${imp}' not found`,
              severity: 'error',
            };
            if (suggestion) {
              error.suggestion = `Did you mean '${suggestion}'?`;
            }
            this.addError(error);
          }
        }
      }
    }
  }

  private checkCircularDeps(entities: Map<string, AnyEntity>): void {
    // Check for circular import dependencies specifically
    const importGraph = new Map<string, string[]>();

    // Build import graph (only Files and ClassFiles can import)
    for (const [name, entity] of entities) {
      if ((entity.type === 'File' || entity.type === 'ClassFile') && 'imports' in entity) {
        const fileImports = entity.imports.filter((imp) => {
          // Only track imports to other Files/ClassFiles
          const imported = entities.get(imp);
          return imported && (imported.type === 'File' || imported.type === 'ClassFile');
        });
        importGraph.set(name, fileImports);
      }
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const reportedCycles = new Set<string>();

    const hasCycle = (node: string, path: string[] = []): string[] | null => {
      if (!importGraph.has(node)) {
        return null;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = importGraph.get(node) || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          const cycle = hasCycle(dep, [...path]);
          if (cycle) return cycle;
        } else if (recursionStack.has(dep)) {
          return [...path, dep];
        }
      }

      recursionStack.delete(node);
      return null;
    };

    for (const name of importGraph.keys()) {
      if (!visited.has(name)) {
        const cycle = hasCycle(name);
        if (cycle) {
          // Normalize cycle to avoid reporting same cycle multiple times
          const cycleKey = [...cycle].sort().join('->');
          if (!reportedCycles.has(cycleKey)) {
            reportedCycles.add(cycleKey);

            const entity = entities.get(name);
            if (entity) {
              this.addError({
                position: entity.position,
                message: `Circular import detected: ${cycle.join(' -> ')}`,
                severity: 'error',
                suggestion: 'Break the circular dependency by refactoring shared code into a separate module',
              });
            }
          }
        }
      }
    }
  }

  private checkCircularUIComponentContainment(entities: Map<string, AnyEntity>): void {
    // Check for circular containment in UIComponents specifically
    const containmentGraph = new Map<string, string[]>();

    // Build containment graph (only UIComponents can contain other UIComponents)
    for (const [name, entity] of entities) {
      if (entity.type === 'UIComponent' && 'contains' in entity) {
        const uiEntity = entity as UIComponentEntity;
        if (uiEntity.contains) {
          containmentGraph.set(name, uiEntity.contains);
        }
      }
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const reportedCycles = new Set<string>();

    const hasCycle = (node: string, path: string[] = []): string[] | null => {
      if (!containmentGraph.has(node)) {
        return null;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const containedComponents = containmentGraph.get(node) || [];
      for (const contained of containedComponents) {
        // Check for self-containment
        if (contained === node) {
          const entity = entities.get(node);
          if (entity) {
            this.addError({
              position: entity.position,
              message: `UIComponent '${node}' contains itself`,
              severity: 'error',
              suggestion: 'Remove self-reference from the contains list',
            });
          }
          continue;
        }

        if (!visited.has(contained)) {
          const cycle = hasCycle(contained, [...path]);
          if (cycle) return cycle;
        } else if (recursionStack.has(contained)) {
          return [...path, contained];
        }
      }

      recursionStack.delete(node);
      return null;
    };

    for (const name of containmentGraph.keys()) {
      if (!visited.has(name)) {
        const cycle = hasCycle(name);
        if (cycle) {
          // Normalize cycle to avoid reporting same cycle multiple times
          const cycleKey = [...cycle].sort().join('->');
          if (!reportedCycles.has(cycleKey)) {
            reportedCycles.add(cycleKey);

            const entity = entities.get(name);
            if (entity) {
              this.addError({
                position: entity.position,
                message: `UIComponent '${name}' has circular containment: ${cycle.join(' -> ')}`,
                severity: 'error',
                suggestion: 'Break the circular containment by removing one of the contains relationships',
              });
            }
          }
        }
      }
    }
  }

  private checkInheritanceChains(entities: Map<string, AnyEntity>): void {
    // Check for circular inheritance and invalid inheritance chains
    const inheritanceGraph = new Map<string, string>();

    // Build inheritance graph (single inheritance only)
    for (const [name, entity] of entities) {
      if ((entity.type === 'Class' || entity.type === 'ClassFile') && 'extends' in entity) {
        const classEntity = entity as ClassEntity;
        if (classEntity.extends) {
          inheritanceGraph.set(name, classEntity.extends);

          // Check for self-inheritance
          if (classEntity.extends === name) {
            this.addError({
              position: entity.position,
              message: `Class '${name}' inherits from itself`,
              severity: 'error',
              suggestion: 'Remove the self-inheritance or choose a different base class',
            });
            continue;
          }

          // Check if base class exists
          if (!entities.has(classEntity.extends)) {
            this.addError({
              position: entity.position,
              message: `Class '${name}' extends '${classEntity.extends}' which does not exist`,
              severity: 'error',
              suggestion: `Define '${classEntity.extends}' as a Class or ClassFile entity`,
            });
          }
        }

        // Check implements array for interface existence
        if (classEntity.implements) {
          for (const intf of classEntity.implements) {
            if (!entities.has(intf)) {
              this.addError({
                position: entity.position,
                message: `Class '${name}' implements '${intf}' which does not exist`,
                severity: 'error',
                suggestion: `Define '${intf}' as a Class or ClassFile entity`,
              });
            }
          }
        }
      }
    }

    // Check for circular inheritance using graph traversal
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const reportedCycles = new Set<string>();

    const hasCycle = (node: string, path: string[] = []): string[] | null => {
      if (!inheritanceGraph.has(node)) {
        return null;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const parent = inheritanceGraph.get(node);
      if (parent) {
        if (!visited.has(parent)) {
          const cycle = hasCycle(parent, [...path]);
          if (cycle) return cycle;
        } else if (recursionStack.has(parent)) {
          return [...path, parent];
        }
      }

      recursionStack.delete(node);
      return null;
    };

    for (const name of inheritanceGraph.keys()) {
      if (!visited.has(name)) {
        const cycle = hasCycle(name);
        if (cycle) {
          // Normalize cycle to avoid reporting same cycle multiple times
          const cycleKey = [...cycle].sort().join('->');
          if (!reportedCycles.has(cycleKey)) {
            reportedCycles.add(cycleKey);

            const entity = entities.get(name);
            if (entity) {
              this.addError({
                position: entity.position,
                message: `Class '${name}' has circular inheritance: ${cycle.join(' -> ')}`,
                severity: 'error',
                suggestion: 'Break the circular inheritance by removing one of the extends relationships',
              });
            }
          }
        }
      }
    }
  }

  private checkEntryPoint(entities: Map<string, AnyEntity>): void {
    const programs = Array.from(entities.values()).filter((e) => e.type === 'Program') as ProgramEntity[];

    if (programs.length === 0) {
      this.addError({
        position: { line: 1, column: 1 },
        message: 'No program entry point defined',
        severity: 'error',
        suggestion: 'Add a Program entity: AppName -> EntryFile',
      });
    }

    // Check that each Program's entry point references an existing File entity
    for (const program of programs) {
      const entryFile = entities.get(program.entry);
      if (!entryFile) {
        this.addError({
          position: program.position,
          message: `Program '${program.name}' references undefined entry point '${program.entry}'`,
          severity: 'error',
          suggestion: `Define a File entity: ${program.entry} @ path/to/file.ext:`,
        });
      } else if (entryFile.type !== 'File') {
        this.addError({
          position: program.position,
          message: `Program '${program.name}' entry point '${program.entry}' must be a File entity, but found ${entryFile.type}`,
          severity: 'error',
          suggestion: `Change '${program.entry}' to a File entity: ${program.entry} @ path/to/file.ext:`,
        });
      }
    }
  }

  private checkUniquePaths(entities: Map<string, AnyEntity>): void {
    const entityNamesByPath = new Map<string, string[]>();

    for (const entity of entities.values()) {
      if ('path' in entity && entity.path) {
        const path = entity.path;

        // Skip virtual paths with # fragments - they're allowed to be duplicated
        if (path.includes('#')) {
          continue;
        }

        if (!entityNamesByPath.has(path)) {
          entityNamesByPath.set(path, []);
        }

        const entitiesAtPath = entityNamesByPath.get(path)!;

        // Multiple entities can share the same file path (like multiple constants from same file)
        // Only error if the same ENTITY TYPE has restrictions:
        // - Only one File entity per path
        // - Only one ClassFile entity per path
        // - Constants/DTOs/etc can share paths freely

        if (entity.type === 'File' || entity.type === 'ClassFile') {
          const existingFileType = entitiesAtPath.find((name) => {
            const existing = entities.get(name);
            return existing && (existing.type === 'File' || existing.type === 'ClassFile');
          });

          if (existingFileType) {
            const existing = entities.get(existingFileType)!;
            this.addError({
              position: entity.position,
              message: `Path '${entity.path}' already used by ${existing.type} '${existing.name}'`,
              severity: 'error',
              suggestion: `Each File/ClassFile must have a unique path. Consider using ClassFile fusion with #:`,
            });
          }
        }

        entitiesAtPath.push(entity.name);
      }
    }
  }

  private findSimilar(target: string, entities: Map<string, AnyEntity>): string | null {
    let bestMatch = '';
    let bestScore = 0.6; // Threshold

    for (const name of entities.keys()) {
      const score = this.similarity(target.toLowerCase(), name.toLowerCase());
      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    }

    return bestMatch || null;
  }

  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Create and initialize matrix
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [];
      for (let j = 0; j <= a.length; j++) {
        if (i === 0) {
          matrix[i][j] = j;
        } else if (j === 0) {
          matrix[i][j] = i;
        } else {
          matrix[i][j] = 0;
        }
      }
    }

    // Fill the matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    const distance = matrix[b.length][a.length];
    return 1 - distance / Math.max(a.length, b.length);
  }

  private isDTOExportedByDependency(dtoName: string, entities: Map<string, AnyEntity>): boolean {
    // Check if any dependency exports this DTO
    for (const entity of entities.values()) {
      if (entity.type === 'Dependency') {
        const depEntity = entity as DependencyEntity;
        if (depEntity.exports && depEntity.exports.includes(dtoName)) {
          return true;
        }
      }
    }
    return false;
  }

  private addError(error: ValidationError): void {
    this.errors.push(error);
  }

  private checkClassAndFunctionExports(entities: Map<string, AnyEntity>): void {
    // Build a set of all exported entities
    const exportedEntities = new Set<string>();

    // Build a set of all class methods
    const classMethods = new Set<string>();

    for (const entity of entities.values()) {
      if ('exports' in entity && entity.exports) {
        for (const exp of entity.exports) {
          exportedEntities.add(exp);
        }
      }
      if ('methods' in entity && entity.methods) {
        for (const method of entity.methods) {
          classMethods.add(method);
        }
      }
    }

    // Check that all classes and standalone functions are exported by at least one file
    // Note: Methods of classes don't need to be exported separately
    // Note: ClassFile entities automatically export themselves
    for (const [name, entity] of entities) {
      if (entity.type === 'Class' && !exportedEntities.has(name)) {
        this.addError({
          position: entity.position,
          message: `Class '${name}' is not exported by any file`,
          severity: 'error',
          suggestion: `Add '${name}' to the exports of a file entity or convert to ClassFile with #: operator`,
        });
      } else if (entity.type === 'Function' && !exportedEntities.has(name) && !classMethods.has(name)) {
        this.addError({
          position: entity.position,
          message: `Function '${name}' is not exported by any file and is not a class method`,
          severity: 'error',
          suggestion: `Either add '${name}' to the exports of a file entity or define it as a method of a class`,
        });
      }
      // ClassFile entities are automatically exported, so no check needed
    }
  }

  private checkDuplicateExports(entities: Map<string, AnyEntity>): void {
    const exportMap = new Map<string, AnyEntity[]>();

    // Build map of which files export each entity
    for (const entity of entities.values()) {
      if ('exports' in entity && entity.exports) {
        for (const exp of entity.exports) {
          if (!exportMap.has(exp)) {
            exportMap.set(exp, []);
          }
          exportMap.get(exp)!.push(entity);
        }
      }
    }

    // Check if any entity is exported by multiple files
    for (const [exportName, exporters] of exportMap) {
      if (exporters.length > 1) {
        // Check if this exported name is an entity (exists in entities map)
        const isEntity = entities.has(exportName);

        // Only report error once for the first duplicate we find
        const [first] = exporters;
        if (isEntity && first) {
          this.addError({
            position: first.position,
            message: `Entity '${exportName}' is exported by multiple files: ${exporters.map((e) => e.name).join(', ')}`,
            severity: 'error',
            suggestion: 'Each entity should be exported by exactly one file. Remove the duplicate exports.',
          });
        }
      }
    }
  }

  private checkMethodCalls(entities: Map<string, AnyEntity>): void {
    // Check function calls for validity
    for (const entity of entities.values()) {
      if ('calls' in entity && entity.calls) {
        for (const call of entity.calls) {
          // Check for method call syntax (e.g., TodoModel.create)
          if (call.includes('.')) {
            const [objectName, methodName] = call.split('.', 2);
            const targetEntity = entities.get(objectName as string);

            if (!targetEntity) {
              this.addError({
                position: entity.position,
                message: `Call to '${call}' references unknown entity '${objectName}'`,
                severity: 'error',
              });
            } else if (targetEntity.type !== 'Class' && targetEntity.type !== 'ClassFile') {
              this.addError({
                position: entity.position,
                message: `Cannot call method '${methodName}' on ${targetEntity.type} '${objectName}'. Only Classes and ClassFiles can have methods`,
                severity: 'error',
                suggestion: `Either define '${objectName}' as a Class/ClassFile or use a different call syntax`,
              });
            } else {
              // Check if the method exists on the class/classfile
              const classEntity = targetEntity as ClassEntity;
              if (!classEntity.methods.includes(methodName as string)) {
                this.addError({
                  position: entity.position,
                  message: `Method '${methodName}' not found on ${targetEntity.type.toLowerCase()} '${objectName}'`,
                  severity: 'error',
                  suggestion: `Available methods: ${classEntity.methods.join(', ')}`,
                });
              }
            }
          }
        }
      }
    }
  }

  private checkUndefinedExports(entities: Map<string, AnyEntity>): void {
    // Check that all exported names have corresponding entity definitions
    for (const entity of entities.values()) {
      // Skip export validation for Dependencies (they export external types)
      if (entity.type !== 'Dependency' && 'exports' in entity && entity.exports) {
        for (const exportName of entity.exports) {
          if (!entities.has(exportName)) {
            this.addError({
              position: entity.position,
              message: `Export '${exportName}' is not defined anywhere in the codebase`,
              severity: 'error',
              suggestion: `Define '${exportName}' as a Function, Class, Constants, Asset, or UIComponent entity`,
            });
          }
        }
      }
    }
  }

  private checkFunctionDTOs(entities: Map<string, AnyEntity>): void {
    // Check that function input/output DTOs exist
    for (const entity of entities.values()) {
      if (entity.type === 'Function') {
        const funcEntity = entity as FunctionEntity;

        if (funcEntity.input) {
          const inputEntity = entities.get(funcEntity.input);
          if (!inputEntity) {
            // Check if the DTO is exported by a dependency
            const isExportedByDependency = this.isDTOExportedByDependency(funcEntity.input, entities);
            if (!isExportedByDependency) {
              this.addError({
                position: entity.position,
                message: `Function input DTO '${funcEntity.input}' not found`,
                severity: 'error',
                suggestion: `Define '${funcEntity.input}' as a DTO entity or import it from a dependency`,
              });
            }
          } else if (inputEntity.type !== 'DTO') {
            this.addError({
              position: entity.position,
              message: `Function input '${funcEntity.input}' is not a DTO (it's a ${inputEntity.type})`,
              severity: 'error',
              suggestion: `Change '${funcEntity.input}' to a DTO or use a different input type`,
            });
          }
        }

        if (funcEntity.output) {
          const outputEntity = entities.get(funcEntity.output);
          if (!outputEntity) {
            // Check if the DTO is exported by a dependency
            const isExportedByDependency = this.isDTOExportedByDependency(funcEntity.output, entities);
            if (!isExportedByDependency) {
              this.addError({
                position: entity.position,
                message: `Function output DTO '${funcEntity.output}' not found`,
                severity: 'error',
                suggestion: `Define '${funcEntity.output}' as a DTO entity or import it from a dependency`,
              });
            }
          } else if (outputEntity.type !== 'DTO') {
            this.addError({
              position: entity.position,
              message: `Function output '${funcEntity.output}' is not a DTO (it's a ${outputEntity.type})`,
              severity: 'error',
              suggestion: `Change '${funcEntity.output}' to a DTO or use a different output type`,
            });
          }
        }
      }
    }
  }

  private checkUIComponentRelationships(entities: Map<string, AnyEntity>): void {
    for (const entity of entities.values()) {
      if (entity.type === 'UIComponent') {
        const uiEntity = entity as UIComponentEntity;

        // Check contains references
        if (uiEntity.contains) {
          for (const childName of uiEntity.contains) {
            const childEntity = entities.get(childName);
            if (!childEntity) {
              this.addError({
                position: entity.position,
                message: `UIComponent '${entity.name}' contains unknown component '${childName}'`,
                severity: 'error',
                suggestion: `Define '${childName}' as a UIComponent`,
              });
            } else if (childEntity.type !== 'UIComponent') {
              this.addError({
                position: entity.position,
                message: `UIComponent '${entity.name}' cannot contain '${childName}' (it's a ${childEntity.type})`,
                severity: 'error',
                suggestion: `Only UIComponents can contain other UIComponents`,
              });
            }
          }
        }

        // Check containedBy references
        if (uiEntity.containedBy) {
          for (const parentName of uiEntity.containedBy) {
            const parentEntity = entities.get(parentName);
            if (!parentEntity) {
              this.addError({
                position: entity.position,
                message: `UIComponent '${entity.name}' references unknown parent '${parentName}'`,
                severity: 'error',
                suggestion: `Define '${parentName}' as a UIComponent`,
              });
            } else if (parentEntity.type !== 'UIComponent') {
              this.addError({
                position: entity.position,
                message: `UIComponent '${entity.name}' cannot be contained by '${parentName}' (it's a ${parentEntity.type})`,
                severity: 'error',
                suggestion: `Only UIComponents can contain other UIComponents`,
              });
            }
          }
        }
      }
    }
  }

  private checkFunctionUIComponentAffects(entities: Map<string, AnyEntity>): void {
    // Build bi-directional validation
    const componentAffectedBy = new Map<string, string[]>();

    for (const entity of entities.values()) {
      if (entity.type === 'Function') {
        const funcEntity = entity as FunctionEntity;
        if (funcEntity.affects) {
          for (const componentName of funcEntity.affects) {
            const componentEntity = entities.get(componentName);
            if (!componentEntity) {
              this.addError({
                position: entity.position,
                message: `Function '${entity.name}' affects unknown component '${componentName}'`,
                severity: 'error',
                suggestion: `Define '${componentName}' as a UIComponent`,
              });
            } else if (componentEntity.type !== 'UIComponent') {
              this.addError({
                position: entity.position,
                message: `Function '${entity.name}' cannot affect '${componentName}' (it's a ${componentEntity.type})`,
                severity: 'error',
                suggestion: `Functions can only affect UIComponents`,
              });
            } else {
              // Track for bi-directional validation
              if (!componentAffectedBy.has(componentName)) {
                componentAffectedBy.set(componentName, []);
              }
              componentAffectedBy.get(componentName)!.push(entity.name);
            }
          }
        }
      }
    }

    // Check that UIComponent.affectedBy matches Function.affects
    for (const entity of entities.values()) {
      if (entity.type === 'UIComponent') {
        const uiEntity = entity as UIComponentEntity;
        const functionsAffecting = componentAffectedBy.get(entity.name) || [];

        if (uiEntity.affectedBy && uiEntity.affectedBy.length > 0) {
          // Component claims to be affected by functions - verify they match
          for (const funcName of uiEntity.affectedBy) {
            if (!functionsAffecting.includes(funcName)) {
              this.addError({
                position: entity.position,
                message: `UIComponent '${entity.name}' claims to be affected by '${funcName}', but that function doesn't affect it`,
                severity: 'error',
                suggestion: `Add '${entity.name}' to the affects list of function '${funcName}'`,
              });
            }
          }
        }
      }
    }
  }

  private checkAssetProgramRelationships(entities: Map<string, AnyEntity>): void {
    for (const entity of entities.values()) {
      if (entity.type === 'Asset') {
        const assetEntity = entity as AssetEntity;

        if (assetEntity.containsProgram) {
          const programEntity = entities.get(assetEntity.containsProgram);

          if (!programEntity) {
            this.addError({
              position: entity.position,
              message: `Asset '${entity.name}' references unknown program '${assetEntity.containsProgram}'`,
              severity: 'error',
              suggestion: `Define '${assetEntity.containsProgram}' as a Program entity`,
            });
          } else if (programEntity.type !== 'Program') {
            this.addError({
              position: entity.position,
              message: `Asset '${entity.name}' cannot contain '${assetEntity.containsProgram}' (it's a ${programEntity.type})`,
              severity: 'error',
              suggestion: `Assets can only contain Program entities`,
            });
          }
        }
      }
    }
  }

  private checkUIComponentContainment(entities: Map<string, AnyEntity>): void {
    // Build a set of all UIComponents that are contained by other UIComponents
    const containedComponents = new Set<string>();

    for (const entity of entities.values()) {
      if (entity.type === 'UIComponent') {
        const uiEntity = entity as UIComponentEntity;
        if (uiEntity.contains) {
          for (const childName of uiEntity.contains) {
            containedComponents.add(childName);
          }
        }
      }
    }

    // Check that all non-root UIComponents are contained by another component
    for (const entity of entities.values()) {
      if (entity.type === 'UIComponent') {
        const uiEntity = entity as UIComponentEntity;

        // Skip root components - they don't need to be contained
        if (uiEntity.root) {
          continue;
        }

        // Check if this non-root component is contained by any other component
        if (!containedComponents.has(entity.name)) {
          this.addError({
            position: entity.position,
            message: `UIComponent '${entity.name}' is not contained by any other UIComponent`,
            severity: 'error',
            suggestion: `Either add '${entity.name}' to another UIComponent's contains list, or mark it as a root component with &!`,
          });
        }
      }
    }
  }

  private checkFunctionConsumption(entities: Map<string, AnyEntity>): void {
    // Check that Functions' consumes references exist and are valid types
    const validConsumeTypes = ['RunParameter', 'Asset', 'Dependency', 'Constants'];

    for (const entity of entities.values()) {
      if (entity.type === 'Function') {
        const funcEntity = entity as FunctionEntity;

        if (funcEntity.consumes) {
          for (const consumeName of funcEntity.consumes) {
            const consumeEntity = entities.get(consumeName);

            if (!consumeEntity) {
              this.addError({
                position: entity.position,
                message: `Function '${entity.name}' consumes unknown entity '${consumeName}'`,
                severity: 'error',
                suggestion: `Define '${consumeName}' as one of: ${validConsumeTypes.join(', ')}`,
              });
            } else if (!validConsumeTypes.includes(consumeEntity.type)) {
              this.addError({
                position: entity.position,
                message: `Function '${entity.name}' cannot consume '${consumeName}' (it's a ${consumeEntity.type})`,
                severity: 'error',
                suggestion: `Functions can only consume: ${validConsumeTypes.join(', ')}`,
              });
            }
          }
        }
      }
    }

    // Check that RunParameters' consumedBy matches Functions' consumes
    for (const entity of entities.values()) {
      if (entity.type === 'RunParameter') {
        const paramEntity = entity as RunParameterEntity;

        if (paramEntity.consumedBy && paramEntity.consumedBy.length > 0) {
          for (const funcName of paramEntity.consumedBy) {
            const funcEntity = entities.get(funcName);

            if (!funcEntity) {
              this.addError({
                position: entity.position,
                message: `RunParameter '${entity.name}' claims to be consumed by unknown function '${funcName}'`,
                severity: 'error',
              });
            } else if (funcEntity.type !== 'Function') {
              this.addError({
                position: entity.position,
                message: `RunParameter '${entity.name}' claims to be consumed by '${funcName}' which is not a Function`,
                severity: 'error',
              });
            } else {
              const func = funcEntity as FunctionEntity;
              if (!func.consumes || !func.consumes.includes(entity.name)) {
                this.addError({
                  position: entity.position,
                  message: `RunParameter '${entity.name}' claims to be consumed by '${funcName}', but that function doesn't consume it`,
                  severity: 'error',
                  suggestion: `Add '${entity.name}' to the consumes list of function '${funcName}'`,
                });
              }
            }
          }
        }
      }
    }
  }

  private populateReferencedBy(entities: Map<string, AnyEntity>): void {
    // Clear any existing referencedBy arrays
    for (const entity of entities.values()) {
      entity.referencedBy = [];
    }

    // Helper to add a reference with validation
    const addReference = (targetName: string, refType: ReferenceType, from: AnyEntity): void => {
      const target = entities.get(targetName);
      if (!target) return;

      // Validate the reference type is allowed
      const validRef = DSLValidator.VALID_REFERENCES[refType];
      if (!validRef) {
        this.addError({
          position: from.position,
          message: `Unknown reference type '${refType}'`,
          severity: 'error',
        });
        return;
      }

      // Check if the 'from' entity type is allowed to make this reference
      if (!validRef.from.includes(from.type)) {
        this.addError({
          position: from.position,
          message: `${from.type} '${from.name}' cannot have '${refType}' references`,
          severity: 'error',
          suggestion: `Only ${validRef.from.join(', ')} entities can have '${refType}' references`,
        });
        return;
      }

      // Check if the 'to' entity type is allowed to be referenced this way
      if (!validRef.to.includes(target.type)) {
        this.addError({
          position: from.position,
          message: `Cannot use '${refType}' to reference ${target.type} '${targetName}'`,
          severity: 'error',
          suggestion: `'${refType}' can only reference: ${validRef.to.join(', ')}`,
        });
        return;
      }

      // Check if this reference already exists
      const exists = target.referencedBy!.some((ref) => ref.from === from.name && ref.type === refType);

      if (!exists) {
        target.referencedBy!.push({
          from: from.name,
          type: refType,
          fromType: from.type,
        });
      }
    };

    // Populate referencedBy based on various references
    for (const referencer of entities.values()) {
      // Track imports
      if ('imports' in referencer) {
        for (const imp of referencer.imports) {
          if (!imp.includes('*')) {
            // Check if this is a Dependency entity
            const dependency = Array.from(entities.values()).find((e) => e.type === 'Dependency' && e.name === imp);

            if (dependency) {
              // For Dependencies, update their importedBy field directly
              const depEntity = dependency as DependencyEntity;
              if (!depEntity.importedBy) {
                depEntity.importedBy = [];
              }
              if (!depEntity.importedBy.includes(referencer.name)) {
                depEntity.importedBy.push(referencer.name);
              }
            } else {
              // For other entities, use the standard addReference
              addReference(imp, 'imports', referencer);
            }
          }
        }
      }

      // Track exports
      if ('exports' in referencer) {
        for (const exp of referencer.exports) {
          addReference(exp, 'exports', referencer);
        }
      }

      // Track function calls
      if ('calls' in referencer) {
        for (const call of referencer.calls) {
          const callTarget = call.includes('.') ? call.split('.')[0] : call;
          addReference(callTarget, 'calls', referencer);
        }
      }

      // Track Program entry
      if (referencer.type === 'Program') {
        addReference(referencer.entry, 'entry', referencer);
      }

      // Track Function input/output DTOs
      if (referencer.type === 'Function') {
        const func = referencer as FunctionEntity;
        if (func.input) {
          addReference(func.input, 'input', referencer);
        }
        if (func.output) {
          addReference(func.output, 'output', referencer);
        }
      }

      // Track consumes (RunParameters, Assets, Dependencies, Constants)
      if ('consumes' in referencer) {
        const func = referencer as FunctionEntity;
        if (func.consumes) {
          for (const param of func.consumes) {
            addReference(param, 'consumes', referencer);
          }
        }
      }

      // Track affects (UIComponents)
      if ('affects' in referencer) {
        const func = referencer as FunctionEntity;
        if (func.affects) {
          for (const comp of func.affects) {
            addReference(comp, 'affects', referencer);
          }
        }
      }

      // Track Asset contains program
      if (referencer.type === 'Asset') {
        const asset = referencer as AssetEntity;
        if (asset.containsProgram) {
          addReference(asset.containsProgram, 'containsProgram', referencer);
        }
      }

      // Track UIComponent contains/containedBy
      if (referencer.type === 'UIComponent') {
        const ui = referencer as UIComponentEntity;
        if (ui.contains) {
          for (const child of ui.contains) {
            addReference(child, 'contains', referencer);
          }
        }
        if (ui.containedBy) {
          for (const parent of ui.containedBy) {
            addReference(parent, 'containedBy', referencer);
          }
        }
      }

      // Track Class inheritance
      if (referencer.type === 'Class') {
        const cls = referencer as ClassEntity;
        if (cls.extends) {
          addReference(cls.extends, 'extends', referencer);
        }
        for (const intf of cls.implements) {
          addReference(intf, 'implements', referencer);
        }
      }

      // Track Constants schema
      if (referencer.type === 'Constants') {
        const cnst = referencer as ConstantsEntity;
        if (cnst.schema) {
          addReference(cnst.schema, 'schema', referencer);
        }
      }

      // Track affectedBy reverse references
      if (referencer.type === 'UIComponent') {
        const ui = referencer as UIComponentEntity;
        if (ui.affectedBy) {
          for (const funcName of ui.affectedBy) {
            addReference(funcName, 'affectedBy', referencer);
          }
        }
      }

      // Track consumedBy reverse references
      if (referencer.type === 'RunParameter') {
        const param = referencer as RunParameterEntity;
        if (param.consumedBy) {
          for (const funcName of param.consumedBy) {
            addReference(funcName, 'consumedBy', referencer);
          }
        }
      }
    }
  }

  private checkFunctionDependencies(entities: Map<string, AnyEntity>): void {
    // Check that all function dependencies (from <- [...]) exist
    for (const entity of entities.values()) {
      if (entity.type === 'Function') {
        const funcEntity = entity as FunctionEntityWithDependencies;

        // Check if there are unresolved dependencies
        if (funcEntity._dependencies) {
          for (const dep of funcEntity._dependencies) {
            const depEntity = entities.get(dep);
            if (!depEntity) {
              this.addError({
                position: entity.position,
                message: `Function dependency '${dep}' not found`,
                severity: 'error',
                suggestion: `Define '${dep}' as an entity or remove it from the dependency list`,
              });
            } else if (depEntity.type === 'Dependency') {
              // Check if this dependency is trying to be directly consumed
              this.addError({
                position: entity.position,
                message: `Cannot directly consume dependency '${dep}' in function '${funcEntity.name}'`,
                severity: 'error',
                suggestion: `Import specific entities from '${dep}' instead. If '${dep}' exports entities, add them with '-> [EntityName]' and import those entities in your files.`,
              });
            }
          }
        }
      }
    }
  }

  private checkDTOFieldTypes(entities: Map<string, AnyEntity>): void {
    // Check that DTO fields don't have Function type and validate field type references
    for (const entity of entities.values()) {
      if (entity.type === 'DTO') {
        const dtoEntity = entity as DTOEntity;

        if (dtoEntity.fields) {
          for (const field of dtoEntity.fields) {
            if (!field.type) continue;

            // Check if field type is exactly 'Function' or contains 'Function' as a word
            if (field.type === 'Function' || /\bFunction\b/.test(field.type)) {
              this.addError({
                position: entity.position,
                message: `DTO '${entity.name}' field '${field.name}' cannot have Function type`,
                severity: 'error',
                suggestion: `DTOs should only contain data fields. Use string, number, boolean, object, array, or other data types instead`,
              });
              continue;
            }

            // Validate field type references exist
            this.validateFieldTypeReferences(field.type, entity, field.name, entities);
          }
        }
      }
    }
  }

  private validateFieldTypeReferences(fieldType: string, entity: AnyEntity, fieldName: string, entities: Map<string, AnyEntity>): void {
    // Parse field type to extract base types that need validation
    const typesToCheck = this.extractTypesFromFieldType(fieldType);

    for (const typeName of typesToCheck) {
      // Skip primitive types
      if (this.isPrimitiveType(typeName)) {
        continue;
      }

      // Check if custom type exists as DTO or Class
      const referencedEntity = entities.get(typeName);
      if (!referencedEntity) {
        this.addError({
          position: entity.position,
          message: `DTO '${entity.name}' field '${fieldName}' references undefined type '${typeName}'`,
          severity: 'error',
          suggestion: `Define '${typeName}' as a DTO or Class entity`,
        });
      } else if (referencedEntity.type !== 'DTO' && referencedEntity.type !== 'Class') {
        this.addError({
          position: entity.position,
          message: `DTO '${entity.name}' field '${fieldName}' references '${typeName}' which is a ${referencedEntity.type}, not a DTO or Class`,
          severity: 'error',
          suggestion: `Field types should reference DTO or Class entities for complex types`,
        });
      }
    }
  }

  private extractTypesFromFieldType(fieldType: string): string[] {
    const types: string[] = [];

    // Handle array types (e.g., "string[]", "UserDTO[][]")
    const baseType = fieldType.replace(/\[\]/g, '');

    // Handle union types (e.g., "string | number | UserDTO")
    if (baseType.includes('|')) {
      const unionParts = baseType.split('|').map((part) => part.trim());
      for (const part of unionParts) {
        if (!this.isPrimitiveType(part) && this.isCustomTypeName(part)) {
          types.push(part);
        }
      }
    } else {
      // Single type
      if (!this.isPrimitiveType(baseType) && this.isCustomTypeName(baseType)) {
        types.push(baseType);
      }
    }

    return types;
  }

  private isPrimitiveType(typeName: string): boolean {
    const primitives = [
      'string',
      'number',
      'boolean',
      'object',
      'any',
      'void',
      'null',
      'undefined',
      'Date',
      'Array',
      'Promise',
      'Map',
      'Set',
      'Record',
      'Partial',
      'Required',
      'Pick',
      'Omit',
    ];
    return primitives.includes(typeName);
  }

  private isCustomTypeName(typeName: string): boolean {
    // Custom types typically start with uppercase letter
    // Also handle generic syntax like "Promise<UserDTO>" by extracting the inner type
    if (typeName.includes('<') && typeName.includes('>')) {
      // Extract generic inner type (simplified, could be more robust)
      const match = typeName.match(/<([^>]+)>/);
      if (match) {
        return this.isCustomTypeName(match[1]);
      }
    }

    return /^[A-Z]/.test(typeName) && /^[A-Za-z][A-Za-z0-9_]*$/.test(typeName);
  }
}
