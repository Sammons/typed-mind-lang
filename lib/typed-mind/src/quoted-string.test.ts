import assert from 'node:assert/strict';
import { it } from 'node:test';
import { quoteStringLiteral } from './emitter/quote-string-literal.ts';
import { decodeQuotedString, scanQuotedString } from './quoted-string.ts';

it('TM13 CP: quoted string codec is reversible', () => {
  assert.equal(quoteStringLiteral('a "quote" and \\ slash'), String.raw`"a \"quote\" and \\ slash"`);
  const values = ['', "'", '"', '/', '\\', 'trailing\\', '\\"', '\\\\"', String.raw`\q\n`, '雪🙂é'];
  for (const value of values) {
    const encoded = quoteStringLiteral(value);
    assert.equal(decodeQuotedString(encoded), value);
    assert.deepEqual(scanQuotedString(`${encoded} | Other`), { value, endIndex: encoded.length });
  }
  assert.equal(decodeQuotedString(String.raw`"\q\n"`), String.raw`\q\n`);
  assert.equal(decodeQuotedString(String.raw`"\\"`), '\\');
  for (const token of ['"unterminated', '"trailing\\"', '"line\nbreak"', '"line\rbreak"', '"escape\\\nbreak"']) {
    assert.equal(scanQuotedString(token), undefined, token);
  }
});
