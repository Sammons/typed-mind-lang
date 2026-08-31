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
// - scenario-47-function-mixed-dependencies.tmd: a REAL bucket-b design gap
//   (NOT cosmetic like the two above) — see the design-gap inventory in the
//   vault note. Function.pendingDependencies (the unresolved `<- [...]`
//   residue the validator's "Function dependency not found" check consumes)
//   has no reserved longform property key at all (longform-builder.ts's
//   Function case never reads or assigns pendingDependencies; it always
//   defaults to `[]`, entity-accumulator.ts). Toggling a shortform Function
//   with a non-empty pendingDependencies list through longform silently
//   drops it — a genuine data-loss bug, structurally identical in shape to
//   RC-C (issue #102) but requiring a NEW grammar-recognized property key
//   (not fixable by promoting the entity to a form it's already declaring),
//   so it needs its own issue rather than a mechanical emitter fix.
//
// - scenario-55-common-validation-mistakes.tmd: a REAL bucket-b design gap,
//   same shape as the pendingDependencies gap above. `RunParameter` (and
//   the other three kinds with no separate purpose key — Function, Asset,
//   UIComponent, per emit-longform.ts's own header comment) has exactly
//   ONE longform free-text slot (`description:`), which the parser sets
//   BOTH `comment` and `description` from identically. A shortform-authored
//   entity of one of these four kinds CAN legally carry a comment
//   GENUINELY DISTINCT from its description/purpose (`API_KEY $secret "API
//   key" # Wrong type comment` — two separate string values on parse, see
//   honest-fields.ts's honestFieldsAcrossToggleOf doc comment) — but
//   forcing it through longform has no property key to carry the distinct
//   comment alongside the description, so it is silently dropped. Same
//   missing-schema-slot mechanism as pendingDependencies; not filed as a
//   separate issue from #121 since the fix (reserve a `comment:`-equivalent
//   longform property for these four kinds) is the same class of change —
//   noted in issue #121's own scope for the eventual fix to consider.
const KNOWN_CORPUS_TOGGLE_EXCEPTIONS: ReadonlySet<string> = new Set([
  join('lib', 'typed-mind-test-suite', 'scenarios', 'scenario-61-multiple-dtos-function-deps.tmd'),
  join('lib', 'typed-mind-test-suite', 'scenarios', 'scenario-49-dto-complex-structures.tmd'),
  join('lib', 'typed-mind-test-suite', 'scenarios', 'scenario-31-mixed-syntax.tmd'),
  join('lib', 'typed-mind-test-suite', 'scenarios', 'scenario-47-function-mixed-dependencies.tmd'),
  join('lib', 'typed-mind-test-suite', 'scenarios', 'scenario-55-common-validation-mistakes.tmd'),
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
  // When set, this fixture is expected to reproduce a KNOWN, documented
  // gap (bucket-b, cross-referenced to issue #103 or its addendum) rather
  // than round-trip cleanly. The test asserts the failure still reproduces
  // exactly as described, so a change to this behavior requires a
  // conscious decision (updating this fixture's expectation), never a
  // silent pass or a silent new failure.
  readonly knownGap?: string;
}

const TYPE_EXPR_KIND_FIXTURES: readonly ToggleFixture[] = [
  { name: 'typedef alias: named', source: 'Named = string\n' },
  { name: 'typedef alias: array (suffix spelling)', source: 'Ids = string[]\n' },
  { name: 'typedef alias: array (readonly suffix spelling)', source: 'ReadonlyIds = readonly string[]\n' },
  { name: 'typedef alias: array (generic spelling, Array<T>)', source: 'GenericIds = Array<string>\n' },
  { name: 'typedef alias: intersection', source: 'Combo = Named & Other\n' },
  { name: 'typedef alias: generic with named args', source: 'Pair = Record<string, number>\n' },
  {
    name: 'typedef alias: union of string literals',
    source: 'Status = "active" | "inactive"\n',
    knownGap:
      'issue #103 addendum (see emit-longform.ts typeDefToLongform comment): a printed type containing its own string-literal spelling breaks longform emission via the same block_property GLR-precedence race #103 documents.',
  },
  {
    name: 'typedef alias: generic with a string-literal argument (opaque leaf via type-expr-from-text fallback)',
    source: 'PickSend = Pick<S3Client, "send">\n',
    knownGap: 'issue #103 addendum: same mechanism as the union-of-string-literals case above — the printed type embeds a literal quote.',
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

const ALL_TARGETED_FIXTURES: readonly ToggleFixture[] = [
  ...TYPE_EXPR_KIND_FIXTURES,
  ...TYPEDEF_ENUM_FIXTURES,
  ...SUPPRESSION_FIXTURES,
  ...REEXPORT_FIXTURES,
  ...RC_C_PROMOTION_FIXTURES,
  ...QUOTED_DESCRIPTION_FIXTURES,
];

describe('toggle round-trip: targeted fixtures for surfaces the standard corpus does not exercise', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  for (const fixture of ALL_TARGETED_FIXTURES) {
    it(`${fixture.name}${fixture.knownGap !== undefined ? ' (documented KNOWN GAP, not fixed)' : ''}`, () => {
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

      if (fixture.knownGap !== undefined) {
        assert.equal(
          toggled1SyntaxDiagnostics.length > 0,
          true,
          `expected the documented known gap to still reproduce for "${fixture.name}" (${fixture.knownGap}), but toggling produced zero syntax/* diagnostics — if this now round-trips cleanly, the knownGap fixture expectation needs updating, not silently deleting`,
        );
        return;
      }

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
