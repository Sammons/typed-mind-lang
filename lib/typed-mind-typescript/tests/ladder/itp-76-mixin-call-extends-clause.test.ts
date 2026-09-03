// Fixture 76 — itp-maker ladder rung. A heritage clause's type is an
// `ExpressionWithTypeArguments`; for a MIXIN APPLICATION its
// `.expression` is a CallExpression, so `getTypeString`'s bare
// `getText()` returned the literal text `withMobx(LitElement)`. The
// converter emits that into the `<:` inherit slot, where the grammar's
// `inherit_list` accepts only bare entity names — one
// `Unparsable text: \`(LitElement)\`` finding per mixin-based class.
//
// Live evidence: itp-maker's Lit + MobX frontend, five components
// (`frontend/src/components/views/app-shell.ts:20`, `file-list.ts:13`,
// `toast-host.ts:11`, `job-list-view.ts:13`, `job-detail-view.ts:32`)
// each written as `class X extends withMobx(LitElement)`, producing 6
// `syntax/*` findings on the frontend entrypoint.
//
// Fixed by `getExtendsTargetName`, which unwraps a mixin call to its
// base argument — the base class, which is what the inheritance edge
// actually means: `withMobx(LitElement)` IS-A LitElement.
//
// Helper reconciliation (PR #152 / PR #153): this rung originally shipped
// `getHeritageTypeString` while the slat-harness rung shipped
// `getExtendsTargetName` for the same defect found in a different corpus.
// The two are now ONE helper, `getExtendsTargetName`, keeping every
// property either version had: the non-CallExpression path still returns
// `getTypeString(typeNode)` so generic bases keep their type arguments,
// the argument search still skips a leading options object, and nested
// mixin applications now recurse. Assertions below are unchanged.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(testDir, 'repros-analyzer', '76-mixin-call-extends-clause');

const analyze = () => {
  const analyzer = new TypeScriptAnalyzer(fixtureDir);
  return analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'index.ts'));
};

const convert = () => {
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analyze());
};

describe('fixture 76: a mixin CallExpression in an extends clause resolves to the base class', () => {
  it('the analyzer records the base class, not the raw call text', () => {
    const analysis = analyze();
    const indexModule = analysis.modules.find((module) => module.filePath.endsWith('index.ts'));
    const mixedChild = indexModule?.classes.find((cls) => cls.name === 'MixedChild');
    assert.notEqual(mixedChild, undefined, 'MixedChild class must be analyzed');
    assert.deepEqual([...(mixedChild?.extends ?? [])], ['BaseElement'], 'the extends target must unwrap to the mixin call argument');
  });

  it('no emitted extends target carries call-expression punctuation', () => {
    const result = convert();
    assert.equal(result.success, true);

    const withInherit = result.entities.filter(
      (entity) => typeof (entity as { extends?: unknown }).extends === 'string',
    ) as unknown as ReadonlyArray<{ name: string; extends: string }>;

    for (const entity of withInherit) {
      assert.ok(
        !entity.extends.includes('(') && !entity.extends.includes(')'),
        `${entity.name}'s extends target must be a bare entity name, got: ${JSON.stringify(entity.extends)}`,
      );
    }
  });

  it('control: a plain-identifier extends clause is unchanged', () => {
    const result = convert();
    assert.equal(result.success, true);

    const plainChild = result.entities.find((entity) => (entity as { name: string }).name === 'PlainChild') as unknown as
      | { extends?: string }
      | undefined;
    assert.equal(plainChild?.extends, 'BaseElement', 'a plain extends clause must keep emitting exactly as before');
  });

  it('checker verdict: zero syntax/* findings — the emitted .tmd parses clean', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({
      entities: result.entities as never,
      imports: [],
      suppressions: [],
      diagnostics: [],
    });
    const typedMind = await TypedMind.create();
    const checkResult = typedMind.check(longform);

    const syntaxFindings = checkResult.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
    assert.deepEqual(syntaxFindings, [], `a mixin-based extends clause must not produce syntax errors: ${JSON.stringify(syntaxFindings)}`);
  });
});
