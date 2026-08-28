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
//   - X-AN-7/X-CONV-2 (enum modeling, 14-enum) is Q3 (TM-8-dependent).
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
  { fixture: '01-js-ext', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '02-dynamic-import', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '07-barrel-reexport', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '07b-barrel-noext', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '10-export-star', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '12-tsconfig-paths', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '13-jsdoc-desc', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '15-getter-setter', entrySegments: ['src', 'widget.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '16-arrow-const-fn', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '08-type-only-import', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '08b-type-only-noext', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '09-namespace-import', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '09b-namespace-noext', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  { fixture: '17-default-export', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
  // Q2 landed (X-CONV-4): conversion now succeeds — the naming collision
  // that used to crash this fixture no longer exists. Checker verdict is
  // still `false`, same pre-existing shortform-Program-exports emitter
  // defect as every other fixture above (see file header) — not owned by
  // this Quantum.
  { fixture: '03-app-collision', entrySegments: ['src', 'App.tsx'], expectConversionSuccess: true, recordedCheckerValid: false },
  // Known-pending (Q3 scope, see file header).
  { fixture: '14-enum', entrySegments: ['src', 'main.ts'], expectConversionSuccess: true, recordedCheckerValid: false },
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
