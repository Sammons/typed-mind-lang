import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { DtoNode, SyntaxEmitter, TypeDefNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

// Frozen original gap ownership plus the named factory/heritage enabling cases.
// Unit tests own their source-removal controls; this gate proves they close in
// the same built analyzer, emitter and checker without changing suppressions.
const cases = [
  ['68', 'G', '68-generic-type-parameters', 'index.ts'],
  ['77', 'A2', '77-same-name-interface-two-files', 'main.ts'],
  ['82b', 'C', '82-function-type-generic-union-return', 'index.ts'],
  ['83', 'B2', '83-generic-base-external-stub', 'index.ts'],
  ['84', 'B1', '84-function-io-generic-orphan', 'index.ts'],
  ['85', 'B3', '85-classfile-method-signature-types', 'server.ts'],
  ['86-grammar', 'C', '86-fn-type-union-in-generic-return', 'index.ts'],
  ['88', 'D/F', '88-export-assignment-default', 'index.ts'],
  ['95', 'G', '95-generic-function-type-parameter', 'index.ts'],
  ['96', 'A2', '96-same-name-type-alias-two-files', 'index.ts'],
  ['66b', 'G', '66b-mixin-heritage-controls', 'index.ts'],
  ['66c', 'H', '66c-mixin-no-base-argument', 'index.ts'],
  ['69d', 'G', '69d-generic-heritage-both-lanes', 'index.ts'],
] as const;

it('TM13 EXIT: gap fixture ledger has zero unowned or unresolved target rows', async () => {
  const mind = await TypedMind.create();
  const emitter = new SyntaxEmitter();
  assert.equal(new Set(cases.map(([id]) => id)).size, 13);
  for (const [id, owner, fixture, entry] of cases) {
    assert.ok(owner.length > 0);
    const root = join(import.meta.dirname, 'repros-analyzer', fixture);
    const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'src', entry));
    const converted = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(converted.success, true, `${id}: ${JSON.stringify(converted.errors)}`);
    const outcome = mind.parse(converted.tmdContent);
    assert.deepEqual(outcome.suppressions, [], `${id}: no diagnostic suppression`);
    assert.deepEqual(mind.check(converted.tmdContent).diagnostics, [], `${id}: emitted extraction`);
    // Every generated identity in this corpus follows the new naming contract.
    assert.equal(
      converted.entities.some((entity) => entity.name.includes('__')),
      false,
      id,
    );
    for (const forceForm of ['longform', 'shortform'] as const) {
      const emitted = emitter.emitWithDiagnostics(outcome, { forceForm });
      assert.deepEqual(emitted.diagnostics, [], `${id}: ${forceForm}`);
      assert.deepEqual(mind.check(emitted.text).diagnostics, [], `${id}: ${forceForm}`);
    }
  }
  // #130's quoted-description trigger plus literal union/alias wrappers are
  // syntax/codec obligations; these standalone declarations have no Program.
  for (const source of [
    'Data %\n  - status: "active" | "inactive"\n',
    'Status = "active" | "inactive"\n',
    'Only = "active"\n',
    String.raw`Data %
  - value: string "Description with \"quoted\" words and \\ slash"
`,
  ]) {
    const original = mind.parse(source);
    assert.deepEqual(original.diagnostics, []);
    const entity = original.entities[0];
    assert.ok(entity instanceof DtoNode || entity instanceof TypeDefNode);
    for (const forceForm of ['longform', 'shortform'] as const) {
      const emitted = emitter.emitWithDiagnostics(original, { forceForm });
      assert.deepEqual(emitted.diagnostics, []);
      const reparsed = mind.parse(emitted.text);
      assert.deepEqual(reparsed.diagnostics, []);
      if (entity instanceof DtoNode) {
        const next = reparsed.entities[0];
        assert.ok(next instanceof DtoNode);
        assert.deepEqual(
          next.fields.map((field) => field.description),
          entity.fields.map((field) => field.description),
        );
      }
      assert.equal(emitter.emitShortform(reparsed), emitter.emitShortform(original));
    }
  }
});
