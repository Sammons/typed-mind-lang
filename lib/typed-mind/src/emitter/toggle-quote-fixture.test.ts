// toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/typedmind/
// toggle-fidelity-audit-2026-08-31.md) — a bucket-a mechanical emitter bug
// found by extending the round-trip audit past corpus-only coverage: the
// grammar's `string` token is `/"[^"\n]*"/` (grammar.js, no escape
// production for an embedded double quote — same lexical constraint issue
// #113 already documents at the EXTRACTION-PIPELINE layer,
// typescript-to-typedmind-converter.ts's escapeDescriptionQuotes). Every
// description/purpose/reason emission site in emit-shortform.ts/
// emit-longform.ts/emit-suppression.ts wraps raw text in a bare `"${text}"`
// template with no equivalent escaping, so every entity whose comment/purpose/
// reason legitimately contains a literal `"` (achievable today via every AST
// field a caller can set without going through the CLI's own text grammar —
// a future authoring surface, an LSP code action, or an entity carrying such
// text from an upstream tool) breaks the emitted string's own closing quote
// on emission, corrupting every token after it on that line.
//
// This is a DIFFERENT mechanism from issue #103 (GLR precedence race
// committing to the wrong block_property alternative): this is a pure
// lexical gap — the string token has no escape sequence at all, so no
// alternative production could recover the intended text either. The fix
// mirrors #113's own resolution: apply the same meaning-preserving
// substitution (`"` -> `'`, not excluded by the string token) at the
// emitter's quoting choke point (quoteStringLiteral, print-type-expr.ts).
//
// The second describe block below documents a RELATED but narrower finding:
// one specific call site (TypeDef's aliasType, emit-longform.ts's
// typeDefToLongform) canNOT take the same `"` -> `'` fix without a semantic
// regression, because its printed text gets reparsed as a structured
// TypeExprNode rather than kept as opaque free text — see that block's
// comment for the full analysis. It is a bucket-b (design gap) finding,
// filed as an issue #103 addendum, not a bucket-a fix.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DtoNode } from '../ast/dto-node.ts';
import { SuppressionNode } from '../ast/suppression-node.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { emitLongform as emitLongformEntity } from './emit-longform.ts';
import { emitShortform as emitShortformEntity } from './emit-shortform.ts';
import { suppressionsToLongformBlock, suppressionToShortformLine } from './emit-suppression.ts';
import { QUOTE_SWAP_CODE } from './emitter-diagnostics.ts';
import { SyntaxEmitter } from './syntax-emitter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

const SPAN = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

describe('bucket-a: embedded double-quote in description/purpose/reason breaks emission (no grammar escape production)', () => {
  it('DTO purpose containing a literal quote no longer desyncs shortform emission', () => {
    const dto = new DtoNode({
      name: 'Foo',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      purpose: 'a "quoted" phrase',
      fields: [],
    });
    const lines = emitShortformEntity(dto);
    const emitted = lines.join('\n');
    // Exactly one open/close quote pair around the purpose text: no stray
    // unescaped `"` reaches the emitted line.
    const quoteCount = (emitted.match(/"/g) ?? []).length;
    assert.equal(quoteCount, 2, `expected exactly one quote pair, got: ${emitted}`);
  });

  it('DTO purpose containing a literal quote no longer desyncs longform emission', () => {
    const dto = new DtoNode({
      name: 'Foo',
      span: SPAN,
      raw: '',
      sourceForm: 'longform',
      purpose: 'a "quoted" phrase',
      fields: [],
    });
    const lines = emitLongformEntity(dto);
    // DtoNode has no `comment` here, only `purpose` — descriptionAndPurposeLines
    // (emit-longform.ts) emits a `description:` line for this shape (comment
    // undefined, purpose defined): `description:` sets both comment and
    // purpose identically on reparse, closing the toggle round-trip gap
    // where a `purpose:`-only spelling used to lose `comment` on a bounce
    // through shortform (see that function's own comment for the full
    // toggle-fidelity-audit analysis).
    const descriptionLine = lines.find((line) => line.trim().startsWith('description:'));
    assert.notEqual(descriptionLine, undefined);
    const quoteCount = ((descriptionLine ?? '').match(/"/g) ?? []).length;
    assert.equal(quoteCount, 2, `expected exactly one quote pair on the description line, got: ${lines.join('\n')}`);
  });

  it('a suppression reason containing a literal quote emits with balanced quoting (shortform)', () => {
    const suppression = new SuppressionNode({
      target: 'Foo',
      code: 'checker/orphaned-entity',
      reason: 'flagged as "intentional" for now',
      span: SPAN,
      raw: '',
    });
    const line = suppressionToShortformLine(suppression);
    const quoteCount = (line.match(/"/g) ?? []).length;
    assert.equal(quoteCount, 2, `expected exactly one quote pair, got: ${line}`);
  });

  it('a suppression reason containing a literal quote emits with balanced quoting (longform block)', () => {
    const suppression = new SuppressionNode({
      target: 'Foo',
      code: 'checker/orphaned-entity',
      reason: 'flagged as "intentional" for now',
      span: SPAN,
      raw: '',
    });
    const blockLines = suppressionsToLongformBlock([suppression]);
    const entryLine = blockLines[1] ?? '';
    const quoteCount = (entryLine.match(/"/g) ?? []).length;
    assert.equal(quoteCount, 2, `expected exactly one quote pair, got: ${blockLines.join('\n')}`);
  });

  it('the fixed emission reparses with zero syntax/* diagnostics (parse-clean bar, matching issue #113 test shape)', async () => {
    const parser = await TypedMindParser.create({ wasmPath });
    const dto = new DtoNode({
      name: 'Foo',
      span: SPAN,
      raw: '',
      sourceForm: 'longform',
      purpose: 'a "quoted" phrase, and another "one" too',
      fields: [],
    });
    const longform = emitLongformEntity(dto).join('\n');
    const reparsed = parser.parse(longform);
    const syntaxDiagnostics = reparsed.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
    assert.deepEqual(syntaxDiagnostics, [], `expected zero syntax/* diagnostics, got: ${JSON.stringify(reparsed.diagnostics)}`);
    assert.equal(reparsed.entities.length, 1);
  });
});

describe('bucket-b (issue #103 addendum, NOT fixed): TypeDef alias containing a string-literal member breaks longform emission', () => {
  it("documents the known gap: quoteStringLiteral is deliberately NOT applied to typeDefToLongform's alias branch", async () => {
    // See emit-longform.ts's typeDefToLongform comment for the full
    // analysis. Two things are simultaneously true here, both load-bearing:
    //
    // 1. This IS the same block_property GLR-precedence race issue #103
    //    documents — property_string commits to the first embedded `"..."`
    //    and ERRORs on the remainder — just reached via TypeDef's
    //    `type: "..."` quoting wrapper instead of a raw unquoted signature.
    // 2. Unlike every OTHER quoteStringLiteral call site in this module, a
    //    `"` -> `'` substitution fix is NOT safe here: type-expr-from-text.ts's
    //    parseStringLiteral only recognizes `"`, so swapping the inner
    //    quotes to `'` would silently degrade a `literal`/literalKind:'string'
    //    TypeExprNode member to an `opaque` leaf on reparse — a real
    //    semantic change the checker can observe (check-dto-fields.ts:181
    //    branches on literalKind === 'string'), not a safe byte-for-byte
    //    substitution the way a free-text description/purpose/reason is.
    //
    // This test is a documented-gap regression guard: it asserts the KNOWN
    // failure still reproduces exactly as described, so a future change
    // that alters this behavior (for better or worse) shows up as a test
    // failure requiring a conscious decision, not a silent drift.
    const parser = await TypedMindParser.create({ wasmPath });
    const outcome = parser.parse('Status = "active" | "inactive"\n');
    const { SyntaxEmitter } = await import('./syntax-emitter.ts');
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform(outcome);
    const reparsed = parser.parse(longform);
    const syntaxDiagnostics = reparsed.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
    assert.equal(
      syntaxDiagnostics.length,
      1,
      `expected the known #103-family syntax/error to still reproduce, got: ${JSON.stringify(reparsed.diagnostics)}`,
    );
    assert.equal(syntaxDiagnostics[0]?.code, 'syntax/error');
  });
});

// Issue #130 (git.tail4ea214.ts.net/sammons/typed-mind-lang), disposition
// (b) — the toggle-fidelity harness case for the fix above: the quote swap
// this file's first describe block confirms is no longer CORRUPTING must
// now also no longer be SILENT. `toggleFormatWithDiagnostics` is the surface
// the LSP's toggle-format command (lib/typed-mind-lsp/src/toggle-format.ts)
// calls; this asserts the warning actually reaches that surface end to end
// (a ParseOutcome carrying a description with an embedded `"` -> toggleFormat
// -> Diagnostic), not just the lower-level quoteSwapDiagnosticsFor unit
// (emitter-diagnostics.test.ts covers that unit in isolation). The entity is
// constructed directly rather than parsed from `.tmd` source text, matching
// this file's own first describe block: an embedded `"` is structurally
// UNREPRESENTABLE in the grammar's string token (this file's header
// comment), so no `.tmd` source string could ever produce one — the AST is
// the only way this shape reaches the emitter, exactly the scenario this
// fix protects against.
describe('bucket-a fix, issue #130: the quote swap now surfaces a warning instead of staying silent', () => {
  it('toggling a shortform-authored description containing a double quote to longform reports emitter/quote-swap', () => {
    const dto = new DtoNode({
      name: 'Foo',
      span: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
      raw: '',
      sourceForm: 'shortform',
      purpose: 'the "canonical" name',
      fields: [],
    });
    const outcome = { entities: [dto], imports: [], suppressions: [], diagnostics: [] };
    const emitter = new SyntaxEmitter();
    const { text: longform, diagnostics } = emitter.toggleFormatWithDiagnostics(outcome, 'shortform');
    const quoteSwapDiagnostics = diagnostics.filter((diagnostic) => diagnostic.code === QUOTE_SWAP_CODE);
    assert.equal(quoteSwapDiagnostics.length, 1, `expected exactly one quote-swap warning, got: ${JSON.stringify(diagnostics)}`);
    assert.equal(quoteSwapDiagnostics[0]?.severity, 'warning');
    assert.match(quoteSwapDiagnostics[0]?.message ?? '', /'Foo'/);
    assert.match(quoteSwapDiagnostics[0]?.message ?? '', /rewritten to a single quote/);
    // The emitted text itself is unchanged by this fix (disposition (b) keeps
    // the swap, it only stops the silence) — still reparses clean.
    assert.match(longform, /description: "the 'canonical' name"/);
  });

  it('toggling a description with no double quote reports zero emitter/quote-swap diagnostics', () => {
    const dto = new DtoNode({
      name: 'Foo',
      span: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
      raw: '',
      sourceForm: 'shortform',
      purpose: 'the canonical name',
      fields: [],
    });
    const outcome = { entities: [dto], imports: [], suppressions: [], diagnostics: [] };
    const emitter = new SyntaxEmitter();
    const { diagnostics } = emitter.toggleFormatWithDiagnostics(outcome, 'shortform');
    assert.deepEqual(
      diagnostics.filter((diagnostic) => diagnostic.code === QUOTE_SWAP_CODE),
      [],
    );
  });
});
