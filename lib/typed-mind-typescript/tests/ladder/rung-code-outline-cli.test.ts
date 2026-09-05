// Ladder rung for sammons/code-outline-cli — a 5-package pnpm workspace with
// 8 tsconfigs, NodeNext `.ts` import specifiers, and
// `rewriteRelativeImportExtensions`. Four fixtures (78-81), each distilled
// from a diagnostic the live extraction produced against that repo.
//
// Live baseline (extractor at 6720f01, checker via `--check`):
//   packages/cli    (cli.ts / index.ts entrypoints)  6 diagnostics each
//   packages/parser (index.ts)                       7 diagnostics
//   packages/formatter (index.ts)                    1 diagnostic
//   root tsconfig + packages/cli/src/cli.ts          6 diagnostics
//   tsconfig.scripts.json + scripts/generate-docs.ts 0 (clean control)
//
// Fixtures 78/79/80/81/81b are all fix-bound: each fails before its fix and
// passes here. Fixture 81 was a documented knownGap until referenced-project
// modules started classifying internal; 81b covers the unbuilt-sibling half of
// the same defect. See each fixture's README.md.
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { printTypeParameter, TypeDefNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

// Fixture 81 is a two-package mini-workspace whose gap only reproduces when the
// sibling resolves the way pnpm actually exposes a `workspace:*` dependency:
// through a `node_modules` link to the package's declared `types` entry. That
// is what makes `ts.resolveModuleName` report `isExternalLibraryImport: true`.
//
// The link is created HERE rather than committed, because a checked-in symlink
// is not portable (git on Windows can materialize it as a plain text file
// containing the target path). The link's target — `packages/core/dist/
// index.d.ts` — IS committed, with a matching `.gitignore` negation.
//
// Without this setup the fixture is non-hermetic: it passes on a machine where
// a previous run left the link behind and fails on a clean runner, where the
// specifier does not resolve at all and the module-graph golden differs. That
// is precisely the PR #156 run-334 failure this helper closes.
//
// `paths` is NOT an alternative here: a `paths`-resolved specifier reports
// `isExternalLibraryImport: false` whether it points at the source or at the
// built `.d.ts`, so it resolves as INTERNAL and does not exercise the gap.
const ensureFixture81WorkspaceLink = (): void => {
  const linkDir = fixturePath('81-crosspkg-type-only-dto-field', 'packages', 'cli', 'node_modules', '@fixture');
  const linkPath = join(linkDir, 'core');

  mkdirSync(linkDir, { recursive: true });

  // Replace anything that is not already the correct link, so a stale entry
  // from an older checkout cannot silently change what the test resolves.
  if (existsSync(linkPath) || lstatSync(linkPath, { throwIfNoEntry: false }) !== undefined) {
    rmSync(linkPath, { recursive: true, force: true });
  }

  // Relative target, matching how pnpm writes it: cli/node_modules/@fixture/core
  // -> packages/core (three levels up from the @fixture directory).
  symlinkSync(join('..', '..', '..', 'core'), linkPath, 'dir');
};

// Gap 81's external CONTROL. `@fixture/vendor` is a real installed-package
// shape: a directory under the consumer's `node_modules` with its own
// package.json and a `.d.ts` at its declared `types` entry. It resolves with
// `isExternalLibraryImport: true` exactly like the workspace sibling does.
//
// The one difference is the one that matters: NO tsconfig `references` entry
// names it, so its realpath lies under no referenced project's `outDir` and the
// reverse-map declines to redirect it. It must stay external and untraversed.
//
// Written by this hook rather than committed for the same reason the symlink
// is: the repo's `.gitignore` blanket-ignores `node_modules/`, and adding a
// negation for a stub package would make the fixture's external control depend
// on ignore-file bookkeeping rather than on the analyzer's own rule.
const ensureFixture81ExternalStubPackage = (): void => {
  const packageDir = fixturePath('81-crosspkg-type-only-dto-field', 'packages', 'cli', 'node_modules', '@fixture', 'vendor');

  rmSync(packageDir, { recursive: true, force: true });
  mkdirSync(packageDir, { recursive: true });

  writeFileSync(
    join(packageDir, 'package.json'),
    `${JSON.stringify({ name: '@fixture/vendor', version: '2.0.0', type: 'module', types: 'index.d.ts', main: 'index.js' }, null, 2)}\n`,
  );
  writeFileSync(join(packageDir, 'index.d.ts'), 'export type VendorTag = string;\n');
};

const analyzeFixture = (name: string, projectSegments: string[], entrySegments: string[]) => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(name, ...projectSegments));
  return analyzer.analyzeFromEntrypoint(fixturePath(name, ...entrySegments));
};

const convertFixture = (name: string, projectSegments: string[], entrySegments: string[]) => {
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analyzeFixture(name, projectSegments, entrySegments));
};

// The module-graph.json exact edge-list golden (RFC-TM-9 §1, the Q1 leaf
// check): a correct-count/wrong-target regression fails on the target field.
// Count summaries are not a check.
const assertModuleGraphGolden = (name: string, projectSegments: string[], entrySegments: string[]): void => {
  const analysis = analyzeFixture(name, projectSegments, entrySegments);
  const actual = analysis.moduleGraph.map((edge) => ({
    sourceModule: edge.sourceModule,
    specifier: edge.specifier,
    resolvedTarget: edge.resolvedTarget,
    classification: edge.classification,
  }));
  const golden: unknown = JSON.parse(readFileSync(fixturePath(name, 'module-graph.json'), 'utf8'));
  assert.deepEqual(actual, golden, 'module-graph.json must exact-match: source, specifier, resolved target, classification');
};

const convertSimple = (name: string) => convertFixture(name, [], ['src', 'index.ts']);

const checkTmd = async (tmdContent: string) => {
  const typedMind = await TypedMind.create();
  return typedMind.check(tmdContent);
};

const diagnosticCodes = (result: { diagnostics: readonly { code: string }[] }): string[] => {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
};

describe('78 — an entrypoint that is itself an `export *` barrel', () => {
  // Corpus: packages/formatter/src/index.ts, whose entire body is
  // `export * from './formatter.ts';`. The analyzer models the star as a
  // ParsedExport whose `name` is the literal `'*'`;
  // `extractPublicExportsFromEntrypoint` pushed that straight into
  // Program.exports and emitted the ungrammatical `exports: [*]`.
  //
  // The pre-existing 10-export-star fixture does NOT cover this: there the
  // barrel is a non-entrypoint, so `'*'` never reaches a Program.
  it('never emits the literal `*` as a Program export name', () => {
    const result = convertFixture('78-entrypoint-barrel-star-export', [], ['src', 'index.ts']);
    assert.equal(result.success, true);
    assert.equal(
      result.tmdContent.includes('exports: [*]'),
      false,
      `'*' is not a name any entity can carry, so it is never a legal exports: member. Got:\n${result.tmdContent}`,
    );
  });

  it("expands the star to the source module's real export names", () => {
    const result = convertFixture('78-entrypoint-barrel-star-export', [], ['src', 'index.ts']);
    const programEntity = result.entities.find((entity) => entity.kind === 'Program') as { exports?: readonly string[] } | undefined;
    assert.deepEqual([...(programEntity?.exports ?? [])], ['stringifyYaml'], 'the barrel re-exports exactly what formatter.ts declares');
  });

  it('records the barrel -> starred-source edge, so the source file is not orphaned', () => {
    const result = convertFixture('78-entrypoint-barrel-star-export', [], ['src', 'index.ts']);
    const barrelEntity = result.entities.find((entity) => entity.kind === 'File' && entity.path.endsWith('index.ts')) as
      | { imports: readonly string[] }
      | undefined;
    assert.ok(
      barrelEntity?.imports.includes('FormatterFile'),
      `a bare 'export * from' emits no ImportDeclaration, so this edge exists only if the converter records it. Got: ${JSON.stringify(barrelEntity?.imports)}`,
    );
  });

  it('does not warn that a module demonstrably in the analysis is missing', () => {
    const result = convertFixture('78-entrypoint-barrel-star-export', [], ['src', 'index.ts']);
    // The legacy `resolveModulePath` fs-prober appended `.ts` to the already
    // `.ts`-suffixed NodeNext specifier ('./formatter.ts' -> 'formatter.ts.ts')
    // and warned about a file it had itself emitted a File entity for.
    assert.deepEqual(
      (result.warnings ?? []).map((warning) => warning.message).filter((message) => message.includes('Re-export source module not found')),
      [],
    );
  });

  it('module-graph golden: the star edge resolves internal to formatter.ts', () => {
    assertModuleGraphGolden('78-entrypoint-barrel-star-export', [], ['src', 'index.ts']);
  });

  it('checks clean end to end', async () => {
    const result = convertFixture('78-entrypoint-barrel-star-export', [], ['src', 'index.ts']);
    const checkResult = await checkTmd(result.tmdContent);
    assert.deepEqual(diagnosticCodes(checkResult), []);
    assert.equal(checkResult.valid, true);
  });
});

describe('79 — a function-type alias loses its parameter list and return type', () => {
  // Corpus: packages/parser/src/tree-utils.ts's `TreeVisitor` / `NodePredicate`.
  // `parseTypeExprText`'s `(` branch treated a function type's PARAMETER LIST
  // as a parenthesized type GROUP: it returned the inner type and left
  // `) => T` in `remainder`, which every call site discards. The emitted
  // TypeDef was the bare parameter text, spread over the source's own lines.
  it('keeps the whole callable alias and its declared generic default', () => {
    const result = convertSimple('79-function-type-alias-remainder');
    assert.equal(result.success, true);
    const visitor = result.entities.find((entity) => entity.name === 'TreeVisitor');
    assert.ok(visitor instanceof TypeDefNode);
    assert.equal(visitor.aliasType?.kind, 'opaque');
    assert.equal(visitor.aliasType?.kind === 'opaque' && visitor.aliasType.text, '(node: NodeInfo, depth: number, parent?: NodeInfo) => T');
    assert.deepEqual(visitor.typeParameters?.map(printTypeParameter), ['T = void']);
  });

  it('promotes the defaulted alias to longform while keeping its callable payload on one line', () => {
    const result = convertSimple('79-function-type-alias-remainder');
    assert.ok(
      result.tmdContent.includes(
        [
          'typedef TreeVisitor {',
          '  typeParameter: "T = void"',
          '  type: "(node: NodeInfo, depth: number, parent?: NodeInfo) => T"',
          '}',
        ].join('\n'),
      ),
    );
    // The three-line source must not leak its own line breaks into the token.
    assert.equal(result.tmdContent.includes('TreeVisitor = node: NodeInfo,'), false);
  });

  it('control: the single-line sibling alias was already correct and stays correct', () => {
    // NodePredicate is authored on one line in the fixture. It emitted
    // correctly before this fix and must be unchanged by it — this is what
    // isolates the defect to the multi-line form.
    const result = convertSimple('79-function-type-alias-remainder');
    assert.match(result.tmdContent, /NodePredicate = \(node: NodeInfo, depth: number\) => boolean/);
  });

  it('module-graph golden: a single-file fixture has no edges', () => {
    assertModuleGraphGolden('79-function-type-alias-remainder', [], ['src', 'index.ts']);
  });

  it('produces no syntax diagnostics', async () => {
    const result = convertSimple('79-function-type-alias-remainder');
    const checkResult = await checkTmd(result.tmdContent);
    assert.deepEqual(
      checkResult.diagnostics.filter((diagnostic) => diagnostic.code === 'syntax/error').map((diagnostic) => diagnostic.message),
      [],
      'the extractor must never emit text its own grammar rejects',
    );
  });
});

it('TM13 B1.5: fixture 79 changes only its two signature-only orphan findings', async () => {
  const result = convertSimple('79-function-type-alias-remainder');
  const golden = readFileSync(join(testDir, 'goldens-tmd', '79-function-type-alias-remainder.tmd'), 'utf8').replace(/\n$/, '');
  assert.equal(result.tmdContent, golden);
  assert.deepEqual((await checkTmd(result.tmdContent)).diagnostics, []);
  const withoutUses = result.tmdContent.replace(
    'visitor: TreeVisitor<void>, predicate: NodePredicate',
    'visitor: unknown, predicate: unknown',
  );
  assert.deepEqual((await checkTmd(withoutUses)).diagnostics.map((diagnostic) => diagnostic.message).toSorted(), [
    "Orphaned entity 'NodePredicate'",
    "Orphaned entity 'TreeVisitor'",
  ]);
});

describe('80 — two files extending the same builtin both claim to export the stub', () => {
  // Corpus: packages/cli's `CLIArgumentError extends Error`
  // (cli-argument-parser.ts:45) and `FileProcessorError extends Error`
  // (file-processor.ts:13). `ensureBuiltinExtendsStub` is idempotent — ONE
  // shared `Error` ClassNode — but every ClassFile whose module extends it
  // folded that one name into its OWN `exports:` list.
  it('exports the shared builtin stub from exactly one file', async () => {
    const result = convertFixture('80-shared-builtin-extends-stub', [], ['src', 'index.ts']);
    assert.equal(result.success, true);
    const checkResult = await checkTmd(result.tmdContent);
    assert.deepEqual(
      checkResult.diagnostics.filter((diagnostic) => diagnostic.code === 'checker/multi-exported').map((diagnostic) => diagnostic.message),
      [],
    );
  });

  it('still exports the stub from SOME file, so checkClassAndFunctionExports is satisfied', () => {
    const result = convertFixture('80-shared-builtin-extends-stub', [], ['src', 'index.ts']);
    const exporters = result.entities.filter(
      (entity) =>
        (entity.kind === 'File' || entity.kind === 'ClassFile') && (entity as { exports: readonly string[] }).exports.includes('Error'),
    );
    assert.equal(exporters.length, 1, 'exactly one exporter — not zero (unexported stub), not two (multi-exported)');
  });

  it('module-graph golden: both sibling modules resolve internal', () => {
    assertModuleGraphGolden('80-shared-builtin-extends-stub', [], ['src', 'index.ts']);
  });

  it('every file that extends the builtin still IMPORTS it, preserving each reference edge', () => {
    const result = convertFixture('80-shared-builtin-extends-stub', [], ['src', 'index.ts']);
    const importers = result.entities.filter(
      (entity) => entity.kind === 'ClassFile' && (entity as { imports: readonly string[] }).imports.includes('Error'),
    );
    assert.equal(importers.length, 2, 'the export claim is exclusive; the import edge is not');
  });
});

describe('81 — a `workspace:*` sibling declared in tsconfig `references` is internal', () => {
  // Gap 81, FIXED. These assertions were the knownGap pin and are now inverted:
  // the sibling package is classified internal, traversed, and its types become
  // real entities. See repros-analyzer/81-crosspkg-type-only-dto-field/README.md
  // for the resolution mechanism.
  const project = ['packages', 'cli', 'tsconfig.json'];
  const entry = ['packages', 'cli', 'src', 'index.ts'];

  // Makes the fixture hermetic on a clean checkout — see the helper's own
  // comment for why the link is created rather than committed. The stub
  // package is the external control: it proves the fix is scoped to referenced
  // projects and does not drag genuine npm dependencies in.
  before(() => {
    ensureFixture81WorkspaceLink();
    ensureFixture81ExternalStubPackage();
  });

  it('fixture is hermetic: the committed dist declaration and the setup-created workspace link both exist', () => {
    assert.ok(
      existsSync(fixturePath('81-crosspkg-type-only-dto-field', 'packages', 'core', 'dist', 'index.d.ts')),
      'packages/core/dist/index.d.ts is committed fixture input (with a .gitignore negation); it is what makes the resolution report isExternalLibraryImport, which is the condition the fix reverses',
    );
    assert.ok(
      existsSync(fixturePath('81-crosspkg-type-only-dto-field', 'packages', 'cli', 'node_modules', '@fixture', 'core')),
      'the workspace link is created by this suite’s before() hook',
    );
  });

  it('traverses the referenced sibling package, not just the importing package', () => {
    const analysis = analyzeFixture('81-crosspkg-type-only-dto-field', project, entry);
    // Two analyzed modules, not one: the importer plus the sibling's SOURCE.
    // Asserted on the analyzer's own module list rather than on emitted `File`
    // entities, because the sibling contributes only types and so produces no
    // second File entity even when it is fully traversed.
    const traversed = analysis.modules.map((module) => module.filePath);
    assert.equal(traversed.length, 2, 'the sibling package is classified internal and traversed alongside the importer');
    assert.ok(
      traversed.some((filePath) => filePath.endsWith(join('packages', 'core', 'src', 'index.ts'))),
      'the traversed sibling is its rootDir SOURCE, not the dist declaration the specifier literally resolved to',
    );
  });

  it('DTO fields typed by a sibling package resolve to real entities', async () => {
    const result = convertFixture('81-crosspkg-type-only-dto-field', project, entry);
    const checkResult = await checkTmd(result.tmdContent);
    const unknownTypeMessages = checkResult.diagnostics
      .filter((diagnostic) => diagnostic.code === 'checker/dto-field-unknown-type')
      .map((diagnostic) => diagnostic.message);
    assert.deepEqual(unknownTypeMessages, [], 'OutputFormat and NodeInfo are extracted from the traversed sibling');
  });

  it('the sibling package’s own types are emitted as entities', () => {
    const result = convertFixture('81-crosspkg-type-only-dto-field', project, entry);
    // The traversal is only worth anything if the types it reaches actually
    // land — asserting on the absence of a diagnostic alone would also pass if
    // the checker rule stopped firing for an unrelated reason.
    assert.match(result.tmdContent, /OutputFormat =/);
    assert.match(result.tmdContent, /NodeInfo %/);
  });

  it('module-graph golden: the workspace edge is internal and points at the sibling’s SOURCE', () => {
    // The resolved target is `../../core/src/index.ts`, not the
    // `../../core/dist/index.d.ts` the specifier literally resolves to: the
    // analyzer reverse-maps a declaration under a referenced project's outDir
    // back to the source under its rootDir, which is the file the union
    // program already holds.
    assertModuleGraphGolden(
      '81-crosspkg-type-only-dto-field',
      ['packages', 'cli', 'tsconfig.json'],
      ['packages', 'cli', 'src', 'index.ts'],
    );
  });

  it('control: a genuine node_modules package stays EXTERNAL and is not traversed', () => {
    // The scope guard on the fix. `@fixture/vendor` is a real installed-package
    // shape — same node_modules location and same `isExternalLibraryImport`
    // verdict as the workspace sibling — but no tsconfig `references` entry
    // names it, so its realpath is under no referenced project's outDir and the
    // reverse-map declines. Without this control, "classify referenced projects
    // internal" and "classify everything internal" pass identically.
    const analysis = analyzeFixture(
      '81-crosspkg-type-only-dto-field',
      ['packages', 'cli', 'tsconfig.json'],
      ['packages', 'cli', 'src', 'vendor-consumer.ts'],
    );
    const vendorEdge = analysis.moduleGraph.find((edge) => edge.specifier === '@fixture/vendor');
    assert.equal(vendorEdge?.classification, 'external', 'a package with no references entry must stay external');
    const traversed = analysis.modules.map((module) => module.filePath);
    assert.ok(!traversed.some((filePath) => filePath.includes('@fixture/vendor')), 'an external package must not be traversed');
  });

  it('degrades rather than crashing or emitting nothing (I-13)', () => {
    const result = convertFixture('81-crosspkg-type-only-dto-field', project, entry);
    assert.match(result.tmdContent, /describeOptions/);
    assert.match(result.tmdContent, /CliOptions %/);
    assert.match(result.tmdContent, /ProcessedFile %/);
  });
});

describe('81b — a referenced sibling that has never been built is still internal', () => {
  // The second trigger fixture 81's README named: with no `dist/`, the
  // specifier does not resolve at all, so the fix's built-case reverse-map has
  // nothing to reverse. The unbuilt fallback maps the package's DECLARED
  // `types` path through the same outDir -> rootDir rule instead.
  //
  // No before() hook and no node_modules link: this fixture is hermetic by
  // construction because it depends on nothing being present.
  const project = ['packages', 'cli', 'tsconfig.json'];
  const entry = ['packages', 'cli', 'src', 'index.ts'];

  it('fixture is hermetic: the sibling has NO dist directory, which is the state under test', () => {
    assert.ok(
      !existsSync(fixturePath('81b-crosspkg-unbuilt-sibling', 'packages', 'core', 'dist')),
      'the unbuilt state is the fixture input; a dist here would silently convert this into a duplicate of fixture 81',
    );
  });

  it('traverses the unbuilt sibling and emits its types', () => {
    const analysis = analyzeFixture('81b-crosspkg-unbuilt-sibling', project, entry);
    const traversed = analysis.modules.map((module) => module.filePath);
    assert.equal(traversed.length, 2, 'the unbuilt sibling is reached through its declared types path mapped back to source');
    assert.ok(
      traversed.some((filePath) => filePath.endsWith(join('packages', 'core', 'src', 'index.ts'))),
      'the unbuilt sibling resolves straight to source; there is no declaration file for it to resolve to',
    );

    const result = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(result.success, true);
    assert.match(result.tmdContent, /ReportFormat =/);
    assert.match(result.tmdContent, /ReportRow %/);
  });

  it('emits no unresolvable-import diagnostic for the sibling specifier', () => {
    const analysis = analyzeFixture('81b-crosspkg-unbuilt-sibling', project, entry);
    const unresolved = analysis.diagnostics.filter((diagnostic) => diagnostic.category === 'unresolvable-import');
    assert.deepEqual(unresolved, [], 'the unbuilt fallback resolves the edge, so the diagnostic must not fire');
  });

  it('DTO fields typed by the unbuilt sibling resolve to real entities', async () => {
    const result = convertFixture('81b-crosspkg-unbuilt-sibling', project, entry);
    const checkResult = await checkTmd(result.tmdContent);
    const unknownTypeMessages = checkResult.diagnostics
      .filter((diagnostic) => diagnostic.code === 'checker/dto-field-unknown-type')
      .map((diagnostic) => diagnostic.message);
    assert.deepEqual(unknownTypeMessages, [], 'extraction quality must not depend on whether the sibling was built');
  });

  it('module-graph golden: the unbuilt edge is internal and points at the sibling’s SOURCE', () => {
    assertModuleGraphGolden('81b-crosspkg-unbuilt-sibling', project, entry);
  });
});
