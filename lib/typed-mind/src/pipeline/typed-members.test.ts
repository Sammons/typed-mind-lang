import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { ClassNode } from '../ast/class-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { honestFieldsAcrossToggleOf } from '../emitter/honest-fields.ts';
import { quoteStringLiteral } from '../emitter/quote-string-literal.ts';
import { SyntaxEmitter } from '../emitter/syntax-emitter.ts';
import { TypedMind } from '../typed-mind.ts';
import { walkEntityTypeReferences } from './type-reference-walk.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const wasmPath = join(import.meta.dirname, '../../grammar/grammar.wasm');
const semantic = (entity: EntityNode) => {
  const { sourceForm: _sourceForm, ...fields } = honestFieldsAcrossToggleOf(entity);
  return fields;
};

it('TM13 B3a: typed methods constructors and overloads round-trip at EOF', async () => {
  const parser = await TypedMindParser.create({ wasmPath });
  const source = [
    'StoreFile @ store.ts:',
    'class StoreFile.Store<T> {',
    `  method: ${quoteStringLiteral('run<U extends T>(value: U) => Result')}`,
    `  method: ${quoteStringLiteral('run(value: T, label?: "say \\"hi\\"") => Other')}`,
    `  constructor: ${quoteStringLiteral('(config: Config)')}`,
    `  constructor: ${quoteStringLiteral('(config: OtherConfig, optional?: boolean)')}`,
    '}',
  ].join('\n');
  const original = parser.parse(source);
  assert.deepEqual(original.diagnostics, [], source);
  const cls = original.entities.find((entity) => entity instanceof ClassNode);
  assert.ok(cls instanceof ClassNode);
  assert.deepEqual(cls.methods, ['run', 'run']);
  assert.equal(cls.members?.constructors.length, 2);
  let current = original;
  for (const forceForm of ['shortform', 'longform', 'shortform'] as const) {
    const emitted = new SyntaxEmitter().emitWithDiagnostics(current, { forceForm });
    assert.deepEqual(emitted.diagnostics, []);
    assert.ok(emitted.text.includes('class StoreFile.Store {'));
    const reparsed = parser.parse(emitted.text.trimEnd());
    assert.deepEqual(reparsed.diagnostics, [], emitted.text);
    assert.deepEqual(reparsed.entities.map(semantic), original.entities.map(semantic));
    current = reparsed;
  }
});

it('TM13 B3a: legacy lists and invalid member properties preserve ownership', async () => {
  const mind = await TypedMind.create({ wasmPath, skipOrphanCheck: true });
  const source = [
    'StoreFile @ store.ts:',
    ' -> [Store]',
    'class Store {',
    ' methods: [legacy]',
    ' method: "bad.name(value: Phantom) => Result"',
    ' method: "not a signature"',
    ' constructor: "(value: Phantom) => Result"',
    ' constructor: "<T>(value: T)"',
    ' constructor: "(value: Phantom) =>"',
    '}',
    'dto Invalid {',
    ' method: "run() => Result"',
    '}',
  ].join('\n');
  const checked = mind.check(source);
  assert.equal(checked.diagnostics.filter((finding) => finding.code === 'checker/invalid-member-signature').length, 3);
  assert.equal(checked.diagnostics.filter((finding) => finding.code === 'checker/unsupported-member-signature').length, 2);
  assert.equal(checked.diagnostics.filter((finding) => finding.code === 'semantics/invalid-member-property').length, 1);
  const parsed = mind.parse(source);
  const cls = parsed.entities.find((entity) => entity instanceof ClassNode);
  assert.ok(cls instanceof ClassNode);
  assert.deepEqual(cls.methods, ['legacy']);
  const emitted = new SyntaxEmitter().emit(parsed);
  assert.ok(emitted.includes('constructor: "(value: Phantom) =>"'));
  assert.ok(emitted.includes('method: "not a signature"'));
  assert.equal(
    checked.diagnostics.some((finding) => /unknown.*Phantom|Phantom.*unknown/.test(finding.message)),
    false,
  );
});

it('TM13 B3a: typed local names do not consume unrelated global functions', async () => {
  const mind = await TypedMind.create({ wasmPath });
  const source =
    'StoreFile @ store.ts:\n -> [Store, start]\nStoreProgram -> StoreFile\nclass Store {\n method: "run() => void"\n constructor: "()"\n}\nrun :: run() => void\nstart :: start() => void\n ~> [Store.run]\n';
  const findings = mind.check(source).diagnostics;
  assert.ok(findings.some((finding) => finding.message === "Orphaned entity 'run'"));
  assert.ok(findings.some((finding) => finding.code === 'checker/function-not-exported' && finding.message.includes("'run'")));
  const used = mind.check(source.replace('[Store.run]', '[Store.run, run]')).diagnostics;
  assert.equal(
    used.some((finding) => finding.message === "Orphaned entity 'run'"),
    false,
  );
  const legacy = mind.check(source.replace(' method: "run() => void"', ' methods: [run]')).diagnostics;
  assert.equal(
    legacy.some((finding) => finding.message === "Orphaned entity 'run'" || finding.code === 'checker/function-not-exported'),
    false,
  );
  // RFC-TM-14 §S2 (U2): `Store.constructor` is the implicit member every
  // class has, so the call resolves; a typed constructor still adds no
  // `methods` entry, and an unknown member is still reported.
  assert.equal(
    mind.check(source.replace('[Store.run]', '[Store.constructor]')).diagnostics.some((finding) => finding.message.includes('constructor')),
    false,
  );
  assert.ok(
    mind.check(source.replace('[Store.run]', '[Store.build]')).diagnostics.some((finding) => finding.code === 'checker/unknown-method'),
  );
});

it('TM13 B3a: quoted signature references retain exact source columns after escapes', async () => {
  const parser = await TypedMindParser.create({ wasmPath });
  const payload = 'run<T extends Bound>(label: "say \\"hi\\" \\q", value: Request, callback: (input: Input) => Output) => Result';
  const source = `class Store {\n  method: ${quoteStringLiteral(payload)}\n}`;
  const parsed = parser.parse(source);
  assert.deepEqual(parsed.diagnostics, []);
  const entity = parsed.entities[0];
  assert.ok(entity);
  const references: string[] = [];
  walkEntityTypeReferences(entity, {
    reference: (node) => {
      references.push(node.name);
      const line = source.split('\n')[node.span.start.line - 1];
      assert.equal(line?.slice(node.span.start.column - 1, node.span.end.column - 1), node.name);
    },
  });
  assert.deepEqual(references, ['Bound', 'Request', 'Input', 'Output', 'Result']);
});

it('TM13 B3a: nested generic callbacks preserve escaped literal source offsets', async () => {
  const parser = await TypedMindParser.create({ wasmPath });
  const payload = 'run(value: Box<(label: "say hi", item: Input) => Output>) => Result';
  const source = `class Store {\n  method: ${quoteStringLiteral(payload)}\n}`;
  const parsed = parser.parse(source);
  assert.deepEqual(parsed.diagnostics, []);
  const entity = parsed.entities[0];
  assert.ok(entity);
  const references: string[] = [];
  walkEntityTypeReferences(entity, {
    reference: (node) => {
      references.push(node.name);
      assert.equal(source.split('\n')[node.span.start.line - 1]?.slice(node.span.start.column - 1, node.span.end.column - 1), node.name);
    },
  });
  assert.deepEqual(references, ['Box', 'Input', 'Output', 'Result']);
});
