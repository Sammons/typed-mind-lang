// RFC-TM-8 §5 (rfc-tm-8-diamond.md, X-TYPE-7 / Diamond DAG Q2) — check
// bindings for the TypeDef entity kind: shortform + longform declaration
// fixtures for both variants (enum, alias), the reference-legality positive
// (schema → TypeDef) and negative (extends → TypeDef rejected) fixtures, the
// per-part checker walk (X-TYPE-4) exercised through a TypeDef-typed field,
// and the enum closed-set rule's positive/negative fixtures (X-TYPE-7 §"FAQ:
// What exactly triggers the enum closed-set check?").

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { AstValidator } from '../checker/ast-validator.ts';
import { SyntaxEmitter } from '../emitter/syntax-emitter.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { TypeDefNode } from './type-def-node.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(testDir, '..', '..', 'grammar', 'grammar.wasm');

const createParser = async () => TypedMindParser.create({ wasmPath });

describe('X-TYPE-7: TypeDef shortform declaration fixtures', () => {
  it('parses an enum-variant TypeDef with zero syntax/* diagnostics', async () => {
    const parser = await createParser();
    const source = ['Status = enum [Active, Inactive, Pending]', ''].join('\n');
    const outcome = parser.parse(source);
    assert.deepEqual(
      outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/')),
      [],
    );
    const [entity] = outcome.entities;
    assert.ok(entity instanceof TypeDefNode);
    assert.equal(entity.kind, 'TypeDef');
    assert.equal(entity.variant, 'enum');
    assert.deepEqual(entity.members, ['Active', 'Inactive', 'Pending']);
    assert.equal(entity.aliasType, undefined);
  });

  it('parses an alias-variant TypeDef whose aliased type is a structured union', async () => {
    const parser = await createParser();
    const source = ['UserId = string | number', ''].join('\n');
    const outcome = parser.parse(source);
    assert.deepEqual(
      outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/')),
      [],
    );
    const [entity] = outcome.entities;
    assert.ok(entity instanceof TypeDefNode);
    assert.equal(entity.variant, 'alias');
    assert.equal(entity.members, undefined);
    assert.deepEqual(entity.aliasType, {
      kind: 'union',
      members: [
        { kind: 'named', name: 'string', span: entity.aliasType?.kind === 'union' ? entity.aliasType.members[0]?.span : undefined },
        { kind: 'named', name: 'number', span: entity.aliasType?.kind === 'union' ? entity.aliasType.members[1]?.span : undefined },
      ],
      span: entity.aliasType?.span,
    });
  });

  it('a bare `enum` with no following bracket lexes as the named type, not the keyword (collision fixture)', async () => {
    const parser = await createParser();
    const source = ['AliasedEnum = enum', ''].join('\n');
    const outcome = parser.parse(source);
    assert.deepEqual(
      outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/')),
      [],
    );
    const [entity] = outcome.entities;
    assert.ok(entity instanceof TypeDefNode);
    assert.equal(entity.variant, 'alias');
    assert.deepEqual(entity.aliasType, { kind: 'named', name: 'enum', span: entity.aliasType?.span });
  });
});

describe('X-TYPE-7: TypeDef longform declaration fixtures', () => {
  it('parses an enum-variant TypeDef longform block', async () => {
    const parser = await createParser();
    const source = ['typedef Status {', '  variant: enum', '  members: [Active, Inactive]', '}', ''].join('\n');
    const outcome = parser.parse(source);
    assert.deepEqual(
      outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/')),
      [],
    );
    const [entity] = outcome.entities;
    assert.ok(entity instanceof TypeDefNode);
    assert.equal(entity.variant, 'enum');
    assert.deepEqual(entity.members, ['Active', 'Inactive']);
  });

  it('parses an alias-variant TypeDef longform block (variant unspelled defaults to alias)', async () => {
    const parser = await createParser();
    const source = ['typedef UserId {', '  type: "string | number"', '}', ''].join('\n');
    const outcome = parser.parse(source);
    assert.deepEqual(
      outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/')),
      [],
    );
    const [entity] = outcome.entities;
    assert.ok(entity instanceof TypeDefNode);
    assert.equal(entity.variant, 'alias');
    assert.equal(entity.aliasType?.kind, 'union');
  });
});

describe('X-TYPE-7: reference legality (schema positive, extends negative)', () => {
  it('a Constants schema referencing a TypeDef validates clean', async () => {
    const parser = await createParser();
    const source = ['Status = enum [Active, Inactive]', 'Config ! src/config.ts : Status', ''].join('\n');
    const outcome = parser.parse(source);
    const result = new AstValidator().validate(outcome, computeLinks(outcome.entities));
    assert.deepEqual(
      result.findings.filter((finding) => finding.code.startsWith('checker/reference-')),
      [],
    );
  });

  it('negative fixture: a TypeDef referenced via `extends` is rejected', async () => {
    const parser = await createParser();
    const source = ['Status = enum [Active, Inactive]', 'Widget <: Status', ''].join('\n');
    const outcome = parser.parse(source);
    const result = new AstValidator().validate(outcome, computeLinks(outcome.entities));
    const toIllegal = result.findings.filter((finding) => finding.code === 'checker/reference-to-illegal');
    assert.equal(toIllegal.length, 1);
    assert.match(toIllegal[0]?.message ?? '', /Cannot use 'extends' to reference TypeDef 'Status'/);
  });
});

describe('X-TYPE-4: per-part checker walk exercised through a TypeDef-typed DTO field', () => {
  it('a DTO field referencing an alias TypeDef and an enum TypeDef both validate clean', async () => {
    const parser = await createParser();
    const source = [
      'Status = enum [Active, Inactive]',
      'UserId = string | number',
      'Account %',
      '  - id: UserId',
      '  - status: Status',
      '',
    ].join('\n');
    const outcome = parser.parse(source);
    const result = new AstValidator().validate(outcome, computeLinks(outcome.entities));
    assert.deepEqual(
      result.findings.filter((finding) => finding.code.startsWith('checker/dto-field-')),
      [],
    );
  });

  it('one-bad-variant span fixture: a union with one invalid named part flags ONLY that part span', async () => {
    const parser = await createParser();
    const source = ['Account %', '  - id: string | Nonexistent', ''].join('\n');
    const outcome = parser.parse(source);
    const result = new AstValidator().validate(outcome, computeLinks(outcome.entities));
    const unknownTypeFindings = result.findings.filter((finding) => finding.code === 'checker/dto-field-unknown-type');
    assert.equal(unknownTypeFindings.length, 1);
    // The field line is line 2: `  - id: string | Nonexistent`. `Nonexistent`
    // starts at column 18 (1-based) — the failing PART's span, not the DTO
    // entity's span (line 1).
    assert.equal(unknownTypeFindings[0]?.span.start.line, 2);
    assert.equal(unknownTypeFindings[0]?.span.start.column, 18);
  });

  it('a DTO field referencing a TypeDef via a generic argument resolves the TypeDef as a legal data-type kind', async () => {
    const parser = await createParser();
    const source = ['Status = enum [Active, Inactive]', 'Account %', '  - statuses: Array<Status>', ''].join('\n');
    const outcome = parser.parse(source);
    const result = new AstValidator().validate(outcome, computeLinks(outcome.entities));
    assert.deepEqual(
      result.findings.filter((finding) => finding.code.startsWith('checker/dto-field-')),
      [],
    );
  });
});

describe('X-TYPE-7: enum closed-set rule (checker/enum-literal-outside-members)', () => {
  it('positive: every union literal is a member of the referenced enum — validates clean', async () => {
    const parser = await createParser();
    const source = ['Status = enum [Active, Inactive]', 'Account %', '  - status: Status | "Active"', ''].join('\n');
    const outcome = parser.parse(source);
    const result = new AstValidator().validate(outcome, computeLinks(outcome.entities));
    assert.deepEqual(
      result.findings.filter((finding) => finding.code === 'checker/enum-literal-outside-members'),
      [],
    );
  });

  it('negative: a union literal absent from the enum member set flags checker/enum-literal-outside-members', async () => {
    const parser = await createParser();
    const source = ['Status = enum [Active, Inactive]', 'Account %', '  - status: Status | "Deleted"', ''].join('\n');
    const outcome = parser.parse(source);
    const result = new AstValidator().validate(outcome, computeLinks(outcome.entities));
    const findings = result.findings.filter((finding) => finding.code === 'checker/enum-literal-outside-members');
    assert.equal(findings.length, 1);
    assert.match(findings[0]?.message ?? '', /'Deleted' is not a member of enum 'Status'/);
  });

  it('a union of literals with no enum reference is unchecked (no declared set to check against)', async () => {
    const parser = await createParser();
    const source = ['Account %', '  - status: "Active" | "Deleted"', ''].join('\n');
    const outcome = parser.parse(source);
    const result = new AstValidator().validate(outcome, computeLinks(outcome.entities));
    assert.deepEqual(
      result.findings.filter((finding) => finding.code === 'checker/enum-literal-outside-members'),
      [],
    );
  });
});

describe('X-TYPE-7: round-trip (parse -> emit -> parse) for both TypeDef variants and forms', () => {
  it('shortform enum-variant TypeDef round-trips', async () => {
    const parser = await createParser();
    const emitter = new SyntaxEmitter();
    const source = ['Status = enum [Active, Inactive]', ''].join('\n');
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome);
    const reparsed = parser.parse(emitted);
    const [entity] = reparsed.entities;
    assert.ok(entity instanceof TypeDefNode);
    assert.equal(entity.variant, 'enum');
    assert.deepEqual(entity.members, ['Active', 'Inactive']);
  });

  it('shortform alias-variant TypeDef round-trips', async () => {
    const parser = await createParser();
    const emitter = new SyntaxEmitter();
    const source = ['UserId = string | number', ''].join('\n');
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome);
    const reparsed = parser.parse(emitted);
    const [entity] = reparsed.entities;
    assert.ok(entity instanceof TypeDefNode);
    assert.equal(entity.variant, 'alias');
    assert.equal(entity.aliasType?.kind, 'union');
  });

  it('longform enum-variant TypeDef round-trips through forced longform emission', async () => {
    const parser = await createParser();
    const emitter = new SyntaxEmitter();
    const source = ['Status = enum [Active, Inactive]', ''].join('\n');
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome, { forceForm: 'longform' });
    const reparsed = parser.parse(emitted);
    const [entity] = reparsed.entities;
    assert.ok(entity instanceof TypeDefNode);
    assert.equal(entity.variant, 'enum');
    assert.deepEqual(entity.members, ['Active', 'Inactive']);
  });

  it('longform alias-variant TypeDef round-trips through forced longform emission', async () => {
    const parser = await createParser();
    const emitter = new SyntaxEmitter();
    const source = ['UserId = string | number', ''].join('\n');
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome, { forceForm: 'longform' });
    const reparsed = parser.parse(emitted);
    const [entity] = reparsed.entities;
    assert.ok(entity instanceof TypeDefNode);
    assert.equal(entity.variant, 'alias');
    assert.equal(entity.aliasType?.kind, 'union');
  });
});
