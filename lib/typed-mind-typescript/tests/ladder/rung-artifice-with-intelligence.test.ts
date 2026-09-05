// Ladder rung: sammons/artifice-with-intelligence (RFC-TM-9 §8 X-LADDER-2).
//
// Target shape: a single-package Node 26 agent-friendly email service
// (HATEOAS + MJML), 3 tsconfigs, generics-heavy, 163 TypeScript files.
//
// Fixture 94 is a FIX (fail-before / pass-after). Fixture 95 was a KNOWN GAP
// (a generic function's type parameter leaked as a fabricated global entity)
// and is now FIXED (unit G) — see the 'FIXED GAP 95' describe block below.
//
// Fixture 96 was also a known gap and is now FULLY fixed by
// decision-same-named-entities PR 1 (declaration identity) plus unit A2
// (signature reference resolution): both the declaration half (the abort is
// gone; the second declaration is renamed) and the reference half (each
// signature resolves its own actual declaration, no interim collision
// warnings) are closed. See the describe block's own comment.
//
// No existing assertion is weakened by this file.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ConstantsNode, FunctionNode, TypedMind } from '@sammons/typed-mind';
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

// Constants line for a given entity, e.g. `embedWhitelist ! src/index.ts : ReadonlySet<string>`.
const constantsLine = (tmdContent: string, name: string): string | undefined => {
  return tmdContent.split('\n').find((line) => line.startsWith(`${name} ! `));
};

// RFC-TM-14 U5a, leaf R6a (rfc-tm-14-diamond.md §S5, S-11): the Constants
// schema slot is a `type_expr` (grammar/grammar.js constants_declaration, the
// typedef_declaration twin), so fixture 94's four pinned REDUCTIONS —
// `ReadonlySet<string>` -> `ReadonlySet`, `Record<string, string>` ->
// `Record`, `Map<string, number>` -> `Map`, `string[]` -> `Array` — migrate
// to the whole annotation. The fixture's original defect (an ungrammatical
// `<string>` in the slot) stays pinned by the zero-diagnostics check: every
// slot now parses because the grammar holds the full type expression. Cause:
// `convertTypeToSchema` no longer degrades to a base name (fixture 119,
// `constants-schema.test.ts`, is the R6a fixture).
describe('artifice rung, FIXTURE 94: a Constants generic type annotation is emitted whole into the type_expr schema slot', () => {
  it('the emitted .tmd has zero diagnostics (was: syntax/error on `<string>`)', async () => {
    const result = convert('94-constants-generic-type-annotation');
    assert.equal(result.success, true);
    const diagnostics = await diagnose(result.tmdContent);
    assert.deepEqual(diagnostics, [], `must have zero diagnostics: ${JSON.stringify(diagnostics.map((d) => d.message))}`);
  });

  it('ReadonlySet<string> is emitted whole (R6a migration of the pinned base-name reduction)', () => {
    const result = convert('94-constants-generic-type-annotation');
    assert.equal(constantsLine(result.tmdContent, 'embedWhitelist'), 'embedWhitelist ! src/index.ts : ReadonlySet<string>');
  });

  it('CONTROLS: the former allowlist reductions now emit the annotation text (R6a migration)', () => {
    const result = convert('94-constants-generic-type-annotation');
    assert.deepEqual(
      {
        headerDefaults: constantsLine(result.tmdContent, 'headerDefaults'),
        slotIndex: constantsLine(result.tmdContent, 'slotIndex'),
        knownRels: constantsLine(result.tmdContent, 'knownRels'),
        skillDoc: constantsLine(result.tmdContent, 'skillDoc'),
      },
      {
        headerDefaults: 'headerDefaults ! src/index.ts : Record<string, string>',
        slotIndex: 'slotIndex ! src/index.ts : Map<string, number>',
        knownRels: 'knownRels ! src/index.ts : string[]',
        skillDoc: 'skillDoc ! src/index.ts : string',
      },
    );
  });

  it('every emitted Constants type slot parses as a type_expr (grammar.md "Constants" row)', async () => {
    const result = convert('94-constants-generic-type-annotation');
    const annotated = result.tmdContent.split('\n').filter((line) => / ! .* : /.test(line));
    assert.equal(annotated.length, 5, 'all five constants must keep their type slot');
    const tm = await TypedMind.create();
    for (const line of annotated) {
      const outcome = tm.parse(`${line}\n`);
      assert.deepEqual(outcome.diagnostics, [], `unparsable Constants type slot: ${line}`);
      assert.equal(outcome.entities[0] instanceof ConstantsNode && outcome.entities[0].schemaType !== undefined, true, line);
    }
  });
});

describe('artifice rung, FIXED GAP 95: a generic function binds its return type locally', () => {
  it('G.5 retains T on the function and creates no global output DTO edge', async () => {
    const result = convert('95-generic-function-type-parameter');
    assert.equal(result.success, true);
    assert.deepEqual(await diagnose(result.tmdContent), []);
    const fn = result.entities.find((entity) => entity.name === 'withTransaction');
    assert.ok(fn instanceof FunctionNode);
    assert.deepEqual(
      fn.typeParameters?.map((parameter) => parameter.name),
      ['T'],
    );
    assert.equal(fn.output, undefined);
    assert.equal(
      result.entities.some((entity) => entity.name === 'T'),
      false,
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

// Fixture96 retains two distinct PublishState aliases. E allocates their
// declaration identities; A2 resolves signature aliases to those identities.
// The companion converter test removes origins to restore exactly the old
// unused LifecycleFile.PublishState and missing StoredPublishState findings.
describe('artifice rung, FIXED GAP 96: distinct aliases and signature references resolve by source identity', () => {
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

  it('FIXED (A2): each signature references the correct type alias without interim warnings', () => {
    const result = convert('96-same-name-type-alias-two-files');

    // Each signature position resolves its own actual declaration.
    const interimWarnings = result.warnings
      .map((warning) => warning.message)
      .filter((message) => message.startsWith("Reference to 'PublishState'"));
    assert.equal(
      interimWarnings.length,
      0,
      `resolved references no longer carry interim collision warnings: ${JSON.stringify(interimWarnings)}`,
    );

    assert.ok(result.tmdContent.includes('advance(state: PublishState) => LifecycleFile.PublishState'));
    assert.ok(result.tmdContent.includes('nextState(current: LifecycleFile.PublishState) => LifecycleFile.PublishState'));
  });

  it('FIXED (A2): the original alias-import fixture checks clean and signature removal restores real orphans', async () => {
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

    assert.deepEqual(diagnostics, []);
    const control = await diagnose(
      result.tmdContent
        .replace('advance(state: PublishState) => LifecycleFile.PublishState', 'advance(state: string) => string')
        .replace('nextState(current: LifecycleFile.PublishState) => LifecycleFile.PublishState', 'nextState(current: string) => string'),
    );
    assert.deepEqual(
      control.map(({ code, message }) => ({ code, message })).sort((left, right) => (left.message < right.message ? -1 : 1)),
      [
        { code: 'checker/orphaned-entity', message: "Orphaned entity 'LifecycleFile.PublishState'" },
        { code: 'checker/orphaned-entity', message: "Orphaned entity 'PublishState'" },
      ],
    );
  });
});
