// Ladder rung: sammons/artifice-with-intelligence (RFC-TM-9 §8 X-LADDER-2).
//
// Target shape: a single-package Node 26 agent-friendly email service
// (HATEOAS + MJML), 3 tsconfigs, generics-heavy, 163 TypeScript files.
//
// Fixture 94 is a FIX (fail-before / pass-after). Fixture 95 is a KNOWN GAP,
// pinned with positive assertions per the harness convention
// (slat-harness-known-gaps.test.ts:1-9): it asserts the defect is STILL
// present, so the day it is fixed this suite fails loudly and the
// expectation gets re-baselined deliberately rather than drifting.
//
// Fixture 96 was such a gap and has been PARTIALLY fixed by
// decision-same-named-entities PR 1 — its declaration half is closed (the
// abort is gone; the second declaration is renamed) and its reference half
// remains pinned. That re-baselining is exactly the deliberate flip this
// convention exists to force. See the describe block's own comment.
//
// No existing assertion is weakened by this file.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');

const convert = (fixture: string) => {
  const fixtureDir = join(reprosDir, fixture);
  const analyzer = new TypeScriptAnalyzer(fixtureDir);
  const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

const diagnose = async (tmdContent: string) => {
  const tm = await TypedMind.create();
  return tm.check(tmdContent).diagnostics;
};

// Constants line for a given entity, e.g. `embedWhitelist ! src/index.ts : ReadonlySet`.
const constantsLine = (tmdContent: string, name: string): string | undefined => {
  return tmdContent.split('\n').find((line) => line.startsWith(`${name} ! `));
};

describe('artifice rung, FIXTURE 94: a Constants generic type annotation must degrade to a grammatical entity_name', () => {
  it('the emitted .tmd has zero diagnostics (was: syntax/error on `<string>`)', async () => {
    const result = convert('94-constants-generic-type-annotation');
    assert.equal(result.success, true);
    const diagnostics = await diagnose(result.tmdContent);
    assert.deepEqual(diagnostics, [], `must have zero diagnostics: ${JSON.stringify(diagnostics.map((d) => d.message))}`);
  });

  it('ReadonlySet<string> reduces to its base name, matching how Record<K,V> already reduces', () => {
    const result = convert('94-constants-generic-type-annotation');
    assert.equal(constantsLine(result.tmdContent, 'embedWhitelist'), 'embedWhitelist ! src/index.ts : ReadonlySet');
  });

  it('CONTROLS: the pre-existing allowlist reductions are unchanged', () => {
    const result = convert('94-constants-generic-type-annotation');
    assert.equal(constantsLine(result.tmdContent, 'headerDefaults'), 'headerDefaults ! src/index.ts : Record');
    assert.equal(constantsLine(result.tmdContent, 'slotIndex'), 'slotIndex ! src/index.ts : Map');
    assert.equal(constantsLine(result.tmdContent, 'knownRels'), 'knownRels ! src/index.ts : Array');
    assert.equal(constantsLine(result.tmdContent, 'skillDoc'), 'skillDoc ! src/index.ts : string');
  });

  it('every emitted Constants type slot is a bare entity_name (grammar/grammar.js:761)', () => {
    const result = convert('94-constants-generic-type-annotation');
    const annotated = result.tmdContent.split('\n').filter((line) => / ! .* : /.test(line));
    assert.equal(annotated.length, 5, 'all five constants must keep their type slot');
    for (const line of annotated) {
      const schema = line.split(' : ')[1] ?? '';
      assert.match(schema, /^[A-Za-z_]\w*$/, `ungrammatical Constants type slot: ${line}`);
    }
  });
});

describe('artifice rung, KNOWN GAP 95: a generic function type parameter leaks into the output slot', () => {
  it('KNOWN GAP — `T` is still reported as a missing output DTO (analyzer never reads node.typeParameters)', async () => {
    const result = convert('95-generic-function-type-parameter');
    assert.equal(result.success, true);
    const diagnostics = await diagnose(result.tmdContent);
    const finding = diagnostics.find((d) => /Function output DTO 'T' not found/.test(d.message));
    assert.notEqual(
      finding,
      undefined,
      `the generic-type-parameter gap must still be present and annotated; got: ${JSON.stringify(diagnostics.map((d) => d.message))}`,
    );
  });

  it('CONTROLS: a concrete return type and a primitive return type both resolve correctly', async () => {
    const result = convert('95-generic-function-type-parameter');
    const diagnostics = await diagnose(result.tmdContent);
    const messages = diagnostics.map((d) => d.message).join(' | ');
    assert.doesNotMatch(messages, /'Ledger' not found/, 'the concrete DTO return must resolve');
    assert.doesNotMatch(messages, /'number' not found/, 'a primitive return must not be treated as a DTO');
  });
});

// decision-same-named-entities PR 1 — RE-PINNED. Gap 96 was the type-alias
// twin of fixture 77: both files declare `export type PublishState`, and
// `convertTypeAliasToDTO` aborted the whole conversion with
// `Duplicate entity name: PublishState` (`success: false`, partial output).
// The memo this PR implements named exactly this fixture as one of the two
// knownGaps it unblocks.
//
// The abort is GONE. The DECLARATION half is fixed: `reserveTypeEntityNames`
// renames the second declarer to `LifecycleFile.PublishState`, both TypeDefs
// survive carrying their own right-hand sides, and the run completes.
//
// The REFERENCE half is still the gap, so this fixture stays a pin for it —
// same status as fixture 77, and for the same reason. `advance(state:
// PublishState)` and `nextState(...)` hold raw type TEXT that PR 1 cannot
// resolve to a declaring module (`getTypeString` is a bare
// `typeNode.getText()`; `types.ts` has no resolved-type-origin field), so
// those references stay bare and each one emits an interim-window warning.
// The assertions below characterize that interim state; when PR 2 lands they
// fail by design and get re-baselined deliberately.
describe('artifice rung, gap 96: same type alias in two files — declaration renamed (PR 1), references still bare (PR 2)', () => {
  it('FIXED (PR 1): the conversion completes — no duplicate-name abort', () => {
    const result = convert('96-same-name-type-alias-two-files');
    assert.equal(result.success, true, 'the duplicate-name abort is replaced by a rename');
    assert.deepEqual(
      result.errors.map((e) => e.message),
      [],
      'no error may survive the rename',
    );
  });

  it('FIXED (PR 1): both type aliases survive, the second module-qualified, each with its own RHS', () => {
    const result = convert('96-same-name-type-alias-two-files');

    const publishStateEntities = result.entities
      .map((entity) => entity.name)
      .filter((name) => name === 'PublishState' || name.endsWith('.PublishState'))
      .sort();
    assert.deepEqual(
      publishStateEntities,
      ['LifecycleFile.PublishState', 'PublishState'],
      'index.ts keeps the bare name; lifecycle.ts is qualified by its sanitized module basename',
    );

    // Each keeps its OWN aliased type — the renamed entity is a real, distinct
    // entity, not the survivor wearing the other module's shape.
    assert.ok(
      result.tmdContent.includes("PublishState = 'draft' | 'published'"),
      `index.ts's own union must survive verbatim: ${result.tmdContent}`,
    );
    assert.ok(
      result.tmdContent.includes('LifecycleFile.PublishState = (typeof publishStates)[number]'),
      `lifecycle.ts's own indexed-access alias must survive verbatim: ${result.tmdContent}`,
    );
  });

  it('FIXED (PR 1): the collision warning names both declaring paths and the resulting name', () => {
    const result = convert('96-same-name-type-alias-two-files');
    assert.deepEqual(
      result.warnings.map((warning) => warning.message).filter((message) => message.startsWith('Duplicate entity name ')),
      [
        "Duplicate entity name 'PublishState' declared in both 'src/index.ts' and 'src/lifecycle.ts'; the declaration whose file path sorts first kept the bare name, so 'src/lifecycle.ts' was renamed to 'LifecycleFile.PublishState'. TypedMind entity names are global to a document.",
      ],
    );
  });

  it('STILL THE GAP (PR 2): raw type-text references stay bare, and each one warns', () => {
    const result = convert('96-same-name-type-alias-two-files');

    // Three reference positions hold raw text PR 1 cannot resolve:
    // `advance`'s input, and `nextState`'s input and output.
    const interimWarnings = result.warnings
      .map((warning) => warning.message)
      .filter((message) => message.startsWith("Reference to 'PublishState'"));
    assert.equal(
      interimWarnings.length,
      3,
      `each unresolved reference must warn so the interim window is visible: ${JSON.stringify(interimWarnings)}`,
    );

    // The signature text itself is untouched — still naming the bare alias.
    assert.ok(result.tmdContent.includes('advance(state: PublishState)'), 'the reference stays BARE — reference-following is PR 2');
  });

  it('STILL THE GAP (PR 2): no duplicate-name or multi-exported finding; the residual is the aliased import', async () => {
    const result = convert('96-same-name-type-alias-two-files');
    const diagnostics = await diagnose(result.tmdContent);
    const codes = diagnostics.map((diagnostic) => diagnostic.code);

    // The rename's whole purpose: the global namespace is genuinely
    // collision-free now, so neither check fires.
    assert.deepEqual(
      codes.filter((code) => code === 'checker/duplicate-name' || code === 'checker/multi-exported'),
      [],
      `no duplicate-name and no multi-exported finding may survive the rename: ${JSON.stringify(codes)}`,
    );

    // Residuals pinned exactly so any OTHER finding appearing here fails.
    // B1 recognizes the bare PublishState signature use. The renamed
    // TypeDef and aliased StoredPublishState output still require A2.
    assert.deepEqual(
      codes.sort(),
      ['checker/orphaned-entity', 'checker/output-dto-not-found'],
      `unexpected residual diagnostics: ${JSON.stringify(codes)}`,
    );
    assert.deepEqual(
      diagnostics.filter((diagnostic) => diagnostic.code === 'checker/orphaned-entity').map((diagnostic) => diagnostic.message),
      ["Orphaned entity 'LifecycleFile.PublishState'"],
    );
    const control = await diagnose(
      result.tmdContent
        .replace('advance(state: PublishState)', 'advance(state: string)')
        .replace('nextState(current: PublishState) => PublishState', 'nextState(current: string) => string'),
    );
    const restored = control.filter((diagnostic) => diagnostic.message === "Orphaned entity 'PublishState'");
    assert.equal(restored.length, 1);
    assert.equal(restored[0]?.code, 'checker/orphaned-entity');
    assert.deepEqual(
      control.filter((diagnostic) => !restored.includes(diagnostic)).map(({ code, message }) => ({ code, message })),
      diagnostics.map(({ code, message }) => ({ code, message })),
    );
  });
});
