// RFC-TM-9 Q1 checks (2 continued), (5): star re-exports (X-AN-3, with the
// mutual-barrel cycle guard), JSDoc extraction (X-AN-6), and accessors
// (X-AN-8).
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

describe('RFC-TM-9 Q1 check (2)/(5) — census gap 5, export * from (X-AN-3)', () => {
  it('10-export-star: the star re-export is recorded as a namespace-reexport edge, and widget.ts is discovered', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('10-export-star'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('10-export-star', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 3, 'expected main.ts + lib.ts + widget.ts (star re-export must be followed)');
    const libModule = analysis.modules.find((m) => m.filePath.endsWith('lib.ts'));
    assert.notEqual(libModule, undefined);
    const starExport = libModule?.exports.find((e) => e.type === 'namespace-reexport');
    assert.notEqual(starExport, undefined, 'export * from must produce a namespace-reexport ParsedExport, not an empty array');
    assert.equal(starExport?.name, '*');
    assert.equal(starExport?.source, './widget');

    const widgetModule = analysis.modules.find((m) => m.filePath.endsWith('widget.ts'));
    assert.notEqual(widgetModule, undefined, 'widget.ts must be discovered by following the star re-export source');
    assert.equal(widgetModule?.functions[0]?.name, 'makeWidget');
  });

  it('check (5): mutual-barrel fixture (a.ts <-> b.ts star re-export each other) terminates with correct folded exports', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('10b-mutual-barrel'));

    // The load-bearing assertion here is termination itself: a broken
    // visited-set would hang or stack-overflow. node:test's default timeout
    // catches a hang; this assertion also proves the correct module set.
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('10b-mutual-barrel', 'src', 'main.ts'));

    assert.equal(analysis.modules.length, 3, 'expected main.ts + a.ts + b.ts, no infinite loop');
    const aModule = analysis.modules.find((m) => m.filePath.endsWith('/a.ts'));
    const bModule = analysis.modules.find((m) => m.filePath.endsWith('/b.ts'));
    assert.notEqual(aModule, undefined);
    assert.notEqual(bModule, undefined);

    const aStarExport = aModule?.exports.find((e) => e.type === 'namespace-reexport');
    const bStarExport = bModule?.exports.find((e) => e.type === 'namespace-reexport');
    assert.equal(aStarExport?.source, './b.ts');
    assert.equal(bStarExport?.source, './a.ts');

    assert.ok(aModule?.exports.some((e) => e.name === 'fromA'));
    assert.ok(bModule?.exports.some((e) => e.name === 'fromB'));
  });
});

describe('RFC-TM-9 Q1 — census gap 1, JSDoc extraction (X-AN-6)', () => {
  it('13-jsdoc-desc: addNums description populates from the JSDoc comment', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('13-jsdoc-desc'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('13-jsdoc-desc', 'src', 'main.ts'));

    const module = analysis.modules[0];
    const addNums = module?.functions.find((f) => f.name === 'addNums');
    assert.notEqual(addNums, undefined);
    assert.notEqual(addNums?.description, undefined, 'description must not be silently dropped');
    assert.ok(addNums?.description?.includes('Adds two numbers together'));
  });

  it('JSDoc on a class also resolves via node.name', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('15-getter-setter'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('15-getter-setter', 'src', 'widget.ts'));
    // No JSDoc on Widget in this fixture — this asserts the extraction path
    // does not throw and returns undefined cleanly (no false-positive
    // synthesis), a companion assertion to the positive case above.
    const module = analysis.modules[0];
    const widget = module?.classes.find((c) => c.name === 'Widget');
    assert.notEqual(widget, undefined);
    assert.equal(widget?.description, undefined);
  });
});

describe('RFC-TM-9 Q1 — census gap 12, get/set accessors (X-AN-8)', () => {
  it('15-getter-setter: the name accessor pair folds into one method entry with accessorKind "both"', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('15-getter-setter'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('15-getter-setter', 'src', 'widget.ts'));

    const module = analysis.modules[0];
    const widget = module?.classes.find((c) => c.name === 'Widget');
    assert.notEqual(widget, undefined);

    const nameAccessor = widget?.methods.find((m) => m.name === 'name');
    assert.notEqual(nameAccessor, undefined, 'the get/set pair must not be dropped from the method list');
    assert.equal(nameAccessor?.accessorKind, 'both');
    assert.equal(nameAccessor?.returnType, 'string', 'the getter half must contribute its return type');
    assert.equal(nameAccessor?.parameters[0]?.name, 'value', 'the setter half must contribute its parameter');

    const describe = widget?.methods.find((m) => m.name === 'describe');
    assert.notEqual(describe, undefined);
    assert.equal(describe?.accessorKind, undefined, 'a plain method must not carry an accessorKind');

    assert.equal(widget?.methods.length, 2, 'exactly one folded accessor entry plus describe — no duplicate get/set rows');
  });
});
