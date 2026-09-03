// Real-target evaluation (sammons/architecture-notebook, a Lit web app +
// node:http server) — the mixin-application idiom `class X extends
// Mixin(Base)`, exactly Lit's own documented pattern
// (`extends SignalWatcher(LitElement)`). A heritage clause's expression is an
// arbitrary LeftHandSideExpression, not just an identifier, and when it is a
// CallExpression the analyzer's old `getTypeString` returned `getText()` on
// the whole clause — `WithLogging(BaseWidget)` — which the converter emitted
// verbatim into the `<:` slot as `LoggedWidget <: WithLogging(BaseWidget)`.
// The grammar's entity-name token rejects the parenthesized call tail, so
// every mixin-application subclass on the real target produced a checker
// finding: `Unparsable text: '(BaseWidget)'`. 51 diagnostics across the real
// target's two entrypoints trace to this one gap.
//
// That finding is a PARSE failure, so it also halted checking and masked
// every later diagnostic on the target — which is why this one gap's repair
// changed the target's raw diagnostic count in both directions.
//
// Fix: `getExtendsTargetName` in typescript-analyzer.ts — the single
// mixin-heritage helper reconciled from PR #152 (slat-harness, fixture 66,
// Lit + @lit-labs/signals) and PR #153 (itp-maker, fixture 76, Lit + MobX).
// A CallExpression heritage UNWRAPS TO ITS BASE ARGUMENT, so
// `WithLogging(BaseWidget)` yields `BaseWidget` and the emitted line is
// `LoggedWidget <: BaseWidget`.
//
// Unwrap-to-base is the right design, and this rung originally proposed the
// wrong one (drop the heritage clause). Two reviewers settled it empirically
// on PR #154: a mixin application's real inheritance edge is
// `WithLogging(BaseWidget)` IS-A `BaseWidget`, so naming the base records a
// TRUE edge. Dropping it instead emits a malformed empty `<:` line AND
// erases a real IS-A relationship. The comparison that decided it: a plain
// `class X extends LitElement` against an external base already produces an
// extends edge plus a "does not exist" diagnostic — unwrapping makes the
// mixin case byte-identical to that long-standing behavior, rather than
// inventing a third shape for it. The earlier "extends can only target
// Class/ClassFile, and a factory is a Function" objection argued against
// naming the CALLEE (`<: WithLogging`); it does not apply to naming the
// base ARGUMENT, which is a class.
//
// Property 1 of the helper — non-CallExpression heritage passes through
// `getTypeString` unchanged, preserving type arguments — is pinned by the
// `PlainWidget extends BaseWidget` control below.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('70-mixin-call-extends'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('70-mixin-call-extends', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('mixin-application heritage (`class X extends Mixin(Base)`) unwraps to its base argument instead of emitting unparsable text', () => {
  it('LoggedWidget is still extracted as a Class entity with its own members intact', () => {
    // Baseline sanity check: entity extraction itself was never broken by
    // this gap (only the extends edge and the resulting checker error
    // were), so this assertion passes on main too. It is here to pin the
    // starting shape the next two assertions build on, not as a regression
    // proof — see the next test for that.
    const result = convert();
    assert.equal(result.success, true);
    const loggedWidget = result.entities.find((e) => e.name === 'LoggedWidget') as { kind: string; methods: readonly string[] } | undefined;
    assert.notEqual(loggedWidget, undefined, 'LoggedWidget must be extracted as a real entity');
    assert.equal(loggedWidget?.kind, 'Class', `expected LoggedWidget to convert as Class, got kind: ${loggedWidget?.kind}`);
    assert.deepEqual(loggedWidget?.methods, ['describe'], "LoggedWidget's own describe method must survive the heritage unwrap");
  });

  it('LoggedWidget unwraps to its BASE ARGUMENT — `WithLogging(BaseWidget)` yields `<: BaseWidget`, the true IS-A edge', () => {
    // The regression proof for this gap. On main before #152/#153 this was
    // the literal call text `WithLogging(BaseWidget)`, which the grammar
    // rejects. `getExtendsTargetName` unwraps the CallExpression to the
    // base argument, so the recorded edge is the one the source actually
    // states — NOT the callee (`WithLogging`, a Function, which `extends`
    // may not target) and NOT nothing (which would erase a real edge).
    const result = convert();
    assert.equal(result.success, true);
    const loggedWidget = result.entities.find((e) => e.name === 'LoggedWidget') as { extends: string | undefined } | undefined;
    assert.notEqual(loggedWidget, undefined, 'LoggedWidget must be extracted as a real entity');
    assert.equal(
      loggedWidget?.extends,
      'BaseWidget',
      `expected the mixin call to unwrap to its base argument, got: ${JSON.stringify(loggedWidget?.extends)}`,
    );
  });

  it('CONTROL: PlainWidget (an Identifier heritage clause) still HAS its extends edge pointing at BaseWidget', () => {
    // Control, not a regression assertion for the gap itself — this passes
    // on main too. It proves the fix is narrow: only a CallExpression
    // heritage expression is affected, an ordinary identifier subclass is
    // untouched.
    const result = convert();
    assert.equal(result.success, true);
    const plainWidget = result.entities.find((e) => e.name === 'PlainWidget') as { kind: string; extends: string | undefined } | undefined;
    assert.notEqual(plainWidget, undefined, 'PlainWidget must be extracted as a real entity');
    assert.equal(plainWidget?.kind, 'Class');
    assert.equal(
      plainWidget?.extends,
      'BaseWidget',
      `expected PlainWidget's extends edge to survive unchanged, got: ${JSON.stringify(plainWidget?.extends)}`,
    );
  });

  it('the emitted .tmd has zero syntax/* checker findings — the fixture checks fully clean', async () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    assert.deepEqual(
      checkResult.diagnostics,
      [],
      `expected the whole fixture to check clean, got: ${JSON.stringify(checkResult.diagnostics)}`,
    );
  });
});
