// toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/typedmind/
// toggle-fidelity-audit-2026-08-31.md) — extends the S-CORE-2a round-trip
// bar (round-trip.test.ts: parse -> emit SAME form -> reparse -> AST equal)
// to the toggleFormat path specifically: parse -> toggleFormat (force the
// OTHER form) -> reparse -> toggleFormat again (force back) -> reparse ->
// AST equal to the original. round-trip.test.ts never calls toggleFormat
// and never does a double round-trip; this file is the sibling that does,
// per the audit's Phase 3 scope.
//
// Sibling file, not an extension of round-trip.test.ts, per the audit
// brief's own call: the amount of new fixture content (7 TypeExprNode
// kinds, TypeDef enum/alias, suppressions both forms, reexports, RC-C
// promotion, quoted-description escaping) is large enough that folding it
// into the existing 142-line corpus-walker file would bury the corpus
// walk's own focus. Both files share honest-fields.ts's projection so
// there is exactly one "what counts as an honest AST field" definition.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { detectFormat } from './detect-format.ts';
import { honestFieldsAcrossToggleOf, honestSuppressionOf } from './honest-fields.ts';
import { SyntaxEmitter } from './syntax-emitter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

// Same three corpus roots as round-trip.test.ts's CORPUS_ROOTS (S-CORE-2a) —
// kept as a literal copy rather than an import so a future edit to one
// suite's corpus scope doesn't silently retarget the other without review.
const CORPUS_ROOTS = [
  'lib/typed-mind-test-suite/scenarios',
  'lib/typed-mind-static-website/snippets',
  'lib/typed-mind-static-website/snippets-supplementary',
];

const walkTmd = (dir: string, out: string[]): void => {
  for (const entry of readdirSync(join(repoRoot, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTmd(rel, out);
    } else if (entry.name.endsWith('.tmd')) {
      out.push(rel);
    }
  }
};

const enumerateCorpus = (): string[] => {
  const files: string[] = [];
  for (const root of CORPUS_ROOTS) {
    walkTmd(root, files);
  }
  return files;
};

// Documented, named exceptions to the corpus-wide toggle round-trip bar —
// NOT a blanket carve-out. Each entry names the scenario, the field that
// diverges, and the mechanism, cross-referenced to the design-gap inventory
// in the vault note. Both are confirmed-harmless-or-structural, not silent
// data corruption:
//
// - scenario-61-multiple-dtos-function-deps.tmd: a shortform `?` DTO field
//   sigil collapses to `optional: true` in longform (dtoFieldToLongform,
//   emit-longform.ts's own documented design: "Longform spells both `?` and
//   `(optional)` inputs as `optional: true`... a longform round-trip never
//   sees 'question' land here in practice, but the mapping is total
//   regardless"). Once forced through longform, the marker can only
//   re-expand as `(optional)`, never the original `?` — an INTENTIONAL,
//   pre-existing, documented lossy collapse of two shortform spellings into
//   one longform spelling, not a new defect the toggle harness introduces.
//   Fixing it would mean inventing a new longform spelling to distinguish
//   `?` from `(optional)`, a language design change out of mechanical-fix
//   reach — bucket-b, not filed as a new issue (already documented in the
//   emitter's own comments, no fix expected).
// - scenario-49-dto-complex-structures.tmd: the SAME mechanism as
//   scenario-61 above, on a different field — `ComplexDTO`'s `optional?:
//   string` field authors the shortform `?` sigil (`optionalityMarker:
//   'question'`); toggling to longform and back collapses it to
//   `optionalityMarker: 'parenthesized'` (re-emits as `(optional)`), because
//   `longform-builder.ts`'s longform reader (`optional: props.optional ?
//   'parenthesized' : 'none'`) has no way to recover which shortform sigil
//   produced `optional: true`. Confirmed by running the toggle directly on
//   this scenario: every other entity and field is byte-for-byte identical
//   across both toggles; `ComplexDTO`'s `optional` field's
//   `optionalityMarker` is the only divergence. Same INTENTIONAL,
//   pre-existing, documented lossy collapse as scenario-61 — no fix expected
//   without the same new longform spelling that scenario-61's entry
//   describes.
// - scenario-31-mixed-syntax.tmd: a genuinely MIXED-format document
//   (detectFormat === 'mixed', per-entity sourceForm). toggleFormat forces
//   the WHOLE document to ONE form based on detectFormat's single document-
//   level verdict (syntax-emitter.ts's own doc comment: "an honest operation
//   on the new surface... emits the OTHER of the two forms"), not a
//   per-entity flip. Toggling a mixed document twice therefore does NOT
//   reliably return every entity to its OWN original sourceForm — the SAME
//   documented behavior confirmed independently while building browser.test.ts
//   against hero.tmd (also mixed): mixed -> forced-one-form ->
//   forced-other-form, never back to a per-entity mix. Not a bug in the
//   toggle round-trip harness's own single-direction sibling test
//   (S-CORE-2a's scenario-31 check, round-trip.test.ts, which calls plain
//   emit() — per-entity form-preserving — never toggleFormat).
//
// - scenario-47-function-mixed-dependencies.tmd: FIXED (issue #121).
//   Function.pendingDependencies (the unresolved `<- [...]` residue the
//   validator's "Function dependency not found" check consumes) now has a
//   `dependencies: [...]` longform property key, symmetric with the
//   existing calls/affects/consumes list keys (emit-longform.ts's
//   functionToLongform emits it, longform-builder.ts's Function case reads
//   it). See PENDING_DEPENDENCIES_FIXTURES below for the targeted
//   regression test using the issue's own repro. Promoted out of this
//   exception set.
//
// - scenario-55-common-validation-mistakes.tmd: FIXED (RFC-TM-15 leaf C1,
//   rfc-tm-15-diamond.md §S1; follow-up scope named in issue #121). The four
//   kinds with no separate purpose key (Function, Asset, UIComponent,
//   RunParameter) now carry a shortform `# comment` that differs from the
//   description in a dedicated `comment:` longform property
//   (emit-longform.ts's four per-kind emitters write it, longform-builder.ts's
//   buildFromLongformBlock reads it with precedence over `description:`).
//   See COMMENT_SLOT_FIXTURES below for the targeted regression test.
//   Promoted out of this exception set.
const KNOWN_CORPUS_TOGGLE_EXCEPTIONS: ReadonlySet<string> = new Set([
  join('lib', 'typed-mind-test-suite', 'scenarios', 'scenario-61-multiple-dtos-function-deps.tmd'),
  join('lib', 'typed-mind-test-suite', 'scenarios', 'scenario-49-dto-complex-structures.tmd'),
  join('lib', 'typed-mind-test-suite', 'scenarios', 'scenario-31-mixed-syntax.tmd'),
]);

describe('toggle round-trip: corpus-wide parse -> toggleFormat -> toggle back -> AST equal', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  for (const relPath of enumerateCorpus()) {
    const testTitle = KNOWN_CORPUS_TOGGLE_EXCEPTIONS.has(relPath)
      ? `${relPath}: toggling twice recovers the original honest AST (KNOWN GAP, see KNOWN_CORPUS_TOGGLE_EXCEPTIONS comment above)`
      : `${relPath}: toggling twice recovers the original honest AST`;
    it(testTitle, () => {
      const source = readFileSync(join(repoRoot, relPath), 'utf8');
      const outcome = parser.parse(source);
      const parsesCleanly = outcome.diagnostics.every((diagnostic) => !diagnostic.code.startsWith('syntax/'));
      if (!parsesCleanly) {
        // Mirrors round-trip.test.ts's own carve-out (scenario-54's
        // deliberate boundary violations): a document with unparsable text
        // never becomes a clean AST in the first place, so toggling it is
        // not a meaningful check here — the parse-failure surface is out of
        // this audit's scope (it is a parser/grammar concern, not an
        // emitter/toggle concern).
        return;
      }
      const { format: originalFormat } = detectFormat(source);

      const toggled1 = emitter.toggleFormat(outcome, originalFormat);
      const reparsed1 = parser.parse(toggled1);
      const reparsed1SyntaxDiagnostics = reparsed1.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
      assert.deepEqual(
        reparsed1SyntaxDiagnostics,
        [],
        `first toggle introduced new syntax/* diagnostics for ${relPath}: ${JSON.stringify(reparsed1SyntaxDiagnostics)}`,
      );

      const { format: toggled1Format } = detectFormat(toggled1);
      const toggled2 = emitter.toggleFormat(reparsed1, toggled1Format);
      const reparsed2 = parser.parse(toggled2);
      const reparsed2SyntaxDiagnostics = reparsed2.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
      assert.deepEqual(
        reparsed2SyntaxDiagnostics,
        [],
        `second toggle introduced new syntax/* diagnostics for ${relPath}: ${JSON.stringify(reparsed2SyntaxDiagnostics)}`,
      );

      const actualEntities = reparsed2.entities.map(honestFieldsAcrossToggleOf);
      const expectedEntities = outcome.entities.map(honestFieldsAcrossToggleOf);
      if (KNOWN_CORPUS_TOGGLE_EXCEPTIONS.has(relPath)) {
        // Documented-gap regression guard (per the exception's own comment
        // above): assert the KNOWN divergence still reproduces exactly,
        // rather than skipping the check outright, so a future change to this
        // behavior requires touching this test consciously.
        assert.notDeepEqual(
          actualEntities,
          expectedEntities,
          `expected the documented KNOWN GAP to still reproduce for ${relPath} — if this now round-trips cleanly, promote it out of KNOWN_CORPUS_TOGGLE_EXCEPTIONS`,
        );
        return;
      }
      assert.deepEqual(actualEntities, expectedEntities);
      assert.deepEqual(reparsed2.suppressions.map(honestSuppressionOf), outcome.suppressions.map(honestSuppressionOf));
    });
  }
});

describe('toggle round-trip: both starting directions for a single-form corpus document', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('force-emitting a shortform-only doc to longform first, then round-tripping from there, recovers honest fields', () => {
    // hero.tmd is genuinely mixed (per-entity sourceForm) — force it to a
    // single starting form first (emitShortform) so this check exercises
    // the longform-start direction the corpus loop above does not: every
    // corpus .tmd file starts in its OWN sourceForm, so a single-direction
    // walk never proves the OTHER starting direction survives a round-trip.
    const heroPath = join(packageDir, 'grammar', 'test', 'fixtures', 'hero.tmd');
    const heroSource = readFileSync(heroPath, 'utf8');
    const heroOutcome = parser.parse(heroSource);
    const shortformStart = emitter.emitShortform(heroOutcome);
    assert.deepEqual(detectFormat(shortformStart).format, 'shortform');

    const startOutcome = parser.parse(shortformStart);
    const toggled1 = emitter.toggleFormat(startOutcome, 'shortform');
    assert.deepEqual(detectFormat(toggled1).format, 'longform');
    const reparsed1 = parser.parse(toggled1);
    const toggled2 = emitter.toggleFormat(reparsed1, 'longform');
    assert.deepEqual(detectFormat(toggled2).format, 'shortform');
    const reparsed2 = parser.parse(toggled2);

    assert.deepEqual(reparsed2.entities.map(honestFieldsAcrossToggleOf), startOutcome.entities.map(honestFieldsAcrossToggleOf));
  });
});

// Targeted fixtures: real .tmd source strings covering surfaces the standard
// corpus does not exercise at all (confirmed via a repo-wide grep before
// writing this file: zero corpus .tmd files declare a typedef, a
// suppression, or a File reexport today).
interface ToggleFixture {
  readonly name: string;
  readonly source: string;
}

// Any fixture that reproduces a KNOWN, documented gap rather than round-
// tripping cleanly does not belong in ALL_TARGETED_FIXTURES at all — it
// belongs in KNOWN_CORPUS_TOGGLE_EXCEPTIONS above (or, for a non-corpus
// source string, a targeted fixture list of its own with the same shape:
// name the scenario, the field that diverges, and the mechanism, then assert
// the divergence reproduces exactly via `assert.notDeepEqual` rather than
// skipping the check). That mechanism replaced an earlier per-fixture
// `knownGap?: string` field on `ToggleFixture`, which asserted only
// `syntaxDiagnostics.length > 0` and could not express "reparses to a
// DIFFERENT AST with ZERO diagnostics" — exactly the two silent corruptions
// the alias-shape audit below found. `ALL_TARGETED_FIXTURES` below is
// therefore held to a stricter bar: every entry must round-trip byte-for-
// AST-identical, with no per-fixture escape hatch.
//
// The 21 alias shape classes enumerated by this PR's review. `TypeDef`'s
// alias slot is the single most spelling-sensitive position in the language:
// `typeDefToLongform`'s `aliasTypeValue` picks quoted or unquoted per shape,
// and picking wrong is either a loud parse failure or — worse — a SILENT AST
// rewrite. This corpus pins the outcome for every class so a future change to
// that rule cannot move one silently.
//
// A `syntaxDiagnostics.length > 0` check alone can only express LOUD
// failures. Two classes (tuple, single string literal) regressed into SILENT
// corruption during this PR's first round and produced zero diagnostics —
// that check would not have caught either. That is why `ALIAS_SHAPE_CLASSES`
// below carries its own AST-identity assertion suite: silence is only
// acceptable when the round-trip is exact.
const TYPE_EXPR_KIND_FIXTURES: readonly ToggleFixture[] = [
  { name: 'typedef alias: bare identifier', source: 'Alias = Other\n' },
  { name: 'typedef alias: named', source: 'Named = string\n' },
  { name: 'typedef alias: array (suffix spelling)', source: 'Ids = string[]\n' },
  { name: 'typedef alias: array (readonly suffix spelling)', source: 'ReadonlyIds = readonly string[]\n' },
  { name: 'typedef alias: array (generic spelling, Array<T>)', source: 'GenericIds = Array<string>\n' },
  { name: 'typedef alias: intersection', source: 'Combo = Named & Other\n' },
  { name: 'typedef alias: generic with named args', source: 'Pair = Record<string, number>\n' },
  { name: 'typedef alias: union of named', source: 'Either = Widget | Gadget\n' },
  { name: 'typedef alias: union with null', source: 'Maybe = Widget | null\n' },
  { name: 'typedef alias: object literal', source: 'Obj = { a: string; b: number }\n' },
  {
    name: 'typedef alias: union of object literals',
    source: 'Tag = { tagged: false } | { tagged: true; label: string }\n',
  },
  { name: 'typedef alias: parenthesized union array', source: 'Paren = (Widget | Gadget)[]\n' },
  { name: 'typedef alias: function type', source: 'Fn = (input: string) => number\n' },
  { name: 'typedef alias: nested generic', source: 'Nested = Record<string, Array<Widget>>\n' },
  { name: 'typedef alias: numeric literal union', source: 'Level = 1 | 2 | 3\n' },
  // Regression guard, this PR's review. Emitted UNQUOTED, `[string, number]`
  // is not captured as a `type` scalar at all (PR #142's `_freetext_open`
  // tokens cover a leading bare identifier and a leading `{`, never a leading
  // `[`), and longform-builder.ts's fallback default absorbs the miss into a
  // plausible escape-hatch-typed `named` leaf, with ZERO diagnostics.
  // `aliasTypeValue` keeps
  // this class quoted, where it round-trips byte-perfect.
  { name: 'typedef alias: tuple', source: 'Tup = [string, number]\n' },
  // The same tuple text in a NON-leading position is fine: the value's first
  // chunk is a bare identifier, so P7 takes the whole line. Pins that only
  // the leading position is affected.
  { name: 'typedef alias: tuple nested in a union', source: 'TupUnion = Widget | [string, number]\n' },
  // Escaped outer quoting preserves literals in every type position.
  { name: 'typedef alias: generic with a string-literal argument', source: 'PickSend = Pick<S3Client, "send">\n' },
  { name: 'typedef alias: union mixing named and string literal', source: 'Mixed = Widget | "active" | Gadget\n' },
  {
    // RFC-TM-13 C-prime closes the former unrepresentable-alias case.
    name: 'typedef alias: union of string literals',
    source: 'Status = "active" | "inactive"\n',
  },
  {
    // A quoted wrapper must preserve literal kind, not reinterpret a name.
    name: 'typedef alias: single string literal',
    source: 'Only = "active"\n',
  },
];

// Issue #103's own two named shapes, as round-trip fixtures. Both are
// Function signatures, so `functionToLongform` emits them into a longform
// `signature:` property (P7 `property_freetext`) — the position that
// ERRORed while the identical text parsed clean through the shortform
// `Name :: signature` production. Fixed in grammar.js by giving
// `freetext_value` the same `$.string` alternative `signature` has, plus
// the `_freetext_open` / `_freetext_open_string` longest-match opening
// tokens that stop P3 `property_identifier` stealing a multi-chunk value.
const FUNCTION_SIGNATURE_FIXTURES: readonly ToggleFixture[] = [
  {
    name: 'issue #103 shape 1: signature with an inline object-literal parameter type',
    source: 'StorePayload :: async storePayload(opts: { s3Key: string; body: Buffer; contentType: string; }) => Promise<void>\n',
  },
  {
    name: 'issue #103 shape 2: signature with a quoted-string-literal union parameter type',
    source: 'SetMode :: setMode(mode: "read" | "write" | "admin") => void\n',
  },
  {
    // The narrower trigger the reproduction isolated: the defect is a bare
    // identifier as the value's FIRST whitespace-delimited chunk, not the
    // brace or the quote. `async` alone is enough to reproduce it.
    name: 'issue #103 minimal trigger: signature whose first chunk is a bare identifier',
    source: 'Run :: async run\n',
  },
];

const TYPEDEF_ENUM_FIXTURES: readonly ToggleFixture[] = [
  { name: 'typedef enum: shortform-sourced', source: 'Status = enum [Active, Done, Archived]\n' },
  {
    name: 'typedef enum: longform-sourced',
    source: 'typedef Status {\n  variant: enum\n  members: [Active, Done, Archived]\n}\n',
  },
];

const SUPPRESSION_FIXTURES: readonly ToggleFixture[] = [
  {
    name: 'suppression: shortform (one line per entry)',
    source: 'Foo % "a dto"\n  - id: string\n\nsuppress Foo checker/orphaned-entity "intentionally unreferenced in this fixture"\n',
  },
  {
    name: 'suppression: longform block (multiple entries)',
    source:
      'Foo % "a dto"\n  - id: string\n\nBar % "another dto"\n  - id: string\n\nsuppress {\n  Foo checker/orphaned-entity "first reason"\n  Bar checker/orphaned-entity "second reason"\n}\n',
  },
];

const REEXPORT_FIXTURES: readonly ToggleFixture[] = [
  {
    name: 'File reexports: shortform (<-> [...])',
    source: 'Barrel @ src/barrel.ts:\n  -> [Foo]\n  <-> [Bar, Baz]\n',
  },
  {
    name: 'File reexports: longform (reexports: [...])',
    source: 'file Barrel {\n  type: File\n  path: src/barrel.ts\n  exports: [Foo]\n  reexports: [Bar, Baz]\n}\n',
  },
];

const RC_C_PROMOTION_FIXTURES: readonly ToggleFixture[] = [
  {
    name: 'RC-C: Program.exports forces longform even under forceForm shortform (issue #102)',
    source: 'program TodoApp {\n  type: Program\n  entry: AppEntry\n  exports: [TodoService]\n}\n',
  },
  {
    name: 'RC-C: declared ClassFile purpose forces longform even under forceForm shortform (issue #102)',
    source:
      'classfile UserService {\n  type: ClassFile\n  path: src/user-service.ts\n  description: "handles user accounts"\n  methods: [create, delete]\n}\n',
  },
];

const QUOTED_DESCRIPTION_FIXTURES: readonly ToggleFixture[] = [
  {
    name: 'collapsed description containing an embedded quote survives escaping both directions',
    source: 'Foo % "a dto"\n  - id: string "the \'id\' field, sometimes called the key"\n',
  },
];

// Issue #121: Function.pendingDependencies — the unresolved `<- [...]`
// residue after Q4's forward-semantics distribution sorts resolvable names
// into calls/affects/consumes/input — now has a `dependencies: [...]`
// longform property key, symmetric with those siblings. Repro is the
// issue's own fixture.
const PENDING_DEPENDENCIES_FIXTURES: readonly ToggleFixture[] = [
  {
    name: 'Function.pendingDependencies survives shortform -> longform -> shortform',
    source:
      'processData :: (input: InputData) => OutputData\n  <- [DashboardUI, IconAsset, InputData, transformData, lodash, AppConfig]\n  <- InputData\n  -> OutputData\n',
  },
];

// RFC-TM-15 leaf C1 (rfc-tm-15-diamond.md §S1): the four kinds with no
// separate purpose key have a dedicated `comment:` longform property, so a
// shortform `# comment` that differs from the quoted description survives a
// longform toggle. One shortform entity per kind, comment distinct from
// description; honest-fields.ts keeps BOTH fields in the comparison when
// they differ, so a dropped comment is a hard diff here.
const COMMENT_SLOT_FIXTURES: readonly ToggleFixture[] = [
  {
    name: 'TM15 V1: shortform comments distinct from descriptions survive a longform toggle on all four kinds',
    source: [
      'run :: () => void # entry-point wrapper',
      '  "runs the thing"',
      'Logo ~ "the logo" # brand mark, not the favicon',
      'App & "root shell" # mounted by index.html',
      'API_KEY $env "API key" # rotated monthly',
      '',
    ].join('\n'),
  },
  {
    // The comment-only shape: no quoted description at all, so before C1 the
    // longform block had no line to carry the comment and it was dropped
    // (scenario-56's `log` is the corpus instance).
    name: 'TM15 V1 control: a comment-only Function round-trips through longform',
    source: 'run :: () => void # distinct\n',
  },
  {
    // An empty description is still a description; the comment differs from
    // it (scenario-52's `NoDescAsset` is the corpus instance).
    name: 'TM15 V1 control: a comment beside an empty description round-trips through longform',
    source: 'NoDescAsset ~ "" # empty description\n',
  },
];

// Ladder gap 93 (PR #158): a string-literal discriminant inside a union of
// object literals — the house-style `kind`-tagged failure union that
// `failures_are_local_tagged_unions` mandates. `_opaque_piece`'s chunk token
// excludes `"` and the choice had no `$.string` alternative, so a quoted
// value inside a balanced group was structurally unrepresentable and the
// whole type ERRORed. Fixed in grammar.js by giving the brace and bracket
// opaque-group bodies the `$.string` alternative, mirroring the
// `freetext_value` fix issue #103 needed one layer over.
const LITERAL_DISCRIMINANT_FIXTURES: readonly ToggleFixture[] = [
  {
    name: 'ladder gap 93: union of object literals with string-literal discriminants',
    source: 'DispatchResult = { kind: "none"; reason: string } | { kind: "reply"; text: string }\n',
  },
  {
    // The union is not the trigger — a SINGLE object literal with a quoted
    // value reproduced the gap identically. Pinned so a future change cannot
    // "fix" only the multi-member form.
    name: 'ladder gap 93 minimal trigger: a single object literal with a quoted value',
    source: 'One = { kind: "none"; reason: string }\n',
  },
  {
    // Both halves of the design at once: the quoted discriminants belong to
    // the type, while the trailing quoted string stays the field's
    // description. This is the shape complex-dto-example.tmd:167 carries.
    name: 'ladder gap 93: quoted discriminant inside the type plus a separate description string',
    source: 'UserDTO %\n  - preferences: { theme: "light" | "dark", language: string } "User preferences"\n',
  },
];

const ALL_TARGETED_FIXTURES: readonly ToggleFixture[] = [
  ...TYPE_EXPR_KIND_FIXTURES,
  ...FUNCTION_SIGNATURE_FIXTURES,
  ...TYPEDEF_ENUM_FIXTURES,
  ...SUPPRESSION_FIXTURES,
  ...REEXPORT_FIXTURES,
  ...RC_C_PROMOTION_FIXTURES,
  ...QUOTED_DESCRIPTION_FIXTURES,
  ...PENDING_DEPENDENCIES_FIXTURES,
  ...COMMENT_SLOT_FIXTURES,
  ...LITERAL_DISCRIMINANT_FIXTURES,
];

describe('toggle round-trip: targeted fixtures for surfaces the standard corpus does not exercise', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  for (const fixture of ALL_TARGETED_FIXTURES) {
    it(fixture.name, () => {
      const outcome = parser.parse(fixture.source);
      const preflightSyntaxDiagnostics = outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
      assert.deepEqual(
        preflightSyntaxDiagnostics,
        [],
        `fixture source itself must parse cleanly: ${JSON.stringify(preflightSyntaxDiagnostics)}`,
      );

      const { format: originalFormat } = detectFormat(fixture.source);
      const toggled1 = emitter.toggleFormat(outcome, originalFormat);
      const reparsed1 = parser.parse(toggled1);
      const toggled1SyntaxDiagnostics = reparsed1.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));

      assert.deepEqual(
        toggled1SyntaxDiagnostics,
        [],
        `toggle introduced syntax/* diagnostics for "${fixture.name}": ${JSON.stringify(toggled1SyntaxDiagnostics)}`,
      );

      const { format: toggled1Format } = detectFormat(toggled1);
      const toggled2 = emitter.toggleFormat(reparsed1, toggled1Format);
      const reparsed2 = parser.parse(toggled2);
      const toggled2SyntaxDiagnostics = reparsed2.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
      assert.deepEqual(
        toggled2SyntaxDiagnostics,
        [],
        `toggle-back introduced syntax/* diagnostics for "${fixture.name}": ${JSON.stringify(toggled2SyntaxDiagnostics)}`,
      );

      assert.deepEqual(reparsed2.entities.map(honestFieldsAcrossToggleOf), outcome.entities.map(honestFieldsAcrossToggleOf));
      assert.deepEqual(reparsed2.suppressions.map(honestSuppressionOf), outcome.suppressions.map(honestSuppressionOf));
    });
  }
});

// The anti-silent-corruption gate for TypeDef's alias slot (this PR's review).
//
// The suite above cannot express this property: it asserts
// `syntaxDiagnostics.length === 0`, so a shape that reparses to a DIFFERENT
// AST with ZERO diagnostics still passes. Both silent corruptions this PR's
// first round introduced — `Tup = [string, number]` reparsing to an
// escape-hatch-typed `named` leaf via longform-builder.ts's fallback
// default, and `Only = "active"` degrading `literal` -> `named` via P1's
// `unquote` — were invisible to a diagnostics-only check.
//
// The rule enforced here is the one that actually matters: for every alias
// shape class, toggling to longform and back either reproduces the source
// AST EXACTLY, or fails LOUDLY. Silence plus a changed AST is never allowed.
// `expectation` records which of the two a class is; a class moving between
// them requires editing this table, which is the point.
interface AliasShapeClass {
  readonly name: string;
  readonly source: string;
  // 'round-trips'  -> longform reparse is diagnostic-free AND AST-identical.
  // 'loud-failure' -> longform reparse raises a syntax/* diagnostic. Allowed
  //                   only where NO representation is correct (issue #130);
  //                   the emitter must additionally warn at emit time.
  readonly expectation: 'round-trips' | 'loud-failure';
}

const ALIAS_SHAPE_CLASSES: readonly AliasShapeClass[] = [
  { name: 'bare identifier', source: 'Alias = Other\n', expectation: 'round-trips' },
  { name: 'named (string)', source: 'Named = string\n', expectation: 'round-trips' },
  { name: 'array suffix', source: 'Ids = string[]\n', expectation: 'round-trips' },
  { name: 'readonly array suffix', source: 'ReadonlyIds = readonly string[]\n', expectation: 'round-trips' },
  { name: 'Array<T> generic spelling', source: 'GenericIds = Array<string>\n', expectation: 'round-trips' },
  { name: 'Record<string, number>', source: 'Pair = Record<string, number>\n', expectation: 'round-trips' },
  { name: 'intersection', source: 'Combo = Named & Other\n', expectation: 'round-trips' },
  { name: 'union of named', source: 'Either = Widget | Gadget\n', expectation: 'round-trips' },
  { name: 'union with null', source: 'Maybe = Widget | null\n', expectation: 'round-trips' },
  { name: 'object literal', source: 'Obj = { a: string; b: number }\n', expectation: 'round-trips' },
  {
    name: 'union of object literals',
    source: 'Tag = { tagged: false } | { tagged: true; label: string }\n',
    expectation: 'round-trips',
  },
  { name: 'parenthesized union array', source: 'Paren = (Widget | Gadget)[]\n', expectation: 'round-trips' },
  { name: 'function type', source: 'Fn = (input: string) => number\n', expectation: 'round-trips' },
  { name: 'nested generic', source: 'Nested = Record<string, Array<Widget>>\n', expectation: 'round-trips' },
  { name: 'numeric literal union', source: 'Level = 1 | 2 | 3\n', expectation: 'round-trips' },
  { name: 'tuple', source: 'Tup = [string, number]\n', expectation: 'round-trips' },
  { name: 'tuple nested in a union', source: 'TupUnion = Widget | [string, number]\n', expectation: 'round-trips' },
  { name: 'generic with a string-literal argument', source: 'PickSend = Pick<S3Client, "send">\n', expectation: 'round-trips' },
  { name: 'union mixing named and string literal', source: 'Mixed = Widget | "active" | Gadget\n', expectation: 'round-trips' },
  // RFC-TM-13 C-prime: the escaped outer wrapper preserves literal types.
  { name: 'union of string literals', source: 'Status = "active" | "inactive"\n', expectation: 'round-trips' },
  { name: 'single string literal', source: 'Only = "active"\n', expectation: 'round-trips' },
];

// Spans move when a shape is re-emitted into a different form, so identity is
// compared on structure alone — the kind/name/value payload that carries the
// MEANING. This is what separates an escape-hatch-typed `named` leaf from
// `opaque '[string, number]'`, and `literal/'string'` from `named`.
const stripSpans = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripSpans);
  }
  if (value !== null && typeof value === 'object') {
    const stripped: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'span') {
        continue;
      }
      stripped[key] = stripSpans(nested);
    }
    return stripped;
  }
  return value;
};

const aliasTypesOf = (outcome: { readonly entities: readonly unknown[] }): unknown =>
  stripSpans(outcome.entities.map((entity) => (entity as { readonly aliasType?: unknown }).aliasType));

describe('TypeDef alias shape classes: a longform toggle round-trips exactly or fails loudly, never silently', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  for (const shapeClass of ALIAS_SHAPE_CLASSES) {
    it(`${shapeClass.name} (${shapeClass.expectation})`, () => {
      const outcome = parser.parse(shapeClass.source);
      assert.deepEqual(
        outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/')),
        [],
        'the shortform source itself must parse cleanly, or the fixture proves nothing',
      );

      const longform = emitter.toggleFormat(outcome, 'shortform');
      const reparsed = parser.parse(longform);
      const syntaxDiagnostics = reparsed.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));

      assert.deepEqual(
        syntaxDiagnostics,
        [],
        `"${shapeClass.name}" must reparse cleanly. Emitted:\n${longform}\ndiagnostics: ${JSON.stringify(syntaxDiagnostics)}`,
      );
      // The assertion a diagnostics-only check structurally cannot make: zero
      // diagnostics is only acceptable when the AST actually survived.
      assert.deepEqual(
        aliasTypesOf(reparsed),
        aliasTypesOf(outcome),
        `"${shapeClass.name}" reparsed without diagnostics but to a DIFFERENT aliasType — silent corruption. Emitted:\n${longform}`,
      );

      // And the full circuit back to shortform, so the user-visible source
      // text is proven to survive too.
      const backToShortform = emitter.toggleFormat(reparsed, 'longform');
      const reparsedTwice = parser.parse(backToShortform);
      assert.deepEqual(
        reparsedTwice.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/')),
        [],
        `"${shapeClass.name}" failed on the toggle back to shortform:\n${backToShortform}`,
      );
      assert.deepEqual(
        aliasTypesOf(reparsedTwice),
        aliasTypesOf(outcome),
        `"${shapeClass.name}" survived the longform hop but not the toggle back. Got:\n${backToShortform}`,
      );
    });
  }

  it('covers every shape class the review enumerated, so the table cannot silently shrink', () => {
    assert.equal(ALIAS_SHAPE_CLASSES.length, 21);
  });
});

// RFC-TM-15 leaf C1 (rfc-tm-15-diamond.md §S1) — the emission rule itself:
// `comment:` appears only when `comment` differs from the description slot.
// An identical pair keeps one `description:` line (which the reader assigns
// to both fields), so no corpus document that authored a single free-text
// value gains a line.
describe('TM15 V1: the longform comment: property', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('is emitted for each of the four kinds when the comment differs from the description', () => {
    const outcome = parser.parse(COMMENT_SLOT_FIXTURES[0]?.source ?? '');
    const longform = emitter.toggleFormat(outcome, 'shortform');
    const commentLines = longform.split('\n').filter((line) => line.trim().startsWith('comment: '));
    assert.deepEqual(commentLines, [
      '  comment: "entry-point wrapper"',
      '  comment: "brand mark, not the favicon"',
      '  comment: "mounted by index.html"',
      '  comment: "rotated monthly"',
    ]);
  });

  it('control: an identical comment emits no comment: line and still round-trips', () => {
    const source = ['run :: () => void # runs the thing', '  "runs the thing"', 'Logo ~ "the logo" # the logo', ''].join('\n');
    const outcome = parser.parse(source);
    const longform = emitter.toggleFormat(outcome, 'shortform');
    assert.deepEqual(
      longform.split('\n').filter((line) => line.trim().startsWith('comment: ')),
      [],
    );
    const reparsed1 = parser.parse(longform);
    const reparsed2 = parser.parse(emitter.toggleFormat(reparsed1, 'longform'));
    assert.deepEqual(reparsed2.entities.map(honestFieldsAcrossToggleOf), outcome.entities.map(honestFieldsAcrossToggleOf));
  });

  it('control: comment: wins over description: for the comment field, and description: alone still sets both', () => {
    const outcome = parser.parse(
      'function run {\n  signature: () => void\n  description: "runs the thing"\n  comment: "entry-point wrapper"\n}\n\nasset Logo {\n  description: "the logo"\n}\n',
    );
    assert.deepEqual(
      outcome.entities.map((entity) => ({ name: entity.name, comment: entity.comment })),
      [
        { name: 'run', comment: 'entry-point wrapper' },
        { name: 'Logo', comment: 'the logo' },
      ],
    );
  });
});
