import { readFileSync } from 'fs';
import { dirname, resolve, isAbsolute } from 'path';
import type { ImportStatement, AnyEntity, ValidationError } from './types.ts';
import type { ParseResult } from './parser.ts';
import { DSLParser } from './parser.ts';

export interface ResolvedImport {
  import: ImportStatement;
  entities: Map<string, AnyEntity>;
  imports: ImportStatement[];
  errors?: ValidationError[];
}

export class ImportResolver {
  private parser = new DSLParser();
  private resolvedPaths = new Map<string, ParseResult>();
  private resolutionStack: string[] = [];

  resolveImports(
    imports: ImportStatement[],
    basePath: string,
  ): {
    resolvedEntities: Map<string, AnyEntity>;
    errors: ValidationError[];
  } {
    const allEntities = new Map<string, AnyEntity>();
    const errors: ValidationError[] = [];

    for (const importStmt of imports) {
      // Check for circular import before processing
      const fullPath = this.resolvePath(importStmt.path, basePath);
      if (this.resolutionStack.includes(fullPath)) {
        errors.push({
          position: importStmt.position,
          message: `Circular import detected: ${[...this.resolutionStack, fullPath].join(' -> ')}`,
          severity: 'error',
        });
        continue;
      }

      // Push to stack before resolving
      this.resolutionStack.push(fullPath);

      const result = this.resolveImport(importStmt, basePath);

      if (result.errors) {
        errors.push(...result.errors);
        this.resolutionStack.pop();
        continue;
      }

      // Apply alias prefix if specified
      const prefix = result.import.alias ? `${result.import.alias}.` : '';

      for (const [name, entity] of result.entities) {
        const prefixedName = prefix + name;

        if (allEntities.has(prefixedName)) {
          errors.push({
            position: result.import.position,
            message: `Duplicate entity name '${prefixedName}' from import`,
            severity: 'error',
            suggestion: 'Use an alias to avoid naming conflicts',
          });
        } else {
          // Clone entity with prefixed name
          const clonedEntity = { ...entity, name: prefixedName };
          allEntities.set(prefixedName, clonedEntity);
        }
      }

      // Recursively resolve nested imports
      if (result.imports.length > 0) {
        const importDir = dirname(fullPath);
        const nestedResult = this.resolveImports(result.imports, importDir);

        for (const [name, entity] of nestedResult.resolvedEntities) {
          const nestedName = prefix + name;
          if (!allEntities.has(nestedName)) {
            allEntities.set(nestedName, { ...entity, name: nestedName });
          }
        }

        errors.push(...nestedResult.errors);
      }

      // Pop from stack after all nested imports are resolved
      this.resolutionStack.pop();
    }

    return { resolvedEntities: allEntities, errors };
  }

  private resolveImport(importStmt: ImportStatement, basePath: string): ResolvedImport {
    const fullPath = this.resolvePath(importStmt.path, basePath);

    // Check if already resolved
    if (this.resolvedPaths.has(fullPath)) {
      const cached = this.resolvedPaths.get(fullPath)!;
      return {
        import: importStmt,
        entities: cached.entities,
        imports: cached.imports,
      };
    }

    try {
      // Read and parse the imported file
      const content = readFileSync(fullPath, 'utf-8');
      const parseResult = this.parser.parse(content);

      this.resolvedPaths.set(fullPath, parseResult);

      return {
        import: importStmt,
        entities: parseResult.entities,
        imports: parseResult.imports,
      };
    } catch (error) {
      return {
        import: importStmt,
        entities: new Map(),
        imports: [],
        errors: [
          {
            position: importStmt.position,
            message: `Failed to import '${importStmt.path}': ${error}`,
            severity: 'error',
          },
        ],
      };
    }
  }

  private resolvePath(importPath: string, basePath: string): string {
    if (isAbsolute(importPath)) {
      return importPath;
    }
    return resolve(basePath, importPath);
  }
}
