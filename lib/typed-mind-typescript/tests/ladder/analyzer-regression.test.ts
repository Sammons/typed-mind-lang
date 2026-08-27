// RFC-TM-9 Q1 check (2) — all gap-bound analyzer repros fail-then-pass per
// fix, controls labeled and green. This suite exercises TypeScriptAnalyzer
// directly (not the built CLI) against the fixtures under
// tests/ladder/repros-analyzer/, asserting the SHAPE the census adjudicated
// as broken now resolves correctly.
//
// `cannot_exit_validation_on_absence_of_failing_check`: each gap-bound case
// below is a positive assertion on parsed-module structure (entity names,
// signatures, resolved paths) — never a bare "did not throw" or a
// count-only check. Controls (08/08b/09/09b/17) are labeled explicitly and
// assert the SAME sound behavior the census already verified — they are
// non-regression proofs, not fix-bound.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');

const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

describe('RFC-TM-9 Q1 check (2) — gap-bound analyzer repros (X-AN-1)', () => {
  it('census gap 2 (.js-suffix NodeNext imports): 01-js-ext resolves helper.ts through the .js specifier', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('01-js-ext'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('01-js-ext', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 2, 'expected main.ts + helper.ts, the .js-suffixed import must resolve');
    const helperModule = analysis.modules.find((m) => m.filePath.endsWith('helper.ts'));
    assert.notEqual(helperModule, undefined, 'helper.ts must be discovered via the .js-suffixed import');
    assert.equal(helperModule?.functions[0]?.name, 'helperFn');

    const mainModule = analysis.modules.find((m) => m.filePath.endsWith('main.ts'));
    assert.equal(mainModule?.imports[0]?.specifier, './helper.js');

    // module-graph.json exact edge-list assertion (RFC §1, the Q1 leaf
    // check): the edge must classify internal and target helper.ts exactly.
    const edge = analysis.moduleGraph.find((e) => e.specifier === './helper.js');
    assert.notEqual(edge, undefined);
    assert.equal(edge?.classification, 'internal');
    assert.ok(edge?.resolvedTarget?.endsWith('helper.ts'));
  });

  it('census gap 3 (directory/barrel imports): 07b-barrel-noext resolves ./lib to lib/index.ts and follows the chain', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('07b-barrel-noext'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('07b-barrel-noext', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 3, 'expected main.ts + lib/index.ts + lib/widget.ts');
    assert.ok(analysis.modules.some((m) => m.filePath.endsWith('lib/index.ts')));
    assert.ok(analysis.modules.some((m) => m.filePath.endsWith('lib/widget.ts')));
  });

  it('census gap 3 (directory/barrel imports, extensioned): 07-barrel-reexport resolves the barrel chain', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('07-barrel-reexport'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('07-barrel-reexport', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 3);
    const widgetModule = analysis.modules.find((m) => m.filePath.endsWith('lib/widget.ts'));
    assert.notEqual(widgetModule, undefined);
    assert.equal(widgetModule?.functions[0]?.name, 'makeWidget');
  });

  it('census gap 6 (tsconfig paths aliases): 12-tsconfig-paths resolves @utils/format as an internal edge, not external', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('12-tsconfig-paths'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('12-tsconfig-paths', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 2, 'expected main.ts + utils/format.ts via the paths alias');
    const formatModule = analysis.modules.find((m) => m.filePath.endsWith('utils/format.ts'));
    assert.notEqual(formatModule, undefined, '@utils/format must resolve internally, not classify as an external Dependency');
    assert.equal(formatModule?.functions[0]?.name, 'formatIt');

    const edge = analysis.moduleGraph.find((e) => e.specifier === '@utils/format');
    assert.notEqual(edge, undefined);
    assert.equal(edge?.classification, 'internal', 'a paths-aliased specifier must classify internal, never external');
  });

  it("negative check (RFC §1): no startsWith('.') guard remains in the resolution path", () => {
    const source = readAnalyzerSource();
    // The removed guard's exact shape from the census (typescript-analyzer.ts:722-725).
    assert.doesNotMatch(source, /if \(!importSpecifier\.startsWith\('\.'\)\)/);
  });
});

describe('RFC-TM-9 Q1 check (6) — arrow fixtures (X-AN-5)', () => {
  it('census gap 10 (module-level arrow-const): 16-arrow-const-fn emits a FunctionNode-shaped entity with a signature', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('16-arrow-const-fn'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('16-arrow-const-fn', 'src', 'main.ts'));

    const helperModule = analysis.modules.find((m) => m.filePath.endsWith('helper.ts'));
    assert.notEqual(helperModule, undefined);
    assert.equal(helperModule?.constants.length, 0, 'helperFn must not be classified as a Constants entity');
    assert.equal(helperModule?.functions.length, 1);
    assert.equal(helperModule?.functions[0]?.name, 'helperFn');
    assert.equal(helperModule?.functions[0]?.parameters[0]?.name, 'x');
    assert.equal(helperModule?.functions[0]?.parameters[0]?.type, 'string');
    assert.equal(helperModule?.functions[0]?.returnType, 'string');

    const exportEntry = helperModule?.exports.find((e) => e.name === 'helperFn');
    assert.equal(exportEntry?.type, 'function', 'the export registration must push type: "function"');
  });

  it('class-property arrow: a handler-shaped class property joins the method list with accessorKind undefined', () => {
    // FAQ Q7: same root cause as the module-level case, fixed together — no
    // standalone census repro directory for this shape, so it is authored
    // fresh alongside the module-level fixture as its Q1 sibling.
    const analyzer = new TypeScriptAnalyzer(fixturePath('16b-class-property-arrow'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('16b-class-property-arrow', 'src', 'widget.ts'));

    const module = analysis.modules[0];
    assert.notEqual(module, undefined);
    const cls = module?.classes.find((c) => c.name === 'Widget');
    assert.notEqual(cls, undefined);
    assert.equal(cls?.properties.length, 0, 'the arrow-bound property must not remain in the property list');
    const handleClick = cls?.methods.find((m) => m.name === 'handleClick');
    assert.notEqual(handleClick, undefined, 'a class-property arrow must join the method list');
    assert.equal(handleClick?.accessorKind, undefined);
    assert.equal(handleClick?.parameters[0]?.name, 'event');
  });

  it('generic arrow-const: type parameters flow through the reused signature builder', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('16c-generic-arrow'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('16c-generic-arrow', 'src', 'wrap.ts'));

    const module = analysis.modules[0];
    const wrapFn = module?.functions.find((f) => f.name === 'wrap');
    assert.notEqual(wrapFn, undefined, 'a generic arrow-const must be recognized as a function, not a constant');
    assert.equal(wrapFn?.parameters[0]?.name, 'x');
  });
});

describe('RFC-TM-9 Q1 check (7)/(8 partial) — diagnostics fixtures per silence mode (X-DIAG-1)', () => {
  it('census gap 4 (dynamic import()): 02-dynamic-import discovers worker.ts through the literal specifier', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('02-dynamic-import'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('02-dynamic-import', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 2, 'expected main.ts + worker.ts via the dynamic import()');
    const workerModule = analysis.modules.find((m) => m.filePath.endsWith('worker.ts'));
    assert.notEqual(workerModule, undefined);
    assert.equal(workerModule?.functions[0]?.name, 'doWork');

    const mainModule = analysis.modules.find((m) => m.filePath.endsWith('main.ts'));
    assert.ok(mainModule?.dynamicImportSpecifiers.includes('./worker.js'));
  });

  it('census gap 11 (tsconfig include-miss): 04-sst-config-noref throws a descriptive error naming the tsconfig and include miss', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('04-sst-config-noref'));
    assert.throws(
      () => analyzer.analyzeFromEntrypoint(fixturePath('04-sst-config-noref', 'sst.config.ts')),
      /not included by this tsconfig's include\/files configuration/,
    );
  });

  it('control: 04-sst-config-included has no entrypoint-not-in-program case (both files are within include)', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('04-sst-config-included'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('04-sst-config-included', 'infra', 'sst-like.ts'));
    assert.ok(analysis.modules.length >= 1);
    assert.equal(analysis.diagnostics.filter((d) => d.category === 'entrypoint-not-in-program').length, 0);
  });
});

describe('RFC-TM-9 Q1 — controls (labeled, not fix-bound; prove non-regression)', () => {
  it('control A (type-only imports, 08b-type-only-noext): resolves correctly, sound before and after', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('08b-type-only-noext'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('08b-type-only-noext', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 2);
    const typesModule = analysis.modules.find((m) => m.filePath.endsWith('types.ts'));
    assert.notEqual(typesModule, undefined);
    assert.equal(typesModule?.interfaces[0]?.name, 'Widget');
  });

  it('control B (namespace imports, 09-namespace-import): namespace method extraction is sound once .js resolves', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('09-namespace-import'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('09-namespace-import', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 2, 'the .js-suffixed namespace import must now resolve (gap 2 fix)');
    const mathModule = analysis.modules.find((m) => m.filePath.endsWith('mathutils.ts'));
    assert.notEqual(mathModule, undefined);
    assert.equal(mathModule?.functions.length, 2);
  });

  it('control C (default exports, 17-default-export): resolves correctly, sound before and after', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('17-default-export'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('17-default-export', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 2);
    const helperModule = analysis.modules.find((m) => m.filePath.endsWith('helper.ts'));
    assert.equal(helperModule?.functions[0]?.name, 'helperFn');
  });
});

function readAnalyzerSource(): string {
  const analyzerPath = join(testDir, '..', '..', 'src', 'typescript-analyzer.ts');
  return readFileSync(analyzerPath, 'utf8');
}
