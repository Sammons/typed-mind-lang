import assert from 'node:assert/strict';
import { it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { buildDocumentState } from './document-state.ts';
import { getSemanticTokenType } from './entity-kind-maps.ts';
import { provideReferencesForName } from './references.ts';
import { provideSemanticTokensForDocument } from './semantic-tokens.ts';

const source = `file File {
  path: api.ts
  exports: [Public]
}
dto File.Private {
  fields: {
    value: { type: "string" }
  }
}
Public %
Uses %
  - item: File.Private
  - items: readonly File.Private[]
  - public: File.Public
  - missing: File.Unknown
File.Service <:
  => [run]
Caller :: () => void
  ~> [File.Service.run]
suppress File.Private checker/orphaned-entity "test"
`;

it('TM13 Q: LSP qualified headers types and members share checked navigation targets', async () => {
  const typedMind = await TypedMind.create();
  const output = typedMind.parseWithCst(source);
  assert.deepEqual(output.diagnostics, []);
  const state = buildDocumentState(output);
  const privateOccurrences = state.nameIndex.occurrencesOf('File.Private');
  assert.equal(privateOccurrences.length, 4);
  assert.deepEqual(
    privateOccurrences.map((occurrence) => occurrence.isDeclaration),
    [true, false, false, false],
  );
  for (const occurrence of privateOccurrences) {
    const line = source.split('\n')[occurrence.startLine - 1];
    assert.equal(line?.slice(occurrence.startColumn - 1, occurrence.endColumn - 1), 'File.Private');
    assert.equal(state.nameIndex.occurrenceAt(occurrence.startLine, occurrence.startColumn + 5)?.name, 'File.Private');
    assert.equal(state.names.target(occurrence.name)?.name, 'File.Private');
  }
  assert.equal(state.names.target('File.Public')?.name, 'Public');
  assert.equal(state.names.target('File.Service.run')?.name, 'File.Service');
  assert.equal(state.names.target('File.Unknown'), undefined);
  assert.equal(provideReferencesForName('file:///test.tmd', 'File.Public', state.nameIndex, state.names).length, 3);
  assert.equal(provideReferencesForName('file:///test.tmd', 'File.Private', state.nameIndex, state.names).length, 4);
  assert.equal(
    output.links.referencedBy('File.Service').some((reference) => reference.from === 'Caller'),
    true,
  );
});

it('TM13 Q: LSP semantic tokens distinguish qualified owners and member identities', async () => {
  const typedMind = await TypedMind.create();
  const state = buildDocumentState(typedMind.parseWithCst(source));
  const { data } = provideSemanticTokensForDocument(state);
  const decoded: { line: number; column: number; length: number; kind: number; modifiers: number }[] = [];
  let line = 0;
  let column = 0;
  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i] ?? 0;
    line += deltaLine;
    column = deltaLine === 0 ? column + (data[i + 1] ?? 0) : (data[i + 1] ?? 0);
    decoded.push({ line, column, length: data[i + 2] ?? 0, kind: data[i + 3] ?? 0, modifiers: data[i + 4] ?? 0 });
  }
  const declaration = decoded.filter((token) => token.line === 4);
  assert.deepEqual(declaration, [
    { line: 4, column: 4, length: 4, kind: getSemanticTokenType('File'), modifiers: 0 },
    { line: 4, column: 9, length: 7, kind: getSemanticTokenType('DTO'), modifiers: 1 },
  ]);
  assert.equal(
    decoded.some((token) => token.line === 14),
    false,
  );
});

it('TM13 Q: LSP export suffixes navigate to the owning qualified declaration', async () => {
  const typedMind = await TypedMind.create();
  for (const header of ['File @ file.ts:\n  -> [Private]\n', 'file File {\n  path: file.ts\n  exports: [Private]\n}\n']) {
    const state = buildDocumentState(typedMind.parseWithCst(`${header}File.Private %\n`));
    assert.deepEqual(state.output.diagnostics, []);
    const exported = state.nameIndex.occurrencesOf('Private')[0];
    assert.equal(exported?.exportingOwner, 'File');
    assert.equal(provideReferencesForName('file:///test.tmd', 'Private', state.nameIndex, state.names, exported?.exportingOwner).length, 2);
  }
});
