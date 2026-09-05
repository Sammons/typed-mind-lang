// decision-same-named-entities PR 1 — one fixture per DECLARATION FORM that
// lands in the flat global entity namespace: interface (102), type alias (103),
// enum (104), class (105), constant (106). Each fixture has two files declaring
// the same bare name with different shapes, and neither declaration carries a
// `from` clause, so every case is a genuine same-name collision rather than
// the barrel/re-export shape `isReExport` gates on.
//
// WHAT THESE PIN. Before PR 1, six sibling declaration sites `addError`ed
// `Duplicate entity name` on such a collision, which fails the WHOLE
// conversion — one collision killed a 349-entity extraction and the CLI wrote
// partial output only. `createConstantEntity` (fixture 94) did something
// strictly worse: it SILENTLY returned, so the surviving Constants entity
// carried the wrong module's `path`/`schema` while both Files still listed
// the name in `exports:`, producing `checker/multi-exported` plus a silently
// wrong shape. That converted a loud failure into semantic corruption.
//
// RFC-TM-13 E updates the same collision controls to checked File ownership.
// The first source declaration keeps its bare name; later declarations use
// their actual emitted File/ClassFile owner plus the source name. Source
// underscores remain authored text, while generated identities share a
// global reservation registry.
//
// Each fixture asserts four things: conversion COMPLETES, the second
// declaration is renamed per the convention, the warning text is EXACT, and
// the emitted `.tmd` checks with zero `checker/duplicate-name` and zero
// `checker/multi-exported` — the two findings the collision used to produce.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = (name: string, ...segments: string[]): string => join(testDir, 'repros-analyzer', name, ...segments);

const convertFixture = (name: string, entrypoint = 'main.ts') => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(name));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath(name, 'src', entrypoint));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

const allEntityNames = (result: { entities: readonly unknown[] }): string[] => {
  return result.entities.map((entity) => (entity as { name: string }).name).sort();
};

const entityNames = (result: { entities: readonly unknown[] }, suffix: string): string[] => {
  return result.entities
    .map((entity) => (entity as { name: string }).name)
    .filter((name) => name === suffix || name.endsWith(`.${suffix}`))
    .sort();
};

const collisionWarnings = (result: { warnings: readonly unknown[] }): string[] => {
  return result.warnings
    .map((warning) => (warning as { message: string }).message)
    .filter((message) => message.startsWith('Duplicate entity name '));
};

// Every case runs the identical four assertions, differing only in the fixture
// and the names involved. A shared driver keeps the five declaration forms
// provably held to the SAME bar — a per-form copy would let one form's
// assertions drift weaker than another's without the diff showing it.
const assertCollisionRenamed = async (options: {
  readonly fixture: string;
  readonly bareName: string;
  readonly qualifiedName: string;
  readonly firstPath: string;
  readonly secondPath: string;
}): Promise<void> => {
  const result = convertFixture(options.fixture);

  // (1) The conversion COMPLETES. This is the whole point of PR 1: a name
  // collision must not discard every other entity in the run.
  assert.equal(result.success, true, `${options.fixture}: a name collision must not fail the conversion`);
  assert.deepEqual(
    result.errors.filter((error) => (error as { message: string }).message.includes('Duplicate entity name')),
    [],
    `${options.fixture}: the hard \`Duplicate entity name\` abort must be gone`,
  );

  // (2) The second declaration is renamed per the convention; the first stays
  // bare. Asserted as an exact set so a THIRD entity, or a renamed FIRST
  // declaration, fails.
  assert.deepEqual(
    entityNames(result, options.bareName),
    [options.bareName, options.qualifiedName].sort(),
    `${options.fixture}: the first declarer keeps the bare name, the second is module-qualified`,
  );

  // (3) The warning text is the documented contract — asserted verbatim, not
  // by substring, so a reworded message is a failing test rather than a silent
  // drift.
  assert.deepEqual(
    collisionWarnings(result),
    [
      `Duplicate entity name '${options.bareName}' declared in both '${options.firstPath}' and '${options.secondPath}'; the declaration whose file path sorts first kept the bare name, so '${options.secondPath}' was renamed to '${options.qualifiedName}'. TypedMind entity names are global to a document.`,
    ],
    `${options.fixture}: exactly one collision warning, naming both paths and the resulting name`,
  );

  // (4) The emitted document is genuinely collision-free. `checker/duplicate-name`
  // fires at EVERY declaration in any same-name group of 2+
  // (check-duplicate-names.ts), and `checker/multi-exported` fires when one
  // entity is exported by two Files — the exact pair the pre-PR-1 constant
  // silent-skip produced. Both must be absent.
  const typedMind = await TypedMind.create();
  const checkResult = typedMind.check(result.tmdContent);
  const codes = checkResult.diagnostics.map((diagnostic) => diagnostic.code);
  assert.deepEqual(
    codes.filter((code) => code === 'checker/duplicate-name' || code === 'checker/multi-exported'),
    [],
    `${options.fixture}: the rename must leave no duplicate-name and no multi-exported finding: ${JSON.stringify(checkResult.diagnostics)}`,
  );
};

describe('decision-same-named-entities PR 1: a cross-module name collision renames instead of aborting', () => {
  it('102 — INTERFACE: the second `interface Config` becomes SettingsFile.Config', async () => {
    await assertCollisionRenamed({
      fixture: '102-same-name-interface-collision',
      bareName: 'Config',
      qualifiedName: 'SettingsFile.Config',
      firstPath: 'src/main.ts',
      secondPath: 'src/settings.ts',
    });
  });

  it('103 — TYPE ALIAS: the second `type Payload` becomes StorageFile.Payload', async () => {
    await assertCollisionRenamed({
      fixture: '103-same-name-type-alias-collision',
      bareName: 'Payload',
      qualifiedName: 'StorageFile.Payload',
      firstPath: 'src/main.ts',
      secondPath: 'src/storage.ts',
    });
  });

  it('104 — ENUM: the second `enum Status` becomes WorkerFile.Status', async () => {
    await assertCollisionRenamed({
      fixture: '104-same-name-enum-collision',
      bareName: 'Status',
      qualifiedName: 'WorkerFile.Status',
      firstPath: 'src/main.ts',
      secondPath: 'src/worker.ts',
    });
  });

  // 105 and 106 are the two fixtures where the OTHER module sorts first
  // (`src/audit.ts` < `src/main.ts`, `src/limits.ts` < `src/main.ts`), so the
  // canonical path-sort rule gives THEM the bare name and renames `main.ts`.
  // That is the rule working, not a quirk: which file is the "entrypoint" has
  // no bearing on the assignment, only the path order does.
  it('105 — CLASS: `class Recorder` in main.ts becomes MainFile.Recorder (audit.ts sorts first)', async () => {
    await assertCollisionRenamed({
      fixture: '105-same-name-class-collision',
      bareName: 'Recorder',
      qualifiedName: 'MainFile.Recorder',
      firstPath: 'src/audit.ts',
      secondPath: 'src/main.ts',
    });
  });

  it('106 — CONSTANT: `const DEFAULTS` in main.ts becomes MainFile.DEFAULTS (limits.ts sorts first)', async () => {
    await assertCollisionRenamed({
      fixture: '106-same-name-constant-collision',
      bareName: 'DEFAULTS',
      qualifiedName: 'MainFile.DEFAULTS',
      firstPath: 'src/limits.ts',
      secondPath: 'src/main.ts',
    });
  });

  // Per-form detail assertions. The shared driver above proves the rename and
  // the clean check; these prove each surviving entity carries its OWN
  // module's content, which is what distinguishes a real rename from the
  // pre-PR-1 survivor-wearing-the-wrong-shape corruption.
  it("90 — each surviving DTO keeps its own fields, not the other module's", () => {
    const result = convertFixture('102-same-name-interface-collision');
    const fieldsOf = (name: string): string[] => {
      const entity = result.entities.find((candidate) => (candidate as { name: string }).name === name);
      return (entity as { fields: { name: string }[] }).fields.map((field) => field.name);
    };
    assert.deepEqual(fieldsOf('Config'), ['endpoint'], 'main.ts keeps the bare name and its own field');
    assert.deepEqual(fieldsOf('SettingsFile.Config'), ['retries'], 'settings.ts is renamed and keeps ITS own field');
  });

  it('104 — each surviving TypeDef keeps its own enum members', () => {
    const result = convertFixture('104-same-name-enum-collision');
    const membersOf = (name: string): readonly string[] => {
      const entity = result.entities.find((candidate) => (candidate as { name: string }).name === name);
      return (entity as { members: readonly string[] }).members;
    };
    assert.deepEqual(membersOf('Status'), ['Pending', 'Done']);
    assert.deepEqual(membersOf('WorkerFile.Status'), ['Idle', 'Busy']);
  });

  it("94 — the constant case: two entities with two DISTINCT paths, and neither file exports the other's", () => {
    // This is the form whose pre-PR-1 behaviour was silent corruption rather
    // than a loud abort, so it gets the sharpest assertion: the renamed entity
    // must carry its OWN module's path, and each File must export only the
    // entity it actually declares.
    const result = convertFixture('106-same-name-constant-collision');
    const pathOf = (name: string): string => {
      const entity = result.entities.find((candidate) => (candidate as { name: string }).name === name);
      return (entity as { path: string }).path;
    };
    assert.equal(pathOf('DEFAULTS'), 'src/limits.ts', 'limits.ts sorts first and keeps the bare name');
    assert.equal(pathOf('MainFile.DEFAULTS'), 'src/main.ts', 'the renamed constant must carry its OWN module path');

    const exportsOf = (name: string): string[] => {
      const entity = result.entities.find((candidate) => (candidate as { name: string }).name === name);
      return (entity as { exports: string[] }).exports;
    };
    assert.ok(exportsOf('MainFile').includes('MainFile.DEFAULTS'), 'main.ts exports the RENAMED entity, not the bare name');
    assert.ok(!exportsOf('MainFile').includes('DEFAULTS'), "main.ts must not claim limits.ts's constant");
    assert.ok(exportsOf('LimitsFile').includes('DEFAULTS'), 'limits.ts sorts first and exports the bare name');
    assert.ok(!exportsOf('LimitsFile').includes('MainFile.DEFAULTS'), "limits.ts must not claim main.ts's constant");
  });
});

describe('decision-same-named-entities PR 1: the rename is order-independent (review blocker 1)', () => {
  // `modules` arrives in BFS-from-entrypoint order, so a "first occurrence
  // keeps the bare name" rule makes the emitted names a function of import
  // line order and of which entrypoint was used. Two runs over byte-identical
  // source could then disagree on which declaration is `Shared` and which is
  // `<File>.Shared`. The canonical rule — within a colliding group, the
  // declaration whose project-relative path sorts first in byte order wins —
  // takes traversal order out of the answer entirely.
  //
  // Fixture 107 carries two entrypoints over the SAME two declaring modules,
  // differing only in the order of their two import lines.
  const fixture = '107-collision-rename-order-independence';

  const sharedNames = (result: { entities: readonly unknown[] }): string[] =>
    allEntityNames(result).filter((name) => name === 'Shared' || name.endsWith('.Shared'));

  it('reversing the import order does not change which declaration keeps the bare name', () => {
    const forward = convertFixture(fixture, 'main.ts');
    const reversed = convertFixture(fixture, 'reversed.ts');

    // `src/alpha.ts` sorts before `src/zulu.ts`, so alpha keeps the bare name
    // under BOTH traversal orders. Before the fix the reversed entrypoint
    // produced `AlphaFile.Shared` instead — same source, different answer.
    assert.deepEqual(sharedNames(forward), ['Shared', 'ZuluFile.Shared'], 'alpha sorts first, so it keeps the bare name');
    assert.deepEqual(sharedNames(reversed), sharedNames(forward), 'reversing the import order must not change the assignment');
  });

  it('a different entrypoint over the same modules produces identical names', () => {
    const forward = convertFixture(fixture, 'main.ts');
    const reversed = convertFixture(fixture, 'reversed.ts');

    // Compare every collision-relevant name, not just the pair above. The two
    // entrypoints legitimately differ in their OWN entities — the File and
    // Program (`MainFile`/`MainApp` vs `ReversedFile`/`ReversedApp`) and
    // each one's own exported function (`runMain` vs `runReversed`) — so those
    // are excluded; everything reachable from BOTH must match exactly.
    const common = (result: { entities: readonly unknown[] }): string[] =>
      allEntityNames(result).filter(
        (name) => !name.startsWith('Main') && !name.startsWith('Reversed') && name !== 'runMain' && name !== 'runReversed',
      );

    assert.deepEqual(
      common(reversed),
      common(forward),
      'the entity set reachable from both entrypoints must be name-identical regardless of traversal',
    );
  });

  it('the collision warning states the rule that decided the winner', () => {
    const result = convertFixture(fixture, 'main.ts');
    assert.deepEqual(
      collisionWarnings(result),
      [
        "Duplicate entity name 'Shared' declared in both 'src/alpha.ts' and 'src/zulu.ts'; the declaration whose file path sorts first kept the bare name, so 'src/zulu.ts' was renamed to 'ZuluFile.Shared'. TypedMind entity names are global to a document.",
      ],
      'the warning must name both paths, the resulting name, AND the deciding rule',
    );
  });
});

describe('decision-same-named-entities PR 1: every assigned name is unique (review blocker 2)', () => {
  // The adversarial shape: `src/settings.ts` loses an `Options` collision and
  // its first disambiguator tier proposes `Settings__Options`, which is
  // EXACTLY the name `src/collide.ts` declares outright. The fixture's import
  // order puts `settings.ts` ahead of `collide.ts` in BFS traversal, so the
  // rename claims that name first and the later bare declaration used to take
  // it too.
  //
  // Before the fix the pass recorded only QUALIFIED names in `assignedNames`
  // and wrote bare names unguarded, so this emitted TWO entities both named
  // `Settings__Options` with no error — surfacing only downstream as two
  // `checker/duplicate-name` findings plus a `checker/multi-exported`.
  const fixture = '108-collision-rename-name-uniqueness';

  it('a later bare declaration cannot take a name an earlier rename already claimed', () => {
    const result = convertFixture(fixture);
    const names = allEntityNames(result);
    const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];

    assert.deepEqual(duplicates, [], `every emitted entity name must be unique, got: ${JSON.stringify(names)}`);

    // The hand-authored declaration keeps its own literal name, and the
    // collision loser steps past the taken tier onto the parent-directory one.
    assert.ok(names.includes('Settings__Options'), "collide.ts's own hand-authored name must survive");
    assert.ok(
      names.includes('SettingsFile.Options'),
      'the renamed loser uses its real File owner while authored underscores remain distinct',
    );
    assert.ok(names.includes('Options'), 'config.ts sorts first and keeps the bare name');
  });

  it('the emitted .tmd carries zero checker/duplicate-name findings', async () => {
    const result = convertFixture(fixture);
    const typedMind = await TypedMind.create();
    const checkResult = typedMind.check(result.tmdContent);
    const codes = checkResult.diagnostics.map((diagnostic) => diagnostic.code);

    assert.deepEqual(
      codes.filter((code) => code === 'checker/duplicate-name'),
      [],
      `the duplicate-name check must not fire: ${JSON.stringify(checkResult.diagnostics)}`,
    );
    assert.deepEqual(
      codes.filter((code) => code === 'checker/multi-exported'),
      [],
      `the multi-exported check must not fire either: ${JSON.stringify(checkResult.diagnostics)}`,
    );
  });
});
