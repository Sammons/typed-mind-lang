// RFC-TM-10 §11 (rfc-tm-10-diamond.md, D-LEG-11, Diamond DAG Q8) — exact-text
// diagnostic fixtures for the residual set enumerated in §11: one fixture per
// class asserts the message's (and, for CheckerFinding-shaped codes, the
// suggestion's) EXACT text, not merely its code or severity. Per the gating
// rule, every asserted string here is authored ONLY from
// `diagnostic-code-audit.md`'s graded disposition (D-LEG-12) for that code —
// the PASS-as-written text, or the FIXED-to text — never from re-reading the
// producing module's own source directly. `check-fixture-audit-gating.mjs`
// cross-validates that claim: it re-parses this file's asserted code+string
// pairs and deep-equals them against the audit table's row for that code.
//
// Scope, per §11's enumeration (checked against the mission's post-Q1-Q9
// state): `checker/multi-exported`, `checker/orphaned-entity`,
// `checker/orphaned-file`, `checker/stale-suppression`,
// `checker/dto-field-unknown-type`, `checker/dto-field-non-data-type`,
// `checker/enum-literal-outside-members`. The D-LEG-1..6 emission-defect
// classes' "NEW residual diagnostics if any remain post-fix" bucket is EMPTY
// (FAQ Q7: a diagnostic whose root cause D-LEG-1..8 fixed is simply absent
// from this enumerated set, not fixture-bound here).
//
// checker/multi-exported, checker/orphaned-entity, checker/orphaned-file, and
// checker/stale-suppression are CheckerFinding-shaped (carry `suggestion`, so
// clause 3 is asserted there); the DTO-field codes and the enum code below
// are likewise CheckerFinding-shaped. `checker/stale-suppression` is a
// Diagnostic-shaped (pipeline-adjacent, apply-suppressions.ts) code with NO
// `suggestion` field per the audit table's "Shape" column, so only `message`
// is asserted for it, matching `diagnostic-code-audit.md`'s row.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { SuppressionNode } from '../ast/suppression-node.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { applySuppressions } from './apply-suppressions.ts';
import { type AstValidationResult, AstValidator } from './ast-validator.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(testDir, '..', '..', 'grammar', 'grammar.wasm');
const parserPromise = TypedMindParser.create({ wasmPath });

const check = async (source: string) => {
  const parser = await parserPromise;
  const outcome = parser.parse(source);
  const links = computeLinks(outcome.entities);
  const result = new AstValidator().validate(outcome, links);
  return { outcome, result };
};

const findingsByCode = (result: AstValidationResult, code: string) => {
  return result.findings.filter((finding) => finding.code === code);
};

const zeroSpan = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

describe('RFC-TM-10 Q8 exact-text fixture: checker/multi-exported', () => {
  it('pins the audited message text (audit table: PASS, check-exports.ts:91)', async () => {
    const { result } = await check(
      ['App -> Main v1.0.0', 'Main @ src/main.ts:', '  <- [thing]', '  -> [thing]', 'Other @ src/other.ts:', '  -> [thing]', 'thing :: () => void', ''].join(
        '\n',
      ),
    );
    const findings = findingsByCode(result, 'checker/multi-exported');
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.message, "Entity 'thing' is exported by multiple files: Main, Other");
    assert.equal(findings[0]?.suggestion, 'Each entity should be exported by exactly one file. Remove the duplicate exports.');
  });
});

describe('RFC-TM-10 Q8 exact-text fixture: checker/orphaned-entity', () => {
  it('pins the audited message text (audit table: PASS, check-orphans.ts:118)', async () => {
    const { result } = await check(
      ['App -> Main v1.0.0', 'Main @ src/main.ts:', '  <- [helper]', '  -> [helper]', 'helper :: () => void', 'lonely % "unused DTO"', ''].join('\n'),
    );
    const findings = findingsByCode(result, 'checker/orphaned-entity');
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.message, "Orphaned entity 'lonely'");
    assert.equal(findings[0]?.suggestion, 'Remove or reference this entity');
  });
});

describe('RFC-TM-10 Q8 exact-text fixture: checker/orphaned-file', () => {
  it('pins the audited message text (audit table: PASS, check-orphans.ts:108)', async () => {
    const { result } = await check(
      ['App -> Main v1.0.0', 'Main @ src/main.ts:', '  <- [helper]', '  -> [helper]', 'helper :: () => void', 'Extra @ src/extra.ts:', '  -> [extraFn]', 'extraFn :: () => void', ''].join(
        '\n',
      ),
    );
    const findings = findingsByCode(result, 'checker/orphaned-file');
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.message, "Orphaned file 'Extra' - none of its exports are imported");
    assert.equal(findings[0]?.suggestion, 'Remove this file or import its exports somewhere');
  });
});

describe('RFC-TM-10 Q8 exact-text fixture: checker/dto-field-unknown-type', () => {
  it('pins the audited message text (audit table: PASS, check-dto-fields.ts:75)', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [useDto]',
        '  -> [useDto]',
        'useDto :: () => void',
        '  <- BadDTO',
        'BadDTO % "bad shapes"',
        '  - other: MissingType "no such type"',
        '',
      ].join('\n'),
    );
    const findings = findingsByCode(result, 'checker/dto-field-unknown-type');
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.message, "DTO 'BadDTO' field 'other' references undefined type 'MissingType'");
    assert.equal(findings[0]?.suggestion, "Define 'MissingType' as a DTO or Class entity");
  });
});

describe('RFC-TM-10 Q8 exact-text fixture: checker/dto-field-non-data-type', () => {
  it('pins the audited message text (audit table: PASS, check-dto-fields.ts:85)', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [useDto]',
        '  -> [useDto]',
        'useDto :: () => void',
        '  <- BadDTO',
        'BadDTO % "bad shapes"',
        '  - fileRef: Main "a file reference"',
        '',
      ].join('\n'),
    );
    const findings = findingsByCode(result, 'checker/dto-field-non-data-type');
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.message, "DTO 'BadDTO' field 'fileRef' references 'Main' which is a File, not a DTO or Class");
    assert.equal(findings[0]?.suggestion, 'Field types should reference DTO or Class entities for complex types');
  });
});

describe('RFC-TM-10 Q8 exact-text fixture: checker/enum-literal-outside-members', () => {
  it('pins the audited message text (audit table: PASS, check-dto-fields.ts:167)', async () => {
    const { result } = await check(['Status = enum [Active, Inactive]', 'Account %', '  - status: Status | "Deleted"', ''].join('\n'));
    const findings = findingsByCode(result, 'checker/enum-literal-outside-members');
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.message, "DTO 'Account' field 'status' union literal 'Deleted' is not a member of enum 'Status'");
    assert.equal(findings[0]?.suggestion, 'Use one of: Active, Inactive');
  });
});

describe('RFC-TM-10 Q8 exact-text fixture: checker/stale-suppression', () => {
  // apply-suppressions.ts constructs a Diagnostic (no `suggestion` field per
  // finding.ts/ast/diagnostic.ts) directly, not through AstValidator/
  // CheckerFinding — exercised via applySuppressions() directly, matching
  // check-codes.test.ts's own precedent for this module.
  it('pins the audited message text (audit table: FIXED, apply-suppressions.ts:133)', () => {
    const target = new DtoNode({ name: 'Lonely', span: zeroSpan, raw: 'Lonely', sourceForm: 'shortform', fields: [] });
    const byName = new Map<string, EntityNode>([['Lonely', target]]);
    const suppression = new SuppressionNode({
      target: 'Lonely',
      code: 'checker/orphaned-entity',
      reason: 'Q8 exact-text fixture',
      span: zeroSpan,
      raw: 'suppress Lonely checker/orphaned-entity "Q8 exact-text fixture"',
    });
    const result = applySuppressions([], [suppression], byName);
    const stale = result.diagnostics.find((diagnostic) => diagnostic.code === 'checker/stale-suppression');
    assert.notEqual(stale, undefined);
    assert.equal(stale?.message, "Stale suppression: 'checker/orphaned-entity' on 'Lonely' matches no finding this run — remove this suppression entry");
  });
});
