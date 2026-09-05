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
export { type ClassMembers, type ConstructorDeclarationNode, legacyMethodNames, type MethodDeclarationNode } from './ast/class-members.ts';
export { ClassNode } from './ast/class-node.ts';
export { ConstantsNode } from './ast/constants-node.ts';
export { DependencyNode } from './ast/dependency-node.ts';
export type { Diagnostic, DiagnosticSeverity } from './ast/diagnostic.ts';
export { DtoFieldNode, type OptionalityMarker } from './ast/dto-field-node.ts';
export { DtoNode } from './ast/dto-node.ts';
export type { EntityKind, RunParameterType, TypeDefVariant } from './ast/entity-kind.ts';
export { EntityNode, type SourceForm } from './ast/entity-node.ts';
export { FileNode } from './ast/file-node.ts';
export { FunctionNode } from './ast/function-node.ts';
export { CstNode, CstSourceFile } from './ast/gen/cst-nodes.ts';
export type { ClassHeritage, HeritageReference } from './ast/heritage-reference.ts';
export { ImportStatementNode } from './ast/import-statement-node.ts';
export { ProgramNode } from './ast/program-node.ts';
export { type QualifiedNameResolution, QualifiedNameResolver, resolvedNameTarget } from './ast/qualified-name-resolver.ts';
export { RunParameterNode } from './ast/run-parameter-node.ts';
export type { Span } from './ast/span.ts';
// RFC-TM-8 §7/Q4 (rfc-tm-8-diamond.md, X-SUPP-2) — SuppressionNode joins the
// public surface for the same reason TypeDefNode does above:
// `ParseOutcome.suppressions` is already a typed, exported field
// (pipeline/parse-outcome.ts), but until now the ELEMENT type had no path
// out of this package (no `exports` map, no ast/ barrel, per the no-barrel
// house rule) — a sibling package consuming `outcome.suppressions` could
// read the values structurally but could not name `SuppressionNode` in an
// annotation or construct one directly. TM-9's language-dependent Quantums
// are the first out-of-package consumer of this surface (Q4's frozen-surface
// handoff); export follows the established TypeDefNode/DtoFieldNode
// precedent rather than inventing a new visibility rule. RFC-TM-9 §9
// (rfc-tm-9-diamond.md, X-SUPP-6) is exactly that consumer: the converter
// builds SuppressionNode instances directly (same synthetic-construction
// posture as every other entity class above) to pass to SyntaxEmitter's
// `suppressions` field.
export { SuppressionNode } from './ast/suppression-node.ts';
// RFC-TM-8 §5 (rfc-tm-8-diamond.md, X-TYPE-7) — TypeDefNode joins the other
// ten semantic classes on the public surface, same rationale as every other
// entity class re-export above: sibling workspace packages (LSP, converter)
// need it to narrow EntityNode by `instanceof`.
export { TypeDefNode } from './ast/type-def-node.ts';
// RFC-TM-8 §2 (rfc-tm-8-diamond.md, X-TYPE-2) — DtoFieldNode's new required
// typeExpr construction argument means every out-of-package DtoFieldNode
// builder (the TM-6/TM-9 TypeScript-to-TypedMind converter,
// typescript-to-typedmind-converter.ts) needs a way to produce a TypeExprNode
// from the plain type STRING it already computes, without depending on
// tree-sitter/wasm. parseTypeExprText is exactly that — the same hand-rolled
// parser the longform `type:` quoted-string value and the readonly-array's
// parenthesized element already reuse internally — re-exported here per the
// no-barrel house rule's targeted-export precedent (index.ts is the only path
// into lib/typed-mind/src for sibling workspace packages).
export type { TypeExprNode } from './ast/type-expr-node.ts';
export type { TypeParameterNode } from './ast/type-parameter-node.ts';
export { UiComponentNode } from './ast/ui-component-node.ts';
// Historical diagnostic identifiers remain exported for compatibility.
// RFC-TM-13 C-prime preserves quotes and nested aliases, so neither fires.
export { QUOTE_SWAP_CODE, UNREPRESENTABLE_ALIAS_CODE } from './emitter/emitter-diagnostics.ts';
export { printHeritage, printTypeParameter } from './emitter/generic-declaration-emission.ts';
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
export { parseHeritageText } from './pipeline/parse-heritage-text.ts';
export type { ParseOutcome } from './pipeline/parse-outcome.ts';
export {
  type ParsedSignature,
  type ParseSignatureTextOptions,
  parseSignatureText,
  type SignatureParameter,
  type SignatureParseResult,
  type SignatureTypePosition,
} from './pipeline/parse-signature-text.ts';
export { parseTypeParameterListText, parseTypeParameterText } from './pipeline/parse-type-parameters.ts';
export { type ParseTypeExprTextOptions, type ParseTypeExprTextResult, parseTypeExprText } from './pipeline/type-expr-from-text.ts';
export { canonicalizeTypeText } from './pipeline/type-text-lexical.ts';
// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — the new primary surface (the flip's
// original new export). This is the only checker/parser entry point left —
// the legacy bridge and its DSLCheckerOptions (skipOrphanCheck/
// validateGrammar/strictMode) and checkSafe/Result box died with the facade
// (RFC-TM-4 FAQ Q4).
// RFC-TM-10 §13 (rfc-tm-10-diamond.md, D-LEG-13) — checkWithParseGate joins
// TypedMind's other public methods on this surface; the CLI (a sibling
// workspace package, @sammons/typed-mind-cli) is its only consumer today.
export { type CheckOutcome, type ParseOutput, TypedMind, type TypedMindOptions } from './typed-mind.ts';
