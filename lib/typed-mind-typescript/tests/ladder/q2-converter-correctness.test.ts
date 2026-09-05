// RFC-TM-9 Q2 — converter correctness and new recognizers. Check bindings
// per the Diamond Doc's Q2 line:
//   - hash-private repro passes with zero `#` tokens in emitted lists (X-CONV-1)
//   - script-shaped entrypoint fixture extracts with a File entity, resolving
//     Program entry, and project-root-relative paths from an external cwd (X-CONV-3)
//   - App.tsx fixture extracts with `<Base>App` naming; I-13 fixture — corrupted
//     input still writes partial output, exits nonzero (X-CONV-4)
//   - builtin-extends fixture passes the checker (X-CONV-5)
//   - the recognizer's not-found fixture surfaces the X-DIAG-1 warning (X-AN-10)
//   - self-invoking-root fixture: zero orphan flags, function present in
//     Program's exports, zero FileNode/checker changes (X-AN-11)
//
// Golden-discipline note shared with tmd-goldens.test.ts (Q1): this repo HAD
// a PRE-EXISTING, Q2-unrelated converter/checker defect where
// `ProgramNode.exports` (the entrypoint's public re-export list) always
// duplicates names its own File entity already exports, tripping
// `checker/multi-exported` on any fixture with a Program and ANY exported
// entrypoint symbol — present on `main` before this Quantum's changes,
// confirmed via a control fixture with no builtin-extends/recognizer/
// self-invocation content at all. It was not named anywhere in RFC-TM-9's
// scope (not X-CONV-1/3/4/5, not X-AN-10/11), so that Quantum did not fix it
// — filed as issue #62, fixed by RFC-TM-10 Q4 (rfc-tm-10-diamond.md §7,
// D-LEG-7): a narrow `ProgramNode.entry`-to-co-exporter-name field
// comparison excludes exactly this Program/entry-File duplication shape,
// with no import-provenance reasoning. The fixtures below now assert zero
// diagnostics for this class specifically. Checks below assert the
// diagnostics actually owned by each X-item (unknown-base-class,
// orphaned-entity, class-not-exported, recognizer-not-found) rather than a
// blanket `valid: true`, exactly mirroring tmd-goldens.test.ts's "record the
// achieved verdict" precedent — and separately pin the full diagnostic-code
// list so a regression on either class is still caught.
//
// Emission note: RFC-TM-9 Q1's tmd-goldens.test.ts documents that
// `ProgramNode.exports` is emitted in a shortform continuation
// (`-> [...]`) the grammar's attachment rules reject as an illegal
// continuation on Program (longform-only) — a pre-existing emitter/grammar
// defect in `lib/typed-mind` (TM-8's surface), out of this Quantum's scope
// (X-CONV-3/4/5/X-AN-10/11 are converter-only per the file-disjointness
// header). Checker-verdict assertions below therefore emit through
// `SyntaxEmitter.emitLongform` (forces every entity to its longform block,
// where Program's `exports:` property line round-trips correctly) rather
// than reading `result.tmdContent` (which is shortform and silently drops
// Program.exports on reparse, masking exactly the behavior these fixtures
// exist to prove).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassFileNode, ClassNode, SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);
const cliPath = join(testDir, '..', '..', 'dist', 'cli.js');

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return { longform, result: tm.check(longform) };
};

describe('RFC-TM-9 Q2 check — X-CONV-1: hash-private members excluded, zero # tokens emitted', () => {
  it('a #-named class method is excluded from the emitted method list entirely', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('21-hash-private'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('21-hash-private', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, true);
    assert.equal(result.tmdContent.includes('#'), false, 'zero # tokens anywhere in the emitted .tmd');

    const classEntity = result.entities.find((e) => e.kind === 'Class' || e.kind === 'ClassFile') as
      | { methods: readonly string[] }
      | undefined;
    assert.notEqual(classEntity, undefined);
    assert.ok(!classEntity?.methods.some((m) => m.includes('#')), 'no method name carries a # token');
    assert.ok(classEntity?.methods.includes('publicMethod'), 'the public method is still emitted');
  });

  it('--include-private retains hard-private opaque payloads with explicit unsupported diagnostics', async () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('21-hash-private'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('21-hash-private', 'src', 'main.ts'));
    const defaultResult = new TypeScriptToTypedMindConverter().convert(analysis);
    const includedResult = new TypeScriptToTypedMindConverter({ includePrivateMembers: true }).convert(analysis);

    const defaultClass = defaultResult.entities.find((entity) => entity instanceof ClassNode || entity instanceof ClassFileNode);
    const includedClass = includedResult.entities.find((entity) => entity instanceof ClassNode || entity instanceof ClassFileNode);
    assert.ok(defaultClass instanceof ClassNode || defaultClass instanceof ClassFileNode);
    assert.ok(includedClass instanceof ClassNode || includedClass instanceof ClassFileNode);
    assert.equal(defaultClass.members?.methods.length, 1, 'default: only the public method');
    assert.equal(includedClass.members?.methods.length, 2, 'includePrivate retains both canonical members');
    assert.deepEqual(includedClass.methods, ['publicMethod'], 'unsupported names do not become guessed callable identities');
    const privateMember = includedClass.members?.methods[1];
    assert.equal(privateMember?.name, undefined);
    assert.equal(privateMember?.signature?.kind, 'opaque');
    if (privateMember?.signature?.kind !== 'opaque') assert.fail('expected retained opaque private signature');
    assert.equal(privateMember.signature.text, '#privateHelper() => string');
    assert.ok(includedResult.tmdContent.includes('method: "#privateHelper() => string"'));
    const mind = await TypedMind.create();
    const parsed = mind.parse(includedResult.tmdContent);
    assert.deepEqual(parsed.diagnostics, []);
    assert.deepEqual(
      mind.check(includedResult.tmdContent).diagnostics.map((finding) => finding.code),
      ['checker/unsupported-member-signature'],
    );
    assert.deepEqual(parsed.links.referencedBy('#privateHelper'), [], 'opaque text adds no phantom reference');
    const reparsedClass = parsed.entities.find((entity) => entity instanceof ClassNode || entity instanceof ClassFileNode);
    assert.ok(reparsedClass instanceof ClassNode || reparsedClass instanceof ClassFileNode);
    assert.equal(reparsedClass.members?.methods.length, 2);
    assert.deepEqual(reparsedClass.methods, ['publicMethod']);
  });
});

describe('RFC-TM-9 Q2 check — X-CONV-3: script-shaped entrypoint forces a File entity + project-root-relative paths', () => {
  it('export const app = new Hono() extracts with a File entity and a resolving Program entry', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('22-script-entrypoint'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('22-script-entrypoint', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, true);
    const fileEntity = result.entities.find((e) => e.kind === 'File');
    assert.notEqual(fileEntity, undefined, 'a File entity must exist for the script-shaped entrypoint');

    const programEntity = result.entities.find((e) => e.kind === 'Program') as { entry: string } | undefined;
    assert.notEqual(programEntity, undefined);
    assert.equal(programEntity?.entry, fileEntity?.name, "Program's entry must resolve to the File entity, not dangle");
  });

  it('paths are project-root-relative when the CLI runs from an external cwd', () => {
    const projectDir = fixturePath('22-script-entrypoint');
    const outputPath = join(mkdtempSync(join(tmpdir(), 'tm9-q2-cwd-')), 'out.tmd');
    try {
      // cwd deliberately NOT the target project — proves getRelativePath
      // relativizes against the project root (the tsconfig's directory),
      // never process.cwd().
      execFileSync(process.execPath, [cliPath, 'export', '--project', projectDir, '--entrypoint', 'src/main.ts', '--output', outputPath], {
        cwd: tmpdir(),
      });
      const content = readFileSync(outputPath, 'utf-8');
      assert.ok(content.includes('src/main.ts'), 'emitted path must be project-root-relative (src/main.ts), not cwd-relative');
      assert.equal(content.includes(tmpdir()), false, 'no absolute cwd-derived path leaked into the output');
    } finally {
      rmSync(dirname(outputPath), { recursive: true, force: true });
    }
  });
});

describe('RFC-TM-9 Q2 check — X-CONV-4: collision-safe naming + I-13 degrade-never-discard', () => {
  it('App.tsx extracts with <Base>App naming, no collision, conversion succeeds', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('03-app-collision'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('03-app-collision', 'src', 'App.tsx'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, true, 'the App.tsx collision must no longer crash the conversion');
    const programEntity = result.entities.find((e) => e.kind === 'Program');
    assert.equal(programEntity?.name, 'AppApp');
    assert.ok(
      result.entities.some((e) => e.name === 'App' && (e.kind === 'Function' || e.kind === 'Class')),
      'the real App component keeps its own name, uncollided',
    );
  });

  // decision-same-named-entities PR 1 — RE-PINNED. This test previously
  // asserted the I-13 DEGRADE path for this fixture: a nonzero CLI exit plus
  // PARTIAL output. Fixture 18 is two files each declaring `class Widget`,
  // which is exactly the cross-module collision PR 1 resolves, so there is no
  // longer anything here to degrade FROM — the collision is renamed
  // (`OtherFile.Widget`) and the CLI exits 0 with COMPLETE output. Strictly
  // better than the behaviour this test pinned: the same entities, none lost,
  // and the collision reported as a warning that names both paths.
  //
  // The I-13 degrade-never-discard POLICY is unchanged and still covered:
  // `convert()`'s partial-output emission path (see its `addError`
  // /`Partial-output emission also failed` arm) is untouched by this change.
  // What changed is that a duplicate entity name is no longer one of the
  // errors that triggers it.
  it('I-13: a duplicate entity name no longer degrades — the CLI exits 0 with complete output', () => {
    const projectDir = fixturePath('18-i13-degrade-never-discard');
    const outputPath = join(mkdtempSync(join(tmpdir(), 'tm9-q2-i13-')), 'out.tmd');
    try {
      let exitCode = 0;
      try {
        execFileSync(
          process.execPath,
          [cliPath, 'export', '--project', projectDir, '--entrypoint', 'src/main.ts', '--output', outputPath],
          {
            stdio: 'pipe',
          },
        );
      } catch (error) {
        exitCode = (error as { status?: number }).status ?? 1;
      }
      assert.equal(exitCode, 0, 'a duplicate entity name is now resolved by a rename, not an abort');
      assert.equal(existsSync(outputPath), true, 'output must be written');
      const content = readFileSync(outputPath, 'utf-8');
      assert.ok(content.length > 0, 'the output file must be non-empty');

      // BOTH colliding classes are present: the first declarer keeps the bare
      // name, the second is qualified by its sanitized module basename. Before
      // PR 1 only one survived, and the run failed.
      assert.match(
        content,
        /class Widget \{\n {2}type: Class\n {2}method: "render\(\) => string"/,
        'main.ts keeps the bare Widget and typed method',
      );
      assert.ok(content.includes('OtherFile.Widget'), 'other.ts is renamed, not dropped');
    } finally {
      rmSync(dirname(outputPath), { recursive: true, force: true });
    }
  });
});

describe('RFC-TM-9 Q2 check — X-CONV-5: builtin-extends stub entities', () => {
  it('class NotionApiError extends Error synthesizes an Error stub and resolves the extends reference', async () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('19-builtin-extends'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('19-builtin-extends', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const stubEntity = result.entities.find((e) => e.name === 'Error');
    assert.notEqual(stubEntity, undefined, 'a stub Class entity named Error must be synthesized');
    assert.equal(
      stubEntity?.kind,
      'Class',
      'the stub must be a ClassNode — Dependency fails extends.to (verified: "Cannot use \'extends\' to reference Dependency")',
    );

    const { result: checkResult } = await checkViaLongform(result.entities);
    const codes = checkResult.diagnostics.map((d) => d.code);
    assert.equal(codes.includes('checker/unknown-base-class'), false, 'the extends target must resolve');
    assert.equal(codes.includes('checker/orphaned-entity'), false, 'neither the stub nor the extending class may be orphaned');
    assert.equal(codes.includes('checker/class-not-exported'), false, 'the stub must be exported by some file');
    // RFC-TM-10 §7 (rfc-tm-10-diamond.md, D-LEG-7) fixed the Program/entry
    // dual-export defect this test used to pin as a known pre-existing
    // false-positive (a direct ProgramNode.entry-to-co-exporter-name field
    // comparison excludes exactly this shape). Zero diagnostics now.
    assert.deepEqual(codes, []);
  });
});

describe('RFC-TM-9 Q2 check — X-AN-10: --recognize sst-handler (flag-gated, one convention entry)', () => {
  it('WITHOUT the flag: the handler string is invisible, behavior unchanged from Q1', () => {
    const fixtureDir = fixturePath('webhookstorage-signature');
    const analyzer = new TypeScriptAnalyzer(fixtureDir);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));
    assert.equal(analysis.moduleGraph.length, 0, 'no recognizer edge without the flag');
    assert.equal(analysis.diagnostics.filter((d) => d.category === 'recognizer-not-found').length, 0);
  });

  it('WITH --recognize sst-handler: the handler string resolves and appears in the module-graph golden', () => {
    const fixtureDir = fixturePath('webhookstorage-signature');
    const analyzer = new TypeScriptAnalyzer(fixtureDir, undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'infra', 'api.ts'));

    const golden = JSON.parse(readFileSync(join(fixtureDir, 'module-graph.infra.recognized.json'), 'utf8'));
    assert.deepEqual(analysis.moduleGraph, golden);
    // RFC-TM-10 Q3 (D-LEG-6) superseded this Q2-era "zero diagnostics"
    // expectation: the resolved handler module now ALSO joins
    // `traverseQueue` and is parsed standalone (it lives outside this
    // fixture's root tsconfig, `exclude: ["packages"]`, by design), which
    // discloses one 'recognizer-module-standalone-parsed' informational
    // diagnostic naming the exact fidelity loss (no checker-backed JSDoc
    // symbol resolution for that module) rather than silently degrading.
    assert.deepEqual(
      analysis.diagnostics.map((d) => d.category),
      ['recognizer-module-standalone-parsed'],
      'the happy-path resolution surfaces exactly the Q3 standalone-parse disclosure, nothing else',
    );
  });

  // RFC-TM-10 §11 (rfc-tm-10-diamond.md, D-LEG-11, Diamond DAG Q8) —
  // exact-text pin for the one live X-DIAG-1 warning class §11's enumeration
  // names. DISCLOSED SCOPE NOTE: this message is authored directly from
  // typescript-analyzer.ts's own construction site, NOT from a
  // diagnostic-code-audit.md row — D-LEG-12's audit (Q7) bounded itself to
  // exactly the 62-row `CHECK_CODES` registry (checker/pipeline codes only,
  // per §12's "Bounded scope... one per CHECK_CODES entry"), and D-LEG-10(b)'s
  // jargon lint (Q6) likewise scans only `src/checker`/`src/pipeline`
  // (check-diagnostic-jargon.mjs's CHECKER_DIR/PIPELINE_DIR) — neither ever
  // covered this extractor-package warning despite the style guide's own
  // header text nominally including "every extractor warning." Retroactively
  // widening Q6's lint or Q7's audit to the extractor package is outside
  // D-LEG-11's own named scope (D-LEG-10/D-LEG-12 are separate, already-landed
  // items), so this fixture pins the text directly and is exempted from
  // `check-fixture-audit-gating.mjs`'s cross-validation by construction — that
  // script only reads rows keyed by a `code:`-shaped registry entry
  // (`checker/*`/`imports/*`/`semantics/*`/`syntax/*`), and this warning's
  // `category` field (`recognizer-not-found`) is not such a code. Recorded
  // here rather than silently left as a substring match, matching this
  // Diamond's own honest-disposition convention (D-LEG-7's residual, §7/§14).
  it('recognizer not-found: a handler string pointing nowhere surfaces an X-DIAG-1 warning with pinned exact text, never silence', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('23-recognizer-not-found'), undefined, ['sst-handler']);
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('23-recognizer-not-found', 'infra', 'api.ts'));

    const notFoundDiagnostics = analysis.diagnostics.filter((d) => d.category === 'recognizer-not-found');
    assert.equal(notFoundDiagnostics.length, 1);
    assert.equal(notFoundDiagnostics[0]?.severity, 'warning');
    assert.equal(
      notFoundDiagnostics[0]?.message,
      "sst-handler recognizer: no source file found for handler string 'nonexistent/path.handler' (probed nonexistent/path.ts, nonexistent/path.tsx, nonexistent/path.mts)",
    );

    const edge = analysis.moduleGraph.find((e) => e.specifier === 'nonexistent/path.handler');
    assert.equal(edge?.classification, 'unresolved');
  });
});

describe('RFC-TM-9 Q2 check — X-AN-11: import.meta.url self-invocation guard marks a real root', () => {
  it('analyzer marks the guarded function as self-invoked', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('20-self-invoking-root'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('20-self-invoking-root', 'src', 'index.ts'));
    assert.deepEqual(analysis.modules[0]?.selfInvokedFunctionNames, ['runWorker']);
  });

  it('converter pushes the function name into Program.exports; zero orphan flags; zero FileNode diffs', async () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('20-self-invoking-root'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('20-self-invoking-root', 'src', 'index.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const programEntity = result.entities.find((e) => e.kind === 'Program') as { exports: readonly string[] | undefined } | undefined;
    assert.ok(programEntity?.exports?.includes('runWorker'), 'runWorker must be present in Program.exports');

    // Negative check (RFC §6 F2 disposition): zero FileNode shape change
    // FROM THIS ITEM specifically. FileNode's field set gained `reExports`
    // under RFC-TM-11 (rfc-tm-11-diamond.md §RX-2, unrelated to
    // self-invocation) — the set below is updated to match that addition,
    // not reverted; this item still introduces no self-invocation-specific
    // field.
    const fileEntity = result.entities.find((e) => e.kind === 'File') as Record<string, unknown> | undefined;
    assert.notEqual(fileEntity, undefined);
    assert.deepEqual(
      new Set(Object.keys(fileEntity ?? {})),
      new Set(['kind', 'name', 'span', 'raw', 'sourceForm', 'comment', 'path', 'imports', 'exports', 'reExports', 'purpose']),
    );

    const { result: checkResult } = await checkViaLongform(result.entities);
    const codes = checkResult.diagnostics.map((d) => d.code);
    assert.equal(codes.includes('checker/orphaned-entity'), false, 'runWorker must not be flagged orphaned');
    assert.equal(codes.includes('checker/orphaned-file'), false);
    // RFC-TM-10 §7 (rfc-tm-10-diamond.md, D-LEG-7) fixed the same
    // Program/entry dual-export defect the X-CONV-5 case above used to pin.
    // Zero diagnostics now.
    assert.deepEqual(codes, []);
  });
});
