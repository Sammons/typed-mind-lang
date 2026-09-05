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

const fixture119Dir = join(import.meta.dirname, 'repros-analyzer', '119-constants-schema-generic-annotation');
const fixtureDir = fixture119Dir;

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
    assert.equal(longform.includes("schema: \"'read' | 'write'\""), true, longform);
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

// RFC-TM-14 U5b (rfc-tm-14-diamond.md §S5, leaf R6b): constants with
// call/new initializers carrying explicit type arguments and no annotation.
// The checker-read path resolves the compiler type structurally. Fixture 120.
const fixture120Dir = join(import.meta.dirname, 'repros-analyzer', '120-constants-call-type-argument');

const convert120 = () => {
  const analysis = new TypeScriptAnalyzer(fixture120Dir).analyzeFromEntrypoint(join(fixture120Dir, 'src', 'main.ts'));
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true, JSON.stringify(result.errors));
  return result;
};

describe('TM14 U5b: checker-read schema for call/new initializers with explicit type arguments', () => {
  it('toasts carries schema Signal<Toast[]> and boxed carries schema Box<Toast> with defaulted param omitted', () => {
    const { tmdContent } = convert120();
    assert.deepEqual(
      {
        toasts: constantsLine(tmdContent, 'toasts'),
        boxed: constantsLine(tmdContent, 'boxed'),
      },
      {
        toasts: 'toasts ! src/signals.ts : Signal<Toast[]>',
        boxed: 'boxed ! src/signals.ts : Box<Toast>',
      },
    );
  });

  it('wrapped carries opaque object schema and cond carries resolved literal schema', () => {
    const { tmdContent } = convert120();
    assert.deepEqual(
      {
        wrapped: constantsLine(tmdContent, 'wrapped'),
        cond: constantsLine(tmdContent, 'cond'),
      },
      {
        wrapped: 'wrapped ! src/signals.ts : { a: Legacy; }',
        cond: 'cond ! src/signals.ts : 2',
      },
    );
  });

  it('the converted entities carry schemaType nodes for toasts and boxed', () => {
    const { entities } = convert120();
    const schemaOf = (name: string) => {
      const entity = entities.find((candidate) => candidate instanceof ConstantsNode && candidate.name === name);
      assert.ok(entity instanceof ConstantsNode, name);
      return { kind: entity.schemaType?.kind, schema: entity.schema };
    };
    assert.deepEqual(
      {
        toasts: schemaOf('toasts'),
        boxed: schemaOf('boxed'),
        wrapped: schemaOf('wrapped'),
        cond: schemaOf('cond'),
      },
      {
        toasts: { kind: 'generic', schema: 'Signal' },
        boxed: { kind: 'generic', schema: 'Box' },
        wrapped: { kind: 'opaque', schema: undefined },
        cond: { kind: 'literal', schema: undefined },
      },
    );
  });

  it('no unsupported-type warnings for wrapped or cond (anonymous object and literal are resolved)', () => {
    const { warnings } = convert120();
    const unsupported = warnings.filter((w) => w.message.includes('inferred constant type'));
    assert.deepEqual(unsupported, []);
  });

  it('Toast is not orphaned: schema Signal<Toast[]> credits it in the orphan walk', async () => {
    const { tmdContent } = convert120();
    const mind = await TypedMind.create();
    const findings = mind.check(tmdContent).diagnostics;
    assert.deepEqual(
      findings.filter((f) => f.message.includes('Toast')),
      [],
    );
  });

  it('longform round-trips schema: "Signal<Toast[]>"', async () => {
    const { tmdContent } = convert120();
    const mind = await TypedMind.create();
    const longform = mind.emitLongform(tmdContent);
    assert.equal(longform.includes('schema: "Signal<Toast[]>"'), true, longform);
    const findings = mind.check(longform).diagnostics;
    assert.deepEqual(findings, []);
    const backToShortform = mind.emitShortform(longform);
    assert.equal(constantsLine(backToShortform, 'toasts'), constantsLine(tmdContent, 'toasts'));
  });

  it('checker-read reference positions index correctly into the text (rewriteTypeReferences contract)', () => {
    const analysis = new TypeScriptAnalyzer(fixture120Dir).analyzeFromEntrypoint(join(fixture120Dir, 'src', 'main.ts'));
    const seen = new Set<string>();
    for (const mod of analysis.modules) {
      for (const constant of mod.constants) {
        if (seen.has(constant.name) || constant.checkerReadSchema === undefined) continue;
        seen.add(constant.name);
        const { text, references } = constant.checkerReadSchema;
        for (const ref of references) {
          assert.equal(
            text.slice(ref.start, ref.end),
            ref.writtenName,
            `${constant.name}: ${ref.writtenName} at [${ref.start},${ref.end}]`,
          );
        }
      }
    }
    assert.ok(seen.size > 0);
  });
});
