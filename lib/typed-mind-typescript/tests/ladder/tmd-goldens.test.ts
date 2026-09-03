// RFC-TM-9 §8 — "Q1 commits two assertion layers per fixture — the
// module-graph.json exact edge-list golden (§1)... and full .tmd goldens
// against the current language." This suite captures and commits the
// second layer: the converter's `.tmd` output for every fixture Q1's
// analyzer fixes now resolve structurally (real entities discovered,
// correct classification — the analyzer-owned half of extraction).
//
// Scope discipline on the CHECKER verdict specifically: this suite records
// each fixture's checker verdict but does NOT assert green end-to-end,
// because reaching a green checker verdict on these single-function
// fixtures depends on machinery RFC-TM-9 Q1 does not own —
//   - The converter's Program-entity `exports` continuation is emitted in
//     shortform (`-> [mainFn]`), which the grammar's attachment rules only
//     allow on File/ClassFile/Dependency, never Program (longform-only) —
//     a PRE-EXISTING emitter defect in `lib/typed-mind/src/emitter`
//     (confirmed via RFC-TM-6 Q3's goldens test, which documents the
//     identical shape surviving both the legacy and shared emitters as a
//     known non-regression). This makes the checker see the Program with
//     no exports, so every entity looks unreachable ("orphaned") even
//     though the analyzer/converter correctly discovered and wired them.
//   - X-CONV-4 (Program-naming collision fix, 03-app-collision) landed in
//     Q2: conversion now succeeds (`<Base>__App` naming is collision-proof,
//     per RFC-TM-9 §5) — the case table below reflects the flip Q1's
//     comment anticipated. The checker verdict is still `false` because it
//     hits the SAME pre-existing shortform-Program-exports emitter defect
//     as every other fixture here (see above) — Q2 owns converter
//     correctness, not the `lib/typed-mind` emitter/grammar (TM-8's
//     surface, out of scope per the header parallel-safety paragraph).
//   - X-AN-7/X-CONV-2 (enum modeling, 14-enum; type-alias modeling,
//     24-type-alias) landed in Q3, after TM-8 merged the TypeDef entity
//     kind: the golden delta for 14-enum is `Status ! src/status.ts :
//     enum` (self-referential Constants, member list dropped) ->
//     `Status = enum [Active, Inactive]` (TypeDef, full member list) —
//     cause-linked to TM-8's X-TYPE-7 (TypeDef entity) plus this
//     Quantum's X-CONV-2 (converter emission). 24-type-alias is a NEW
//     fixture this Quantum authors (no prior golden to diff against).
//     Checker verdict stays `false` for both — same pre-existing
//     shortform-Program-exports emitter defect PLUS a second pre-existing
//     defect this Quantum's own investigation surfaced and disclosed
//     (never introduced by X-CONV-2 itself): `check-orphans.ts`'s
//     `collectReferencedNames` never walks DTO field types for ANY entity
//     kind, so an entity referenced only via a DTO field's `type:` value
//     always orphans, TypeDef or not — confirmed with an isolated
//     DTO-referencing-DTO control fixture carrying zero TypeDef content.
//     See tests/ladder/q3-language-adoption.test.ts's header for the full
//     disclosure. `25-generated-single-file` is a NEW X-SUPP-6 fixture
//     (converter-emitted suppression), also authored fresh this Quantum.
//   - Census gap 7 (`import = require`/`export =`, 11-commonjs) is not an
//     owned X-AN item in RFC-TM-9 at all — out of mission scope entirely.
// Recording the actual verdict (rather than asserting a false green) is
// itself the check that Q1 has not silently absorbed Q2/Q3/emitter scope.
// The conservation-relevant assertion is CONVERSION success/failure, which
// IS fully determined by analyzer-owned fixes — that field is asserted.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const goldenDir = join(testDir, 'goldens-tmd');

const writeGolden = (name: string, content: string): void => {
  mkdirSync(goldenDir, { recursive: true });
  writeFileSync(join(goldenDir, name), content, 'utf8');
};

interface FixtureCase {
  readonly fixture: string;
  readonly entrySegments: readonly string[];
  readonly expectConversionSuccess: boolean;
  // The checker verdict this fixture is known to produce today, recorded
  // as documentation of current end-to-end state — NOT a claim that Q1
  // owns making it green (see file header). 'unchecked' means conversion
  // itself fails, so there is no .tmd to check.
  readonly recordedCheckerValid: boolean | 'unchecked';
}

const cases: readonly FixtureCase[] = [
  // RC-C (sammons/typed-mind-lang#102) fixed the shortform-Program-exports/
  // declared-ClassFile-purpose emitter defect the file header (and this
  // suite's original comments) name as the reason every fixture below used
  // to record `false` despite correct extraction — `emit-shortform.ts` now
  // promotes an affected entity to its legal longform block instead of
  // emitting a continuation attachment-rules.ts rejects. The fixtures whose
  // ONLY remaining diagnostic was that defect flip to `true` here (expected,
  // welcome drift per this file's own doctrine, line ~156); fixtures with an
  // unrelated orphan-registry gap (RC-A/RC-B, tracked separately) stay
  // `false`.
  { fixture: '01-js-ext', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  { fixture: '02-dynamic-import', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  // RFC-TM-11 (rfc-tm-11-diamond.md, issue #109 RC-G) — expected, welcome
  // drift per this file's own recorded-verdict discipline above: these two
  // fixtures ARE the RC-G shape (a barrel File whose only export is a
  // re-export). `checker/orphaned-file` no longer fires now that
  // `isFileConsumed` counts a re-exported name as consumption
  // (check-orphans.ts). Verified directly: both fixtures' converted
  // `.tmd` now check clean (`valid: true`, zero diagnostics).
  { fixture: '07-barrel-reexport', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  { fixture: '07b-barrel-noext', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  // RFC-TM-11 Amendment 1, RX-6 (rfc-tm-11-diamond.md, issue #109 RC-G
  // real-corpus residual) — the shape 07/07b's same-package-resolvable
  // re-exports do NOT exercise: a barrel re-exporting from an EXTERNAL or
  // workspace-package specifier (`@scope/core/client-ip`, matching the
  // real `TenantBillingFile`/`ClientIpFile` corpus instances exactly).
  // `getClientIp` never resolves to a locally-constructed entity, so only
  // the RX-6 converter fold (folding `ClientIpFile`'s own File entity
  // name into `MainFile.imports`) plus `isFileConsumed`'s new third
  // branch clear `checker/orphaned-file` here — 07/07b already passed
  // before RX-6 existed, this fixture would NOT have passed without it.
  // Also exercises bound (a): `formatIp` (a genuine local declaration
  // alongside the re-export, NOT in `reExports`) resolves normally and
  // does not trigger a redundant fold.
  { fixture: '47-crosspkg-reexport', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  { fixture: '10-export-star', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '12-tsconfig-paths', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '13-jsdoc-desc', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  { fixture: '15-getter-setter', entrySegments: ['src', 'widget.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  { fixture: '16-arrow-const-fn', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  { fixture: '08-type-only-import', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  { fixture: '08b-type-only-noext', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  { fixture: '09-namespace-import', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '09b-namespace-noext', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '17-default-export', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  // Q2 landed (X-CONV-4): conversion now succeeds — the naming collision
  // that used to crash this fixture no longer exists. Checker verdict flips
  // to `true` now that RC-C's shortform-Program-exports emitter defect
  // (see above) is fixed — this fixture's only remaining diagnostic was
  // that defect.
  { fixture: '03-app-collision', entrySegments: ['src', 'App.tsx'], expectConversionSuccess: true, recordedCheckerValid: true },
  // X-AN-7/X-CONV-2 landed in Q3 (see file header for the cause-linked
  // delta). Checker verdict flips to `true` now that RC-C's
  // shortform-Program-exports defect is fixed — the previously-disclosed
  // DTO-field-reference orphan gap does not trigger on either fixture's
  // actual content (verified directly against `TypedMind.check()`).
  { fixture: '14-enum', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  // NEW in Q3 — a union type alias and a simple named-type alias, both
  // emitting TM-8's TypeDef entity kind (X-AN-7/X-CONV-2). No prior golden
  // to diff against; the golden IS the new baseline.
  { fixture: '24-type-alias', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  // NEW in Q3 — X-SUPP-6: a module-private class suppressed with reason
  // 'generated-single-file-scope'. issue #91 (tm10-inc4) — the SAME
  // suppression reason now also covers this class's
  // `checker/class-not-exported` twin finding (previously genuinely
  // separate and un-suppressed — see q3-language-adoption.test.ts for the
  // fix). Checker verdict FLIPS to `true`: both of this fixture's only two
  // ERROR-severity findings (orphaned-entity and its class-not-exported
  // twin) now carry a `suppression` annotation, and `valid` only counts
  // UNSUPPRESSED errors (I-10, "suppressed-not-silenced") — the remaining
  // `semantics/illegal-continuation` finding is a warning, which never
  // gates `valid`. This is expected, welcome drift (file header), not a
  // regression.
  { fixture: '25-generated-single-file', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  // NEW — RFC-TM-9 §8 X-LADDER-2 rung against sammons/slat-harness. Four
  // fixtures distilled from that target's real diagnostics; see
  // slat-harness-mixin-extends.test.ts (the FIXED one) and
  // slat-harness-known-gaps.test.ts (the three left as documented failing
  // expectations) for the per-gap adjudication and root causes.
  //
  // 66 is fixed in this change (mixin-application extends targets now
  // resolve to the mixin's base argument), so its checker verdict is
  // `true`. 67/68 record `false` — each carries the exact diagnostic its
  // known-gap pin asserts. 69 records `true` precisely BECAUSE its gap is
  // checker-invisible: the dropped interface method produces no finding at
  // all, which is what makes it the severe one.
  { fixture: '66-mixin-extends-call', entrySegments: ['src', 'index.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  {
    fixture: '67-implements-data-interface',
    entrySegments: ['src', 'index.ts'],
    expectConversionSuccess: true,
    recordedCheckerValid: false,
  },
  { fixture: '68-generic-type-parameters', entrySegments: ['src', 'index.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '69-interface-method-dropped', entrySegments: ['src', 'index.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  // Reconciliation controls for the single mixin-heritage helper (PR #152
  // + PR #153 merged into `getExtendsTargetName`). 66b records `false`:
  // its `StringBox extends Container<string>` carries the generic-base
  // finding of gap 68, which is the PRICE of property 1 being correct —
  // preserving the type arguments is what the reconciliation restores.
  // 66c records `false` for its own known gap (a zero-identifier mixin
  // falls back to the factory name, which the checker rejects).
  {
    fixture: '66b-mixin-heritage-controls',
    entrySegments: ['src', 'index.ts'],
    expectConversionSuccess: true,
    recordedCheckerValid: false,
  },
  {
    fixture: '66c-mixin-no-base-argument',
    entrySegments: ['src', 'index.ts'],
    expectConversionSuccess: true,
    recordedCheckerValid: false,
  },
  // NEW — the architecture-notebook ladder rung (a Lit web app plus a
  // node:http server). Three gaps the real target surfaced, each with its
  // own dedicated fail-then-pass suite; these entries commit the .tmd
  // golden layer for them. All three check clean, so the recorded verdict
  // is `true` — no pre-existing emitter defect survives on these shapes.
  //
  // 70: a mixin-application heritage clause (`class X extends Mixin(Base)`,
  // Lit's `SignalWatcher(LitElement)`) emitted `<: Mixin(Base)` — an
  // unparsable line, and a PARSE failure, so it also masked every later
  // diagnostic on the target. 51 diagnostics across the two web
  // entrypoints. Resolved by `getExtendsTargetName`, the single mixin-
  // heritage helper reconciled from PR #152 and PR #153: the call unwraps
  // to its base ARGUMENT, so `WithLogging(BaseWidget)` states the true
  // IS-A edge `<: BaseWidget`. The golden records that unwrapped edge
  // alongside the untouched `PlainWidget <: BaseWidget` control, which
  // pins property 1 (non-CallExpression heritage is byte-identical to
  // pre-#152 behavior).
  { fixture: '70-mixin-call-extends', entrySegments: ['src', 'index.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  // 71: a `.ts`-suffixed re-export specifier (`export { x } from
  // './types-list.ts'`, legal under allowImportingTsExtensions) tripped the
  // converter's private hand-rolled resolver, producing a false
  // "Re-export source module not found" warning. 17 instances on the
  // target's server entrypoint.
  { fixture: '71-ts-suffix-reexport', entrySegments: ['src', 'index.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  // 72: a side-effect import (`import './components/widget.ts'`, the
  // custom-elements registration idiom) bound no name, so the resolved
  // module edge never reached the importing File's `imports:` list and
  // every component file read as orphaned. 18 false orphaned-file
  // diagnostics on the target's web entrypoint.
  { fixture: '72-side-effect-import', entrySegments: ['src', 'index.ts'], expectConversionSuccess: true, recordedCheckerValid: true },
  // NEW — the sammons/code-outline-cli ladder rung (fixtures 78-81, see
  // rung-code-outline-cli.test.ts). 78 checks clean end to end: an
  // entrypoint that is itself an `export *` barrel now expands the star to
  // the source's real names AND records the barrel->source edge.
  {
    fixture: '78-entrypoint-barrel-star-export',
    entrySegments: ['src', 'index.ts'],
    expectConversionSuccess: true,
    recordedCheckerValid: true,
  },
  // 79 records `false`: every `syntax/error` is fixed (the function-type
  // alias round-trips), but `TreeVisitor`/`NodePredicate` are referenced
  // only from a function SIGNATURE, which lands on the deferred
  // call-graph-vs-import-graph orphan class
  // (ladder-diagnostic-disposition-r3-2026-08-29.md rank 5, TRUE under the
  // frozen RFC-TM-4 rule). The rung test asserts the syntax half directly.
  {
    fixture: '79-function-type-alias-remainder',
    entrySegments: ['src', 'index.ts'],
    expectConversionSuccess: true,
    recordedCheckerValid: false,
  },
  // 80 records `false` for the same deferred reason: `checker/multi-exported`
  // on the shared `Error` stub IS fixed (asserted in the rung test), and the
  // two residual findings are `CliArgumentError`/`FileProcessorError` —
  // declared-but-never-referenced error classes, the same rank-5 class.
  {
    fixture: '80-shared-builtin-extends-stub',
    entrySegments: ['src', 'index.ts'],
    expectConversionSuccess: true,
    recordedCheckerValid: false,
  },
  // 81 is deliberately absent: it is a two-package mini-workspace whose
  // entrypoint sits under `packages/cli/` with its own tsconfig, which this
  // harness's fixture-root-as-project-dir shape cannot express. Its goldens
  // and knownGap disposition live in rung-code-outline-cli.test.ts and
  // repros-analyzer/81-crosspkg-type-only-dto-field/README.md.
];

describe('RFC-TM-9 Q1 — .tmd goldens against the current language (per-fixture, RFC §8 golden discipline)', () => {
  for (const testCase of cases) {
    it(`${testCase.fixture}: conversion success=${testCase.expectConversionSuccess}, recorded checker verdict=${testCase.recordedCheckerValid}`, async () => {
      const projectDir = join(reprosDir, testCase.fixture);
      const entryPath = join(projectDir, ...testCase.entrySegments);
      const analyzer = new TypeScriptAnalyzer(projectDir);
      const analysis = analyzer.analyzeFromEntrypoint(entryPath);

      const converter = new TypeScriptToTypedMindConverter();
      const result = converter.convert(analysis);

      // This IS a Q1-owned assertion: conversion success/failure is fully
      // determined by the analyzer's output shape, which Q1's fixes own.
      assert.equal(result.success, testCase.expectConversionSuccess, `conversion success mismatch for ${testCase.fixture}`);

      if (!testCase.expectConversionSuccess) {
        // Conversion-failure fixtures (03-app-collision) have no .tmd to
        // golden — the failure itself is what Q2's X-CONV-4 fix resolves.
        return;
      }

      writeGolden(`${testCase.fixture}.tmd`, result.tmdContent);

      if (testCase.recordedCheckerValid === 'unchecked') {
        return;
      }

      // Recorded, not gated: the checker verdict on these fixtures depends
      // on Q2/Q3/emitter machinery outside Q1's scope (file header). A
      // verdict change here (e.g. this flips to `true` once Q2/Q3 land) is
      // an expected, welcome drift, not a failure of THIS Quantum's check —
      // so the assertion pins today's actual, verified verdict rather than
      // an aspirational one Q1 cannot deliver alone.
      const originalCwd = process.cwd();
      process.chdir('/');
      try {
        const typedMind = await TypedMind.create();
        const checkResult = typedMind.check(result.tmdContent);
        assert.equal(
          checkResult.valid,
          testCase.recordedCheckerValid,
          `recorded checker verdict drifted for ${testCase.fixture} (update recordedCheckerValid if this is expected progress): ${JSON.stringify(checkResult.diagnostics)}`,
        );
      } finally {
        process.chdir(originalCwd);
      }
    });
  }

  it('goldens-tmd/ has one .tmd file per conversion-succeeding fixture', () => {
    const succeeding = cases.filter((c) => c.expectConversionSuccess);
    for (const testCase of succeeding) {
      const goldenPath = join(goldenDir, `${testCase.fixture}.tmd`);
      assert.ok(existsSync(goldenPath), `missing golden: ${goldenPath}`);
      assert.ok(readFileSync(goldenPath, 'utf8').length > 0);
    }
  });
});
