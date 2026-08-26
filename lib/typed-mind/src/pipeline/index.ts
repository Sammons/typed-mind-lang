// RFC-TM-3 §3.7 (rfc-tm-3-diamond.md) — the pipeline's BROWSER-SAFE entry and
// the root of the I-8 module-boundary check: the static import graph reachable
// from this file must never touch node:fs/node:path (browser-boundary.test.ts
// walks it in both directions). The Node-only ImportResolver
// (./import-resolver.ts) is deliberately NOT exported here — Node consumers
// import it by path. This is the doc-mandated boundary entry, not a general
// re-export barrel (the no-barrel house rule yields to the doc's named
// artifact); it exports exactly the pipeline chain, and the semantic AST
// classes ride its type graph.

export { type AttachmentSpan, type CstToAstResult, compareDiagnosticsBySpan, walkCstToAst } from './cst-to-ast.ts';
export { distributeForwardSemantics } from './forward-semantics.ts';
export { computeLinks, LinkIndex, type LinkIndexMaps, type Reference } from './link-index.ts';
export type { ParseOutcome } from './parse-outcome.ts';
export { TypedMindParser, type TypedMindParserOptions } from './typed-mind-parser.ts';
