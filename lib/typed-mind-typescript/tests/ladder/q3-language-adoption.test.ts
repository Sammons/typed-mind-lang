// RFC-TM-9 Q3 — new-language adoption in the extractor. Check bindings per
// the Diamond Doc's Q3 line:
//   - enum and alias fixtures emit the TM-8 entity kind and pass the
//     checker (X-AN-7, X-CONV-2)
//   - zero-reference greps for `convertTypeAliasToConstants` (verified as
//     part of this Quantum's implementation; not re-asserted at runtime —
//     there is no runtime symbol left to probe once the method is deleted)
//   - suppression fixtures assert EXACT counts and enumerated reasons
//     (X-SUPP-6)
//   - every golden delta classifies to a named TM-8 feature or TM-9 fix
//     (tmd-goldens.test.ts's per-fixture header comments carry this)
//
// "Pass the checker" scope note (same disclosure shape as Q2's file
// header): two PRE-EXISTING, Q3-unrelated defects are present on main and
// confirmed via control fixtures below:
//   1. `checker/multi-exported` — Program.exports always duplicates its
//      entry File's exports (documented in q2-converter-correctness.test.ts's
//      header; unowned by any X-item in this RFC).
//   2. `checker/orphaned-entity` on an entity referenced ONLY via a DTO
//      field's type — `check-orphans.ts`'s `collectReferencedNames` never
//      walks DTO/DtoField structure at all (confirmed pre-existing via an
//      isolated DTO-to-DTO fixture with no TypeDef involved whatsoever:
//      a DTO referenced only as a sibling DTO's field type orphans the
//      same way). This predates both TM-8 and TM-9 — it is a `lib/typed-
//      mind/src/checker/check-orphans.ts` gap, outside this Quantum's
//      converter-only surface (`lib/typed-mind-typescript/`) and outside
//      the frozen X-AN-7/X-CONV-2/X-SUPP-6 item set. Flagged for a
//      follow-up issue, not fixed here, per this Quantum's file-
//      disjointness boundary with TM-8/TM-9 Q4's parallel `lib/typed-mind`
//      work.
// Checks below pin the FULL diagnostic-code list (not a blanket
// `valid: true`) so a NEW diagnostic class regresses these tests while the
// two known, disclosed defects do not — the same discipline
// q2-converter-correctness.test.ts already established.
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

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return { longform, result: tm.check(longform) };
};

describe('RFC-TM-9 Q3 check — X-AN-7/X-CONV-2: real TS enum emits TM-8 TypeDef entity kind', () => {
  it('an exported enum emits variant: enum with its full member list, replacing the dropped-member-list Constants path', async () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('14-enum'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('14-enum', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, true);

    const statusEntity = result.entities.find((e) => e.name === 'Status') as
      | { kind: string; variant: string; members: readonly string[] }
      | undefined;
    assert.notEqual(statusEntity, undefined, 'Status must be emitted');
    assert.equal(statusEntity?.kind, 'TypeDef');
    assert.equal(statusEntity?.variant, 'enum');
    assert.deepEqual(statusEntity?.members, ['Active', 'Inactive'], 'the full member list survives, not dropped');

    const { result: checkResult } = await checkViaLongform(result.entities);
    const codes = checkResult.diagnostics.map((d) => d.code).sort();
    // Pre-existing, Q3-unrelated defects only (see file header): the DTO-
    // field-reference orphan gap (Status is referenced only via Job's
    // `status:` field type) and the Program/File dual-export defect
    // (fires once per dual-exported entity — Job and describe).
    assert.deepEqual(codes, ['checker/multi-exported', 'checker/multi-exported', 'checker/orphaned-entity']);
  });
});

describe('RFC-TM-9 Q3 check — X-AN-7/X-CONV-2: type alias emits TM-8 TypeDef entity kind', () => {
  it('a union type alias ("like an enum") and a simple named-type alias both emit variant: alias', async () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('24-type-alias'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('24-type-alias', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, true);

    const roleEntity = result.entities.find((e) => e.name === 'Role') as { kind: string; variant: string } | undefined;
    assert.notEqual(roleEntity, undefined, 'Role (union alias) must be emitted');
    assert.equal(roleEntity?.kind, 'TypeDef');
    assert.equal(roleEntity?.variant, 'alias');

    const roleIdEntity = result.entities.find((e) => e.name === 'RoleId') as { kind: string; variant: string } | undefined;
    assert.notEqual(roleIdEntity, undefined, 'RoleId (simple alias) must be emitted');
    assert.equal(roleIdEntity?.kind, 'TypeDef');
    assert.equal(roleIdEntity?.variant, 'alias');

    // Zero self-referential Constants emission anywhere (the deleted
    // `Name ! path : Name` shape L-g3/A-g9 caught).
    assert.equal(result.tmdContent.includes(' : Role'), false);
    assert.equal(result.tmdContent.includes(' : RoleId'), false);

    const { result: checkResult } = await checkViaLongform(result.entities);
    const codes = checkResult.diagnostics.map((d) => d.code).sort();
    // Same two pre-existing, Q3-unrelated defect FAMILIES as the enum case
    // above — both Role and RoleId are referenced only via Member's DTO
    // field types (one orphan finding each), and multi-exported fires once
    // per dual-exported entity (Member and describe).
    assert.deepEqual(codes, ['checker/multi-exported', 'checker/multi-exported', 'checker/orphaned-entity', 'checker/orphaned-entity']);
  });
});

describe('RFC-TM-9 Q3 check — X-SUPP-6: converter-emitted suppressions with enumerated reasons', () => {
  it("a module-private class (never exported from its declaring module) is suppressed with reason 'generated-single-file-scope'", async () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('25-generated-single-file'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('25-generated-single-file', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, true);

    // EXACT counts per reason (doc §9: "ladder fixtures assert exact
    // counts and reasons per target").
    assert.deepEqual(result.suppressionCounts, {
      'generated-single-file-scope': 1,
      'test-only-consumer': 0,
    });

    assert.ok(
      result.tmdContent.includes('suppress InternalRegistryEntry checker/orphaned-entity "generated-single-file-scope"'),
      'the suppression line names the exact target, code, and enumerated reason',
    );

    // The suppression actually matches a real finding this run (never
    // stale) and the checker's suppressed-not-silenced semantics (I-9)
    // keep the diagnostic visible with its `suppression` annotation rather
    // than dropping it.
    const tm = await TypedMind.create();
    const checkResult = tm.check(result.tmdContent);
    const orphanFinding = checkResult.diagnostics.find(
      (d) => d.code === 'checker/orphaned-entity' && d.message.includes('InternalRegistryEntry'),
    );
    assert.notEqual(orphanFinding, undefined, 'the orphan finding this suppression targets must still be present, annotated');
    assert.equal(orphanFinding?.suppression?.reason, 'generated-single-file-scope');
    assert.equal(
      checkResult.diagnostics.some((d) => d.code === 'checker/stale-suppression'),
      false,
      'the suppression matched a real finding, so it is never stale',
    );
  });

  it('unlimited auto-suppression is forbidden: an exported class (real cross-file consumer possible) never gets suppressed', () => {
    // Control fixture: 21-hash-private's class IS exported, so it must
    // carry zero suppressions despite having a private-shaped member —
    // suppression triggers only on the enumerated, structurally-provable
    // 'generated-single-file-scope' shape (non-exported symbol), never as
    // a general orphan-avoidance mechanism.
    const analyzer = new TypeScriptAnalyzer(fixturePath('21-hash-private'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('21-hash-private', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, true);
    assert.deepEqual(result.suppressionCounts, {
      'generated-single-file-scope': 0,
      'test-only-consumer': 0,
    });
  });
});
