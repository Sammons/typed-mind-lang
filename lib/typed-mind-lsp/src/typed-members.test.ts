import assert from 'node:assert/strict';
import { it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { buildDocumentState, targetOfOccurrence } from './document-state.ts';
import { renderHoverContents } from './hover.ts';
import { provideReferencesForName } from './references.ts';
import { provideSemanticTokensForDocument } from './semantic-tokens.ts';

const source = String.raw`Types @ types.ts:
Types.Payload %
Config %
T %
run :: () => void
class Store<T> {
  method: "run<U extends Types.Payload>(label: \"escaped\\path\", value: Types.Payload, local: T, callback: <V>(value: V) => Config) => U"
  constructor: "(config: Config)"
}
`;

it('TM13 B3: quoted member references share exact source spans and checked LSP targets', async () => {
  const output = (await TypedMind.create()).parseWithCst(source);
  assert.deepEqual(output.diagnostics, []);
  const state = buildDocumentState(output);
  for (const name of ['Types.Payload', 'Config']) {
    const occurrences = state.nameIndex.occurrencesOf(name);
    assert.equal(occurrences.length, 3);
    for (const occurrence of occurrences) {
      assert.equal(source.split('\n')[occurrence.startLine - 1]?.slice(occurrence.startColumn - 1, occurrence.endColumn - 1), name);
      assert.equal(targetOfOccurrence(occurrence, state.names)?.name, name);
      assert.equal(state.nameIndex.occurrenceAt(occurrence.startLine, occurrence.startColumn), occurrence);
    }
    assert.equal(provideReferencesForName('file:///members.tmd', name, state.nameIndex, state.names).length, 3);
  }
  assert.equal(state.nameIndex.occurrencesOf('T').length, 1);
  assert.equal(state.nameIndex.occurrencesOf('run').length, 1);
  assert.equal(state.nameIndex.occurrencesOf('U').length, 0);
  assert.equal(state.nameIndex.occurrencesOf('V').length, 0);
  const tokens = provideSemanticTokensForDocument(state).data;
  let line = 0;
  let memberTokens = 0;
  for (let index = 0; index < tokens.length; index += 5) {
    line += tokens[index] ?? 0;
    if (line === 6 || line === 7) memberTokens++;
  }
  assert.equal(memberTokens, 6); // Two qualified references split owner/member, plus two Config references.
  const store = state.names.target('Store');
  assert.ok(store);
  const hover = renderHoverContents(store, output.links);
  assert.match(hover, /\*\*Methods\*\*: run<U extends Types.Payload>/);
  assert.match(hover, /\*\*Constructors\*\*: \(config: Config\)/);
});

it('TM13 B3: malformed or opaque members add no guessed LSP references', async () => {
  const output = (await TypedMind.create()).parseWithCst(`Payload %
class Broken {
  method: "run(value: Payload) =>"
  constructor: "(value: Payload) => Payload"
}
`);
  const state = buildDocumentState(output);
  assert.equal(state.nameIndex.occurrencesOf('Payload').length, 1);
  assert.equal(provideReferencesForName('file:///members.tmd', 'Payload', state.nameIndex, state.names).length, 1);
});

it('TM13 B3: nested callback constraints and defaults navigate after quoted escapes', async () => {
  const source = String.raw`Bound %
Fallback %
Output %
Box<T> %
class Store {
  method: "run(prefix: \"before\\path\", value: Box<<U extends Bound = Fallback>(label: \"quoted\\path\", item: Output) => Output>) => void"
}
`;
  const output = (await TypedMind.create()).parseWithCst(source);
  assert.deepEqual(output.diagnostics, []);
  const state = buildDocumentState(output);
  for (const [name, count] of [
    ['Bound', 2],
    ['Fallback', 2],
    ['Output', 3],
  ] as const) {
    const occurrences = state.nameIndex.occurrencesOf(name);
    assert.equal(occurrences.length, count);
    for (const occurrence of occurrences) {
      assert.equal(source.split('\n')[occurrence.startLine - 1]?.slice(occurrence.startColumn - 1, occurrence.endColumn - 1), name);
      assert.equal(targetOfOccurrence(occurrence, state.names)?.name, name);
    }
  }
});
