// issue #113 — the emitter broke on inner double quotes in a description
// because the grammar's `string` token (`/"[^"\n]*"/`, grammar.js:1209) has
// no escape production for `"`. Repro'd against the real slat-harness
// corpus (`NeedsItem`'s JSDoc: `A "needs you" item...`). Fixed by
// `escapeDescriptionQuotes` in typescript-to-typedmind-converter.ts,
// swapping an embedded `"` for `'` — a meaning-preserving substitution the
// grammar's `string` token can actually carry, mirroring the existing
// `collapseDescription` newline-collapse precedent (mechanical, no
// truncation, no grammar change).
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath('50-description-inner-quotes'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('50-description-inner-quotes', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('issue #113: a description with an inner double-quoted phrase round-trips through emission and parses', () => {
  it('the DTO purpose text is extracted with the inner quotes swapped to single quotes, not truncated', () => {
    const result = convert();
    assert.equal(result.success, true);

    const needsItem = result.entities.find((e) => e.kind === 'DTO' && e.name === 'NeedsItem') as { purpose?: string } | undefined;
    assert.notEqual(needsItem, undefined, 'NeedsItem must be extracted as a real entity');
    assert.equal(
      needsItem?.purpose,
      "A 'needs you' item — an agent waiting on the human in a thread.",
      `expected the full description with swapped quotes, got: ${JSON.stringify(needsItem?.purpose)}`,
    );
  });

  it('the emitted .tmd names NeedsItem with a single well-formed quoted description, no bare inner double quote', () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const needsItemLine = longform.split('\n').find((line) => line.includes('needs you'));
    assert.notEqual(needsItemLine, undefined, `expected a line containing the description text, got:\n${longform}`);
    // The grammar's `string` token is `/"[^"\n]*"/` — a well-formed quoted
    // description has exactly two `"` characters on its line (open/close).
    const quoteCount = (needsItemLine?.match(/"/g) ?? []).length;
    assert.equal(
      quoteCount,
      2,
      `expected exactly 2 double quotes (open+close) on the description line, got ${quoteCount}: ${JSON.stringify(needsItemLine)}`,
    );
  });

  it('the emitted .tmd parses cleanly (checker verdict has zero syntax/* findings)', async () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    const syntaxFindings = checkResult.diagnostics.filter((d) => d.code.startsWith('syntax/'));
    assert.deepEqual(syntaxFindings, [], `must have zero syntax/* findings: ${JSON.stringify(syntaxFindings)}`);
  });
});
