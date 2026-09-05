// RFC-TM-14 §S3 (rfc-tm-14-diamond.md, Quantum U3a): Class and ClassFile
// `calls`/`consumes` reach hover, the reference index and the CST name
// occurrences the same way a Function's do.
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { ClassFileNode, ClassNode, TypedMind } from '@sammons/typed-mind';
import { renderHoverContents } from './hover.ts';
import { NameOccurrenceIndex } from './name-occurrence-index.ts';

it('TM14 U3: Class and ClassFile hover, references and occurrences carry calls and consumes', async () => {
  const mind = await TypedMind.create();
  const parsed = mind.parseWithCst(
    [
      'helper :: () => void',
      'LIMIT ! limits.ts',
      'Service <:',
      '  ~> [helper]',
      '  $< [LIMIT]',
      'Store #: store.ts',
      '  ~> [helper]',
      '  $< [LIMIT]',
    ].join('\n'),
  );
  const service = parsed.entities.find((entity) => entity instanceof ClassNode);
  const store = parsed.entities.find((entity) => entity instanceof ClassFileNode);
  assert.ok(service);
  assert.ok(store);
  assert.match(renderHoverContents(service, parsed.links), /Calls[^\n]*helper[\s\S]*Consumes[^\n]*LIMIT/);
  assert.match(renderHoverContents(store, parsed.links), /Calls[^\n]*helper[\s\S]*Consumes[^\n]*LIMIT/);
  const names = new NameOccurrenceIndex(parsed.cst, parsed.entities);
  assert.equal(names.occurrencesOf('helper').length, 3);
  assert.equal(names.occurrencesOf('LIMIT').length, 3);
  for (const target of ['helper', 'LIMIT']) {
    assert.deepEqual(
      parsed.links
        .referencedBy(target)
        .map((reference) => reference.from)
        .toSorted(),
      ['Service', 'Store'],
    );
  }
});
