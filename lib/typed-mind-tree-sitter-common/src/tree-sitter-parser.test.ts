import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { TreeSitterParser } from './tree-sitter-parser.ts';

const GRAMMAR_WASM = resolve(import.meta.dirname, '../../typed-mind/grammar/grammar.wasm');

describe('TreeSitterParser', () => {
  it('creates a parser from a WASM file path', async () => {
    const parser = await TreeSitterParser.create(GRAMMAR_WASM);
    assert.ok(parser);
  });

  it('parses source and returns a tree with a root node', async () => {
    const parser = await TreeSitterParser.create(GRAMMAR_WASM);
    const tree = parser.parse('MyFunc (x: string) => Result');
    assert.ok(tree.rootNode);
    assert.equal(tree.rootNode.type, 'source_file');
  });

  it('exposes the loaded language', async () => {
    const parser = await TreeSitterParser.create(GRAMMAR_WASM);
    const language = parser.getLanguage();
    assert.ok(language);
  });

  it('parses multiple sources with the same instance', async () => {
    const parser = await TreeSitterParser.create(GRAMMAR_WASM);
    const tree1 = parser.parse('A %');
    const tree2 = parser.parse('B %');
    assert.ok(tree1.rootNode);
    assert.ok(tree2.rootNode);
    assert.notEqual(tree1.rootNode.text, tree2.rootNode.text);
  });
});
