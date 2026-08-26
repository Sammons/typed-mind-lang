// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — the new primary surface. `TypedMind.create()`
// is the single async construction seam every consumer of the new pipeline goes
// through: it awaits the wasm-backed TypedMindParser once, then hands back a
// facade whose methods are synchronous. The entity container changes shape
// exactly once here (Map -> list, per ParseOutcome.entities, doc §3) — this is
// the only place S-CORE-3 touches container shape; the legacy bridge (index.ts)
// keeps the Map-shaped ParseResult unchanged for its three named consumers.

import { dirname } from 'node:path';
import type { Diagnostic } from './ast/diagnostic.ts';
import type { EntityNode } from './ast/entity-node.ts';
import type { CstSourceFile } from './ast/gen/cst-nodes.ts';
import { AstValidator } from './checker/ast-validator.ts';
import { toDiagnostics } from './checker/finding.ts';
import { detectFormat, type FormatDetectionResult } from './emitter/detect-format.ts';
import { SyntaxEmitter } from './emitter/syntax-emitter.ts';
import { ImportResolver } from './pipeline/import-resolver.ts';
import { computeLinks, type LinkIndex } from './pipeline/link-index.ts';
import type { ParseOutcome } from './pipeline/parse-outcome.ts';
import { TypedMindParser, type TypedMindParserOptions } from './pipeline/typed-mind-parser.ts';

export interface TypedMindOptions extends TypedMindParserOptions {
  readonly skipOrphanCheck?: boolean;
}

export interface CheckOutcome {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

export type ParseOutput = ParseOutcome & { readonly links: LinkIndex };

// RFC-TM-3 §3.7 / RFC-TM-4 §3 — `filePath` is the seat for cross-file
// `@import "path"` resolution on the new surface (this was the unwired half
// of the signature; see the PR #34 review finding this Quantum fixes).
// Mirrors the legacy facade (DSLChecker.parse/check(input, filePath)):
// resolution runs ONLY when a filePath is supplied AND the document has
// imports; a bare `parse(source)` / `check(source)` call stays single-document
// (no filesystem access), matching legacy's `if (parseResult.imports.length >
// 0 && filePath)` gate (index.ts:140,196).
//
// Merge semantics replicate the shadow-verdict harness's `runNew` (the
// equivalence-proven reference implementation, scripts/shadow-verdict-harness.mjs):
// imported entities are APPENDED to the duplicate-preserving ParseOutcome.entities
// list (not merged last-wins-if-absent, per the harness's own doc comment
// "the pipeline ImportResolver merge (appended to the duplicate-preserving
// list; the facade conflict error folds into the duplicate-name check, §1)").
// A local entity colliding by name with an imported one is therefore reported
// once by the originated `checker/duplicate-name` check (which walks the full
// entities list) instead of the legacy `check()`-only "Entity 'X' conflicts
// with imported entity" error (index.ts:118, folded per rfc-tm-4-diamond.md §1
// "Originated, not ported" / the A6 amendment row). Resolver diagnostics
// (`imports/circular`, `imports/read-failure`, `imports/duplicate-name`) are
// appended to `diagnostics` unconditionally.
const resolveImportsInto = (parser: TypedMindParser, outcome: ParseOutcome, filePath: string | undefined): ParseOutcome => {
  if (filePath === undefined || outcome.imports.length === 0) {
    return outcome;
  }
  const resolver = new ImportResolver(parser);
  const { resolvedEntities, diagnostics: importDiagnostics } = resolver.resolveImports(outcome.imports, dirname(filePath));
  const entities: readonly EntityNode[] = [...outcome.entities, ...resolvedEntities.values()];
  const diagnostics: readonly Diagnostic[] = [...outcome.diagnostics, ...importDiagnostics];
  return { entities, imports: outcome.imports, diagnostics };
};

export class TypedMind {
  readonly #parser: TypedMindParser;
  readonly #validator: AstValidator;
  readonly #emitter = new SyntaxEmitter();

  private constructor(parser: TypedMindParser, validator: AstValidator) {
    this.#parser = parser;
    this.#validator = validator;
  }

  static async create(options: TypedMindOptions = {}): Promise<TypedMind> {
    const parser = await TypedMindParser.create(options);
    const validator = new AstValidator(options.skipOrphanCheck === undefined ? {} : { skipOrphanCheck: options.skipOrphanCheck });
    return new TypedMind(parser, validator);
  }

  parse(source: string, filePath?: string): ParseOutput {
    const outcome = resolveImportsInto(this.#parser, this.#parser.parse(source), filePath);
    const links = computeLinks(outcome.entities);
    return { ...outcome, links };
  }

  // RFC-TM-5 §1 (rfc-tm-5-diamond.md) — the `parseWithCst` facade extension.
  // Consumers that need the CST (the LSP's NameOccurrenceIndex) get it plus
  // the same links every other new-surface consumer sees, from ONE parse: the
  // TypedMindParser shares its single walked tree between the AST outcome and
  // the returned CST (see typed-mind-parser.ts#parseWithCst). Import
  // resolution merges entities/diagnostics the same way as parse()/check();
  // the returned `cst` stays THIS document's own tree (imported documents are
  // parsed by the resolver via the plain `parse()` DocumentParser contract,
  // never via parseWithCst, so no imported CST exists to attach here).
  parseWithCst(source: string, filePath?: string): ParseOutput & { readonly cst: CstSourceFile } {
    const outcome = this.#parser.parseWithCst(source);
    const merged = resolveImportsInto(this.#parser, outcome, filePath);
    const links = computeLinks(merged.entities);
    return { ...merged, links, cst: outcome.cst };
  }

  check(source: string, filePath?: string): CheckOutcome {
    const outcome = resolveImportsInto(this.#parser, this.#parser.parse(source), filePath);
    const links = computeLinks(outcome.entities);
    const { findings } = this.#validator.validate(outcome, links);
    const diagnostics = [...outcome.diagnostics, ...toDiagnostics(findings)];
    const valid = diagnostics.every((diagnostic) => diagnostic.severity !== 'error');
    return { valid, diagnostics };
  }

  emitShortform(source: string): string {
    const outcome = this.#parser.parse(source);
    return this.#emitter.emitShortform(outcome);
  }

  emitLongform(source: string): string {
    const outcome = this.#parser.parse(source);
    return this.#emitter.emitLongform(outcome);
  }

  toggleFormat(source: string): string {
    const outcome = this.#parser.parse(source);
    const { format } = detectFormat(source);
    return this.#emitter.toggleFormat(outcome, format);
  }

  detectFormat(source: string): FormatDetectionResult {
    return detectFormat(source);
  }
}
