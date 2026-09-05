import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { parseTypeParameterText } from '../pipeline/parse-type-parameters.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { honestFieldsAcrossToggleOf } from './honest-fields.ts';
import { quoteStringLiteral } from './quote-string-literal.ts';
import { SyntaxEmitter } from './syntax-emitter.ts';

const createParser = () => TypedMindParser.create({ wasmPath: join(import.meta.dirname, '../../grammar/grammar.wasm') });
const semantic = (entity: EntityNode) => {
  const { sourceForm: _sourceForm, ...fields } = honestFieldsAcrossToggleOf(entity);
  return fields;
};

it('G.3 all five generic declarations retain parameters and heritage through repeated format toggles', async () => {
  const parser = await createParser();
  const emitter = new SyntaxEmitter();
  const source =
    'Pair<T, U> %\n - value: T\nAlias<T> = Array<T>\nchoose<T> :: choose(value: T) => T\nChild<T> <: Base<T>, Contract<Array<T>>\nChildFile<T> #: child.ts <: Base<T>\n';
  const original = parser.parse(source);
  assert.deepEqual(original.diagnostics, []);
  let current = original;
  for (const forceForm of ['longform', 'shortform', 'longform', 'shortform'] as const) {
    const emitted = emitter.emitWithDiagnostics(current, { forceForm });
    assert.deepEqual(emitted.diagnostics, []);
    current = parser.parse(emitted.text);
    assert.deepEqual(current.diagnostics, [], emitted.text);
    assert.deepEqual(current.entities.map(semantic), original.entities.map(semantic));
  }
});

it('G.3 full generic facts and implements-only/interface heritage promote to lossless longform', async () => {
  const parser = await createParser();
  const emitter = new SyntaxEmitter();
  const parameter = 'out T extends Constraint = "quoted\\" value\\\\"';
  const source = `dto Pair {\n typeParameter: ${quoteStringLiteral(parameter)}\n typeParameter: "U = Map<T, Other>"\n extends: "Base<T>"\n extends: "OtherBase<U>"\n}\nclass Child {\n typeParameter: "T"\n implements: "Contract<T>"\n}\n`;
  const original = parser.parse(source);
  assert.deepEqual(original.diagnostics, []);
  const text = emitter.emitShortform(original);
  assert.ok(text.startsWith('dto Pair {'));
  assert.ok(text.includes('class Child {'));
  const reparsed = parser.parse(text);
  assert.deepEqual(reparsed.diagnostics, [], text);
  assert.deepEqual(reparsed.entities.map(semantic), original.entities.map(semantic));
  assert.equal((reparsed.entities[0] as DtoNode).typeParameters?.[0]?.modifiers[0], 'out');
});

it('G.3 whitespace canonicalization preserves raw inspection and emits complete single-line parameter values', async () => {
  const parser = await createParser();
  const emitter = new SyntaxEmitter();
  const raw = 'const T extends {\n  value: Other;\n  label: "a  /*literal*/  b"\n}';
  const result = parseTypeParameterText(raw);
  assert.equal(result.kind, 'parsed');
  if (result.kind !== 'parsed') return;
  const span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
  const node = new DtoNode({ name: 'Pair', span, raw: '', sourceForm: 'shortform', fields: [], typeParameters: result.parameters });
  const outcome = { entities: [node], imports: [], suppressions: [], diagnostics: [] };
  const emitted = emitter.emitShortformWithDiagnostics(outcome);
  assert.deepEqual(emitted.diagnostics, []);
  const reparsed = parser.parse(emitted.text);
  assert.deepEqual(reparsed.diagnostics, [], emitted.text);
  assert.equal(node.typeParameters?.[0]?.raw, raw);
  assert.deepEqual(reparsed.entities.map(semantic), outcome.entities.map(semantic));
});

it('G.3 diagnostic emission reports unsupported programmatic multiline literal metadata', () => {
  const span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
  const node = new DtoNode({
    name: 'Pair',
    span,
    raw: '',
    sourceForm: 'shortform',
    fields: [],
    typeParameters: [
      {
        name: 'T',
        modifiers: [],
        constraint: undefined,
        defaultType: { kind: 'literal', literalKind: 'string', value: 'line\nvalue', span },
        raw: 'T',
        span,
      },
    ],
  });
  const result = new SyntaxEmitter().emitShortformWithDiagnostics({ entities: [node], imports: [], suppressions: [], diagnostics: [] });
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => [diagnostic.code, diagnostic.severity]),
    [['emitter/unsupported-multiline-type-parameter', 'error']],
  );
});
