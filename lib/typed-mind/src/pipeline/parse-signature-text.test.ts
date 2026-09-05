import assert from 'node:assert/strict';
import { it } from 'node:test';
import { type ParseSignatureTextOptions, parseSignatureText } from './parse-signature-text.ts';

const parsed = (text: string, options?: ParseSignatureTextOptions) => {
  const result = parseSignatureText(text, options);
  assert.equal(result.kind, 'parsed', JSON.stringify(result));
  if (result.kind !== 'parsed') {
    throw new Error('assertion invariant');
  }
  assert.equal(result.signature.text, text);
  return result.signature;
};

it('TM13 B1: signature parser preserves parameter and return type structure', () => {
  const signature = parsed('async go<T extends Map<string, Boxed>, U = Wrapped>(value?: T, ...others: U[]) => Promise<Wrapped>');
  assert.equal(signature.async, true);
  assert.equal(signature.displayName, 'go');
  assert.equal(signature.typeParameterText, '<T extends Map<string, Boxed>, U = Wrapped>');
  assert.deepEqual(signature.typeParameterNames, ['T', 'U']);
  assert.deepEqual(
    signature.parameters.map(({ binding, optional, rest, type }) => ({ binding, optional, rest, type: type?.text })),
    [
      { binding: 'value', optional: true, rest: false, type: 'T' },
      { binding: 'others', optional: false, rest: true, type: 'U[]' },
    ],
  );
  assert.equal(signature.returnType?.kind, 'type');
  assert.equal(signature.returnType?.text, 'Promise<Wrapped>');
  assert.equal(parsed('async (value: Wrapped) => Boxed').displayName, undefined);
  assert.equal(parsed('(value: Wrapped) => Boxed').async, false);

  const callback = parsed('go(callback: (input: Store) => Lease | Failure) => void').parameters[0]?.type;
  assert.equal(callback?.kind, 'callable');
  if (callback?.kind === 'callable') {
    assert.equal(callback.signature.parameters[0]?.type?.text, 'Store');
    assert.equal(callback.signature.returnType?.text, 'Lease | Failure');
    assert.equal(callback.signature.returnType?.kind === 'type' && callback.signature.returnType.typeExpr.kind, 'union');
  }

  const defaults = parsed(
    'go(value: Wrapped = "comma, => )", test = left < right, callback = () => ({ value: "(" }), label = `a,b`) => Boxed',
  );
  assert.deepEqual(
    defaults.parameters.map((parameter) => parameter.defaultText),
    ['"comma, => )"', 'left < right', '() => ({ value: "(" })', '`a,b`'],
  );
  assert.equal(parsed('go({ value, other }: Wrapped, [first, second]: Boxed) => void').parameters[0]?.binding, '{ value, other }');
  assert.equal(parsed('constructor(value: Wrapped)', { allowMissingReturnType: true }).returnType, undefined);
  assert.equal(parseSignatureText('constructor(value: Wrapped)').kind, 'opaque');

  const multiline = parsed('  go(\n value: Map<string,\n Wrapped>\n) => Boxed  ', { baseLine: 10, baseColumn: 5 });
  assert.deepEqual(multiline.span, { start: { line: 10, column: 5 }, end: { line: 13, column: 13 } });
  const position = multiline.parameters[0]?.type;
  assert.deepEqual(position?.span, { start: { line: 11, column: 9 }, end: { line: 12, column: 10 } });
  if (position?.kind === 'type' && position.typeExpr.kind === 'generic') {
    assert.deepEqual(position.typeExpr.args[1]?.span, { start: { line: 12, column: 2 }, end: { line: 12, column: 9 } });
  } else {
    assert.fail('multiline type must retain its structured generic');
  }

  for (const invalid of [
    'go(value: Wrapped) => Boxed trailing',
    'go(value:) => Boxed',
    'go(value: Wrapped) =>',
    'go(value: Wrapped] => Boxed',
    'go(,value: Wrapped) => void',
    'go(value = ) => void',
    'go(value = "unterminated) => Boxed',
  ]) {
    assert.equal(parseSignatureText(invalid).kind, 'opaque', invalid);
  }
  // biome-ignore lint/suspicious/noTemplateCurlyInString: This is literal parser input.
  assert.equal(parseSignatureText('go(value = `a${nested}`) => Boxed').kind, 'opaque');
});
