// RFC-TM-14 U8 EXIT + RFC-TM-15 V4 EXIT: pin the live diagnostic counts
// for self (typed-mind-typescript) and core (typed-mind) after all TM-14
// and TM-15 Quantums merge. Baseline: Q2 head 1f2893b (self 23, core 19).
// Full attribution: [[rfc-tm-14-15-exit-results]].
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const repoRoot = join(import.meta.dirname, '../../../..');

const analyzeAndCheck = async (projectDir: string, configPath: string, entrypoint: string) => {
  const analysis = new TypeScriptAnalyzer(projectDir, configPath).analyzeFromEntrypoint(entrypoint);
  const converted = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(converted.success, true, JSON.stringify(converted.errors));
  const tm = await TypedMind.create();
  const checked = tm.check(converted.tmdContent);
  return {
    entityCount: converted.entities.length,
    diagnostics: checked.diagnostics,
    orphans: checked.diagnostics.filter((d) => d.message.startsWith("Orphaned entity '")),
  };
};

describe('TM14/15 EXIT: self (typed-mind-typescript)', () => {
  it('self has 13 active diagnostics (down from 23 at Q2)', async () => {
    const result = await analyzeAndCheck(
      join(repoRoot, 'lib/typed-mind-typescript'),
      join(repoRoot, 'lib/typed-mind-typescript/tsconfig.json'),
      join(repoRoot, 'lib/typed-mind-typescript/src/cli.ts'),
    );
    assert.equal(
      result.diagnostics.length,
      13,
      `expected 13 diagnostics, got ${result.diagnostics.length}: ${result.diagnostics.map((d) => d.message).join(', ')}`,
    );
  });

  it('self retained orphans are exactly the known set', async () => {
    const result = await analyzeAndCheck(
      join(repoRoot, 'lib/typed-mind-typescript'),
      join(repoRoot, 'lib/typed-mind-typescript/tsconfig.json'),
      join(repoRoot, 'lib/typed-mind-typescript/src/cli.ts'),
    );
    const orphanNames = result.orphans
      .map((d) => d.message.replace("Orphaned entity '", '').replace("'", ''))
      .sort();
    assert.deepEqual(orphanNames, [
      'AccumulatorSlots',
      'CONSTRUCTOR_MEMBER',
      'CST_FINAL_TWIN_COUNT',
      'CST_LOGICAL_CLASS_COUNT',
      'CST_NAMED_NODE_TYPE_COUNT',
      'ParameterSource',
      'ParsedCallReference',
      'collapseToSingleLineType',
      'isImportDeclaration',
      'parenthesizeTypeQueryText',
      'schemaBaseName',
      'spanCoversLine',
      'toValidationErrors',
    ]);
  });
});

describe('TM14/15 EXIT: core (typed-mind)', () => {
  it('core has 7 active diagnostics (down from 19 at Q2)', async () => {
    const result = await analyzeAndCheck(
      join(repoRoot, 'lib/typed-mind'),
      join(repoRoot, 'lib/typed-mind/tsconfig.json'),
      join(repoRoot, 'lib/typed-mind/src/typed-mind.ts'),
    );
    assert.equal(
      result.diagnostics.length,
      7,
      `expected 7 diagnostics, got ${result.diagnostics.length}: ${result.diagnostics.map((d) => d.message).join(', ')}`,
    );
  });

  it('core retained orphans are exactly the known set', async () => {
    const result = await analyzeAndCheck(
      join(repoRoot, 'lib/typed-mind'),
      join(repoRoot, 'lib/typed-mind/tsconfig.json'),
      join(repoRoot, 'lib/typed-mind/src/typed-mind.ts'),
    );
    const orphanNames = result.orphans
      .map((d) => d.message.replace("Orphaned entity '", '').replace("'", ''))
      .sort();
    assert.deepEqual(orphanNames, [
      'AccumulatorSlots',
      'CST_FINAL_TWIN_COUNT',
      'CST_LOGICAL_CLASS_COUNT',
      'CST_NAMED_NODE_TYPE_COUNT',
      'ParameterSource',
      'spanCoversLine',
      'toValidationErrors',
    ]);
  });
});
