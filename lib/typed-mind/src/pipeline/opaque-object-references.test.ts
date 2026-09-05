// RFC-TM-14 §S4 R4a/R4b substrate (rfc-tm-14-diamond.md, S2-6): the bounded
// inline-object member parse and the `(typeof X)` value query, exercised
// through the shared walker so hook routing and span mapping are asserted at
// the surface every consumer uses.

import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { Span } from '../ast/span.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { quoteStringLiteral } from '../emitter/quote-string-literal.ts';
import { parseOpaqueObjectMembers, parseTypeQueryReference } from './opaque-object-references.ts';
import { parseQuotedSignature } from './parse-quoted-signature.ts';
import { parseTypeExprText } from './type-expr-from-text.ts';
import { type TypeReferencePosition, walkTypeReferences } from './type-reference-walk.ts';

const base = { baseLine: 1, baseColumn: 1 };
const memberKeys = (text: string) => {
  const parsed = parseOpaqueObjectMembers(text, base);
  return parsed.kind === 'members' ? parsed.members.map((member) => `${member.kind}:${member.key}`) : 'rejected';
};

interface Walked {
  readonly references: string[];
  readonly values: string[];
  readonly opaque: string[];
  readonly spans: Map<string, Span>;
}
const walk = (typeExpr: TypeExprNode, position: TypeReferencePosition = 'alias', binders: ReadonlySet<string> = new Set()): Walked => {
  const walked: Walked = { references: [], values: [], opaque: [], spans: new Map() };
  walkTypeReferences(
    typeExpr,
    binders,
    {
      reference: (node) => {
        walked.references.push(node.name);
        walked.spans.set(node.name, node.span);
      },
      valueReference: (name, span) => {
        walked.values.push(name);
        walked.spans.set(name, span);
      },
      opaque: (node) => {
        walked.opaque.push(node.text);
      },
    },
    position,
  );
  return walked;
};
const walkText = (text: string, position: TypeReferencePosition = 'alias') => walk(parseTypeExprText(text).typeExpr, position);
const sliceOf = (text: string, span: Span) => text.slice(span.start.column - 1, span.end.column - 1);

it('TM14 U4: the member grammar accepts property, optional, readonly, quoted-key and method members', () => {
  assert.deepEqual(memberKeys('{ a: string; b?: Legacy, readonly c: Base; "quoted-key": string; send(cmd: Base): Promise<Legacy> }'), [
    'property:a',
    'property:b',
    'property:c',
    'property:quoted-key',
    'method:send',
  ]);
  assert.deepEqual(memberKeys('{ readonly: boolean; readonly?: Flag; pick<T extends Base>(value: T): T; run() }'), [
    'property:readonly',
    'property:readonly',
    'method:pick',
    'method:run',
  ]);
  assert.deepEqual(memberKeys('{ a: string; }'), ['property:a']);
  assert.deepEqual(memberKeys('{}'), []);
});

it('TM14 U4: rejected member shapes make the whole leaf contribute nothing', () => {
  for (const text of [
    '{ [k: string]: Legacy }',
    '{ get x(): Legacy }',
    '{ set x(value: Legacy) }',
    '{ a: Legacy; [K in keyof Base]: string }',
    '{ new (): Legacy }',
    '{ (): Legacy }',
    '{ 0: Legacy }',
    '{ a: Legacy;; b: string }',
    '{ a: Legacy',
    '{ a: Legacy }[]',
    '{ a: `$' + '{Legacy}` }', // a template interpolation (scanner.c rejects it)
    '(typeof CODES)[number]',
    'Legacy',
  ]) {
    assert.equal(memberKeys(text), 'rejected', text);
  }
});

it('TM14 U4: inline-object members yield references through the walker at the leaf position', () => {
  const walked = walkText('Omit<Base, "id"> & { id: string; tier?: Legacy; send(cmd: Base): Promise<Legacy>; nested: { deep: Deep } }');
  assert.deepEqual(walked.references, ['Omit', 'Base', 'string', 'Legacy', 'Base', 'Promise', 'Legacy', 'Deep']);
  assert.deepEqual(walked.values, []);
  // The leaf itself stays opaque to consumers that key on it (G2-5).
  assert.deepEqual(walked.opaque, [
    '{ id: string; tier?: Legacy; send(cmd: Base): Promise<Legacy>; nested: { deep: Deep } }',
    '{ deep: Deep }',
  ]);
  const rejected = walkText('Omit<Base, "id"> & { [k: string]: Legacy }');
  assert.deepEqual(rejected.references, ['Omit', 'Base']);
  assert.deepEqual(rejected.opaque, ['{ [k: string]: Legacy }']);
});

it('TM14 U4: method-member binders shadow outer names and their constraints are references', () => {
  const walked = walkText('{ pick<T extends Bound>(value: T, other: Outer): T }', 'alias');
  assert.deepEqual(walked.references, ['Bound', 'Outer']);
  const shadowed = walk(parseTypeExprText('{ value: T; other: U }').typeExpr, 'alias', new Set(['T']));
  assert.deepEqual(shadowed.references, ['U']);
});

it('TM14 U4: inline-object member spans point at the member text', () => {
  const text = 'Base & { tier?: Legacy; send(cmd: Base): Promise<Legacy> }';
  const walked = walkText(text);
  for (const name of ['Legacy', 'Promise']) {
    const span = walked.spans.get(name);
    assert.ok(span, name);
    assert.equal(sliceOf(text, span), name);
  }
  // The map keeps the LAST occurrence: the return-position `Legacy`.
  assert.equal(walked.spans.get('Legacy')?.start.column, text.lastIndexOf('Legacy') + 1);
});

it('TM14 U4: quoted payload spans map through textOffsets for object members and value queries', () => {
  const payload = '(args: Base & { label: "say \\"hi\\""; kind: Legacy; code: (typeof CODES)[number] })';
  const raw = quoteStringLiteral(payload);
  const line = `  constructor: ${raw}`;
  const column = line.indexOf(raw) + 1;
  const parsed = parseQuotedSignature(raw, { start: { line: 1, column }, end: { line: 1, column: column + raw.length } }, true);
  assert.equal(parsed.kind, 'parsed');
  const walked: Walked = { references: [], values: [], opaque: [], spans: new Map() };
  for (const parameter of parsed.signature.parameters) {
    if (parameter.type?.kind !== 'type') continue;
    walkTypeReferences(
      parameter.type.typeExpr,
      new Set(),
      {
        reference: (node) => {
          walked.references.push(node.name);
          walked.spans.set(node.name, node.span);
        },
        valueReference: (name, span) => {
          walked.values.push(name);
          walked.spans.set(name, span);
        },
      },
      'member-signature',
    );
  }
  assert.deepEqual(walked.references, ['Base', 'Legacy']);
  assert.deepEqual(walked.values, ['CODES']);
  for (const name of ['Base', 'Legacy', 'CODES']) {
    const span = walked.spans.get(name);
    assert.ok(span, name);
    assert.equal(sliceOf(line, span), name);
  }
});

it('TM14 U4: a parenthesized type query fires valueReference only, with postfix text allowed', () => {
  for (const text of ['(typeof CODES)[number]', '(typeof CODES)', '(typeof CODES)[]', '( typeof Dep.CODES )["key"][number]']) {
    const walked = walkText(text, 'alias');
    assert.deepEqual(walked.references, [], text);
    assert.deepEqual(walked.values, [text.includes('Dep.') ? 'Dep.CODES' : 'CODES'], text);
    assert.deepEqual(walked.opaque, [text], text);
  }
  const span = parseTypeQueryReference('(typeof CODES)[number]', base)?.span;
  assert.deepEqual(span, { start: { line: 1, column: 9 }, end: { line: 1, column: 14 } });
  for (const text of ['typeof CODES', '(typeof CODES).length', '(typeof CODES) | Other', 'keyof (typeof CODES)']) {
    assert.equal(parseTypeQueryReference(text, base), undefined, text);
  }
  const inSignature = walkText('(base: (typeof BaseWidget)) => (typeof BaseWidget)', 'signature');
  assert.deepEqual(inSignature.references, []);
  assert.deepEqual(inSignature.values, ['BaseWidget', 'BaseWidget']);
});
