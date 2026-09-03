// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2).
//
// Fixture 66 — a mixin application in an `extends` clause. FIXED in this
// change: `TypeScriptAnalyzer.getExtendsTargetName` unwraps a
// CallExpression base to the mixin's own base argument, so the extends
// target names the real prototype ancestor instead of leaking the call
// text into the emitted `.tmd`.
//
// Before the fix, the harness target emitted
// `SlatLeaf <: SignalWatcher(LitElement)` and the checker reported
// `Unparsable text: \`(LitElement)\`` — a PARSE failure, which halted
// checking and masked 160 further diagnostics on that target.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixtureDir = join(reprosDir, '66-mixin-extends-call');

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixtureDir);
  const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('slat-harness rung: a mixin application in an extends clause resolves to its base argument', () => {
  it('the zero-method class extends the mixin base, not the call expression', () => {
    const result = convert();
    assert.equal(result.success, true);
    const entity = result.entities.find((e) => e.name === 'IsolatedLeaf');
    assert.notEqual(entity, undefined, 'IsolatedLeaf must be extracted');
    // The defect emitted `applyMixin(BaseWidget)` here.
    assert.equal(entity?.extends, 'BaseWidget');
  });

  it('the with-methods class (ClassFile path) resolves identically', () => {
    const result = convert();
    const entity = result.entities.find((e) => e.name === 'LightWidget');
    assert.notEqual(entity, undefined, 'LightWidget must be extracted');
    assert.equal(entity?.extends, 'BaseWidget');
  });

  it('no extends target leaks parenthesis syntax into any emitted entity', () => {
    const result = convert();
    for (const entity of result.entities) {
      const extendsTarget = (entity as { extends?: string }).extends;
      if (extendsTarget !== undefined) {
        assert.ok(!extendsTarget.includes('('), `extends target must be a bare entity name, got: ${extendsTarget}`);
      }
    }
  });

  it('the emitted .tmd has zero diagnostics', async () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({
      entities: result.entities as never,
      imports: [],
      suppressions: [],
      diagnostics: [],
    });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    assert.deepEqual(checkResult.diagnostics, [], `must have zero diagnostics: ${JSON.stringify(checkResult.diagnostics)}`);
  });
});
