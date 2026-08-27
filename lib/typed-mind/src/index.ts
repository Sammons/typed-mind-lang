// RFC-TM-4 §5 (rfc-tm-4-diamond.md) — Q5 terminal sweep. The legacy bridge
// (DSLChecker/DSLParser/DSLValidator/SyntaxGenerator/AnyEntity/ProgramGraph/
// the Map-shaped ParseResult/the legacy type surface/checkSafe+Result) is
// deleted now that TM-5 (LSP) and TM-6 (converter, renderer) have both
// migrated off it. This file is the new-surface-only public entry point.

// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — new-surface type/class re-exports the
// parseWithCst leaf needs to be consumable outside this package: the LSP
// (@sammons/typed-mind-lsp) is a sibling workspace package with no path into
// lib/typed-mind/src other than what index.ts exports (no `exports` map, no
// ast/ barrel per the no-barrel house rule). Enabling substrate for the
// parseWithCst leaf, not new logic — every symbol below already ships and is
// tested by RFC-TM-3/4.
export { AssetNode } from './ast/asset-node.ts';
export { ClassFileNode } from './ast/class-file-node.ts';
export { ClassNode } from './ast/class-node.ts';
export { ConstantsNode } from './ast/constants-node.ts';
export { DependencyNode } from './ast/dependency-node.ts';
export type { Diagnostic, DiagnosticSeverity } from './ast/diagnostic.ts';
export { DtoFieldNode, type OptionalityMarker } from './ast/dto-field-node.ts';
export { DtoNode } from './ast/dto-node.ts';
export type { EntityKind, RunParameterType } from './ast/entity-kind.ts';
export { EntityNode, type SourceForm } from './ast/entity-node.ts';
export { FileNode } from './ast/file-node.ts';
export { FunctionNode } from './ast/function-node.ts';
export { CstNode, CstSourceFile } from './ast/gen/cst-nodes.ts';
export { ImportStatementNode } from './ast/import-statement-node.ts';
export { ProgramNode } from './ast/program-node.ts';
export { RunParameterNode } from './ast/run-parameter-node.ts';
export type { Span } from './ast/span.ts';
export { UiComponentNode } from './ast/ui-component-node.ts';
// RFC-TM-6 §3 (rfc-tm-6-diamond.md) — the TypeScript converter builds a
// synthetic ParseOutcome directly (it never runs source through the parser),
// so it needs SyntaxEmitter itself rather than going through TypedMind's
// source-string-only emit* methods. Re-exported here because index.ts is the
// only path into lib/typed-mind/src for sibling workspace packages (no
// `exports` map, no ast/ barrel, per the no-barrel house rule).
export { type EmitOptions, SyntaxEmitter } from './emitter/syntax-emitter.ts';
// Renamed on export: the legacy bridge exported `Reference` (types.ts, now
// deleted) with a different shape (from/type/to/position) — LinkIndex's
// Reference (from/fromType, link-index.ts) is the new-surface type and no
// longer needs the rename to avoid a collision, but the exported name stays
// `LinkReference` for call-site stability.
export { LinkIndex, type Reference as LinkReference } from './pipeline/link-index.ts';
export type { ParseOutcome } from './pipeline/parse-outcome.ts';
// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — the new primary surface (the flip's
// original new export). This is the only checker/parser entry point left —
// the legacy bridge and its DSLCheckerOptions (skipOrphanCheck/
// validateGrammar/strictMode) and checkSafe/Result box died with the facade
// (RFC-TM-4 FAQ Q4).
export { type CheckOutcome, type ParseOutput, TypedMind, type TypedMindOptions } from './typed-mind.ts';
