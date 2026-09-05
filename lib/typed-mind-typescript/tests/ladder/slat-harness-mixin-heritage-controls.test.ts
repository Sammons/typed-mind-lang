// Reconciliation controls for the single mixin-heritage helper
// (`TypeScriptAnalyzer.getExtendsTargetName`), which merges PR #152's
// `getExtendsTargetName` and PR #153's `getHeritageTypeString`. Each of
// the three properties below was got right by exactly one of the two
// original versions; these checks stop either behavior regressing out.
//
// Fixture 66b covers properties 1 and 2 (all clean). Fixture 66c covers
// property 3, whose named constructor return is resolved by RFC-TM-13 H.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');

const analyze = (fixture: string) => {
  const fixtureDir = join(reprosDir, fixture);
  const analyzer = new TypeScriptAnalyzer(fixtureDir);
  return analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'index.ts'));
};

const convert = (fixture: string) => {
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analyze(fixture));
};

const extendsTargetOf = (fixture: string, className: string): string | undefined => {
  const analysis = analyze(fixture);
  for (const module of analysis.modules) {
    const cls = module.classes.find((candidate) => candidate.name === className);
    if (cls !== undefined) {
      return cls.extends[0];
    }
  }
  return undefined;
};

const diagnose = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({
    entities: entities as never,
    imports: [],
    suppressions: [],
    diagnostics: [],
  });
  const tm = await TypedMind.create();
  return tm.check(longform).diagnostics;
};

describe('mixin heritage reconciliation, property 1: a non-CallExpression base keeps its type arguments', () => {
  it('`extends Container<string>` records `Container<string>`, not `Container`', () => {
    // PR #152's version used `type.expression.getText()` and dropped the
    // type arguments — the blocker this reconciliation fixes. The guard
    // is `ts.isCallExpression`, falling through to
    // `getTypeString(typeNode)` on the whole type node.
    assert.equal(extendsTargetOf('66b-mixin-heritage-controls', 'StringBox'), 'Container<string>');
  });
});

describe('mixin heritage reconciliation, property 2: the base is searched for among the arguments', () => {
  it('a leading options object is skipped — `configurableMixin({ opt: 1 }, BaseWidget)` yields `BaseWidget`', () => {
    // PR #152's version took `arguments[0]` and re-leaked `{ opt: 1 }`.
    assert.equal(extendsTargetOf('66b-mixin-heritage-controls', 'ConfiguredWidget'), 'BaseWidget');
  });

  it('a nested mixin application recurses — `outer(inner(BaseWidget))` yields `BaseWidget`', () => {
    // PR #153's version searched only one level.
    assert.equal(extendsTargetOf('66b-mixin-heritage-controls', 'NestedWidget'), 'BaseWidget');
  });

  it('no heritage target leaks parenthesis or brace syntax', () => {
    const analysis = analyze('66b-mixin-heritage-controls');
    for (const module of analysis.modules) {
      for (const cls of module.classes) {
        for (const target of cls.extends) {
          assert.ok(
            !target.includes('(') && !target.includes('{'),
            `extends target must be a bare entity name or generic type, got: ${target}`,
          );
        }
      }
    }
  });

  it('the two mixin classes emit no diagnostic of their own', async () => {
    // Scoped deliberately to the mixin classes rather than asserting a
    // globally-clean fixture. `StringBox extends Container<string>` DOES
    // carry one finding — `checker/unknown-base-class`, because a generic
    // base name is unresolvable while type parameters stay unmodeled
    // (gap 68, pinned in slat-harness-known-gaps.test.ts). That finding is
    // the price of property 1 being correct: dropping the type arguments
    // would silence it by discarding real information, which is exactly
    // the blocker this reconciliation fixes. Asserting zero diagnostics
    // here would therefore pressure a future author to reintroduce the bug.
    const result = convert('66b-mixin-heritage-controls');
    assert.equal(result.success, true);
    const diagnostics = await diagnose(result.entities);

    const mixinFindings = diagnostics.filter((d) => /'(ConfiguredWidget|NestedWidget)'/.test(d.message));
    assert.deepEqual(mixinFindings, [], `the mixin-resolved classes must be clean: ${JSON.stringify(mixinFindings.map((d) => d.message))}`);

    const unrelated = diagnostics.filter((d) => !/'StringBox'/.test(d.message));
    assert.deepEqual(
      unrelated,
      [],
      `the only expected finding is StringBox's generic-base gap: ${JSON.stringify(unrelated.map((d) => d.message))}`,
    );
  });

  it('the generic-base finding on StringBox is gap 68, not a heritage-helper defect', async () => {
    const result = convert('66b-mixin-heritage-controls');
    const diagnostics = await diagnose(result.entities);
    const finding = diagnostics.find((d) => /Class 'StringBox' extends 'Container<string>' which does not exist/.test(d.message));
    assert.notEqual(
      finding,
      undefined,
      `the generic base must still be recorded verbatim (property 1) even though the checker cannot resolve it; got: ${JSON.stringify(diagnostics.map((d) => d.message))}`,
    );
  });
});

describe('mixin heritage reconciliation, property 3: named factory-return identity', () => {
  it('retains the written factory fallback beside a proven returned class identity', () => {
    const analysis = analyze('66c-mixin-no-base-argument');
    const classes = analysis.modules.flatMap((module) => module.classes);
    const derived = classes.find((cls) => cls.name === 'SelfMadeWidget');
    const base = classes.find((cls) => cls.name === 'Widget');
    assert.equal(derived?.extends[0], 'makeWidget');
    assert.deepEqual(derived?.factoryHeritage?.[0]?.origin, { kind: 'project', declaration: base?.declaration });
  });

  it('emits the actual Widget base and the original fixture checks clean', async () => {
    const result = convert('66c-mixin-no-base-argument');
    assert.equal(result.success, true);
    assert.match(result.tmdContent, /SelfMadeWidget <: Widget/);
    assert.deepEqual(await diagnose(result.entities), []);
  });
});
