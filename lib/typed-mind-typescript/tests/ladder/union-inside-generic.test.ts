// Adversarial-review regression fixture (PR #115 comment) — issue #114's
// fix (isUnionOfObjectLiterals) originally tracked bracket depth for
// `{()[]}` only, not `<>`. A union of object literals NESTED inside a
// generic (`Record<string, { a: string } | { b: string }>`) has its `|`
// sitting inside Record's OWN angle brackets, not at the alias's top
// level — the un-fixed depth tracker misread it as top-level the instant
// the first `{...}` member closed, misrouting `Shapes` to the TypeDef
// path and corrupting a PREVIOUSLY-correct emission (confirmed: without
// tracking `<`/`>`, the emitted text was
// `Record<string, { a: string } | { b: string }>>` — a doubled trailing
// `>>` the grammar rejects as unparsable). Fixed by counting `<`/`>`
// alongside the existing three bracket pairs.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('52-union-inside-generic'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('52-union-inside-generic', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('regression: a union nested inside a generic must not trip isUnionOfObjectLiterals', () => {
  it('Shapes (Record<string, {a}|{b}>) still converts as a DTO, not a TypeDef', () => {
    const result = convert();
    assert.equal(result.success, true);
    const shapes = result.entities.find((e) => e.name === 'Shapes');
    assert.notEqual(shapes, undefined, 'Shapes must be extracted as a real entity');
    assert.equal(shapes?.kind, 'DTO', `expected Shapes to stay a DTO (matching pre-#114-fix behavior), got kind: ${shapes?.kind}`);
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
