// RFC-TM-3 §3.1 (rfc-tm-3-diamond.md) — the async tree-sitter parser factory.
// Q1 delivered creation + wasm resolution + the wrapped CST root (parseCst);
// Q3 adds the CST→AST walk/attach layer: parse(source) returns ParseOutcome.

import { Language, Parser } from 'web-tree-sitter';
import { CstSourceFile } from '../ast/gen/cst-nodes.ts';
import { compareDiagnosticsBySpan, walkCstToAst } from './cst-to-ast.ts';
import { distributeForwardSemantics } from './forward-semantics.ts';
import type { ParseOutcome } from './parse-outcome.ts';

export interface TypedMindParserOptions {
  readonly wasmPath?: string;
  readonly wasmBytes?: Uint8Array;
  // RFC-TM-5 §2 (rfc-tm-5-diamond.md) — the primary mechanism for locating
  // web-tree-sitter's own emscripten runtime wasm (distinct from
  // grammar.wasm, the language). The glue's findWasmBinary() calls
  // Module["locateFile"]("web-tree-sitter.wasm") when a locateFile hook is
  // present (web-tree-sitter@0.26.13, web-tree-sitter.js:1707-1712), falling
  // back to a same-directory URL resolution otherwise — that fallback breaks
  // once the glue is bundled into a different directory layout (a bundled
  // cli.js is not adjacent to node_modules/web-tree-sitter/). When set, this
  // path is handed to web-tree-sitter's own Parser.init({ locateFile }) below.
  readonly runtimeWasmPath?: string;
}

// Default wasm resolution uses import.meta.url to locate the grammar.wasm
// relative to this module's filesystem position. Candidates, in order, both
// rooted at the package dir:
//   - in-repo: src/pipeline → ../../grammar/grammar.wasm (built by the
//     package's pretest step, gitignored);
//   - published: the files manifest ships grammar.wasm alongside dist/ at the
//     TM-4/S-CORE-3 publish → ../../grammar.wasm.
// Everything else (type-stripped src execution, browser bundles — the TM-7
// contract) passes { wasmPath } or { wasmBytes } explicitly.
const resolveDefaultWasmPath = async () => {
  if (typeof import.meta.url !== 'string') {
    throw new Error(
      'TypedMindParser.create(): default grammar.wasm resolution requires import.meta.url; pass { wasmPath } or { wasmBytes }',
    );
  }
  // Dynamic import keeps node:path/node:fs/node:url out of this module's
  // static import graph — the pipeline's browser-safe entry must never reach
  // them. The imports only execute on the Node default path.
  const { fileURLToPath } = await import('node:url');
  const { join, dirname } = await import('node:path');
  const { existsSync } = await import('node:fs');
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(thisDir, '..', '..', 'grammar', 'grammar.wasm'), join(thisDir, '..', '..', 'grammar.wasm')];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `TypedMindParser.create(): grammar.wasm not found at ${candidates.join(' or ')} — run the package's pretest wasm build (pnpm test) or pass { wasmPath }/{ wasmBytes }`,
  );
};

export class TypedMindParser {
  // Explicit field assignment: parameter properties are non-erasable syntax
  // and break Node's strip-only execution of the src tree.
  readonly #parser: Parser;

  private constructor(parser: Parser) {
    this.#parser = parser;
  }

  static async create(options: TypedMindParserOptions = {}) {
    // RFC-TM-5 §2 — when runtimeWasmPath is supplied, wire it through
    // Parser.init's locateFile hook so web-tree-sitter's own
    // findWasmBinary() resolves its runtime wasm from an explicit path
    // instead of a same-directory URL guess. Zero-arg Parser.init() (today's
    // behavior) is preserved when the option is absent.
    if (options.runtimeWasmPath === undefined) {
      await Parser.init();
    } else {
      const runtimeWasmPath = options.runtimeWasmPath;
      await Parser.init({ locateFile: () => runtimeWasmPath });
    }
    const wasmSource = options.wasmBytes ?? options.wasmPath ?? (await resolveDefaultWasmPath());
    const language = await Language.load(wasmSource);
    const parser = new Parser();
    parser.setLanguage(language);
    return new TypedMindParser(parser);
  }

  // The CST-level entry: the wrapped tree root, no semantic interpretation.
  parseCst(source: string): CstSourceFile {
    const tree = this.#parser.parse(source);
    if (tree === null) {
      // Invariant violation: web-tree-sitter returns null only when no language
      // is set or a progress callback cancels the parse; neither path exists
      // through this class.
      throw new Error('TypedMindParser.parseCst(): tree-sitter returned no tree');
    }
    return new CstSourceFile(tree.rootNode);
  }

  // §3.1: the pipeline entry. Always tolerant — parse problems land in
  // ParseOutcome.diagnostics, never as throws (§3.3). The Q4 forward-semantics
  // phase (§3.4) runs here, per document and BEFORE any import merge — the
  // pinned legacy ordering quirk (index.ts:104-127): an import-satisfied
  // dependency is never distributed yet never errored.
  parse(source: string): ParseOutcome {
    return this.#parseFromCst(this.parseCst(source), source);
  }

  // RFC-TM-5 §1 (rfc-tm-5-diamond.md) — the `parseWithCst` facade extension.
  // Parses the CST exactly once and walks it exactly once, sharing that single
  // tree between the AST outcome and the returned CST — the Rejected
  // Alternatives entry this doc names ("a second TypedMindParser instance or a
  // re-parse") is exactly what this shared-tree shape avoids: one wasm-backed
  // parse per document version, not two. ParseOutcome's frozen shape is
  // untouched; this is a new method with a widened return on a new surface.
  parseWithCst(source: string): ParseOutcome & { readonly cst: CstSourceFile } {
    const cst = this.parseCst(source);
    const outcome = this.#parseFromCst(cst, source);
    return { ...outcome, cst };
  }

  // Shared parse-CST-once-then-walk core: both parse() and parseWithCst() walk
  // the SAME already-produced CstSourceFile rather than each re-parsing.
  #parseFromCst(cst: CstSourceFile, source: string): ParseOutcome {
    const walked = walkCstToAst(cst, source).outcome;
    const entities = [...walked.entities];
    const semanticDiagnostics = distributeForwardSemantics(entities);
    const diagnostics = [...walked.diagnostics, ...semanticDiagnostics].sort(compareDiagnosticsBySpan);
    return { entities, imports: walked.imports, suppressions: walked.suppressions, diagnostics };
  }
}
