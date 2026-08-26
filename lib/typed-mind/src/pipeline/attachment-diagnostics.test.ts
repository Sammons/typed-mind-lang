// RFC-TM-3 §3.1/§3.3 / §5 Q3 (rfc-tm-3-diamond.md) — the named
// `semantics/orphan-continuation` and `semantics/illegal-continuation`
// fixtures. Both convert legacy silent no-ops into diagnostics (verdict-moving,
// §3.3 catalog): a continuation with no open entity was silently ignored; an
// attachment the entity kind rejects was a silent no-op in the legacy per-kind
// handlers. Includes the doc-named Class-imports case (§2.2 F3: a `<- [...]`
// on a declared Class, legal-and-stored today, becomes illegal because
// ClassNode carries no imports).

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

describe('semantics/orphan-continuation', () => {
  let parser: TypedMindParser;

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('flags a continuation with no open entity, with a real span', () => {
    const outcome = parser.parse('  <- [Database, UserModel]\n');
    assert.deepEqual(
      outcome.diagnostics.map((diagnostic) => ({ code: diagnostic.code, severity: diagnostic.severity, span: diagnostic.span })),
      [
        {
          code: 'semantics/orphan-continuation',
          severity: 'warning',
          span: { start: { line: 1, column: 3 }, end: { line: 1, column: 27 } },
        },
      ],
    );
  });

  it('keeps the entity open across a continuation-shaped ERROR line (indented `<- []`), so later continuations still attach', () => {
    // Legacy: `  <- []` matches the continuation probe (leading indent + `<-`)
    // but no continuation regex, so it is a silent no-op that leaves the
    // entity open — the following exports line attaches (parser.ts:97). The
    // walker probes the SOURCE lines of the ERROR region for this; probing
    // errorNode.text loses the first line's indent and wrongly closed the
    // entity (Q5 shadow-substrate finding on the corpus's empty-list lines).
    const outcome = parser.parse('PagesFile @ src/pages/index.ts:\n  <- []\n  -> [HomePage, CartPage]\n');
    const file = outcome.entities.at(0);
    assert.deepEqual(
      {
        exports: file !== undefined && 'exports' in file ? file.exports : undefined,
        diagnostics: outcome.diagnostics.map((diagnostic) => ({ code: diagnostic.code, line: diagnostic.span.start.line })),
      },
      {
        exports: ['HomePage', 'CartPage'],
        diagnostics: [{ code: 'syntax/error', line: 2 }],
      },
    );
  });

  it('flags a continuation after a longform block (the block closes the open entity, parser.ts:91)', () => {
    const outcome = parser.parse('function createUser {\n  signature: "() => void"\n}\n  ~> [helper]\n');
    assert.deepEqual(
      outcome.diagnostics.map((diagnostic) => ({ code: diagnostic.code, line: diagnostic.span.start.line })),
      [{ code: 'semantics/orphan-continuation', line: 4 }],
    );
  });
});

describe('semantics/illegal-continuation', () => {
  let parser: TypedMindParser;

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('flags the Class-imports case (§2.2 F3 ruling) and leaves the ClassNode without imports', () => {
    const outcome = parser.parse('TodoModel <:\n  <- [Database]\n');
    assert.deepEqual(
      {
        diagnostics: outcome.diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          severity: diagnostic.severity,
          span: diagnostic.span,
        })),
        entityKinds: outcome.entities.map((entity) => entity.kind),
      },
      {
        diagnostics: [
          {
            code: 'semantics/illegal-continuation',
            severity: 'warning',
            span: { start: { line: 2, column: 3 }, end: { line: 2, column: 16 } },
          },
        ],
        entityKinds: ['Class'],
      },
    );
  });

  it('flags the longform Class imports property the same way (same F3 disposition)', () => {
    const outcome = parser.parse('class TodoModel {\n  imports: [Database]\n}\n');
    assert.deepEqual(
      outcome.diagnostics.map((diagnostic) => ({ code: diagnostic.code, line: diagnostic.span.start.line })),
      [{ code: 'semantics/illegal-continuation', line: 2 }],
    );
  });

  it('flags attachments the legacy per-kind handlers silently dropped', () => {
    const cases = [
      // description line on a DTO: no DTO arm in parser.ts:597-619.
      { source: 'UserDTO %\n  "a description"\n', expectedLine: 2 },
      // methods on a File: `'methods' in entity` is false for FileEntity. The
      // `=>` sits BEYOND the 5-line lookahead window (parser.ts:213), so the
      // declaration stays a File instead of converting.
      { source: 'Main @ src/main.ts:\n\n\n\n\n\n  => [run]\n', expectedLine: 7 },
      // contains on a Function: parser.ts:552-558 requires UIComponent.
      { source: 'createUser :: () => void\n  > [Widget]\n', expectedLine: 2 },
      // description on a DECLARED `#:` ClassFile: no ClassFile arm in
      // parser.ts:597-619 (only the lookahead-converted origin accepts one).
      { source: 'Svc #: src/svc.ts\n  "a description"\n', expectedLine: 2 },
      // default value on a Function: parser.ts:621-627 requires RunParameter.
      { source: 'createUser :: () => void\n  = "nope"\n', expectedLine: 2 },
    ];
    const results = cases.map(({ source, expectedLine }) => {
      const outcome = parser.parse(source);
      return {
        codes: outcome.diagnostics.map((diagnostic) => diagnostic.code),
        lines: outcome.diagnostics.map((diagnostic) => diagnostic.span.start.line),
        expectedLine,
      };
    });
    assert.deepEqual(
      results,
      cases.map(({ expectedLine }) => ({
        codes: ['semantics/illegal-continuation'],
        lines: [expectedLine],
        expectedLine,
      })),
    );
  });
});
