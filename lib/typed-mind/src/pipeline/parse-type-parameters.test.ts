import assert from 'node:assert/strict';
import { it } from 'node:test';
import { parseTypeParameterListText, parseTypeParameterText } from './parse-type-parameters.ts';

const parsed = (text: string) => {
  const result = parseTypeParameterListText(text);
  assert.equal(result.kind, 'parsed', JSON.stringify(result));
  if (result.kind !== 'parsed') throw new Error('assertion invariant');
  return result.parameters;
};

it('G.1 retains ordered generic binders, modifiers, nested constraints and defaults', () => {
  const parameters = parsed('<const T extends Map<string, Box> = Map<string, Default>, in out U = T[], V$,>');
  assert.deepEqual(
    parameters.map((parameter) => [parameter.name, parameter.modifiers]),
    [
      ['T', ['const']],
      ['U', ['in', 'out']],
      ['V$', []],
    ],
  );
  assert.equal(parameters[0]?.constraint?.kind, 'generic');
  assert.equal(parameters[0]?.defaultType?.kind, 'generic');
  assert.equal(parameters[1]?.defaultType?.kind, 'array');
  assert.equal(parameters[0]?.raw, 'const T extends Map<string, Box> = Map<string, Default>');
  const single = parseTypeParameterText('T extends (value: Input) => Output = (value: Input) => Default');
  assert.equal(single.kind, 'parsed');
  if (single.kind === 'parsed') {
    assert.equal(single.parameters.length, 1);
    assert.equal(single.parameters[0]?.constraint?.kind, 'opaque');
    assert.equal(single.parameters[0]?.defaultType?.kind, 'opaque');
  }
  const conditional = parsed('<T extends U extends Box ? Yes : No = Default>')[0]?.constraint;
  assert.equal(conditional?.kind, 'opaque');
  if (conditional?.kind === 'opaque') assert.equal(conditional.text, 'U extends Box ? Yes : No');
});

it('G.1 quoted punctuation cannot split binders or defaults', () => {
  const parameters = parsed('<T extends "comma, => = >" = "escaped\\" quote", U = `comma, = >`>');
  assert.equal(parameters.length, 2);
  const constraint = parameters[0]?.constraint;
  assert.equal(constraint?.kind, 'literal');
  if (constraint?.kind === 'literal') assert.equal(constraint.value, 'comma, => = >');
  const fallback = parameters[1]?.defaultType;
  assert.equal(fallback?.kind, 'opaque');
  if (fallback?.kind === 'opaque') assert.equal(fallback.text, '`comma, = >`');
});

it('G.1 canonicalizes whitespace and comments without changing literal contents or source spans', () => {
  const raw = 'out/*separate*/T extends Map<\n  Input, // explanation\n  Output> = "a  /*literal*/  b"';
  const result = parseTypeParameterText(raw, { baseLine: 10, baseColumn: 4 });
  assert.equal(result.kind, 'parsed');
  if (result.kind !== 'parsed') return;
  const parameter = result.parameters[0];
  assert.equal(parameter?.raw, raw);
  assert.equal(parameter?.name, 'T');
  assert.deepEqual(parameter?.modifiers, ['out']);
  const constraint = parameter?.constraint;
  assert.equal(constraint?.kind, 'generic');
  if (constraint?.kind === 'generic') {
    assert.deepEqual(constraint.args[1]?.span, { start: { line: 12, column: 3 }, end: { line: 12, column: 9 } });
  }
  const defaultType = parameter?.defaultType;
  assert.equal(defaultType?.kind, 'literal');
  if (defaultType?.kind === 'literal') assert.equal(defaultType.value, 'a  /*literal*/  b');
  const object = parsed('<T extends {\n key: string;\n value: Other\n}>')[0]?.constraint;
  assert.equal(object?.kind, 'opaque');
  if (object?.kind === 'opaque') assert.equal(object.text, '{ key: string; value: Other }');
  const adjacent = parsed('<T extends First/* comment */Second>')[0]?.constraint;
  assert.equal(adjacent?.kind, 'opaque');
  if (adjacent?.kind === 'opaque') assert.equal(adjacent.text, 'First Second');
});

it('G.1 rejects malformed declarations and reports multiline literal limitation explicitly', () => {
  for (const input of [
    '<>',
    '<T,,U>',
    '<T extends>',
    '<T=>',
    '<T = Map<A>',
    '<T = Map<A]>',
    '<T extra>',
    '<T = A = B>',
    '<T = "unterminated>',
    '<T /* unterminated>',
  ]) {
    assert.equal(parseTypeParameterListText(input).kind, 'invalid', input);
  }
  assert.equal(parseTypeParameterText('T, U').kind, 'invalid');
  const multiline = parseTypeParameterText('T = `line\nvalue`');
  assert.equal(multiline.kind, 'invalid');
  if (multiline.kind === 'invalid') assert.equal(multiline.reason, 'unsupported-multiline-literal');
  // Duplicates are preserved for a scope-aware checker diagnostic, not collapsed.
  assert.deepEqual(
    parsed('<T, T>').map((parameter) => parameter.name),
    ['T', 'T'],
  );
});
