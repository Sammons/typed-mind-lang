import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { Language, Parser } from 'web-tree-sitter';

let parser: Parser;
before(async () => {
  await Parser.init();
  parser = new Parser();
  parser.setLanguage(await Language.load(new URL('../../grammar/grammar.wasm', import.meta.url).pathname));
});

const document = (type: string) => `Data %\n  - value: ${type}\nNext %\n  - value: string\n`;

describe('TM13 C: atomic opaque angle groups', () => {
  it('preserves balanced payloads, outer unions and descriptions without stealing structured generics', () => {
    const types = [
      '(id: string) => Promise<Result<string | null>>',
      '(id: string) => Wrapper<() => Promise<Result<string | null>>>',
      '(id: string) => Box<"a > b" | "c">',
      '(id: string) => Box<{ cb: (x: "a > b") => Item[] }>',
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal source exercises nested template interpolation
      '(id: string) => Box<`outer ${`inner > value`} tail`>',
      '(id: string) => Box<A >= B | C <= D>',
      String.raw`(id: string) => Box<"escaped \\\" > quote" | 'single >'>`,
    ];
    for (const type of types) {
      const tree = parser.parse(document(type));
      assert.ok(tree);
      assert.equal(tree.rootNode.hasError, false, type);
      assert.equal(tree.rootNode.descendantsOfType('type_opaque')[0]?.text, type);
      tree.delete();
    }
    const structured = parser.parse(document('Box<Result<string>[]>'));
    assert.ok(structured);
    assert.equal(structured.rootNode.hasError, false);
    assert.equal(structured.rootNode.descendantsOfType('type_generic').length, 2);
    assert.equal(structured.rootNode.descendantsOfType('type_opaque').length, 0);
    structured.delete();
    const outer = parser.parse(document('(id: string) => Box<string | null> | undefined "field description"'));
    assert.ok(outer);
    assert.equal(outer.rootNode.hasError, false);
    assert.equal(outer.rootNode.descendantsOfType('type_opaque')[0]?.text, '(id: string) => Box<string | null>');
    assert.ok(outer.rootNode.descendantsOfType('string').some((node) => node.text === '"field description"'));
    outer.delete();
  });

  it('rejects mismatched, unfinished and multiline groups without consuming the following declaration', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal malformed template source
    for (const payload of ['Box<(X>', 'Box<[X)>', 'Box<"unfinished>', 'Box<Item', 'Box<`outer ${`inner >`} tail>', 'Box<Item\n>']) {
      const tree = parser.parse(document(`(id: string) => ${payload}`));
      assert.ok(tree);
      assert.equal(tree.rootNode.hasError, true, payload);
      assert.ok(
        tree.rootNode.descendantsOfType('dto_declaration').some((node) => node.text.startsWith('Next %')),
        payload,
      );
      tree.delete();
    }
  });

  it('fresh and incremental parses agree through valid-invalid-valid edits and EOF', () => {
    const initial = document('(id: string) => Box<Result<string | null>>').trimEnd();
    let text = initial;
    let tree = parser.parse(text);
    assert.ok(tree);
    const index = text.indexOf('>>');
    const point = { row: 1, column: index - text.indexOf('\n') - 1 };
    for (const [removed, inserted] of [
      [1, ''],
      [0, '>'],
    ] as const) {
      const next = text.slice(0, index) + inserted + text.slice(index + removed);
      tree.edit({
        startIndex: index,
        oldEndIndex: index + removed,
        newEndIndex: index + inserted.length,
        startPosition: point,
        oldEndPosition: { row: point.row, column: point.column + removed },
        newEndPosition: { row: point.row, column: point.column + inserted.length },
      });
      const incremental = parser.parse(next, tree);
      const fresh = parser.parse(next);
      assert.ok(incremental);
      assert.ok(fresh);
      assert.equal(incremental.rootNode.toString(), fresh.rootNode.toString());
      assert.equal(incremental.rootNode.hasError, removed === 1);
      tree.delete();
      fresh.delete();
      tree = incremental;
      text = next;
    }
    assert.equal(text, initial);
    tree.delete();
  });
});
