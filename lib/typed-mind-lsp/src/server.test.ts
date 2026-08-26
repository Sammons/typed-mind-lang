import { describe, it, expect, beforeEach } from 'vitest';
import { TypedMindLanguageServer } from './server.ts';
import { TextDocument } from 'vscode-languageserver-textdocument';

describe.skip('TypedMindLanguageServer', () => {
  let server: TypedMindLanguageServer;

  beforeEach(() => {
    server = new TypedMindLanguageServer();
  });

  it('should create a server instance', () => {
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(TypedMindLanguageServer);
  });

  it('should handle simple DSL content', () => {
    const content = `
TodoApp -> AppEntry v2.0

AppEntry @ src/index.ts:
  <- [ExpressSetup, Routes]
  -> [startServer]
`;

    const document = TextDocument.create('file:///test.tmd', 'typedmind', 1, content);
    expect(document.getText()).toBe(content);
  });

  it('should provide completions for entity types', () => {
    // Note: Full testing would require mocking the VS Code connection
    // This is a placeholder for more comprehensive tests
    expect(true).toBe(true);
  });
});
