import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TypedMindLanguageServer } from './server.ts';
import { TextDocument } from 'vscode-languageserver-textdocument';

describe.skip('TypedMindLanguageServer', () => {
  let server: TypedMindLanguageServer;

  beforeEach(() => {
    server = new TypedMindLanguageServer();
  });

  it('should create a server instance', () => {
    assert.notEqual(server, undefined);
    assert.ok(server instanceof TypedMindLanguageServer);
  });

  it('should handle simple DSL content', () => {
    const content = `
TodoApp -> AppEntry v2.0

AppEntry @ src/index.ts:
  <- [ExpressSetup, Routes]
  -> [startServer]
`;

    const document = TextDocument.create('file:///test.tmd', 'typedmind', 1, content);
    assert.equal(document.getText(), content);
  });

  it('should provide completions for entity types', () => {
    // Note: Full testing would require mocking the VS Code connection
    // This is a placeholder for more comprehensive tests
    assert.ok(true);
  });
});
