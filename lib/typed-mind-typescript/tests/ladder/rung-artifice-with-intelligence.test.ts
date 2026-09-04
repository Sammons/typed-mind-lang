// Ladder rung: sammons/artifice-with-intelligence (RFC-TM-9 §8 X-LADDER-2).
//
// Target shape: a single-package Node 26 agent-friendly email service
// (HATEOAS + MJML), 3 tsconfigs, generics-heavy, 163 TypeScript files.
//
// Fixture 94 is a FIX (fail-before / pass-after). Fixtures 95 and 96 are
// KNOWN GAPS, pinned with positive assertions per the harness convention
// (slat-harness-known-gaps.test.ts:1-9): each asserts the defect is STILL
// present, so the day it is fixed this suite fails loudly and the
// expectation gets re-baselined deliberately rather than drifting.
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

describe('artifice rung, KNOWN GAP 96: two files declaring the same type alias abort the whole conversion', () => {
  it('KNOWN GAP — the collision still fails the conversion via convertTypeAliasToDTO (:2173)', () => {
    const result = convert('96-same-name-type-alias-two-files');
    assert.equal(result.success, false, 'the duplicate-name abort must still be present and annotated');
    assert.deepEqual(
      result.errors.map((e) => e.message),
      ['Duplicate entity name: PublishState'],
    );
  });

  it('degrade-not-discard still holds: partial entities are emitted alongside the error', () => {
    const result = convert('96-same-name-type-alias-two-files');
    assert.ok(result.entities.length > 0, 'X-CONV-4 requires partial output, not a total discard');
    assert.notEqual(result.tmdContent, '', 'partial .tmd content must still be emitted');
  });
});
