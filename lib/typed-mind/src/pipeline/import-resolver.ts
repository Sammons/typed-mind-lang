// RFC-TM-3 §3.7 (rfc-tm-3-diamond.md) — the import-resolution port
// (S-PARSE-5). Same mechanics as the legacy resolver (import-resolver.ts:14-40):
// alias prefixing, cycle detection via the resolution stack, nested resolution,
// per-instance path cache — but parsing through TypedMindParser and returning
// EntityNodes + Diagnostics (the three imports/* codes, §3.3, all error
// severity, none verdict-moving).
//
// Two port-fidelity decisions are replicated-and-noted, not silently inherited
// (doc §3.7):
//   - the top-level duplicate-name-error vs nested-import silent-skip
//     asymmetry (legacy import-resolver.ts:58-69 vs :77-82) is kept as-is: a
//     name collision among directly-imported entities is imports/duplicate-name;
//     a collision surfacing through a NESTED import is silently skipped
//     (first resolution wins, no diagnostic);
//   - the path cache is per-resolver-instance — a long-lived LSP process could
//     read stale files (flagged for TM-5, not changed here).
// A third legacy behavior rides along unchanged: an imported document's own
// parse problems are not surfaced by the resolver (the legacy regex parser had
// nothing to surface); the resolver's diagnostics are imports/* only.
//
// This module is Node-only (node:fs/node:path) BY DESIGN and is never imported
// by the pipeline core: the I-8 boundary begins here — the module graph from
// the pipeline's browser-safe entry (src/pipeline/index.ts) must not reach
// these imports (checked by browser-boundary.test.ts, both directions).

import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { Diagnostic } from '../ast/diagnostic.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { ImportStatementNode } from '../ast/import-statement-node.ts';
import type { ParseOutcome } from './parse-outcome.ts';

// The resolver consumes any per-document parser with the pipeline's parse
// shape (inject_interfaces_not_implementations): production wiring passes a
// TypedMindParser; tests may pass a counting or stubbed wrapper.
export interface DocumentParser {
  parse(source: string): ParseOutcome;
}

export interface ResolveImportsResult {
  readonly resolvedEntities: Map<string, EntityNode>;
  readonly diagnostics: Diagnostic[];
}

interface ResolvedDocument {
  readonly entities: readonly EntityNode[];
  readonly imports: readonly ImportStatementNode[];
  readonly failure: Diagnostic | undefined;
}

// Prototype-preserving replica of the legacy `{ ...entity, name: prefixedName }`
// clone (import-resolver.ts:67): every own field is copied verbatim — so a
// ClassFileNode's exports keep the ORIGINAL name, exactly as legacy — while the
// class prototype survives for instanceof narrowing. Going through the class
// constructors instead would re-run construction-time normalization (e.g. the
// ClassFile auto-self-export would append the PREFIXED name), which the legacy
// clone does not do.
const cloneWithName = <T extends EntityNode>(entity: T, name: string): T => {
  // The compiler cannot type Object.create/getPrototypeOf beyond their loose
  // lib signatures; the prototype is the entity's own class prototype and the
  // copied fields are the entity's own, so the T claims hold by construction.
  const prototype = Object.getPrototypeOf(entity) as object;
  const replica = Object.create(prototype) as T;
  return Object.assign(replica, entity, { name });
};

// ParseOutcome.entities is a duplicate-preserving list (§3.1); the resolver
// merges by NAME, so each imported document projects to the legacy Map view
// first — insertion-order last-wins, replicating parser.ts:122.
const lastWinsByName = (entities: readonly EntityNode[]): Map<string, EntityNode> => {
  const byName = new Map<string, EntityNode>();
  for (const entity of entities) {
    byName.set(entity.name, entity);
  }
  return byName;
};

export class ImportResolver {
  readonly #parser: DocumentParser;
  // Per-resolver-instance cache, port-fidelity decision two (doc §3.7).
  readonly #resolvedPaths = new Map<string, ParseOutcome>();
  readonly #resolutionStack: string[] = [];

  constructor(parser: DocumentParser) {
    this.#parser = parser;
  }

  resolveImports(imports: readonly ImportStatementNode[], basePath: string): ResolveImportsResult {
    const resolvedEntities = new Map<string, EntityNode>();
    const diagnostics: Diagnostic[] = [];

    for (const importStatement of imports) {
      const fullPath = this.#resolvePath(importStatement.path, basePath);
      if (this.#resolutionStack.includes(fullPath)) {
        diagnostics.push({
          code: 'imports/circular',
          severity: 'error',
          span: importStatement.span,
          message: `Circular import detected: ${[...this.#resolutionStack, fullPath].join(' -> ')}`,
        });
        continue;
      }

      this.#resolutionStack.push(fullPath);
      const document = this.#resolveDocument(importStatement, fullPath);
      if (document.failure !== undefined) {
        diagnostics.push(document.failure);
        this.#resolutionStack.pop();
        continue;
      }

      const prefix = importStatement.alias === undefined ? '' : `${importStatement.alias}.`;
      for (const [name, entity] of lastWinsByName(document.entities)) {
        const prefixedName = prefix + name;
        if (resolvedEntities.has(prefixedName)) {
          // Port-fidelity decision one, top-level half: direct collisions error
          // (legacy import-resolver.ts:58-64; suggestion folded into message).
          diagnostics.push({
            code: 'imports/duplicate-name',
            severity: 'error',
            span: importStatement.span,
            message: `Duplicate entity name '${prefixedName}' from import; use an alias to avoid naming conflicts`,
          });
        } else {
          resolvedEntities.set(prefixedName, cloneWithName(entity, prefixedName));
        }
      }

      if (document.imports.length > 0) {
        const nested = this.resolveImports(document.imports, dirname(fullPath));
        for (const [name, entity] of nested.resolvedEntities) {
          const nestedName = prefix + name;
          // Port-fidelity decision one, nested half: silent skip — first
          // resolution wins, no diagnostic (legacy import-resolver.ts:77-82).
          if (!resolvedEntities.has(nestedName)) {
            resolvedEntities.set(nestedName, cloneWithName(entity, nestedName));
          }
        }
        diagnostics.push(...nested.diagnostics);
      }

      this.#resolutionStack.pop();
    }

    return { resolvedEntities, diagnostics };
  }

  #resolveDocument(importStatement: ImportStatementNode, fullPath: string): ResolvedDocument {
    const cached = this.#resolvedPaths.get(fullPath);
    if (cached !== undefined) {
      return { entities: cached.entities, imports: cached.imports, failure: undefined };
    }
    let content: string;
    try {
      content = readFileSync(fullPath, 'utf-8');
    } catch (error: unknown) {
      return {
        entities: [],
        imports: [],
        failure: {
          code: 'imports/read-failure',
          severity: 'error',
          span: importStatement.span,
          // String(error) replicates the legacy `${error}` interpolation
          // (import-resolver.ts:127) — the message carries the fs error text.
          message: `Failed to import '${importStatement.path}': ${String(error)}`,
        },
      };
    }
    const outcome = this.#parser.parse(content);
    this.#resolvedPaths.set(fullPath, outcome);
    return { entities: outcome.entities, imports: outcome.imports, failure: undefined };
  }

  #resolvePath(importPath: string, basePath: string): string {
    if (isAbsolute(importPath)) {
      return importPath;
    }
    return resolve(basePath, importPath);
  }
}
