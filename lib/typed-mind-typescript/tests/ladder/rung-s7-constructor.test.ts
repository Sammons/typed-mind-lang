// Ladder rung for sammons/s7-constructor — a 6-package pnpm workspace
// (services/app, lib/{constructs,harness,policy,ui}, tools/worktree-mediator)
// with a Lit + @lit-labs/signals app shell, two `node:http` servers, a
// kysely/pg class-heavy DI layer, and a port-lease mediator.
//
// Live baseline (extractor at 264f735, checker via `--check`), each target run
// as `export --project <tsconfig> --entrypoint <entry> --recognize sst-handler`:
//   services/app          src/server.ts    27 entities   8 diagnostics
//   services/app          src/migrate.ts   13 entities   8 diagnostics
//   lib/harness           src/index.ts     63 entities   2 diagnostics
//   lib/constructs        src/index.ts      8 entities   0 (clean control)
//   lib/ui                src/index.ts     39 entities  14 diagnostics
//   lib/ui                src/components/s7-app-shell.ts  5 entities  1 diagnostic
//   lib/policy            src/evaluate.ts   6 entities   0 (clean control)
//   tools/worktree-mediator src/server.ts  11 entities   2 diagnostics
//
// Four fixtures (82-85). Fixture 82 is HALF fix-bound: its analyzer-side half
// is fixed here and asserted green; its grammar-side half is pinned as a
// knownGap in the same describe block. RFC-TM-13 closes fixtures 83 and 84.
// Fixture 85 remains pinned until typed methods and constructors land.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { parseTypeExprText } from '../../../typed-mind/src/pipeline/type-expr-from-text.ts';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const convertFixture = (name: string, entrySegments: string[]) => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(name));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath(name, ...entrySegments));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

const checkTmd = async (tmdContent: string) => {
  const typedMind = await TypedMind.create();
  return typedMind.check(tmdContent);
};

const messagesOf = (result: { diagnostics: readonly { message: string }[] }): string[] => {
  return result.diagnostics.map((diagnostic) => diagnostic.message);
};

describe('82 — a function type returning a generic whose argument is a union', () => {
  // Corpus: lib/harness/src/model-client.ts (`S7ModelClient.runTurn`) and
  // lib/harness/src/forks.ts (`S7ForkRunner.runSummaryFork`), which produced
  // both of the lib/harness entrypoint's 2 diagnostics.
  //
  // The defect exists in TWO layers that share one logical bug: a `|` inside a
  // return-position generic is read as a TOP-LEVEL union operator, which ends
  // the opaque run early and strands the generic's own closing `>`.
  //
  //   (a) `parseTypeExprText`'s `scanOpaqueRun` (the TS-side text parser).
  //       FIXED here — see the first two tests.
  //   (b) the tree-sitter grammar's `_opaque_piece` token, whose regex
  //       `[^ \t\n"(){}\[\]]+` splits on whitespace, so ` | ` ends the run
  //       inside the grammar too. NOT fixed here — see the knownGap test.

  it('parses `(a: X) => Promise<Y | Z>` as one complete opaque leaf, with no stranded remainder', () => {
    const result = parseTypeExprText('(a: X) => Promise<Y | Z>');
    // A non-empty remainder is what the module's own doc comment calls a
    // parser bug: every caller reads `.typeExpr` and discards `.remainder`,
    // so a stranded `>` silently corrupts the emitted line.
    assert.equal(result.remainder, '', `the whole function type must be consumed, got remainder: ${JSON.stringify(result.remainder)}`);
    assert.equal(result.typeExpr.kind, 'opaque', 'a function type has no structured kind in this grammar (RFC-TM-8 §1)');
    assert.equal(result.typeExpr.kind === 'opaque' ? result.typeExpr.text : '', '(a: X) => Promise<Y | Z>');
  });

  it('leaves the two non-function control shapes structured and unchanged', () => {
    // A top-level union really IS a union — the fix must not swallow it.
    const union = parseTypeExprText('(a: X) => Y | Z');
    assert.equal(union.remainder, '');
    assert.equal(union.typeExpr.kind, 'union', 'a union in RETURN position with no generic stays a union');

    // A bare generic-over-union was already correct and must stay structured.
    const generic = parseTypeExprText('Promise<Y | Z>');
    assert.equal(generic.remainder, '');
    assert.equal(generic.typeExpr.kind, 'generic', 'a bare generic must keep its structured kind');
  });

  it('the corpus spellings from lib/harness parse with no remainder', () => {
    for (const spelling of [
      '(start: ArcStartingPoint) => Promise<readonly S7Message[] | ModelFailure>',
      '(arc: S7Arc) => Promise<SummaryOutcome | null>',
      '(arc: S7Arc) => Promise<S7MemoryUpdate[]>',
    ]) {
      const result = parseTypeExprText(spelling);
      assert.equal(result.remainder, '', `${spelling} must be fully consumed`);
    }
  });

  it('knownGap — the GRAMMAR still rejects the same shape in a DTO field', async () => {
    // The extractor now emits this line correctly, but the checker's grammar
    // cannot read it back, so the fixture's end-to-end verdict is still an
    // error.
    //
    // Scope correction (measured in PR #163, pristine main + isolated
    // XDG_CACHE_HOME): the trigger is NOT just "a union inside a generic".
    // The function type must also sit at the TOP LEVEL of the field's type —
    // the identical shape wrapped in braces parses clean, because the
    // enclosing `_opaque_brace_group` absorbs the `|` before `type_union`
    // ever sees it:
    //   - b: (x: string) => Promise<Rec | null>        # 1 ERROR node
    //   - b: { f: (x: string) => Promise<Rec | null> } # clean
    //
    // Closing it is NOT a matter of adding an `_opaque_angle_group`. That was
    // implemented and measured on clean main (PR #163): it generates with no
    // conflicts, leaves the corpus at 138/138, does NOT break the legal
    // `A < B` case, and does NOT fix this shape either — a no-op, because the
    // fallback chunk token consumes `Promise<` as opaque text before any
    // angle group could open.
    //
    // The real fix is lexer-level: the `|` must stop being visible to
    // `type_union` while inside an unclosed `<`, which is external-scanner
    // territory (the grammar header reserves that as a stop-and-report
    // boundary, S-GRAMMAR-3). Staying a knownGap is the recommendation —
    // zero corpus instances, and the work lands in the same `(`-position
    // neighborhood where `_paramlist_opaque_run` and `_opaque_paren_group`
    // already collide, so it risks regressing issue #50 for a shape nothing
    // uses. Any fix must also not weaken the union split `- f: A | B`
    // depends on.
    const result = convertFixture('82-function-type-generic-union-return', ['src', 'index.ts']);
    assert.equal(result.success, true);

    // The emitted line itself is correct and complete — this is what the
    // analyzer-side fix bought, and it is what a grammar fix would make check.
    assert.ok(
      result.tmdContent.includes('- runTurn: (start: string) => Promise<Message[] | Failure>'),
      `the field must emit its full, balanced type text. Got:\n${result.tmdContent}`,
    );

    const check = await checkTmd(result.tmdContent);
    assert.deepEqual(
      messagesOf(check),
      ['Unparsable text: `>` — check this line against the grammar and fix or remove it'],
      'pinning the grammar-side half of the gap; delete this assertion when _opaque_piece is fixed',
    );

    // The control field — same shape WITHOUT a union inside the generic —
    // is accepted by the grammar, which is what isolates the union as the
    // trigger rather than the function type itself.
    assert.ok(result.tmdContent.includes('- runOnce: (start: string) => Promise<Outcome>'));
  });
});

describe('83 — external generic types resolve through Dependency exports', () => {
  // Corpus: services/app/src/db-types.ts, whose kysely table types spell every
  // generated column `Generated<string>` / `Generated<Date>`. This produced all
  // 8 diagnostics on BOTH services/app entrypoints (server.ts and migrate.ts).
  it('TM13 B2: gap 83 clears exactly its two external field errors', async () => {
    const fixture = '83-generic-base-external-stub';
    const analysis = new TypeScriptAnalyzer(fixturePath(fixture)).analyzeFromEntrypoint(fixturePath(fixture, 'src', 'index.ts'));
    assert.deepEqual(
      analysis.moduleGraph,
      [
        {
          sourceModule: 'src/index.ts',
          specifier: 'external-lib',
          resolvedTarget: undefined,
          classification: 'unresolved',
        },
      ],
      'the external-import fix preserves the baseline unresolved package edge',
    );
    const result = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(result.success, true);
    assert.ok(result.tmdContent.includes('-> [Generated, ExternalThing]'));
    const check = await checkTmd(result.tmdContent);
    assert.deepEqual(messagesOf(check), []);

    // Removing only the dependency exports reproduces precisely the two
    // original field findings; no unrelated checker rule was silenced.
    const withoutExports = result.tmdContent.replace('  -> [Generated, ExternalThing]\n', '');
    assert.deepEqual(messagesOf(await checkTmd(withoutExports)).toSorted(), [
      "DTO 'AccountsTable' field 'id' references undefined type 'Generated'",
      "DTO 'AccountsTable' field 'picked' references undefined type 'ExternalThing'",
    ]);
  });
});

describe('84 — a type used only inside a generic in a function signature is reported orphaned', () => {
  // Corpus: lib/ui/src/api.ts and lib/ui/src/parse.ts, whose `ApiResult` and
  // `ParseResult` appear only as `Promise<ApiResult<Construct[]>>` and
  // `ParseResult<Construct[]>`. Three of the lib/ui entrypoint's 14
  // diagnostics are this shape.
  it('TM13 B1: gap 84 keeps output bytes and removes exactly two orphan findings', async () => {
    const result = convertFixture('84-function-io-generic-orphan', ['src', 'index.ts']);
    assert.equal(result.success, true);

    // Both types are genuinely used — each is the generic ARGUMENT of a
    // function's parameter or return type, and nothing else references them.
    assert.ok(result.tmdContent.includes('fetchWrapped() => Promise<Wrapped[]>'));
    assert.ok(result.tmdContent.includes('countBoxes(boxes: ReadonlyArray<Boxed>) => number'));

    const check = await checkTmd(result.tmdContent);
    assert.equal(result.tmdContent, readFileSync(join(testDir, 'goldens-tmd', '84-function-io-generic-orphan.tmd'), 'utf8'));
    assert.deepEqual(messagesOf(check), []);
    // Removing the two signature type uses restores exactly the old findings.
    const withoutUses = result.tmdContent
      .replace('Promise<Wrapped[]>', 'Promise<string[]>')
      .replace('ReadonlyArray<Boxed>', 'ReadonlyArray<number>');
    assert.deepEqual(messagesOf(await checkTmd(withoutUses)).toSorted(), ["Orphaned entity 'Boxed'", "Orphaned entity 'Wrapped'"]);
  });

  it('control: explicit IO retains its existing bare-name grammar and reference behavior', async () => {
    // Explicit IO is still an entity-name slot. B1 reads signature types
    // without widening IO grammar or DTO-kind validation.
    const typedMind = await TypedMind.create();
    const document = (output: string): string =>
      [
        'program P {',
        '  type: Program',
        '  entry: F',
        '  version: 1.0.0',
        '  exports: [go]',
        '}',
        '',
        'F @ src/index.ts:',
        '  -> [go, Wrapped]',
        '',
        'go :: go() => string',
        `  -> ${output}`,
        '',
        'Wrapped %',
        '  - x: string',
        '',
      ].join('\n');

    const bare = typedMind.check(document('Wrapped'));
    assert.deepEqual(messagesOf(bare), [], 'a BARE output name marks the type referenced');

    const wrapped = typedMind.check(document('Promise<Wrapped>'));
    assert.ok(
      messagesOf(wrapped).includes("Orphaned entity 'Wrapped'"),
      `the SAME type wrapped in a generic is reported orphaned. Got: ${JSON.stringify(messagesOf(wrapped))}`,
    );
  });
});

describe('85 — types reachable only through a ClassFile method signature are reported orphaned', () => {
  // Corpus: tools/worktree-mediator/src/store.ts. `StoreConfig` is the
  // `LeaseStore` constructor's parameter type and `AllocationFailure` is half
  // of `allocate`'s return union; together they are both of that entrypoint's
  // 2 diagnostics.
  it('knownGap — a ClassFile records method NAMES only, so signature-only types lose their referent', async () => {
    const result = convertFixture('85-classfile-method-signature-types', ['src', 'server.ts']);
    assert.equal(result.success, true);

    // `ClassFileNode.methods` is `readonly string[]`
    // (lib/typed-mind/src/ast/class-file-node.ts:12) and the grammar has no
    // slot for a method's parameter or return types.
    assert.ok(result.tmdContent.includes('=> [allocate, list]'), `methods emit as bare names. Got:\n${result.tmdContent}`);

    // The ClassFile's `-> [...]` DOES name them, but check-orphans.ts
    // deliberately does not count exports as references (its own header
    // states the rule), so this list cannot rescue them.
    assert.ok(result.tmdContent.includes('-> [Lease, StoreConfig, AllocationFailure, LeaseStore]'));

    const check = await checkTmd(result.tmdContent);
    assert.deepEqual(messagesOf(check).toSorted(), ["Orphaned entity 'AllocationFailure'", "Orphaned entity 'StoreConfig'"]);

    // `Lease` is the control: it survives only because server.ts imports it by
    // name directly, which is the one path a ClassFile method type can take
    // to reach the referenced set.
    assert.equal(
      messagesOf(check).includes("Orphaned entity 'Lease'"),
      false,
      'a directly-imported type is still counted, which isolates the signature-only path as the trigger',
    );
  });
});
