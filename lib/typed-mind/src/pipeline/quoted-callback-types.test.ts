import assert from 'node:assert/strict';
import { before, it } from 'node:test';
import { Language, Parser } from 'web-tree-sitter';
import { DtoNode } from '../ast/dto-node.ts';
import { quoteStringLiteral } from '../emitter/quote-string-literal.ts';
import { SyntaxEmitter } from '../emitter/syntax-emitter.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

let raw: Parser;
let parser: TypedMindParser;
const wasmPath = new URL('../../grammar/grammar.wasm', import.meta.url).pathname;
before(async () => {
  await Parser.init();
  raw = new Parser();
  raw.setLanguage(await Language.load(wasmPath));
  parser = await TypedMindParser.create({ wasmPath });
});
const document = (type: string) => `Example %\n  - cb: ${type}\nNext %\n  - id: string`;

it('TM13 RQ: quoted callback LF/SF/LF preserves types, descriptions and optional markers', () => {
  const types = [
    '(mode: "read" | "write") => void',
    '{ cb: (mode: "read") => void }',
    '(cb: (mode: "read") => void) => Box<string | null>',
    '{ cb: Box<(mode: "read") => void> }',
    String.raw`(mode: "escaped \" quote, \\ slash, \q") => void`,
    '(mode: "literal ) | } text") => void',
    '("a" | "b")[]',
  ];
  const emitter = new SyntaxEmitter();
  for (const type of types) {
    let outcome = parser.parse(
      `dto Example {\n fields: {\n cb: { type: ${quoteStringLiteral(type)}, description: "callback", optional: true }\n }\n}\n`,
    );
    assert.deepEqual(outcome.diagnostics, [], type);
    for (const forceForm of ['shortform', 'longform', 'shortform'] as const) {
      const emitted = emitter.emitWithDiagnostics(outcome, { forceForm });
      assert.deepEqual(emitted.diagnostics, [], type);
      outcome = parser.parse(emitted.text);
      assert.deepEqual(outcome.diagnostics, [], emitted.text);
      const dto = outcome.entities[0];
      assert.ok(dto instanceof DtoNode);
      assert.equal(dto.fields[0]?.type, type);
      assert.equal(dto.fields[0]?.description, 'callback');
      assert.equal(dto.fields[0]?.isOptional, true);
    }
  }
});

it('TM13 RQ: malformed callbacks fail locally and preserve the following declaration', () => {
  for (const type of ['(mode: "unfinished) => void', '(mode: "read" => void', '{ cb: (mode: "read"] => void }']) {
    const tree = raw.parse(document(type));
    assert.ok(tree);
    assert.equal(tree.rootNode.hasError, true, type);
    assert.ok(
      tree.rootNode.descendantsOfType('dto_declaration').some((node) => node.text.startsWith('Next %')),
      type,
    );
    tree.delete();
  }
});

it('TM13 RQ: quoted callback valid-invalid-valid incremental trees equal fresh trees at EOF', () => {
  let text = document('(mode: "read") => void');
  let tree = raw.parse(text);
  assert.ok(tree);
  const index = text.indexOf('read"') + 4;
  const point = { row: 1, column: index - text.indexOf('\n') - 1 };
  for (const [removed, inserted] of [
    [1, ''],
    [0, '"'],
  ] as const) {
    const next = text.slice(0, index) + inserted + text.slice(index + removed);
    tree.edit({
      startIndex: index,
      oldEndIndex: index + removed,
      newEndIndex: index + inserted.length,
      startPosition: point,
      oldEndPosition: { ...point, column: point.column + removed },
      newEndPosition: { ...point, column: point.column + inserted.length },
    });
    const incremental = raw.parse(next, tree);
    const fresh = raw.parse(next);
    assert.ok(incremental && fresh);
    assert.equal(incremental.rootNode.toString(), fresh.rootNode.toString());
    assert.equal(incremental.rootNode.hasError, removed === 1);
    tree.delete();
    fresh.delete();
    tree = incremental;
    text = next;
  }
  tree.delete();
});
