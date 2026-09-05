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
  const analyzer = new TypeScriptAnalyzer(fixturePath('53-union-of-generics'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('53-union-of-generics', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('regression: a top-level union of generics (each nesting its own object-literal union) must not trip isUnionOfObjectLiterals', () => {
  it('SideBySideGenerics preserves both generic union members without invented DTO IO', () => {
    const result = convert();
    assert.equal(result.success, true);
    const entity = result.entities.find((e) => e.name === 'SideBySideGenerics');
    assert.notEqual(entity, undefined, 'SideBySideGenerics must be extracted as a real entity');
    assert.ok(entity instanceof TypeDefNode);
    assert.ok(
      result.tmdContent.includes(
        'SideBySideGenerics = Record<string, { a: string } | { b: string }> | Map<string, { c: string } | { d: string }>',
      ),
    );
    for (const fn of result.entities) if (fn instanceof FunctionNode) assert.equal(fn.input, undefined);
  });

  it('the emitted .tmd has zero diagnostics (no orphan, no syntax error)', async () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    assert.deepEqual(checkResult.diagnostics, [], `must have zero diagnostics: ${JSON.stringify(checkResult.diagnostics)}`);
  });
});
