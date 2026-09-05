import assert from 'node:assert/strict';
import { it } from 'node:test';
import { ConstantsNode, TypedMind } from '@sammons/typed-mind';
import { renderHoverContents } from './hover.ts';
import { NameOccurrenceIndex } from './name-occurrence-index.ts';

it('TM13 F: Constants hover and call occurrences retain the same target', async () => {
  const mind = await TypedMind.create();
  const parsed = mind.parseWithCst('used :: () => void\nConfig ! config.ts\n  ~> [used]');
  const entity = parsed.entities.find((entity) => entity instanceof ConstantsNode);
  assert.ok(entity);
  assert.match(renderHoverContents(entity, parsed.links), /Calls[\s\S]*used/);
  const names = new NameOccurrenceIndex(parsed.cst);
  assert.equal(names.occurrencesOf('used').length, 2);
  assert.equal(
    parsed.links.referencedBy('used').some((reference) => reference.from === 'Config'),
    true,
  );
});
