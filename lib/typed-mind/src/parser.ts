import { GrammarValidator } from './grammar-validator.ts';
import { LongformParser } from './longform-parser.ts';
import { CONTINUATION_PATTERNS, ENTITY_PATTERNS, GENERAL_PATTERNS } from './parser-patterns.ts';
import type {
  AnyEntity,
  AssetEntity,
  ClassEntity,
  ClassFileEntity,
  ConstantsEntity,
  DependencyEntity,
  DTOEntity,
  DTOField,
  FileEntity,
  FunctionEntity,
  FunctionEntityWithDependencies,
  ImportStatement,
  Position,
  ProgramEntity,
  RunParameterEntity,
  UIComponentEntity,
} from './types.ts';

export interface ParseError {
  line: number;
  column: number;
  message: string;
  context?: string;
  recoverable: boolean;
}

export interface ParseResult {
  entities: Map<string, AnyEntity>;
  imports: ImportStatement[];
  namingConflicts?: Array<{
    name: string;
    existingEntity: AnyEntity;
    newEntity: AnyEntity;
  }>;
  grammarErrors?: Array<{
    entity: string;
    type: string;
    field: string;
    message: string;
  }>;
  parseErrors?: ParseError[];
}

export class DSLParser {
  private lines: string[] = [];
  private entities = new Map<string, AnyEntity>();
  private imports: ImportStatement[] = [];
  private namingConflicts: Array<{ name: string; existingEntity: AnyEntity; newEntity: AnyEntity }> = [];
  private longformParser = new LongformParser();
  private grammarValidator = new GrammarValidator();
  private validateGrammar = false;
  private parseErrors: ParseError[] = [];
  private errorRecoveryMode = true; // Enable error recovery by default

  parse(input: string, options?: { validateGrammar?: boolean; errorRecovery?: boolean }): ParseResult {
    this.validateGrammar = options?.validateGrammar ?? false;
    this.errorRecoveryMode = options?.errorRecovery ?? true;
    this.lines = input.split('\n');
    this.entities.clear();
    this.imports = [];
    this.namingConflicts = [];
    this.parseErrors = [];

    let currentEntity: AnyEntity | null = null;
    const entityStack: AnyEntity[] = [];

    for (let lineNum = 0; lineNum < this.lines.length; lineNum++) {
      const line = this.lines[lineNum];
      if (!line) continue;
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check for import statements (both @import and import)
      if (trimmed.startsWith('@import') || trimmed.startsWith('import ')) {
        this.parseImport(trimmed, lineNum + 1);
        continue;
      }

      // Check for longform syntax
      if (this.isLongformDeclaration(trimmed)) {
        const longformEntity = this.longformParser.parseLongform(input, lineNum);
        if (longformEntity) {
          this.entities.set(longformEntity.name, longformEntity);
          lineNum = this.longformParser.getConsumedLines() - 1; // Skip processed lines
          currentEntity = null; // Reset current entity after longform
        }
        continue;
      }

      // Check for continuation of previous entity
      if (currentEntity && this.isContinuation(line)) {
        this.parseContinuation(currentEntity, trimmed, lineNum + 1);
        continue;
      }

      // Detect entity declarations
      if (this.isEntityDeclaration(trimmed)) {
        try {
          currentEntity = this.parseEntity(trimmed, lineNum + 1);
        } catch (error) {
          this.handleParseError(trimmed, lineNum + 1, error as Error);
          currentEntity = null;
          continue;
        }
        if (currentEntity) {
          // Check for naming conflicts before setting
          const existingEntity = this.entities.get(currentEntity.name);
          if (existingEntity && existingEntity.type !== currentEntity.type) {
            this.namingConflicts.push({
              name: currentEntity.name,
              existingEntity,
              newEntity: currentEntity,
            });
          }

          this.entities.set(currentEntity.name, currentEntity);
          entityStack.push(currentEntity);
        }
      } else {
        // Check if this looks like a malformed entity declaration
        if (this.looksLikeEntity(trimmed)) {
          this.handleParseError(trimmed, lineNum + 1, new Error('Malformed entity declaration'));
        }
        // If we hit a non-entity line that's not a continuation, clear current entity
        currentEntity = null;
      }
    }

    // Post-process function dependencies
    this.distributeFunctionDependencies();

    // Post-process bidirectional relationships
    this.establishBidirectionalRelationships();

    const result: ParseResult = {
      entities: this.entities,
      imports: this.imports,
    };

    // Add parse errors if any occurred
    if (this.parseErrors.length > 0) {
      result.parseErrors = this.parseErrors;
    }

    // Add naming conflicts if any were detected
    if (this.namingConflicts.length > 0) {
      result.namingConflicts = this.namingConflicts;
    }

    // Optionally validate grammar
    if (this.validateGrammar) {
      const validationResult = this.grammarValidator.validateEntities(this.entities);
      if (!validationResult.valid) {
        result.grammarErrors = validationResult.errors.map((e) => ({
          entity: e.entity,
          type: e.type,
          field: e.field,
          message: e.message,
        }));
      }
    }

    return result;
  }

  private isEntityDeclaration(line: string): boolean {
    // Match various entity patterns - entities can start with any letter
    return GENERAL_PATTERNS.ENTITY_DECLARATION.test(line);
  }

  private isLongformDeclaration(line: string): boolean {
    // Match longform keywords followed by entity name and optional opening brace
    return GENERAL_PATTERNS.LONGFORM_DECLARATION.test(line);
  }

  private isContinuation(line: string): boolean {
    // Lines starting with whitespace and specific operators are continuations
    return GENERAL_PATTERNS.CONTINUATION.test(line);
  }

  private parseEntity(line: string, lineNum: number): AnyEntity | null {
    const position: Position = { line: lineNum, column: 1 };

    // Extract inline comment if present
    const { cleanLine, comment } = this.extractInlineComment(line);

    // Program: AppName -> EntryFile v1.0.0 or AppName -> EntryFile "Main application" v1.0.0
    const programMatch = cleanLine.match(ENTITY_PATTERNS.PROGRAM);
    if (programMatch) {
      return {
        name: programMatch[1] as string,
        type: 'Program',
        entry: programMatch[2] as string,
        purpose: programMatch[3],
        version: programMatch[4],
        position,
        raw: line,
        comment,
      } as ProgramEntity;
    }

    // File: UserService @ src/services/user.ts:
    const fileMatch = cleanLine.match(ENTITY_PATTERNS.FILE);
    if (fileMatch) {
      // Check if this is actually a class by looking ahead for methods
      let isClass = false;
      for (let i = lineNum; i < Math.min(lineNum + 5, this.lines.length); i++) {
        const nextLine = this.lines[i]?.trim();
        if (nextLine?.startsWith('=>')) {
          isClass = true;
          break;
        }
        // Stop looking if we hit another entity declaration
        if (nextLine && this.isEntityDeclaration(nextLine)) {
          break;
        }
      }

      if (isClass) {
        return {
          name: fileMatch[1] as string,
          type: 'Class',
          path: fileMatch[2]?.trim() as string,
          implements: [],
          methods: [],
          position,
          raw: line,
          comment,
        } as ClassEntity;
      } else {
        return {
          name: fileMatch[1] as string,
          type: 'File',
          path: fileMatch[2]?.trim() as string,
          imports: [],
          exports: [],
          position,
          raw: line,
          comment,
        } as FileEntity;
      }
    }

    // Function: createUser :: (data: UserInput) => Promise<User>
    const functionMatch = cleanLine.match(ENTITY_PATTERNS.FUNCTION);
    if (functionMatch) {
      return {
        name: functionMatch[1] as string,
        type: 'Function',
        signature: functionMatch[2]?.trim() as string,
        calls: [],
        position,
        raw: line,
        comment,
      } as FunctionEntity;
    }

    // ClassFile: UserController #: src/controllers/user.ts <: BaseController
    const classFileMatch = cleanLine.match(ENTITY_PATTERNS.CLASS_FILE);
    if (classFileMatch) {
      const inheritance = classFileMatch[3]?.trim();
      let baseClass: string | undefined;
      let interfaces: string[] = [];

      if (inheritance) {
        const parts = inheritance.split(',').map((s) => s.trim());
        if (parts.length > 0 && parts[0]) {
          baseClass = parts[0];
          interfaces = parts.slice(1);
        }
      }

      return {
        name: classFileMatch[1] as string,
        type: 'ClassFile',
        path: classFileMatch[2]?.trim() as string,
        extends: baseClass,
        implements: interfaces,
        methods: [],
        imports: [],
        exports: [classFileMatch[1] as string], // Class-file fusion automatically exports the class
        position,
        raw: line,
        comment,
      } as ClassFileEntity;
    }

    // Class: UserController <: BaseController, IController or just TodoModel <:
    const classMatch = cleanLine.match(ENTITY_PATTERNS.CLASS);
    if (classMatch) {
      const inheritance = classMatch[2]?.trim();
      let baseClass: string | undefined;
      let interfaces: string[] = [];

      if (inheritance) {
        const parts = inheritance.split(',').map((s) => s.trim());
        if (parts.length > 0 && parts[0]) {
          baseClass = parts[0];
          interfaces = parts.slice(1);
        }
      }

      return {
        name: classMatch[1] as string,
        type: 'Class',
        extends: baseClass,
        implements: interfaces,
        methods: [],
        imports: [],
        position,
        raw: line,
        comment,
      } as ClassEntity;
    }

    // Constants: AppConfig ! src/config.ts : ConfigSchema
    const constantsMatch = cleanLine.match(ENTITY_PATTERNS.CONSTANTS);
    if (constantsMatch) {
      return {
        name: constantsMatch[1] as string,
        type: 'Constants',
        path: constantsMatch[2]?.trim() as string,
        schema: constantsMatch[3],
        position,
        raw: line,
        comment,
      } as ConstantsEntity;
    }

    // DTO: UserDTO % "User data transfer object"
    const dtoMatch = cleanLine.match(ENTITY_PATTERNS.DTO_WITH_PURPOSE);
    if (dtoMatch) {
      return {
        name: dtoMatch[1] as string,
        type: 'DTO',
        purpose: dtoMatch[2] as string,
        fields: [],
        position,
        raw: line,
        comment,
      } as DTOEntity;
    }

    // DTO without purpose: UserDTO %
    const dtoSimpleMatch = cleanLine.match(ENTITY_PATTERNS.DTO_SIMPLE);
    if (dtoSimpleMatch) {
      return {
        name: dtoSimpleMatch[1] as string,
        type: 'DTO',
        fields: [],
        position,
        raw: line,
        comment,
      } as DTOEntity;
    }

    // Asset: Logo ~ "Company logo image"
    const assetMatch = cleanLine.match(ENTITY_PATTERNS.ASSET);
    if (assetMatch) {
      return {
        name: assetMatch[1] as string,
        type: 'Asset',
        description: assetMatch[2] as string,
        position,
        raw: line,
        comment,
      } as AssetEntity;
    }

    // UIComponent: LoginForm & "User login form" or RootApp &! "Root application"
    const uiComponentMatch = cleanLine.match(ENTITY_PATTERNS.UI_COMPONENT);
    if (uiComponentMatch) {
      const isRoot = uiComponentMatch[2] === '&!';
      return {
        name: uiComponentMatch[1] as string,
        type: 'UIComponent',
        purpose: uiComponentMatch[3] as string,
        root: isRoot || undefined,
        contains: [],
        containedBy: [],
        affectedBy: [],
        position,
        raw: line,
        comment,
      } as UIComponentEntity;
    }

    // RunParameter: DATABASE_URL $env "PostgreSQL connection string" (required)
    const runParamMatch = cleanLine.match(ENTITY_PATTERNS.RUN_PARAMETER);
    if (runParamMatch) {
      const paramType = runParamMatch[2] as 'env' | 'iam' | 'runtime' | 'config';
      const isRequired = runParamMatch[4] === 'required';

      return {
        name: runParamMatch[1] as string,
        type: 'RunParameter',
        paramType,
        description: runParamMatch[3] as string,
        required: isRequired || undefined,
        consumedBy: [],
        position,
        raw: line,
        comment,
      } as RunParameterEntity;
    }

    // Dependency: axios ^ "HTTP client library" v3.0.0
    // Short form: axios ^ "HTTP client"
    // Supports scoped packages like @org/package
    const depMatch = cleanLine.match(ENTITY_PATTERNS.DEPENDENCY);
    if (depMatch) {
      return {
        name: depMatch[1] as string,
        type: 'Dependency',
        purpose: depMatch[2] as string,
        version: depMatch[3],
        importedBy: [],
        position,
        raw: line,
        comment,
      } as DependencyEntity;
    }

    // Long form with explicit type
    const longFormMatch = cleanLine.match(ENTITY_PATTERNS.LONGFORM_ENTITY);
    if (longFormMatch) {
      // Look ahead for type specification
      const nextLineNum = lineNum;
      if (nextLineNum < this.lines.length) {
        const nextLine = this.lines[nextLineNum]?.trim();
        const typeMatch = nextLine?.match(ENTITY_PATTERNS.LONGFORM_TYPE);
        if (typeMatch) {
          const entityType = typeMatch[1] as string;
          const name = longFormMatch[1] as string;
          const entity = this.createLongFormEntity(name, entityType, position, line);
          if (entity && comment) {
            entity.comment = comment;
          }
          return entity;
        }
      }
    }

    // No pattern matched - this is a malformed entity
    if (!this.errorRecoveryMode) {
      throw new Error(`Unable to parse entity declaration: ${line}`);
    }
    return null;
  }

  private parseContinuation(entity: AnyEntity, line: string, _lineNum: number): void {
    // Extract inline comment if present
    const { cleanLine } = this.extractInlineComment(line);
    const trimmedLine = cleanLine.trim();
    // Imports: <- [Database, UserModel]
    const importMatch = trimmedLine.match(/^<-\s*\[([^\]]+)\]/);
    if (importMatch) {
      // Special handling for Functions - distribute by entity type
      if (entity.type === 'Function') {
        const funcEntity = entity as FunctionEntityWithDependencies;
        const items = this.parseList(importMatch[1] as string);

        // We'll need access to entities to check types, so for now just store them
        // The validator will need to handle the validation
        if (!funcEntity.calls) funcEntity.calls = [];
        if (!funcEntity.affects) funcEntity.affects = [];
        if (!funcEntity.consumes) funcEntity.consumes = [];

        // Store all in a temporary field that validator can process
        funcEntity._dependencies = items;
        return;
      }
      // For other entities with imports field
      else if ('imports' in entity && Array.isArray(entity.imports)) {
        entity.imports = this.parseList(importMatch[1] as string);
        return;
      }
    }

    // Exports: -> [createUser, getUser]
    const exportMatch = trimmedLine.match(/^->\s*\[([^\]]+)\]/);
    if (exportMatch) {
      if ('exports' in entity) {
        entity.exports = this.parseList(exportMatch[1] as string);
        return;
      } else if (entity.type === 'Dependency') {
        // Dependencies can also export types/DTOs
        const depEntity = entity as DependencyEntity;
        depEntity.exports = this.parseList(exportMatch[1] as string);
        return;
      }
    }

    // Calls: ~> [validateInput, Database.insert]
    const callsMatch = trimmedLine.match(/^~>\s*\[([^\]]+)\]/);
    if (callsMatch && 'calls' in entity) {
      entity.calls = this.parseList(callsMatch[1] as string);
      return;
    }

    // Function Input: <- UserCreateDTO
    const inputMatch = trimmedLine.match(/^<-\s*(\w+)$/);
    if (inputMatch && entity.type === 'Function') {
      const funcEntity = entity as FunctionEntity;
      funcEntity.input = inputMatch[1] as string;
      return;
    }

    // Function Output: -> UserDTO
    const outputMatch = trimmedLine.match(/^->\s*(\w+)$/);
    if (outputMatch && entity.type === 'Function') {
      const funcEntity = entity as FunctionEntity;
      funcEntity.output = outputMatch[1] as string;
      return;
    }

    // Methods: => [handleCreate, handleGet]
    const methodsMatch = trimmedLine.match(/^=>\s*\[([^\]]+)\]/);
    if (methodsMatch && 'methods' in entity) {
      entity.methods = this.parseList(methodsMatch[1] as string);
      return;
    }

    // Function affects: ~> [ComponentA, ComponentB]
    const affectsMatch = trimmedLine.match(/^~\s*\[([^\]]+)\]/);
    if (affectsMatch && entity.type === 'Function') {
      const funcEntity = entity as FunctionEntity;
      funcEntity.affects = this.parseList(affectsMatch[1] as string);

      // Update affected components' affectedBy list
      for (const componentName of funcEntity.affects) {
        const component = this.entities.get(componentName);
        if (component && component.type === 'UIComponent') {
          const uiComponent = component as UIComponentEntity;
          if (!uiComponent.affectedBy) {
            uiComponent.affectedBy = [];
          }
          if (!uiComponent.affectedBy.includes(funcEntity.name)) {
            uiComponent.affectedBy.push(funcEntity.name);
          }
        }
      }
      return;
    }

    // UIComponent contains: > [ChildComponent1, ChildComponent2]
    const containsMatch = trimmedLine.match(/^>\s*\[([^\]]+)\]/);
    if (containsMatch && entity.type === 'UIComponent') {
      const uiEntity = entity as UIComponentEntity;
      uiEntity.contains = this.parseList(containsMatch[1] as string);
      return;
    }

    // UIComponent containedBy: < [ParentComponent]
    const containedByMatch = trimmedLine.match(/^<\s*\[([^\]]+)\]/);
    if (containedByMatch && entity.type === 'UIComponent') {
      const uiEntity = entity as UIComponentEntity;
      uiEntity.containedBy = this.parseList(containedByMatch[1] as string);
      return;
    }

    // Asset contains program: >> ProgramName
    const containsProgramMatch = trimmedLine.match(/^>>\s*(\w+)$/);
    if (containsProgramMatch && entity.type === 'Asset') {
      const assetEntity = entity as AssetEntity;
      assetEntity.containsProgram = containsProgramMatch[1] as string;
      return;
    }

    // DTO Fields: - fieldName: type "description" (optional) or - fieldName?: type "description"
    const dtoFieldMatch = trimmedLine.match(CONTINUATION_PATTERNS.DTO_FIELD);
    if (dtoFieldMatch && entity.type === 'DTO') {
      const dtoEntity = entity as DTOEntity;
      const field: DTOField = {
        name: dtoFieldMatch[1] as string,
        type: dtoFieldMatch[3]?.trim() as string,
        description: dtoFieldMatch[4],
        optional: dtoFieldMatch[2] === '?' || dtoFieldMatch[5]?.includes('optional') || false,
      };
      dtoEntity.fields.push(field);
      return;
    }

    // Comment: # This is a comment about the entity
    const commentMatch = trimmedLine.match(CONTINUATION_PATTERNS.COMMENT);
    if (commentMatch) {
      entity.comment = commentMatch[1] as string;
      return;
    }

    // Description/Purpose: "Creates a new user in the database"
    const descMatch = trimmedLine.match(CONTINUATION_PATTERNS.DESCRIPTION);
    if (descMatch) {
      const description = descMatch[1] as string;

      if (entity.type === 'Function') {
        const funcEntity = entity as FunctionEntity;
        funcEntity.description = description;
      } else if (entity.type === 'Program') {
        const progEntity = entity as ProgramEntity;
        progEntity.purpose = description;
      } else if (entity.type === 'File') {
        const fileEntity = entity as FileEntity;
        fileEntity.purpose = description;
      } else if (entity.type === 'Class') {
        const classEntity = entity as ClassEntity;
        classEntity.purpose = description;
      } else if (entity.type === 'Constants') {
        const constEntity = entity as ConstantsEntity;
        constEntity.purpose = description;
      }
      return;
    }

    // RunParameter default value: = "default-value"
    const defaultValueMatch = trimmedLine.match(CONTINUATION_PATTERNS.DEFAULT_VALUE);
    if (defaultValueMatch && entity.type === 'RunParameter') {
      const paramEntity = entity as RunParameterEntity;
      paramEntity.defaultValue = defaultValueMatch[1] as string;
      return;
    }

    // Function consumes RunParameters: $< [DATABASE_URL, API_KEY]
    const consumesMatch = trimmedLine.match(CONTINUATION_PATTERNS.CONSUMES);
    if (consumesMatch && entity.type === 'Function') {
      const funcEntity = entity as FunctionEntity;
      funcEntity.consumes = this.parseList(consumesMatch[1] as string);

      // Update consumed RunParameters' consumedBy list
      for (const paramName of funcEntity.consumes) {
        const param = this.entities.get(paramName);
        if (param && param.type === 'RunParameter') {
          const runParam = param as RunParameterEntity;
          if (!runParam.consumedBy) {
            runParam.consumedBy = [];
          }
          if (!runParam.consumedBy.includes(funcEntity.name)) {
            runParam.consumedBy.push(funcEntity.name);
          }
        }
      }
      return;
    }
  }

  private parseList(listStr: string): string[] {
    return listStr.split(',').map((item) => item.trim());
  }

  private extractInlineComment(line: string): { cleanLine: string; comment?: string } {
    const commentMatch = line.match(GENERAL_PATTERNS.INLINE_COMMENT);
    if (commentMatch) {
      return {
        cleanLine: commentMatch[1]?.trim() as string,
        comment: commentMatch[2]?.trim() as string,
      };
    }
    return { cleanLine: line };
  }

  private parseImport(line: string, lineNum: number): void {
    // Support both @import "./path/to/file.tmd" as Alias and import "./path/to/file.tmd" as Alias
    const importMatch = line.match(GENERAL_PATTERNS.IMPORT_STATEMENT);
    if (importMatch) {
      const importStatement: ImportStatement = {
        path: importMatch[1] as string,
        alias: importMatch[2],
        position: { line: lineNum, column: 1 },
      };
      this.imports.push(importStatement);
    }
  }

  private createLongFormEntity(name: string, type: string, position: Position, raw: string): AnyEntity | null {
    const baseEntity = { name, position, raw };

    switch (type) {
      case 'Program':
        return { ...baseEntity, type: 'Program', entry: '' } as ProgramEntity;
      case 'File':
        return { ...baseEntity, type: 'File', path: '', imports: [], exports: [] } as FileEntity;
      case 'Function':
        return { ...baseEntity, type: 'Function', signature: '', calls: [] } as FunctionEntity;
      case 'Class':
        return { ...baseEntity, type: 'Class', implements: [], methods: [] } as ClassEntity;
      case 'ClassFile':
        return { ...baseEntity, type: 'ClassFile', path: '', implements: [], methods: [], imports: [], exports: [name] } as ClassFileEntity;
      case 'Constants':
        return { ...baseEntity, type: 'Constants', path: '' } as ConstantsEntity;
      default:
        return null;
    }
  }

  private establishBidirectionalRelationships(): void {
    // Establish bidirectional relationships after all entities are parsed
    for (const entity of this.entities.values()) {
      if (entity.type === 'Function') {
        const funcEntity = entity as FunctionEntity;

        // Update affectedBy for UIComponents
        if (funcEntity.affects) {
          for (const componentName of funcEntity.affects) {
            const component = this.entities.get(componentName);
            if (component && component.type === 'UIComponent') {
              const uiComponent = component as UIComponentEntity;
              if (!uiComponent.affectedBy) {
                uiComponent.affectedBy = [];
              }
              if (!uiComponent.affectedBy.includes(funcEntity.name)) {
                uiComponent.affectedBy.push(funcEntity.name);
              }
            }
          }
        }

        // Update consumedBy for RunParameters, Assets, and Constants
        if (funcEntity.consumes) {
          for (const resourceName of funcEntity.consumes) {
            const resource = this.entities.get(resourceName);
            if (resource) {
              if (resource.type === 'RunParameter') {
                const runParam = resource as RunParameterEntity;
                if (!runParam.consumedBy) {
                  runParam.consumedBy = [];
                }
                if (!runParam.consumedBy.includes(funcEntity.name)) {
                  runParam.consumedBy.push(funcEntity.name);
                }
              }
              // Can also handle Assets and Constants if they have consumedBy
            }
          }
        }
      }

      // Update containedBy for UIComponents
      if (entity.type === 'UIComponent') {
        const uiComponent = entity as UIComponentEntity;
        if (uiComponent.contains) {
          for (const childName of uiComponent.contains) {
            const child = this.entities.get(childName);
            if (child && child.type === 'UIComponent') {
              const childComponent = child as UIComponentEntity;
              if (!childComponent.containedBy) {
                childComponent.containedBy = [];
              }
              if (!childComponent.containedBy.includes(uiComponent.name)) {
                childComponent.containedBy.push(uiComponent.name);
              }
            }
          }
        }
      }
    }
  }

  private distributeFunctionDependencies(): void {
    // Process functions with _dependencies field
    for (const entity of this.entities.values()) {
      if (entity.type === 'Function') {
        const funcEntity = entity as FunctionEntityWithDependencies;
        if (funcEntity._dependencies) {
          const unresolvedDeps: string[] = [];
          const dtos: string[] = [];

          // First pass: collect DTOs and distribute other entity types
          for (const dep of funcEntity._dependencies) {
            const depEntity = this.entities.get(dep);
            if (depEntity) {
              switch (depEntity.type) {
                case 'DTO':
                  // Collect DTOs for special handling
                  dtos.push(dep);
                  break;
                case 'Function':
                case 'Class':
                case 'ClassFile':
                  // These are calls
                  if (!funcEntity.calls.includes(dep)) {
                    funcEntity.calls.push(dep);
                  }
                  break;
                case 'UIComponent': {
                  // These affect UI components
                  if (!funcEntity.affects) funcEntity.affects = [];
                  if (!funcEntity.affects.includes(dep)) {
                    funcEntity.affects.push(dep);
                  }

                  // Update bidirectional reference
                  const uiComponent = depEntity as UIComponentEntity;
                  if (!uiComponent.affectedBy) {
                    uiComponent.affectedBy = [];
                  }
                  if (!uiComponent.affectedBy.includes(funcEntity.name)) {
                    uiComponent.affectedBy.push(funcEntity.name);
                  }
                  break;
                }
                case 'Dependency':
                  // Dependencies cannot be directly consumed - they must be imported first
                  // This will be caught as an error by the validator
                  unresolvedDeps.push(dep);
                  break;
                case 'Asset':
                case 'RunParameter':
                case 'Constants':
                  // These are consumed
                  if (!funcEntity.consumes) funcEntity.consumes = [];
                  if (!funcEntity.consumes.includes(dep)) {
                    funcEntity.consumes.push(dep);
                  }

                  // Update bidirectional reference for RunParameters
                  if (depEntity.type === 'RunParameter') {
                    const runParam = depEntity as RunParameterEntity;
                    if (!runParam.consumedBy) {
                      runParam.consumedBy = [];
                    }
                    if (!runParam.consumedBy.includes(funcEntity.name)) {
                      runParam.consumedBy.push(funcEntity.name);
                    }
                  }
                  break;
                // Files and Programs are typically not in dependency lists
                default:
                  // Keep as unresolved for other entity types
                  unresolvedDeps.push(dep);
              }
            } else {
              // Keep unresolved dependencies for validator to check
              unresolvedDeps.push(dep);
            }
          }

          // Second pass: handle DTO auto-distribution
          if (dtos.length > 0) {
            // If no explicit input is set, assign the first DTO as input
            if (!funcEntity.input && dtos.length >= 1) {
              funcEntity.input = dtos[0];
            }

            // Additional DTOs beyond the first are not supported in dependency arrays
            // They should use explicit syntax like <- InputDTO, -> OutputDTO
            // For now, we just ignore extra DTOs (they'll be caught by validator if needed)
            if (dtos.length > 1) {
              // Could add a warning here in the future
              // Extra DTOs are simply ignored since Functions should only have one input DTO
            }
          }

          // Keep unresolved dependencies for validator
          if (unresolvedDeps.length > 0) {
            funcEntity._dependencies = unresolvedDeps;
          } else {
            // Clean up temporary field if all were resolved
            delete funcEntity._dependencies;
          }
        }
      }
    }
  }

  // Error recovery helper methods
  private handleParseError(line: string, lineNum: number, error: Error): void {
    if (!this.errorRecoveryMode) {
      throw error; // In strict mode, propagate errors
    }

    const parseError: ParseError = {
      line: lineNum,
      column: 1,
      message: error.message || 'Parse error',
      context: line,
      recoverable: true,
    };

    this.parseErrors.push(parseError);
  }

  private looksLikeEntity(line: string): boolean {
    // Check if a line looks like it was trying to be an entity declaration
    // but doesn't match any valid pattern
    const entityIndicators = [
      '->', // Program
      '@', // File
      '::', // Function
      '<:', // Class
      '#:', // ClassFile
      '!', // Constants
      '%', // DTO
      '~', // Asset (but check for proper format)
      '&', // UIComponent
      '$', // RunParameter
      '^', // Dependency
    ];

    // Check if line contains any entity indicators
    for (const indicator of entityIndicators) {
      if (line.includes(indicator)) {
        // Special case: '~' can be valid in other contexts
        if (indicator === '~') {
          // Check if it's likely an asset declaration (word ~ "description")
          return /^\w+\s*~\s*[^"]/.test(line) || /^\w+\s*~\s*$/.test(line);
        }
        return true;
      }
    }

    // Also check for common typos or malformed patterns
    if (/^[A-Za-z]\w*\s+[->@:!%~&$^]/.test(line)) {
      return true; // Space before operator (common mistake)
    }

    if (/^[A-Za-z]\w*[->@:!%~&$^]{2,}/.test(line)) {
      return true; // Double operators (typo)
    }

    return false;
  }
}
