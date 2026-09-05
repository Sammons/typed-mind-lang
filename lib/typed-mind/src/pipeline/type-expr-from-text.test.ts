// RFC-TM-8 §1 (rfc-tm-8-diamond.md, X-TYPE-1) — direct unit coverage for the
// hand-rolled recursive-descent parser two call sites reuse: the longform
// `type:` quoted-string value, and type_readonly_array's parenthesized
// element (readonly_paren_rest is a flat, non-recursive CST token). Asserts
// on real structure and on base-offset span computation, not counts.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTypeExprText } from './type-expr-from-text.ts';

describe('parseTypeExprText: the shared string-based type-expression parser', () => {
  it('parses a bare named type with default (1,1) base offset', () => {
    const result = parseTypeExprText('UserRole');
    assert.deepEqual(result, {
      typeExpr: { kind: 'named', name: 'UserRole', span: { start: { line: 1, column: 1 }, end: { line: 1, column: 9 } } },
      remainder: '',
    });
  });

  it('parses an array suffix and records the spelling', () => {
    const result = parseTypeExprText('string[]');
    assert.deepEqual(result.typeExpr, {
      kind: 'array',
      element: { kind: 'named', name: 'string', span: { start: { line: 1, column: 1 }, end: { line: 1, column: 7 } } },
      readonly: false,
      spelling: 'suffix',
      span: { start: { line: 1, column: 1 }, end: { line: 1, column: 9 } },
    });
  });

  it('parses a union of named types', () => {
    const result = parseTypeExprText('string | number');
    assert.equal(result.typeExpr.kind, 'union');
    assert.deepEqual(
      result.typeExpr.kind === 'union' ? result.typeExpr.members.map((member) => (member.kind === 'named' ? member.name : undefined)) : [],
      ['string', 'number'],
    );
  });

  it('applies a non-default base offset for spans (readonly-array element reassembly use case)', () => {
    const result = parseTypeExprText('string', { baseLine: 5, baseColumn: 20 });
    assert.deepEqual(result.typeExpr, {
      kind: 'named',
      name: 'string',
      span: { start: { line: 5, column: 20 }, end: { line: 5, column: 26 } },
    });
  });

  it("parses a parenthesized union (readonly (A | B)[]'s element reassembly)", () => {
    const result = parseTypeExprText('string | number)');
    // The caller (type-expr-from-cst.ts) passes the readonly_paren_rest text
    // WITH the trailing ')' still attached (grammar.js's flat, non-recursive
    // token) — the parser's own paren-open/close pairing only applies when
    // IT sees the opening '(' too; here there is none, so the parse stops
    // at the union and leaves ')' as the remainder for the caller to ignore.
    assert.equal(result.typeExpr.kind, 'union');
    assert.equal(result.remainder, ')');
  });

  it('recognizes a generic with a string-literal argument', () => {
    const result = parseTypeExprText('Pick<S3Client, "send">');
    assert.equal(result.typeExpr.kind, 'generic');
    if (result.typeExpr.kind === 'generic') {
      assert.equal(result.typeExpr.base.name, 'Pick');
      assert.deepEqual(
        result.typeExpr.args.map((arg) => (arg.kind === 'named' ? arg.name : arg.kind === 'literal' ? arg.value : undefined)),
        ['S3Client', 'send'],
      );
    }
  });

  it('falls back to opaque for an object literal', () => {
    const result = parseTypeExprText('{ a: string, b: number }');
    assert.equal(result.typeExpr.kind, 'opaque');
    if (result.typeExpr.kind === 'opaque') {
      assert.equal(result.typeExpr.text, '{ a: string, b: number }');
    }
    assert.equal(result.remainder, '');
  });

  it('falls back to opaque for a tuple', () => {
    const result = parseTypeExprText('[string, number, boolean]');
    assert.equal(result.typeExpr.kind, 'opaque');
    if (result.typeExpr.kind === 'opaque') {
      assert.equal(result.typeExpr.text, '[string, number, boolean]');
    }
  });

  it('parses a readonly-prefixed named-type array (the identifier-rest reassembly shape)', () => {
    const result = parseTypeExprText('readonly DtoFieldNode[]');
    assert.deepEqual(
      result.typeExpr.kind === 'array' ? { readonly: result.typeExpr.readonly, element: result.typeExpr.element.kind } : undefined,
      { readonly: true, element: 'named' },
    );
  });

  it('readonly with no trailing [] is not the array prefix (defensive fallback)', () => {
    const result = parseTypeExprText('readonly');
    assert.equal(result.typeExpr.kind, 'named');
    if (result.typeExpr.kind === 'named') {
      assert.equal(result.typeExpr.name, 'readonly');
    }
  });

  it('keeps a qualified/dotted type reference as one complete named type', () => {
    const result = parseTypeExprText('ts.CompilerOptions');
    assert.equal(result.typeExpr.kind, 'named');
    if (result.typeExpr.kind === 'named') {
      assert.equal(result.typeExpr.name, 'ts.CompilerOptions');
    }
    assert.equal(result.remainder, '');
  });

  it('keeps a multi-segment qualified name structured', () => {
    const result = parseTypeExprText('ns.inner.Deep');
    assert.equal(result.typeExpr.kind, 'named');
    if (result.typeExpr.kind === 'named') {
      assert.equal(result.typeExpr.name, 'ns.inner.Deep');
    }
  });

  it('normalizes Array<T> to the array kind, spelling: generic (lead ruling on review finding B3)', () => {
    const result = parseTypeExprText('Array<string>');
    assert.deepEqual(result.typeExpr, {
      kind: 'array',
      element: { kind: 'named', name: 'string', span: { start: { line: 1, column: 7 }, end: { line: 1, column: 13 } } },
      readonly: false,
      spelling: 'generic',
      span: { start: { line: 1, column: 1 }, end: { line: 1, column: 14 } },
    });
  });

  it('does not normalize other generic bases (Pick, Record) — only Array (doc §2)', () => {
    const pickResult = parseTypeExprText('Pick<S3Client, "send">');
    assert.equal(pickResult.typeExpr.kind, 'generic');
    const recordResult = parseTypeExprText('Record<string, number>');
    assert.equal(recordResult.typeExpr.kind, 'generic');
  });

  it('array-of-array assigns each nesting level a distinct end span, not one shared span (review finding B2 parity check)', () => {
    const result = parseTypeExprText('number[][]');
    assert.equal(result.typeExpr.kind, 'array');
    if (result.typeExpr.kind === 'array') {
      const inner = result.typeExpr.element;
      assert.equal(inner.kind, 'array');
      if (inner.kind === 'array') {
        // Inner array (number[]) ends right after its own ']' (index 8,
        // 1-based column 9); outer array (number[][]) ends after its OWN
        // ']' (index 10, column 11) — the two spans must differ.
        assert.equal(inner.span.end.column, 9);
        assert.equal(result.typeExpr.span.end.column, 11);
        assert.notDeepEqual(inner.span, result.typeExpr.span);
      }
    }
  });

  describe('scanOpaqueRun bracket-depth tracker counts <>/generic delimiters (issue #118)', () => {
    it('does not mis-nest a top-level union of two generics, each with an internal union of object literals (the issue repro)', () => {
      const result = parseTypeExprText('Record<string, { a: string } | { b: string }> | Map<string, { c: string } | { d: string }>');
      assert.equal(result.remainder, '', 'the parse must not leave a stray ">" as remainder');
      assert.equal(result.typeExpr.kind, 'union', 'top level must be the union, not folded into the first generic');
      if (result.typeExpr.kind !== 'union') {
        return;
      }
      assert.equal(result.typeExpr.members.length, 2);
      const [recordMember, mapMember] = result.typeExpr.members;
      assert.equal(recordMember?.kind, 'generic');
      assert.equal(mapMember?.kind, 'generic');
      if (recordMember?.kind === 'generic' && mapMember?.kind === 'generic') {
        assert.equal(recordMember.base.name, 'Record');
        assert.equal(mapMember.base.name, 'Map');
        // Map must be a SIBLING at the top-level union, not folded inside
        // Record's own second argument.
        assert.equal(recordMember.args.length, 2);
        const [, recordSecondArg] = recordMember.args;
        assert.equal(recordSecondArg?.kind, 'union');
        if (recordSecondArg?.kind === 'union') {
          assert.equal(recordSecondArg.members.length, 2);
          for (const member of recordSecondArg.members) {
            assert.equal(member.kind, 'opaque');
            // No stray '>' leaking into an opaque leaf's own text (the
            // issue's second symptom: "{ b: string }>").
            if (member.kind === 'opaque') {
              assert.ok(!member.text.includes('>'), `opaque leaf text must not carry a stray '>': ${member.text}`);
            }
          }
        }
      }
    });

    it('handles a nested generic-of-generic unaffected by the fix (Record<string, Array<number>>)', () => {
      const result = parseTypeExprText('Record<string, Array<number>>');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'generic');
      if (result.typeExpr.kind === 'generic') {
        assert.equal(result.typeExpr.base.name, 'Record');
        const [, second] = result.typeExpr.args;
        assert.equal(second?.kind, 'array');
        if (second?.kind === 'array') {
          assert.equal(second.spelling, 'generic');
          assert.equal(second.element.kind, 'named');
        }
      }
    });

    it('still recognizes a generic with a quoted-literal argument (Pick<S3Client, "send">)', () => {
      const result = parseTypeExprText('Pick<S3Client, "send">');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'generic');
      if (result.typeExpr.kind === 'generic') {
        assert.equal(result.typeExpr.base.name, 'Pick');
        assert.deepEqual(
          result.typeExpr.args.map((arg) => (arg.kind === 'named' ? arg.name : arg.kind === 'literal' ? arg.value : undefined)),
          ['S3Client', 'send'],
        );
      }
    });

    it('does not let a "<" or ">" inside a quoted-literal argument perturb the generic depth tracker', () => {
      const openAngle = parseTypeExprText('Record<string, "a<b">');
      assert.equal(openAngle.remainder, '');
      assert.equal(openAngle.typeExpr.kind, 'generic');
      if (openAngle.typeExpr.kind === 'generic') {
        const [, second] = openAngle.typeExpr.args;
        assert.deepEqual(second?.kind === 'literal' ? second.value : undefined, 'a<b');
      }
      const closeAngle = parseTypeExprText('Pick<S3Client, "a>b">');
      assert.equal(closeAngle.remainder, '');
      assert.equal(closeAngle.typeExpr.kind, 'generic');
      if (closeAngle.typeExpr.kind === 'generic') {
        const [, second] = closeAngle.typeExpr.args;
        assert.deepEqual(second?.kind === 'literal' ? second.value : undefined, 'a>b');
      }
    });

    it('still ends the opaque run at the enclosing generic\'s own ">" without swallowing it (single generic-of-union case)', () => {
      const result = parseTypeExprText('Record<string, { a: string } | { b: string }>');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'generic');
      if (result.typeExpr.kind === 'generic') {
        const [, second] = result.typeExpr.args;
        assert.equal(second?.kind, 'union');
        if (second?.kind === 'union') {
          for (const member of second.members) {
            assert.equal(member.kind, 'opaque');
            if (member.kind === 'opaque') {
              assert.ok(!member.text.includes('>'));
            }
          }
        }
      }
    });

    it('a union of arrays of generics still parses each generic as its own sibling member', () => {
      const result = parseTypeExprText('Record<string, number>[] | Map<string, boolean>[]');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'union');
      if (result.typeExpr.kind === 'union') {
        assert.equal(result.typeExpr.members.length, 2);
        for (const member of result.typeExpr.members) {
          assert.equal(member.kind, 'array');
          if (member.kind === 'array') {
            assert.equal(member.element.kind, 'generic');
          }
        }
      }
    });

    it('does NOT treat a bare ">" from an arrow-function-typed opaque leaf as a generic-args terminator (top-level, not inside <>)', () => {
      const result = parseTypeExprText('(result: string) => void');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'opaque');
      if (result.typeExpr.kind === 'opaque') {
        assert.equal(result.typeExpr.text, '(result: string) => void');
      }
    });

    it('a parenthesized group inside a generic argument resets the generic-args context so its own unmatched brackets do not leak past the group', () => {
      const result = parseTypeExprText('Pick<(A | B), "x">');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'generic');
      if (result.typeExpr.kind === 'generic') {
        assert.equal(result.typeExpr.base.name, 'Pick');
        const [first, second] = result.typeExpr.args;
        assert.equal(first?.kind, 'union');
        assert.equal(second?.kind === 'literal' ? second.value : undefined, 'x');
      }
    });

    it('does not truncate an arrow-function-typed generic argument (adversarial review finding, PR #119): the "=>" inside Record<string, (result: string) => void> is not the enclosing generic\'s own closer', () => {
      const result = parseTypeExprText('Record<string, (result: string) => void>');
      assert.equal(
        result.remainder,
        '',
        'the "=>" must not be misread as the generic\'s closing ">", truncating the argument and leaking "void>" as remainder',
      );
      assert.equal(result.typeExpr.kind, 'generic');
      if (result.typeExpr.kind === 'generic') {
        assert.equal(result.typeExpr.base.name, 'Record');
        assert.equal(result.typeExpr.args.length, 2);
        const [, second] = result.typeExpr.args;
        assert.equal(second?.kind, 'opaque');
        if (second?.kind === 'opaque') {
          assert.equal(second.text, '(result: string) => void');
        }
      }
    });

    it('does not truncate a bare (unparenthesized-base) arrow-function-typed generic argument (Foo<(result: string) => void>)', () => {
      const result = parseTypeExprText('Foo<(result: string) => void>');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'generic');
      if (result.typeExpr.kind === 'generic') {
        assert.equal(result.typeExpr.args.length, 1);
        const [only] = result.typeExpr.args;
        assert.equal(only?.kind, 'opaque');
        if (only?.kind === 'opaque') {
          assert.equal(only.text, '(result: string) => void');
        }
      }
    });
  });

  // PR #156 (ladder rung: sammons/code-outline-cli) — a MULTI-LINE opaque
  // leaf. `packages/parser/src/tree-utils.ts` authors `TreeVisitor` /
  // `NodePredicate` as function types spread across lines. Two defects met
  // there: (a) the `(` branch treated the function's PARAMETER LIST as a
  // parenthesized type GROUP, returning the inner type and leaving `) => T`
  // in the discarded `remainder`; (b) an opaque leaf's text is emitted into
  // one grammar token and every text-carrying token in that family excludes
  // '\n', so a multi-line leaf has to collapse to a single line.
  describe('multi-line opaque leaves (PR #156)', () => {
    it('keeps a multi-line function type whole: parameter list and return type both survive', () => {
      const result = parseTypeExprText('(\n  node: NodeInfo,\n  depth: number,\n  parent?: NodeInfo\n) => T');
      assert.equal(result.remainder, '', 'a non-empty remainder signals a parser bug (this module’s own doc comment)');
      assert.equal(result.typeExpr.kind, 'opaque');
      if (result.typeExpr.kind === 'opaque') {
        assert.equal(result.typeExpr.text, '(node: NodeInfo, depth: number, parent?: NodeInfo) => T');
      }
    });

    it('collapses a multi-line parenthesized union to one line and keeps the union structure', () => {
      const result = parseTypeExprText('(\n  Alpha |\n  Beta\n)');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'union');
      if (result.typeExpr.kind === 'union') {
        // `skipWhitespace` treats '\n'/'\r' as whitespace (fix), so a member
        // preceded by a newline still reaches `parseNamed` and each leaf
        // stays `named` — the newline never has to fall through to the
        // opaque scanner just to be consumed as inter-token separation.
        assert.deepEqual(
          result.typeExpr.members.map((member) => (member.kind === 'named' ? member.name : member.kind)),
          ['Alpha', 'Beta'],
        );
      }
    });

    it('collapses a multi-line generic and preserves its argument structure', () => {
      const result = parseTypeExprText('Record<\n  string,\n  number\n>');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'generic');
      if (result.typeExpr.kind === 'generic') {
        assert.equal(result.typeExpr.base.name, 'Record');
        // Same newline-as-whitespace fix as the union case above: the
        // generic's ARGUMENT COUNT and ordering survive, and each argument
        // reaches `parseNamed` instead of degrading to opaque.
        assert.deepEqual(
          result.typeExpr.args.map((arg) => (arg.kind === 'named' ? arg.name : arg.kind)),
          ['string', 'number'],
        );
      }
    });

    it('collapses a multi-line intersection and keeps each member named', () => {
      const result = parseTypeExprText('(\n  Alpha &\n  Beta\n)');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'intersection');
      if (result.typeExpr.kind === 'intersection') {
        assert.deepEqual(
          result.typeExpr.members.map((member) => (member.kind === 'named' ? member.name : member.kind)),
          ['Alpha', 'Beta'],
        );
      }
    });

    it('collapses a multi-line array-of-union and keeps each member named', () => {
      const result = parseTypeExprText('(\n  Alpha |\n  Beta\n)[]');
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'array');
      if (result.typeExpr.kind === 'array') {
        assert.equal(result.typeExpr.element.kind, 'union');
        if (result.typeExpr.element.kind === 'union') {
          assert.deepEqual(
            result.typeExpr.element.members.map((member) => (member.kind === 'named' ? member.name : member.kind)),
            ['Alpha', 'Beta'],
          );
        }
      }
    });

    // Review finding (PR #156): the whitespace collapse must be LITERAL-AWARE.
    // A text-blind regex pass cannot tell a structural bracket from one inside
    // a string literal, so `'( x )'` would become `'(x)'` — changing the
    // type's MEANING, since a string-literal type's value is its exact
    // characters.
    it('preserves a string literal’s own spaces next to ( ) , [ ] while collapsing the structure around it', () => {
      const result = parseTypeExprText("(\n  label: '( x , y )',\n  bounds: '[ a , b ]'\n) => void");
      assert.equal(result.remainder, '');
      assert.equal(result.typeExpr.kind, 'opaque');
      if (result.typeExpr.kind === 'opaque') {
        assert.equal(
          result.typeExpr.text,
          "(label: '( x , y )', bounds: '[ a , b ]') => void",
          'literal text is byte-preserved; only the structural whitespace between literals collapses',
        );
      }
    });

    it('preserves double-quoted and backtick literals the same way', () => {
      const result = parseTypeExprText('(\n  a: "( kept )",\n  b: `[ kept ]`\n) => void');
      assert.equal(result.typeExpr.kind, 'opaque');
      if (result.typeExpr.kind === 'opaque') {
        assert.equal(result.typeExpr.text, '(a: "( kept )", b: `[ kept ]`) => void');
      }
    });

    it('does not end a literal on an escaped quote', () => {
      const result = parseTypeExprText("(\n  a: '( \\' , x )'\n) => void");
      assert.equal(result.typeExpr.kind, 'opaque');
      if (result.typeExpr.kind === 'opaque') {
        assert.equal(result.typeExpr.text, "(a: '( \\' , x )') => void");
      }
    });

    // The transform is scoped to the multi-line case precisely so every
    // already-correct single-line spelling stays byte-identical.
    it('single-line inputs are byte-identical: the collapse is a no-op without a newline', () => {
      const singleLineCases = [
        '(node: NodeInfo, depth: number) => T',
        '{ a: string, b: number }',
        "'( x )' | Foo",
        '( spaced )',
        'Record<string, (result: string) => void>',
      ];
      for (const source of singleLineCases) {
        const viaParser = parseTypeExprText(source);
        assert.equal(viaParser.remainder, '', `unexpected remainder for ${source}`);
      }

      // The two opaque shapes above assert their exact text, which is what
      // "byte-identical" means for this transform.
      const arrow = parseTypeExprText('(node: NodeInfo, depth: number) => T');
      assert.equal(arrow.typeExpr.kind === 'opaque' ? arrow.typeExpr.text : undefined, '(node: NodeInfo, depth: number) => T');
      const objectLiteral = parseTypeExprText('{ a: string, b: number }');
      assert.equal(objectLiteral.typeExpr.kind === 'opaque' ? objectLiteral.typeExpr.text : undefined, '{ a: string, b: number }');
      const spaced = parseTypeExprText('( spaced )');
      assert.equal(spaced.typeExpr.kind === 'named' ? spaced.typeExpr.name : undefined, 'spaced');
    });

    it('braces keep their inner spacing when collapsing (object-literal corpus spelling)', () => {
      const result = parseTypeExprText('{\n  a: string,\n  b: number\n}');
      assert.equal(result.typeExpr.kind, 'opaque');
      if (result.typeExpr.kind === 'opaque') {
        assert.equal(result.typeExpr.text, '{ a: string, b: number }');
      }
    });
  });
});
