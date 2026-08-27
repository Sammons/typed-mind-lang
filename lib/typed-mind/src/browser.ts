// RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1) — the browser-safe facade.
// This is the entry point tsconfig.browser.json emits to dist-browser/ and
// the playground's module script imports. It exposes the same TypedMind
// shape (create/parse/check) the CLI and the Node facade (typed-mind.ts)
// expose, but composes TypedMindParser + AstValidator + computeLinks
// directly instead of importing typed-mind.ts: that file statically imports
// `node:path` (for the file-based @import resolution path) and
// pipeline/import-resolver.ts (which statically imports node:fs/node:path).
// Neither import is excludable from typed-mind.ts's own module graph without
// editing that file, and file-based cross-document import resolution has no
// meaning in a browser (no filesystem to resolve against) — so this facade
// omits it rather than dragging Node builtins into the I-8-checked graph.
// Every class this file imports (TypedMindParser, AstValidator, LinkIndex,
// the checker/finding helpers) is already proven browser-safe by the I-8
// precursor (pipeline/index.ts + browser-boundary.test.ts): their own static
// import graphs reach no node:fs/node:path.
//
// Same composition pattern as the CLI (cli.ts) and the examples-inventory
// golden harness (examples-inventory-goldens.test.ts) minus import
// resolution — those two call sites are the reference for what this facade
// must reproduce.

import type { Diagnostic } from './ast/diagnostic.ts';
import { AstValidator } from './checker/ast-validator.ts';
import { toDiagnostics } from './checker/finding.ts';
import { computeLinks, type LinkIndex } from './pipeline/link-index.ts';
import type { ParseOutcome } from './pipeline/parse-outcome.ts';
import { TypedMindParser, type TypedMindParserOptions } from './pipeline/typed-mind-parser.ts';

export interface TypedMindBrowserOptions extends TypedMindParserOptions {
  readonly skipOrphanCheck?: boolean;
}

export interface CheckOutcome {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

export type ParseOutput = ParseOutcome & { readonly links: LinkIndex };

// Browser-safe TypedMind facade: no filePath parameter (no filesystem to
// resolve @import against in a browser), otherwise the same parse()/check()
// contract as the Node facade (typed-mind.ts).
export class TypedMindBrowser {
  readonly #parser: TypedMindParser;
  readonly #validator: AstValidator;

  private constructor(parser: TypedMindParser, validator: AstValidator) {
    this.#parser = parser;
    this.#validator = validator;
  }

  static async create(options: TypedMindBrowserOptions = {}): Promise<TypedMindBrowser> {
    const parser = await TypedMindParser.create(options);
    const validator = new AstValidator(options.skipOrphanCheck === undefined ? {} : { skipOrphanCheck: options.skipOrphanCheck });
    return new TypedMindBrowser(parser, validator);
  }

  parse(source: string): ParseOutput {
    const outcome = this.#parser.parse(source);
    const links = computeLinks(outcome.entities);
    return { ...outcome, links };
  }

  check(source: string): CheckOutcome {
    const outcome = this.#parser.parse(source);
    const links = computeLinks(outcome.entities);
    const { findings } = this.#validator.validate(outcome, links);
    const diagnostics = [...outcome.diagnostics, ...toDiagnostics(findings)];
    const valid = diagnostics.every((diagnostic) => diagnostic.severity !== 'error');
    return { valid, diagnostics };
  }
}
