// RFC-TM-3 §3.1 (rfc-tm-3-diamond.md) — the async tree-sitter parser factory.
// Q1 delivered creation + wasm resolution + the wrapped CST root (parseCst);
// Q3 adds the CST→AST walk/attach layer: parse(source) returns ParseOutcome.

import { Language, Parser } from 'web-tree-sitter';
import { CstSourceFile } from '../ast/gen/cst-nodes.ts';
import { walkCstToAst } from './cst-to-ast.ts';
import type { ParseOutcome } from './parse-outcome.ts';

export interface TypedMindParserOptions {
  readonly wasmPath?: string;
  readonly wasmBytes?: Uint8Array;
}

// Default wasm resolution is __dirname-relative in the compiled CommonJS
// output (doc §3.1/§4). Candidates, in order, both rooted at the package dir:
//   - in-repo: dist/pipeline → ../../grammar/grammar.wasm (built by the
//     package's pretest step, gitignored);
//   - published: the files manifest ships grammar.wasm alongside dist/ at the
//     TM-4/S-CORE-3 publish → ../../grammar.wasm.
// Everything else (type-stripped src execution, browser bundles — the TM-7
// contract) passes { wasmPath } or { wasmBytes } explicitly.
const resolveDefaultWasmPath = () => {
  if (typeof __dirname !== 'string' || typeof require !== 'function') {
    throw new Error(
      'TypedMindParser.create(): default grammar.wasm resolution is __dirname-relative and only works from the compiled CommonJS output; pass { wasmPath } or { wasmBytes }',
    );
  }
  // Lazy require keeps node:path/node:fs out of this module's static import
  // graph — the pipeline's browser-safe entry must never reach them (doc §3.7,
  // the I-8 precursor); the requires only execute on the Node/CJS default path.
  const nodePath: typeof import('node:path') = require('node:path');
  const nodeFs: typeof import('node:fs') = require('node:fs');
  const candidates = [
    nodePath.join(__dirname, '..', '..', 'grammar', 'grammar.wasm'),
    nodePath.join(__dirname, '..', '..', 'grammar.wasm'),
  ];
  for (const candidate of candidates) {
    if (nodeFs.existsSync(candidate)) {
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
    await Parser.init();
    const wasmSource = options.wasmBytes ?? options.wasmPath ?? resolveDefaultWasmPath();
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
  // ParseOutcome.diagnostics, never as throws (§3.3).
  parse(source: string): ParseOutcome {
    return walkCstToAst(this.parseCst(source), source).outcome;
  }
}
