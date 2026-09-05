// Ladder rung for sammons/bens-almanac — a 5-package SST app (root + four
// packages, 5 tsconfigs) whose per-package `handler.ts` files make the same
// exported name recur across packages, the collision class behind closed
// issue #45. Four fixtures (86-89), each distilled from a diagnostic the live
// extraction produced against that repo.
//
// Live baseline (extractor at 264f735, checker via `--check`):
//   src/api/index.ts                       57 diagnostics (partial output)
//   src/engine/event-processor.ts          51
//   src/engine/rule-fan-out.ts             50
//   src/engine/household-tick.ts           47
//   src/ingestion/mfr-pdf/handler.ts       34
//   src/engine/daily-tick.ts               31
//   src/api/climate-refresh.ts             31
//   packages/usda-ingestion/src/handler.ts  7 -> 4
//   packages/vehicle-data/src/index.ts      7 -> 0 (fixture 89)
//   packages/nhtsa-ingestion/src/handler.ts 6 -> 4
//   packages/vehicle-data/src/seed.ts       3
//   packages/almanac-ctl/src/index.ts       1
//
// Fixtures 87 and 89 are fix-bound: each fails on main and passes here.
// Fixture 86 is fix-bound on its PIPELINE half and pins a grammar knownGap.
// Fixture 88 is a documented knownGap. See each fixture's README.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseTypeExprText, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const analyzeFixture = (name: string) => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(name));
  return analyzer.analyzeFromEntrypoint(fixturePath(name, 'src', 'index.ts'));
};

const convertFixture = (name: string) => {
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analyzeFixture(name));
};

// The module-graph.json exact edge-list golden (RFC-TM-9 §1, the Q1 leaf
// check): a correct-count/wrong-target regression fails on the target field.
const assertModuleGraphGolden = (name: string): void => {
  const analysis = analyzeFixture(name);
  const actual = analysis.moduleGraph.map((edge) => ({
    sourceModule: edge.sourceModule,
    specifier: edge.specifier,
    resolvedTarget: edge.resolvedTarget,
    classification: edge.classification,
  }));
  const golden: unknown = JSON.parse(readFileSync(fixturePath(name, 'module-graph.json'), 'utf8'));
  assert.deepEqual(actual, golden, 'module-graph.json must exact-match: source, specifier, resolved target, classification');
};

const checkTmd = async (tmdContent: string) => {
  const typedMind = await TypedMind.create();
  return typedMind.check(tmdContent);
};

const diagnosticCodes = (result: { diagnostics: readonly { code: string }[] }): string[] => {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
};

describe('86 — a union inside a generic in a function-type return position', () => {
  // `scanOpaqueRun` counted angle depth only when `inGenericArgs` was true but
  // consulted `angleDepth` in its `|`/`&` break regardless, so at the top
  // level the `<` of `Promise<` never bumped the depth and the `|` inside the
  // generic's args read as a TOP-LEVEL union operator, ending the opaque run
  // mid-type. See the fixture README for the full trace.
  it('leaves no remainder — the whole function type is one opaque leaf', () => {
    const result = parseTypeExprText('(pk: string, sk: string) => Promise<DedupRecord | null>');
    assert.equal(
      result.remainder ?? '',
      '',
      'a non-empty remainder is what this module\'s own doc comment calls a parser bug; the stranded ">" was the symptom',
    );
    assert.equal(result.typeExpr?.kind, 'opaque', 'a function type has no structured kind in this grammar (RFC-TM-8 §1)');
  });

  it('does not split the function type into a bogus union', () => {
    const result = parseTypeExprText('(pk: string, sk: string) => Promise<DedupRecord | null>');
    assert.equal(
      (result.typeExpr as { text?: string } | undefined)?.text,
      '(pk: string, sk: string) => Promise<DedupRecord | null>',
      'the union member split was `... => Promise<DedupRecord` + `null`',
    );
  });

  it('control: a genuinely top-level union still splits on `|`', () => {
    // This is what the `|` break exists for and what the fix must not break:
    // with no enclosing generic, `Rec | null` IS a top-level union.
    const result = parseTypeExprText('(x: string) => Rec | null');
    assert.equal(result.remainder ?? '', '');
    assert.equal(result.typeExpr?.kind, 'union');
  });

  it('control: a standalone generic over a union is unchanged', () => {
    const result = parseTypeExprText('Promise<Rec | null>');
    assert.equal(result.remainder ?? '', '');
    assert.equal(result.typeExpr?.kind, 'generic');
  });

  it('emits the corpus field intact, on one line', () => {
    const result = convertFixture('86-fn-type-union-in-generic-return');
    assert.equal(result.success, true);
    assert.match(result.tmdContent, /- getDedupRecord: \(pk: string, sk: string\) => Promise<DedupRecord \| null>/);
  });

  it('controls: the union-free siblings were already correct and stay correct', () => {
    const result = convertFixture('86-fn-type-union-in-generic-return');
    assert.match(result.tmdContent, /- getWatermark: \(\) => Promise<string>/);
    assert.match(result.tmdContent, /- writeDedupRecord: \(record: DedupRecord\) => Promise<void>/);
  });

  it('module-graph golden: a single-file fixture has no edges', () => {
    assertModuleGraphGolden('86-fn-type-union-in-generic-return');
  });

  it('TM13 C: the grammar accepts the complete spaced generic union return', async () => {
    const result = convertFixture('86-fn-type-union-in-generic-return');
    assert.deepEqual(diagnosticCodes(await checkTmd(result.tmdContent)), []);
    const malformed = result.tmdContent.replace('Promise<DedupRecord | null>', 'Promise<DedupRecord | null');
    assert.ok(diagnosticCodes(await checkTmd(malformed)).includes('syntax/error'));
  });
});

describe('87 — a multi-line DTO field type leaks its source newlines', () => {
  // `sanitizeFieldType` ended in a bare `.trim()`, which strips only the
  // leading and trailing whitespace run. A DTO field line in the grammar is
  // single-line, so every interior newline split one field across several
  // lines. The helper `collapseTypeWhitespace` already existed and was already
  // used for function RETURN types; this applies it to fields too.
  it('emits a multi-line function-type field on exactly one line', () => {
    const result = convertFixture('87-multiline-dto-field-type');
    assert.equal(result.success, true);
    const fieldLines = result.tmdContent.split('\n').filter((line) => line.includes('checkSupersession'));
    assert.equal(fieldLines.length, 1, `the three-line source must not leak its line breaks. Got:\n${result.tmdContent}`);
  });

  it('collapses rather than truncates — the full type text survives', () => {
    // RECONCILED with PR #158's fixture 91 (mail-agent), which found this same
    // defect from another corpus and carried the normalization further: the
    // collapsed text now also drops the dangling comma before `)` and the
    // space just inside the brackets, neither of which is legal — nor emitted —
    // in the single-line spelling. The expected text changed from
    // `( make: string, ..., )` to `(make: string, ...)` accordingly. That is
    // strictly closer to this fixture's own stated goal: the
    // `singleLineTarget` control below is now byte-identical in shape to these
    // collapsed multi-line fields, which is what "collapse to the single-line
    // form" means. Every token of the source type is still present.
    const result = convertFixture('87-multiline-dto-field-type');
    assert.match(
      result.tmdContent,
      /- checkSupersession: \(make: string, model: string, yearRange: \[number, number\]\) => Promise<\{ ruleId: string; severity: string \} \| null>/,
      'every token of the source type must still be present, just on one line',
    );
  });

  it('collapses the second multi-line field too', () => {
    const result = convertFixture('87-multiline-dto-field-type');
    const fieldLines = result.tmdContent.split('\n').filter((line) => line.includes('createPr'));
    assert.equal(fieldLines.length, 1);
    assert.match(
      result.tmdContent,
      /- createPr: \(content: PrContent, files: Array<\{ path: string; content: string \}>\) => Promise<number>/,
    );
  });

  it('control: the single-line sibling was already correct and is unchanged', () => {
    const result = convertFixture('87-multiline-dto-field-type');
    assert.match(result.tmdContent, /- singleLineTarget: \(make: string, model: string\) => Promise<number>/);
  });

  it('the collapsed multi-line form is spelled exactly like the single-line form', () => {
    // The reconciliation check (PR #158 fixture 91 + this fixture). Both
    // spellings of a function type must emit identical bracket-and-comma
    // punctuation; if they ever diverge again, the collapse has stopped being
    // a normalization and become a second dialect.
    const result = convertFixture('87-multiline-dto-field-type');
    const multiLinePunctuation = /- checkSupersession: \((?:[^)]*)\) =>/.exec(result.tmdContent)?.[0];
    const singleLinePunctuation = /- singleLineTarget: \((?:[^)]*)\) =>/.exec(result.tmdContent)?.[0];
    assert.ok(multiLinePunctuation !== undefined && singleLinePunctuation !== undefined);
    // Neither opens with `( ` nor closes with `, )`.
    for (const line of [multiLinePunctuation, singleLinePunctuation]) {
      assert.equal(line.includes('( '), false, `no space just inside the opener: ${line}`);
      assert.equal(line.includes(', )'), false, `no dangling comma before the closer: ${line}`);
    }
  });

  it('no DTO field line contains a stray newline-induced fragment', () => {
    const result = convertFixture('87-multiline-dto-field-type');
    // The pre-fix emission left bare `make: string,` / `content: PrContent,`
    // lines that parse as neither a field nor anything else.
    assert.equal(result.tmdContent.includes('\n    make: string,'), false);
    assert.equal(result.tmdContent.includes('\n    content: PrContent,'), false);
  });

  it('module-graph golden: a single-file fixture has no edges', () => {
    assertModuleGraphGolden('87-multiline-dto-field-type');
  });
});

describe('88 — default identifiers retain canonical ownership and initializer references', () => {
  it('the analyzer resolves the default export to the real local declaration', () => {
    const analysis = analyzeFixture('88-export-assignment-default');
    const healthModule = analysis.modules.find((module) => module.filePath.endsWith('health.ts'));
    const app = healthModule?.constants.find((constant) => constant.name === 'app');
    assert.ok(app);
    assert.deepEqual(healthModule?.exports.find((exp) => exp.isDefault)?.declaration, app.declaration);
  });

  it('the importer references the canonical default identity', () => {
    const result = convertFixture('88-export-assignment-default');
    assert.equal(result.success, true);
    const indexFile = result.entities.find((entity) => entity.kind === 'File' && entity.path.endsWith('src/index.ts'));
    assert.ok(indexFile?.kind === 'File');
    assert.deepEqual(indexFile.imports, ['HealthFile.default', 'namedHelper']);
  });

  it('control: the named import in the same module graph resolves correctly', () => {
    const result = convertFixture('88-export-assignment-default');
    const helperFile = result.entities.find((entity) => entity.kind === 'File' && entity.path.endsWith('helper.ts')) as
      | { exports: readonly string[] }
      | undefined;
    assert.deepEqual([...(helperFile?.exports ?? [])], ['namedHelper']);
  });

  it('module-graph golden: both internal source edges remain unchanged', () => {
    // This is what makes the gap a converter/analyzer modeling defect rather
    // than a traversal limit: the analyzer already resolves and follows the
    // route module. Only the export/import NAME binding is lost.
    assertModuleGraphGolden('88-export-assignment-default');
  });
});

describe('89 — a barrel entrypoint double-claims its named re-exports', () => {
  // `extractPublicExportsFromEntrypoint` read `moduleExports.namedExports`,
  // which carries no provenance, and never applied the `isReExport` check that
  // `convertExports` has always applied at its own call sites. So a re-exported
  // name landed in Program.exports while the DEFINING file also listed it.
  it('does not list a re-exported name in the Program exports', () => {
    const result = convertFixture('89-barrel-named-reexport-multi-exported');
    assert.equal(result.success, true);
    const programEntity = result.entities.find((entity) => entity.kind === 'Program') as { exports?: readonly string[] } | undefined;
    assert.deepEqual(
      [...(programEntity?.exports ?? [])],
      ['barrelOwnHelper'],
      'the barrel exports only what it DECLARES; the two re-exported names belong to NormalizeFile',
    );
  });

  it('the defining file keeps its own exports', () => {
    const result = convertFixture('89-barrel-named-reexport-multi-exported');
    const normalizeFile = result.entities.find((entity) => entity.kind === 'File' && entity.path.endsWith('normalize.ts')) as
      | { exports: readonly string[] }
      | undefined;
    assert.deepEqual([...(normalizeFile?.exports ?? [])], ['normalizeVehicleString', 'canonicalVehicleSlug']);
  });

  it('the re-exported names still reach the barrel as reExports, not dropped', () => {
    // RFC-TM-11 §RX-4: excluding a re-export from `exports` must not discard
    // it — `isFileConsumed` and the orphan rule both read `reExports`.
    const result = convertFixture('89-barrel-named-reexport-multi-exported');
    const indexFile = result.entities.find((entity) => entity.kind === 'File' && entity.path.endsWith('src/index.ts')) as
      | { reExports?: readonly string[] }
      | undefined;
    assert.deepEqual([...(indexFile?.reExports ?? [])], ['normalizeVehicleString', 'canonicalVehicleSlug']);
  });

  it('module-graph golden: the barrel resolves internal to normalize.ts', () => {
    assertModuleGraphGolden('89-barrel-named-reexport-multi-exported');
  });

  it('checks clean end to end — no checker/multi-exported', async () => {
    const result = convertFixture('89-barrel-named-reexport-multi-exported');
    const checkResult = await checkTmd(result.tmdContent);
    assert.deepEqual(diagnosticCodes(checkResult), []);
    assert.equal(checkResult.valid, true);
  });
});
