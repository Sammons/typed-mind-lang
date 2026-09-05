// RFC-TM-13 C-prime preserves the original issue #113 source quotes.
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
  it('TM13 CP: extraction retains source description quotes', () => {
    const result = convert();
    assert.equal(result.success, true);

    const needsItem = result.entities.find((e) => e.kind === 'DTO' && e.name === 'NeedsItem') as { purpose?: string } | undefined;
    assert.notEqual(needsItem, undefined, 'NeedsItem must be extracted as a real entity');
    assert.equal(
      needsItem?.purpose,
      'A "needs you" item — an agent waiting on the human in a thread.',
      `expected the full description with original quotes, got: ${JSON.stringify(needsItem?.purpose)}`,
    );
  });

  it('the emitted .tmd names NeedsItem with a single well-formed quoted description, no bare inner double quote', () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const needsItemLine = longform.split('\n').find((line) => line.includes('needs you'));
    assert.notEqual(needsItemLine, undefined, `expected a line containing the description text, got:\n${longform}`);
    assert.ok(needsItemLine?.includes(String.raw`\"needs you\"`), needsItemLine);
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
    const recovered = tm.parse(longform).entities.find((entity) => entity.name === 'NeedsItem');
    assert.equal(Reflect.get(recovered ?? {}, 'purpose'), 'A "needs you" item — an agent waiting on the human in a thread.');
  });
});
