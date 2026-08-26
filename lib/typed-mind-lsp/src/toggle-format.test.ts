// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — toggleFormat drops the Result box: the
// facade's toggleFormat/detectFormat are plain synchronous methods, no
// `_tag`/`.value`/`.error` unwrapping (legacy server.ts:696-711).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { handleToggleFormat } from './toggle-format.ts';

const SOURCE = `AppEntry @ src/index.ts:
  -> [start]
`;

describe('handleToggleFormat (RFC-TM-5 §1)', () => {
  it('returns newText from the facade toggleFormat call directly, with no Result-box unwrapping', async () => {
    const typedMind = await TypedMind.create();
    const result = handleToggleFormat(typedMind, SOURCE, { uri: 'file:///test.tmd' });
    assert.equal(typeof result.newText, 'string');
    assert.equal(result.newText.length > 0, true);
    assert.equal(result.error, undefined);
  });

  it('processes only the selected line range when a range is provided', async () => {
    const typedMind = await TypedMind.create();
    const multiline = `${SOURCE}\nSecondEntity ^ "unrelated dependency"\n`;
    const fullResult = handleToggleFormat(typedMind, multiline, { uri: 'file:///test.tmd' });
    const rangedResult = handleToggleFormat(typedMind, multiline, { uri: 'file:///test.tmd', range: { start: 0, end: 1 } });
    assert.notEqual(rangedResult.newText, fullResult.newText);
  });
});
