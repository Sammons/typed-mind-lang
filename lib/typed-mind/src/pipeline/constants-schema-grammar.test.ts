// RFC-TM-14 U5a, leaf R6a-grammar (rfc-tm-14-diamond.md §S5, "Leaf
// specifications" → R6a / R6a-grammar): the Constants schema slot is a
// `type_expr` (the `typedef_declaration` twin). The six grammar probes
// (bare name, generic + inline comment, opaque brace + comment, EOF without
// newline, literal union, qualified generic base) parse through the runtime
// parser over `grammar/grammar.wasm` — NOT the gitignored prepack artifact
// `lib/typed-mind/grammar.wasm`, which is what round-2 finding U2-1 loaded
// (G3-1) — and round-trip through both emitters. The corpus file
// `grammar/test/corpus/tm14-constants-schema.txt` (under `check:generated
// --wasm`) is the tree-sitter-level substrate for the same probes.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ConstantsNode } from '../ast/constants-node.ts';
import { honestFieldsOf } from '../emitter/honest-fields.ts';
import { TypedMind } from '../typed-mind.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(testDir, '..', '..', 'grammar', 'grammar.wasm');

const probes = [
  { name: 'Config', source: 'Config ! src/config.ts : ConfigSchema\n', printed: 'ConfigSchema', schema: 'ConfigSchema', kind: 'named' },
  {
    name: 'RULES',
    source: 'RULES ! src/rules.ts : Record<string, Rule> # keyed by rule id\n',
    printed: 'Record<string, Rule>',
    schema: 'Record',
    kind: 'generic',
  },
  {
    name: 'BOX',
    source: 'BOX ! src/box.ts : { Variables: AuthVars; } # inline object\n',
    printed: '{ Variables: AuthVars; }',
    schema: undefined,
    kind: 'opaque',
  },
  {
    name: 'NAMES',
    source: 'NAMES ! src/names.ts : ReadonlyMap<string, Rule>',
    printed: 'ReadonlyMap<string, Rule>',
    schema: 'ReadonlyMap',
    kind: 'generic',
  },
  { name: 'MODE', source: 'MODE ! src/mode.ts : "read" | "write"\n', printed: '"read" | "write"', schema: undefined, kind: 'union' },
  {
    name: 'Toasts',
    source: 'Toasts ! src/toast.ts : Dep.Signal<Toast[]>\n',
    printed: 'Dep.Signal<Toast[]>',
    schema: 'Dep.Signal',
    kind: 'generic',
  },
  {
    name: 'App',
    source: 'App ! src/app.ts : Dep.Box<{ Variables: AuthVars; }>\n',
    printed: 'Dep.Box<{ Variables: AuthVars; }>',
    schema: 'Dep.Box',
    kind: 'generic',
  },
] as const;

describe('TM14 U5a: the six schema probes parse and round-trip in the Constants slot', () => {
  let typedMind: TypedMind;
  before(async () => {
    typedMind = await TypedMind.create({ wasmPath });
  });

  for (const probe of probes) {
    it(`parses \`${probe.source.trim()}\` with zero diagnostics and a ${probe.kind} schemaType`, () => {
      const outcome = typedMind.parse(probe.source);
      assert.deepEqual(outcome.diagnostics, []);
      const entity = outcome.entities.find((candidate) => candidate.name === probe.name);
      assert.ok(entity instanceof ConstantsNode);
      assert.deepEqual(
        { kind: entity.schemaType?.kind, schema: entity.schema, comment: entity.comment },
        { kind: probe.kind, schema: probe.schema, comment: probe.source.includes('#') ? probe.source.split('#')[1]?.trim() : undefined },
      );
    });

    it(`round-trips \`${probe.source.trim()}\` through shortform and longform with equal honest fields`, () => {
      const parsed = typedMind.parse(probe.source);
      const shortform = typedMind.emitShortform(probe.source);
      const longform = typedMind.emitLongform(probe.source);
      const comment = probe.source.includes('#') ? ` # ${probe.source.split('#')[1]?.trim()}` : '';
      assert.equal(
        shortform.split('\n')[0],
        `${probe.name} ! ${probe.source.split(' ! ')[1]?.split(' : ')[0]} : ${probe.printed}${comment}`,
      );
      assert.equal(longform.includes(`schema: ${JSON.stringify(probe.printed)}`), true, longform);
      const fromShortform = typedMind.parse(shortform);
      const fromLongform = typedMind.parse(longform);
      assert.deepEqual(fromShortform.diagnostics, []);
      assert.deepEqual(fromLongform.diagnostics, []);
      const honest = (entities: readonly { name: string }[]) =>
        honestFieldsOf(entities.find((candidate) => candidate.name === probe.name) as ConstantsNode);
      assert.deepEqual(honest(fromShortform.entities), honest(parsed.entities));
      // Longform carries the inline comment as `description:` (a pre-existing
      // comment/purpose asymmetry outside this leaf), so compare the slots R6a owns.
      const schemaFields = ({ path, schemaType, schema }: Record<string, unknown>) => ({ path, schemaType, schema });
      assert.deepEqual(schemaFields(honest(fromLongform.entities)), schemaFields(honest(parsed.entities)));
    });
  }

  it('a bare longform `schema: Name` still parses to a named schemaType (every existing longform document)', () => {
    const outcome = typedMind.parse('constants Config {\n  path: "src/config.ts"\n  schema: ConfigSchema\n}\n');
    assert.deepEqual(outcome.diagnostics, []);
    const entity = outcome.entities[0];
    assert.ok(entity instanceof ConstantsNode);
    assert.deepEqual({ kind: entity.schemaType?.kind, schema: entity.schema }, { kind: 'named', schema: 'ConfigSchema' });
  });

  it('the schema slot references credit the orphan walk and keep the pinned silence on an undeclared schema', () => {
    const source = [
      'App -> Main',
      'Main @ src/main.ts:',
      '  <- [RULES, LIST, BROKEN]',
      'RULES ! src/rules.ts : Record<string, Rule>',
      'LIST ! src/list.ts : Rule[]',
      'BROKEN ! src/broken.ts : NonExistentSchema',
      'Rule %',
      '  - ok: boolean',
      '',
    ].join('\n');
    const outcome = typedMind.check(source);
    assert.deepEqual(outcome.diagnostics, []);
    const withoutSchemas = source.replace(' : Record<string, Rule>', '').replace(' : Rule[]', '');
    assert.deepEqual(
      typedMind.check(withoutSchemas).diagnostics.map((finding) => finding.message),
      ["Orphaned entity 'Rule'"],
    );
  });

  it('member resolution runs only through a bare named schema (U-7): `LIST.ok` on `Rule[]` is missing-member', () => {
    const source = [
      'App -> Main',
      'Main @ src/main.ts:',
      '  <- [RULES, LIST]',
      '  -> [use]',
      'RULES ! src/rules.ts : Rule',
      'LIST ! src/list.ts : Rule[]',
      'Rule %',
      '  - ok: boolean',
      'use :: () => void',
      '  $< [RULES.ok, LIST.ok]',
      '',
    ].join('\n');
    assert.deepEqual(
      typedMind.check(source).diagnostics.map((finding) => finding.message),
      [
        "Qualified name 'LIST.ok' has no declared member 'ok' on 'LIST'",
        "Orphaned entity 'use'", // nothing calls `use`; not a schema concern
        "Function 'use' consumes unknown entity 'LIST.ok'",
      ],
    );
  });

  it('the schema legality row runs for every named leaf (G2-8): `: SomeFunction[]` still reports', () => {
    const source = [
      'App -> Main',
      'Main @ src/main.ts:',
      '  <- [LIST]',
      '  -> [work]',
      'LIST ! src/list.ts : work[]',
      'work :: () => void',
      '',
    ].join('\n');
    assert.deepEqual(
      typedMind.check(source).diagnostics.map((finding) => finding.message),
      ["Cannot use 'schema' to reference Function 'work'"],
    );
  });
});
