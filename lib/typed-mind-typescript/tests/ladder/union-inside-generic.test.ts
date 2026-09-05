// RFC-TM-13 EXIT: preserve the complete generic alias now that the grammar
// handles nested object unions. The historical empty DTO lost these facts.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FunctionNode, SyntaxEmitter, TypeDefNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath('52-union-inside-generic'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('52-union-inside-generic', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('regression: a union nested inside a generic must not trip isUnionOfObjectLiterals', () => {
  it('Shapes preserves its generic and object-union alias', () => {
    const result = convert();
    assert.equal(result.success, true);
    const shapes = result.entities.find((e) => e.name === 'Shapes');
    assert.notEqual(shapes, undefined, 'Shapes must be extracted as a real entity');
    assert.ok(shapes instanceof TypeDefNode);
    assert.ok(result.tmdContent.includes('Shapes = Record<string, { a: string } | { b: string }>'));
    for (const fn of result.entities) if (fn instanceof FunctionNode) assert.equal(fn.input, undefined);
  });

  it('the emitted .tmd has no doubled/unbalanced angle bracket and parses cleanly', async () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    assert.ok(!longform.includes('>>'), `must not contain a doubled trailing '>>' , got:\n${longform}`);
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    assert.deepEqual(checkResult.diagnostics, [], `must have zero diagnostics: ${JSON.stringify(checkResult.diagnostics)}`);
  });
});
