// RFC-TM-3 §3.1 (rfc-tm-3-diamond.md) — the CST→AST walk/attach layer. The
// CST's flat line sequence (continuations are SIBLINGS of their declarations,
// doc §1) is walked once: declarations open an entity accumulator,
// continuation lines attach to the open entity per the attachment table,
// longform blocks map their typed children, and the File→Class lookahead rule
// runs at declaration-open time. Every declaration survives into
// ParseOutcome.entities (a list — duplicates preserved, FAQ Q2). Line-loop
// state transitions replicate the legacy parser loop (parser.ts:71-133):
//   - comments (full-line and indented) and import statements keep the open
//     entity open;
//   - a longform block closes it (parser.ts:91);
//   - a new declaration replaces it;
//   - an unparsable (ERROR) region closes it UNLESS every one of its
//     non-blank/non-comment lines is continuation-shaped — legacy treats a
//     continuation-shaped line that matches no continuation as a silent no-op
//     that leaves the entity open (parser.ts:97 + GENERAL_PATTERNS.CONTINUATION),
//     and any other unmatched line as a hard reset (parser.ts:130-132).

import type { Node as SyntaxNode } from 'web-tree-sitter';
import type { Diagnostic } from '../ast/diagnostic.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import {
  CstClassfileBlockSigil,
  CstImportStatement,
  CstLongformBlock,
  type CstSourceFile,
  CstSuppressionBlock,
  CstSuppressLine,
} from '../ast/gen/cst-nodes.ts';
import { ImportStatementNode } from '../ast/import-statement-node.ts';
import type { Span } from '../ast/span.ts';
import { SuppressionNode } from '../ast/suppression-node.ts';
import { decodeQuotedString, scanQuotedString } from '../quoted-string.ts';
import { attachmentRules, illegalContinuationDiagnostic, orphanContinuationDiagnostic } from './attachment-rules.ts';
import {
  openAsset,
  openClass,
  openClassFile,
  openConstants,
  openDependency,
  openDto,
  openFileOrClassFile,
  openFunction,
  openProgram,
  openRunParameter,
  openTypeDef,
  openUiComponent,
} from './declaration-openers.ts';
import type { EntityAccumulator } from './entity-accumulator.ts';
import { buildFromClassfileBlockSigil, buildFromLongformBlock } from './longform-builder.ts';
import type { ParseOutcome } from './parse-outcome.ts';
import { tokenSpanOf } from './spans.ts';
import { collectSyntaxDiagnostics } from './syntax-diagnostics.ts';

// §3.2: every attached field group carries a real span. The semantic classes
// hold plain values (§2.2), so the per-group spans ride on these attachment
// records, which the position fixtures and TM-4's validator consume.
export interface AttachmentSpan {
  readonly entityName: string;
  readonly group: string;
  readonly span: Span;
}

export interface CstToAstResult {
  readonly outcome: ParseOutcome;
  readonly attachments: readonly AttachmentSpan[];
}

// Verbatim copy of the legacy continuation-line probe
// (parser-patterns.ts GENERAL_PATTERNS.CONTINUATION), duplicated here so the
// pipeline never imports the legacy parser modules TM-4 deletes.
const LEGACY_CONTINUATION_PATTERN = /^\s+(->|<-|~>|=>|>>|>|<|~|"|#|-|=|\$<)/;

const logicalTypeOf = (concreteType: string): string => {
  return concreteType.endsWith('_final') ? concreteType.slice(0, -'_final'.length) : concreteType;
};

export const compareDiagnosticsBySpan = (left: Diagnostic, right: Diagnostic): number => {
  if (left.span.start.line !== right.span.start.line) {
    return left.span.start.line - right.span.start.line;
  }
  return left.span.start.column - right.span.start.column;
};

const DECLARATION_OPENERS: Record<string, (syntaxNode: SyntaxNode, sourceLines: readonly string[]) => EntityAccumulator> = {
  program_declaration: (syntaxNode) => openProgram(syntaxNode),
  file_declaration: (syntaxNode, sourceLines) => openFileOrClassFile(syntaxNode, sourceLines),
  function_declaration: (syntaxNode) => openFunction(syntaxNode),
  class_declaration: (syntaxNode) => openClass(syntaxNode),
  classfile_declaration: (syntaxNode) => openClassFile(syntaxNode),
  constants_declaration: (syntaxNode) => openConstants(syntaxNode),
  dto_declaration: (syntaxNode) => openDto(syntaxNode),
  asset_declaration: (syntaxNode) => openAsset(syntaxNode),
  uicomponent_declaration: (syntaxNode) => openUiComponent(syntaxNode),
  runparameter_declaration: (syntaxNode) => openRunParameter(syntaxNode),
  dependency_declaration: (syntaxNode) => openDependency(syntaxNode),
  typedef_declaration: (syntaxNode) => openTypeDef(syntaxNode),
};

export class CstToAstWalker {
  readonly #root: CstSourceFile;
  readonly #sourceLines: readonly string[];
  readonly #entities: EntityNode[] = [];
  readonly #imports: ImportStatementNode[] = [];
  readonly #suppressions: SuppressionNode[] = [];
  readonly #diagnostics: Diagnostic[] = [];
  readonly #attachments: AttachmentSpan[] = [];
  #open: EntityAccumulator | null = null;

  constructor(root: CstSourceFile, source: string) {
    this.#root = root;
    this.#sourceLines = source.split('\n');
  }

  walk(): CstToAstResult {
    for (const lineNode of this.#root.syntaxNode.namedChildren) {
      this.#dispatch(lineNode);
    }
    this.#closeOpenEntity();
    const diagnostics = [...collectSyntaxDiagnostics(this.#root.syntaxNode), ...this.#diagnostics].sort(compareDiagnosticsBySpan);
    return {
      outcome: { entities: this.#entities, imports: this.#imports, suppressions: this.#suppressions, diagnostics },
      attachments: this.#attachments,
    };
  }

  #dispatch(lineNode: SyntaxNode): void {
    if (lineNode.type === 'ERROR') {
      this.#handleErrorRegion(lineNode);
      return;
    }
    const logicalType = logicalTypeOf(lineNode.type);
    if (logicalType === 'comment_line' || logicalType === 'entity_comment') {
      // Comments never attach and never close the open entity (parser.ts:77;
      // the CONTINUATION_PATTERNS.COMMENT arm in parseContinuation is dead
      // code — the comment skip runs first).
      return;
    }
    if (logicalType === 'import_statement') {
      this.#handleImport(lineNode);
      return;
    }
    if (logicalType === 'suppress_line') {
      this.#handleSuppressLine(lineNode);
      return;
    }
    if (logicalType === 'suppression_block') {
      this.#handleSuppressionBlock(lineNode);
      return;
    }
    if (logicalType === 'longform_block') {
      this.#handleLongform(lineNode);
      return;
    }
    if (logicalType === 'classfile_block_sigil') {
      this.#handleClassfileSigil(lineNode);
      return;
    }
    const opener = DECLARATION_OPENERS[logicalType];
    if (opener !== undefined) {
      this.#closeOpenEntity();
      this.#open = opener(lineNode, this.#sourceLines);
      return;
    }
    const rule = attachmentRules[logicalType];
    if (rule !== undefined) {
      this.#handleContinuation(logicalType, lineNode);
      return;
    }
    // Remaining named node kinds only occur nested (list entries, names,
    // strings) or as recovery fragments — nothing to do at line level.
  }

  #handleContinuation(logicalType: string, lineNode: SyntaxNode): void {
    const rule = attachmentRules[logicalType];
    if (rule === undefined) {
      return;
    }
    if (lineNode.hasError) {
      // A GLR-recovered fragment (e.g. `<= [...]`, naming-edge-cases:49,
      // recovered as contained_by_list + a nested ERROR) is not a real
      // continuation: the syntax/* mapper owns the line, and attaching the
      // fragment or double-reporting it as a semantic diagnostic would turn
      // one near-miss line into a cascade. Legacy equivalent: the line matches
      // no continuation regex and is a silent no-op (entity stays open).
      return;
    }
    const span = tokenSpanOf(lineNode);
    if (this.#open === null) {
      this.#diagnostics.push(orphanContinuationDiagnostic(rule.label, span));
      return;
    }
    if (!rule.accepts(this.#open)) {
      this.#diagnostics.push(illegalContinuationDiagnostic(rule.label, this.#open.kind, span));
      return;
    }
    rule.apply(this.#open, lineNode, span);
    this.#attachments.push({ entityName: this.#open.name, group: rule.group, span });
  }

  #handleImport(lineNode: SyntaxNode): void {
    // Import statements do not close the open entity (parser.ts:80-83).
    const statement = new CstImportStatement(lineNode);
    const headText = statement.importHeadChildren().at(0)?.text ?? '';
    const pathMatch = scanQuotedString(headText, headText.indexOf('"'));
    const alias = statement.entityNameChildren().at(0)?.text;
    this.#imports.push(
      new ImportStatementNode({
        path: pathMatch?.value ?? '',
        ...(alias !== undefined ? { alias } : {}),
        span: tokenSpanOf(lineNode),
        raw: lineNode.text.trimEnd(),
      }),
    );
  }

  // RFC-TM-8 §7 (rfc-tm-8-diamond.md) — suppression is document-level like
  // import_statement: it does NOT close the open entity (a suppress line has
  // no attachment relationship to whatever entity happens to be under
  // construction — mirroring #handleImport's precedent, not #handleLongform's
  // close-on-block precedent, since a suppression is not itself a
  // declaration).
  #handleSuppressLine(lineNode: SyntaxNode): void {
    const suppress = new CstSuppressLine(lineNode);
    const keywordText = suppress.suppressKwChildren().at(0)?.text ?? '';
    const lastKeywordCharacter = keywordText.slice(-1);
    const restText = suppress.targetField()?.text ?? '';
    const target = lastKeywordCharacter + restText;
    const code = suppress.codeField()?.text ?? '';
    const reason = suppress.reasonField()?.text ?? '';
    this.#suppressions.push(
      new SuppressionNode({
        target,
        code,
        // Strip the surrounding quotes the same way every other consumer of
        // $.string does (the token's raw text includes them).
        reason: decodeQuotedString(reason),
        span: tokenSpanOf(lineNode),
        raw: lineNode.text.trimEnd(),
      }),
    );
  }

  // Longform `suppress { ... }` — one SuppressionNode PER ENTRY (the grain
  // ruling, doc §7): a block with N entries produces N flat SuppressionNode
  // values, not one node holding N entries, so each entry's staleness is
  // independently checkable.
  #handleSuppressionBlock(lineNode: SyntaxNode): void {
    const block = new CstSuppressionBlock(lineNode);
    for (const entry of block.suppressionEntryChildren()) {
      const target = entry.targetField()?.text ?? '';
      const code = entry.codeField()?.text ?? '';
      const reason = entry.reasonField()?.text ?? '';
      this.#suppressions.push(
        new SuppressionNode({
          target,
          code,
          reason: decodeQuotedString(reason),
          span: entry.span(),
          raw: entry.syntaxNode.text.trimEnd(),
        }),
      );
    }
  }

  #handleLongform(lineNode: SyntaxNode): void {
    this.#closeOpenEntity();
    const result = buildFromLongformBlock(new CstLongformBlock(lineNode));
    if (result !== undefined) {
      this.#entities.push(result.accumulator.finalize());
      this.#diagnostics.push(...result.diagnostics);
      this.#attachments.push(...result.attachments);
    }
    // Legacy resets the open entity after a longform block (parser.ts:91).
    this.#open = null;
  }

  #handleClassfileSigil(lineNode: SyntaxNode): void {
    this.#closeOpenEntity();
    const result = buildFromClassfileBlockSigil(new CstClassfileBlockSigil(lineNode));
    this.#entities.push(result.accumulator.finalize());
    this.#diagnostics.push(...result.diagnostics);
    this.#attachments.push(...result.attachments);
    this.#open = null;
  }

  #handleErrorRegion(errorNode: SyntaxNode): void {
    // The syntax/error diagnostic itself comes from collectSyntaxDiagnostics
    // (one walk over the whole tree); this handler only replicates the legacy
    // line-loop state transition described in the module header. The probe
    // runs against the SOURCE lines the region covers, not errorNode.text:
    // the legacy pattern is anchored on leading indentation (`^\s+`), and a
    // tree-sitter ERROR node's text starts at the first token, dropping the
    // first line's indent — probing node text misreads an indented `<- []`
    // as non-continuation-shaped and wrongly closes the open entity (found by
    // the Q5 shadow substrate on the corpus's empty-list lines).
    const startLineIndex = errorNode.startPosition.row;
    const endLineIndex = errorNode.endPosition.column === 0 ? errorNode.endPosition.row - 1 : errorNode.endPosition.row;
    const coveredLines: string[] = [];
    for (let lineIndex = startLineIndex; lineIndex <= endLineIndex && lineIndex < this.#sourceLines.length; lineIndex++) {
      coveredLines.push(this.#sourceLines[lineIndex] ?? '');
    }
    const meaningfulLines = coveredLines.filter((line) => line.trim().length > 0 && !line.trim().startsWith('#'));
    const allContinuationShaped = meaningfulLines.every((line) => LEGACY_CONTINUATION_PATTERN.test(line));
    if (!allContinuationShaped) {
      this.#closeOpenEntity();
    }
  }

  #closeOpenEntity(): void {
    if (this.#open !== null) {
      this.#entities.push(this.#open.finalize());
      this.#open = null;
    }
  }
}

export const walkCstToAst = (root: CstSourceFile, source: string): CstToAstResult => {
  return new CstToAstWalker(root, source).walk();
};
