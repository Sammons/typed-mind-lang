// Real-target evaluation (sammons/architecture-notebook, a Lit web app +
// node:http server) — a side-effect import: `import './components/widget.ts'`,
// binding NO name. This is the custom-elements registration idiom (the
// module's whole purpose is its `customElements.define(...)` call), and the
// shape every Lit component's consuming module uses. `convertImports`
// iterates only `defaultImport`/`namespaceImport`/`namedImports`, so a
// bindingless import contributed NOTHING to the importing File's `imports:`
// list, even though the analyzer resolved the module edge and recorded it in
// `moduleGraphResolution`. Result: the target file (and its class) read as
// orphaned by the checker. On the real Lit target this produced 18 false
// `Orphaned file` diagnostics plus a false `Orphaned entity` per component.
//
// Structurally identical to RC-E's `lazy(() => import(...))` case (see
// rc-e-lazy-dynamic-import.test.ts) — "a real edge with no bound name" — and
// fixed the same way: a new post-pass `foldSideEffectImportsIntoSourceFiles`
// folds the TARGET's File/ClassFile entity name into the importer's
// `imports:` list, so `isFileConsumed` sees the file as consumed. Unlike
// RC-E, no default-exported entity name is additionally folded: a
// side-effect import makes no claim about any particular exported symbol
// (there is no `lazy()`-style contract that the module default-exports the
// thing being used) — folding only the File name states exactly what the
// source states (this file is loaded) and nothing more.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('72-side-effect-import'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('72-side-effect-import', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe("a side-effect import (`import './components/widget.ts'`) folds the target's File entity into the importer's imports, not silence", () => {
  it("IndexFile's imports include the widget's ClassFile entity name", () => {
    // On main IndexFile has NO imports at all — the bindingless import
    // contributes nothing to convertImports. Post-fix, the fold adds the
    // target File/ClassFile entity name.
    const result = convert();
    assert.equal(result.success, true);
    const indexFile = result.entities.find((e) => e.name === 'IndexFile') as { imports: readonly string[] } | undefined;
    assert.notEqual(indexFile, undefined, "IndexFile's File entity must exist");
    assert.ok(
      indexFile?.imports.includes('Widget'),
      `expected 'Widget' (the target of the side-effect import) in IndexFile's imports, got: ${JSON.stringify(indexFile?.imports)}`,
    );

    const widget = result.entities.find((e) => e.name === 'Widget') as { kind: string } | undefined;
    assert.notEqual(widget, undefined, 'Widget must be extracted as a real entity');
    assert.equal(widget?.kind, 'ClassFile', `expected Widget to convert as ClassFile, got kind: ${widget?.kind}`);
  });

  it('zero Orphaned file / Orphaned entity findings for the side-effect-imported module or its class', async () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    // Assert the fixture checks fully clean, not just filtered on the
    // orphan codes — matches the "checks fully clean" bar used by the
    // sibling gap tests and is the strongest available proof the fold
    // closed the gap without opening another.
    assert.deepEqual(
      checkResult.diagnostics,
      [],
      `expected the whole fixture to check clean, got: ${JSON.stringify(checkResult.diagnostics)}`,
    );
  });

  it('only the File-level entity name is folded — no default export is invented for a side-effect import', () => {
    // Negative check distinguishing this fix from RC-E's lazy() fold, which
    // additionally folds a default-exported entity name because lazy()
    // makes a contractual claim about the default export. A side-effect
    // import makes no such claim, so IndexFile's imports must be exactly
    // ['Widget'] — no second, invented name alongside it.
    const result = convert();
    assert.equal(result.success, true);
    const indexFile = result.entities.find((e) => e.name === 'IndexFile') as { imports: readonly string[] } | undefined;
    assert.notEqual(indexFile, undefined, "IndexFile's File entity must exist");
    assert.deepEqual(
      [...(indexFile?.imports ?? [])].sort(),
      ['Widget'],
      `expected IndexFile's imports to contain exactly the folded File name, got: ${JSON.stringify(indexFile?.imports)}`,
    );
  });
});
