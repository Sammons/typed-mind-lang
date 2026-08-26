// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — the new primary surface. `TypedMind.create()`
// is the single async construction seam every consumer of the new pipeline goes
// through: it awaits the wasm-backed TypedMindParser once, then hands back a
// facade whose methods are synchronous. The entity container changes shape
// exactly once here (Map -> list, per ParseOutcome.entities, doc §3) — this is
// the only place S-CORE-3 touches container shape; the legacy bridge (index.ts)
// keeps the Map-shaped ParseResult unchanged for its three named consumers.

import type { Diagnostic } from './ast/diagnostic.ts';
import { AstValidator } from './checker/ast-validator.ts';
import { toDiagnostics } from './checker/finding.ts';
import { detectFormat, type FormatDetectionResult } from './emitter/detect-format.ts';
import { SyntaxEmitter } from './emitter/syntax-emitter.ts';
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

// `filePath` rides both methods' signatures for parity with the legacy facade
// (DSLChecker.parse/check(input, filePath)) and as the seat for a future
// cross-file @import resolution pass on the new surface — RFC-TM-4 §3 does not
// name that as Q3 scope (checkImports, ported in Q1, validates in-document
// entity-name imports only; cross-file @import "path" resolution is a
// separate, unbound concern with no check binding here), so filePath is
// accepted and currently unused rather than silently wired to a mechanism this
// Quantum was never scoped to port.

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
    const outcome = this.#parser.parse(source);
    const links = computeLinks(outcome.entities);
    void filePath;
    return { ...outcome, links };
  }

  check(source: string, filePath?: string): CheckOutcome {
    void filePath;
    const outcome = this.#parser.parse(source);
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
