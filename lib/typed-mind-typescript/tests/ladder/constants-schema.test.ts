// RFC-TM-14 U5a (rfc-tm-14-diamond.md §S5, leaf R6a, delta R6-ann): a
// Constants schema carries the binding's whole annotation — the grammar slot
// is a `type_expr` (the typedef_declaration twin), `ConstantsNode.schemaType`
// is the node, `schema` the derived base name — and every named leaf credits
// its type in the orphan walk. Fixture 119 (README names the leaf).
//
// Fix-bound: on `origin/main` (08336db) `convertTypeToSchema` reduced
// `Record<string, Rule>` to `Record`, `ReadonlyMap<...>` to `Map`, `Rule[]`
// to `Array` and dropped the literal union, and `Rule` was orphaned.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { ConstantsNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const fixtureDir = join(import.meta.dirname, 'repros-analyzer', '119-constants-schema-generic-annotation');

const convert = () => {
  const analysis = new TypeScriptAnalyzer(fixtureDir).analyzeFromEntrypoint(join(fixtureDir, 'src', 'main.ts'));
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true, JSON.stringify(result.errors));
  return result;
};

const constantsLine = (tmdContent: string, name: string) => tmdContent.split('\n').find((line) => line.startsWith(`${name} ! `));

describe('TM14 U5a: Constants schema carries a full type expression and credits its references', () => {
  it('shortform prints the whole annotation for generic, readonly-map, literal-union and array schemas', () => {
    const { tmdContent } = convert();
    assert.deepEqual(
      {
        rules: constantsLine(tmdContent, 'RULES'),
        names: constantsLine(tmdContent, 'NAMES'),
        mode: constantsLine(tmdContent, 'MODE'),
        list: constantsLine(tmdContent, 'LIST'),
        broken: constantsLine(tmdContent, 'BROKEN'),
      },
      {
        rules: 'RULES ! src/rules.ts : Record<string, Rule>',
        names: 'NAMES ! src/rules.ts : ReadonlyMap<string, Rule>',
        mode: "MODE ! src/rules.ts : 'read' | 'write'",
        list: 'LIST ! src/rules.ts : Rule[]',
        broken: 'BROKEN ! src/rules.ts : NonExistentSchema',
      },
    );
  });

  it('the converted entities carry schemaType nodes with the derived base name', () => {
    const { entities } = convert();
    const schemaOf = (name: string) => {
      const entity = entities.find((candidate) => candidate instanceof ConstantsNode && candidate.name === name);
      assert.ok(entity instanceof ConstantsNode, name);
      return { kind: entity.schemaType?.kind, schema: entity.schema };
    };
    assert.deepEqual(
      { rules: schemaOf('RULES'), names: schemaOf('NAMES'), mode: schemaOf('MODE'), list: schemaOf('LIST') },
      {
        rules: { kind: 'generic', schema: 'Record' },
        names: { kind: 'generic', schema: 'ReadonlyMap' },
        mode: { kind: 'union', schema: undefined },
        list: { kind: 'array', schema: undefined },
      },
    );
  });

  it('longform quotes the schema slot and round-trips, including the literal union', async () => {
    const { tmdContent } = convert();
    const mind = await TypedMind.create();
    const longform = mind.emitLongform(tmdContent);
    assert.equal(longform.includes('schema: "Record<string, Rule>"'), true, longform);
    assert.equal(longform.includes('schema: "\'read\' | \'write\'"'), true, longform);
    assert.deepEqual(mind.check(longform).diagnostics, []);
    const backToShortform = mind.emitShortform(longform);
    assert.deepEqual(
      { rules: constantsLine(backToShortform, 'RULES'), mode: constantsLine(backToShortform, 'MODE') },
      { rules: constantsLine(tmdContent, 'RULES'), mode: constantsLine(tmdContent, 'MODE') },
    );
  });

  it('Rule is not orphaned: the schema references credit the orphan walk (check-orphans.ts port-exclusion correction)', async () => {
    const { tmdContent } = convert();
    const mind = await TypedMind.create();
    assert.deepEqual(mind.check(tmdContent).diagnostics, []);
    // Deleting every schema that names Rule restores exactly Rule's orphan.
    const withoutRuleSchemas = tmdContent
      .replace(' : Record<string, Rule>', '')
      .replace(' : ReadonlyMap<string, Rule>', '')
      .replace(' : Rule[]', '');
    assert.notEqual(withoutRuleSchemas, tmdContent);
    assert.deepEqual(
      mind.check(withoutRuleSchemas).diagnostics.map((finding) => finding.message),
      ["Orphaned entity 'Rule'"],
    );
  });

  it('LIST.ok resolves missing-member: members resolve only through a bare named schema (U-7)', async () => {
    const { tmdContent } = convert();
    const mind = await TypedMind.create();
    const consuming = `${tmdContent}\nuse :: () => void\n  $< [LIST.ok]\n`;
    assert.deepEqual(
      mind
        .check(consuming)
        .diagnostics.filter((finding) => finding.code === 'checker/qualified-name-unresolved')
        .map((finding) => finding.message),
      ["Qualified name 'LIST.ok' has no declared member 'ok' on 'LIST'"],
    );
  });

  it('control: BROKEN : NonExistentSchema yields the existing schema behaviour only and zero checker/generic-* (G2-2, U2-4)', async () => {
    const result = convert();
    const mind = await TypedMind.create();
    const findings = mind.check(result.tmdContent).diagnostics;
    assert.deepEqual(
      {
        generic: findings.filter((finding) => finding.code.startsWith('checker/generic-')),
        schemaFindings: findings.filter((finding) => finding.message.includes('NonExistentSchema')).map((finding) => finding.code),
        converterWarnings: result.warnings.filter((warning) => warning.includes('NonExistentSchema')),
      },
      // An undeclared schema name has no finding of its own today (the
      // scenario-60 pin: no `BrokenConfig` + `NonExistentSchema` message);
      // R6a adds none — it only stops fabricating a generic finding.
      { generic: [], schemaFindings: [], converterWarnings: [] },
    );
  });
});
