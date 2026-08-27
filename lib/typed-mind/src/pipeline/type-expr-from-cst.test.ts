// RFC-TM-8 §1/§2 (rfc-tm-8-diamond.md, X-TYPE-1/X-TYPE-2) — per-shape shortform
// fixtures asserting on REAL parsed structure (kind/name/value/members), not
// node counts. Covers every check binding the Q1 Diamond DAG names: union of
// string literals, intersection of named types, `Pick<S3Client, "send">`,
// nested generic, array-of-union, readonly array (both element forms), the
// two corpus-confirmed opaque categories (object-literal-with-index-signature,
// tuple) plus the extrapolated function-type fixture, and both DTO-field
// description-disambiguation classes (two-strings additive, lone-string
// behavior-change per X-TYPE-6).

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DtoNode } from '../ast/dto-node.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

// Strips spans recursively so assertions compare structure, not position —
// mirrors round-trip.test.ts's honestTypeExprOf without importing test-only
// code across files.
const withoutSpans = (typeExpr: TypeExprNode): unknown => {
  const { span: _span, ...rest } = typeExpr;
  if (rest.kind === 'union' || rest.kind === 'intersection') {
    return { ...rest, members: rest.members.map(withoutSpans) };
  }
  if (rest.kind === 'array') {
    return { ...rest, element: withoutSpans(rest.element) };
  }
  if (rest.kind === 'generic') {
    const { span: _baseSpan, ...baseRest } = rest.base;
    return { ...rest, base: baseRest, args: rest.args.map(withoutSpans) };
  }
  return rest;
};

const firstFieldTypeExpr = (source: string, parser: TypedMindParser): TypeExprNode => {
  const outcome = parser.parse(source);
  const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
  const field = dto?.fields.at(0);
  if (field === undefined) {
    throw new Error(`no DTO field found in fixture: ${source}`);
  }
  return field.typeExpr;
};

describe('X-TYPE-1/X-TYPE-2: per-shape shortform type-expression fixtures', () => {
  let parser: TypedMindParser;

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('union of string literals', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - status: "active" | "inactive" | "pending"\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'union',
      members: [
        { kind: 'literal', literalKind: 'string', value: 'active' },
        { kind: 'literal', literalKind: 'string', value: 'inactive' },
        { kind: 'literal', literalKind: 'string', value: 'pending' },
      ],
    });
  });

  it('intersection of named types', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - x: EntityNodeArgs & Foo\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'intersection',
      members: [
        { kind: 'named', name: 'EntityNodeArgs' },
        { kind: 'named', name: 'Foo' },
      ],
    });
  });

  it('Pick<S3Client, "send"> — generic with a string-literal argument', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - x: Pick<S3Client, "send">\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'generic',
      base: { kind: 'named', name: 'Pick' },
      args: [
        { kind: 'named', name: 'S3Client' },
        { kind: 'literal', literalKind: 'string', value: 'send' },
      ],
    });
  });

  it('nested generic: Record<string, Array<number>>', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - x: Record<string, Array<number>>\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'generic',
      base: { kind: 'named', name: 'Record' },
      args: [
        { kind: 'named', name: 'string' },
        {
          kind: 'generic',
          base: { kind: 'named', name: 'Array' },
          args: [{ kind: 'named', name: 'number' }],
        },
      ],
    });
  });

  it('array of a parenthesized union: (string | number)[]', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - x: (string | number)[]\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'array',
      readonly: false,
      spelling: 'suffix',
      element: {
        kind: 'union',
        members: [
          { kind: 'named', name: 'string' },
          { kind: 'named', name: 'number' },
        ],
      },
    });
  });

  it('array-of-array depth: number[][]', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - x: number[][]\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'array',
      readonly: false,
      spelling: 'suffix',
      element: {
        kind: 'array',
        readonly: false,
        spelling: 'suffix',
        element: { kind: 'named', name: 'number' },
      },
    });
  });

  it('readonly array of a named type: readonly DtoFieldNode[]', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - x: readonly DtoFieldNode[]\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'array',
      readonly: true,
      spelling: 'suffix',
      element: { kind: 'named', name: 'DtoFieldNode' },
    });
  });

  it('readonly array of a parenthesized union: readonly (string | number)[]', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - x: readonly (string | number)[]\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'array',
      readonly: true,
      spelling: 'suffix',
      element: {
        kind: 'union',
        members: [
          { kind: 'named', name: 'string' },
          { kind: 'named', name: 'number' },
        ],
      },
    });
  });

  it('readonly[] collision: readonly lexes as a plain named type, not the keyword', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - x: readonly[]\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'array',
      readonly: false,
      spelling: 'suffix',
      element: { kind: 'named', name: 'readonly' },
    });
  });

  it('unquoted numeric literal union: 1 | 2 | 3 | 4 | 5 (complex-dto-example.tmd:42)', () => {
    const typeExpr = firstFieldTypeExpr('UserDTO %\n  - priority: 1 | 2 | 3 | 4 | 5\n', parser);
    assert.deepEqual(withoutSpans(typeExpr), {
      kind: 'union',
      members: [
        { kind: 'literal', literalKind: 'number', value: '1' },
        { kind: 'literal', literalKind: 'number', value: '2' },
        { kind: 'literal', literalKind: 'number', value: '3' },
        { kind: 'literal', literalKind: 'number', value: '4' },
        { kind: 'literal', literalKind: 'number', value: '5' },
      ],
    });
  });

  it('opaque fallback (corpus-confirmed): object literal with an index signature', () => {
    const outcome = parser.parse('UserDTO %\n  - x: { [key: string]: number }\n');
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    assert.notEqual(field, undefined);
    const typeExpr = field?.typeExpr;
    assert.equal(typeExpr?.kind, 'opaque');
    assert.equal(typeExpr !== undefined && typeExpr.kind === 'opaque' ? typeExpr.text : undefined, '{ [key: string]: number }');
    const syntaxDiagnostics = outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
    assert.deepEqual(syntaxDiagnostics, []);
  });

  it('opaque fallback (corpus-confirmed): tuple', () => {
    const outcome = parser.parse('UserDTO %\n  - x: [string, number, boolean]\n');
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    assert.notEqual(field, undefined);
    const typeExpr = field?.typeExpr;
    assert.equal(typeExpr?.kind, 'opaque');
    assert.equal(typeExpr !== undefined && typeExpr.kind === 'opaque' ? typeExpr.text : undefined, '[string, number, boolean]');
    const syntaxDiagnostics = outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
    assert.deepEqual(syntaxDiagnostics, []);
  });

  it('opaque fallback (extrapolated): bare function type () => void', () => {
    const outcome = parser.parse('UserDTO %\n  - x: () => void\n');
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    assert.notEqual(field, undefined);
    const typeExpr = field?.typeExpr;
    assert.equal(typeExpr?.kind, 'opaque');
    assert.equal(typeExpr !== undefined && typeExpr.kind === 'opaque' ? typeExpr.text : undefined, '() => void');
    const syntaxDiagnostics = outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
    assert.deepEqual(syntaxDiagnostics, []);
  });

  it('regression fix: qualified/dotted type reference falls to opaque (lib/typed-mind-typescript/architecture.tmd:107 `ts.CompilerOptions`)', () => {
    const outcome = parser.parse('UserDTO %\n  - x: ts.CompilerOptions\n');
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    assert.notEqual(field, undefined);
    const typeExpr = field?.typeExpr;
    assert.equal(typeExpr?.kind, 'opaque');
    assert.equal(typeExpr !== undefined && typeExpr.kind === 'opaque' ? typeExpr.text : undefined, 'ts.CompilerOptions');
    const syntaxDiagnostics = outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
    assert.deepEqual(syntaxDiagnostics, []);
  });

  it('regression fix: readonly array of an inline object literal (lib/typed-mind-typescript/architecture.tmd:102)', () => {
    const outcome = parser.parse('UserDTO %\n  - enumValues: readonly { name: string; value?: string }[]\n');
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    assert.notEqual(field, undefined);
    const typeExpr = withoutSpans(field?.typeExpr as TypeExprNode);
    assert.deepEqual(typeExpr, {
      kind: 'array',
      readonly: true,
      spelling: 'suffix',
      element: { kind: 'opaque', text: '{ name: string; value?: string }' },
    });
    const syntaxDiagnostics = outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
    assert.deepEqual(syntaxDiagnostics, []);
  });

  it('deeply-nested object literal (complex-dto-example.tmd:42 depth-3)', () => {
    const outcome = parser.parse('UserDTO %\n  - x: { user: { profile: { settings: string[] } } }\n');
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    const typeExpr = field?.typeExpr;
    assert.equal(typeExpr?.kind, 'opaque');
    assert.equal(
      typeExpr !== undefined && typeExpr.kind === 'opaque' ? typeExpr.text : undefined,
      '{ user: { profile: { settings: string[] } } }',
    );
    const syntaxDiagnostics = outcome.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));
    assert.deepEqual(syntaxDiagnostics, []);
  });

  it('description disambiguation: two strings — type literal, then description slot (additive)', () => {
    const outcome = parser.parse('UserDTO %\n  - f: "active" "desc"\n');
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    assert.deepEqual(withoutSpans(field?.typeExpr as TypeExprNode), { kind: 'literal', literalKind: 'string', value: 'active' });
    assert.equal(field?.description, 'desc');
  });

  it('description disambiguation: lone string — type literal, no description (X-TYPE-6 behavior change)', () => {
    const outcome = parser.parse('UserDTO %\n  - f: "onlystring"\n');
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    assert.deepEqual(withoutSpans(field?.typeExpr as TypeExprNode), { kind: 'literal', literalKind: 'string', value: 'onlystring' });
    assert.equal(field?.description, undefined);
  });

  it('longform: type: "string[]" quoted-string value resolves to an array of a named type', () => {
    const source = 'dto UserDTO {\n  fields: {\n    tags: {\n      type: "string[]"\n    }\n  }\n}\n';
    const outcome = parser.parse(source);
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    assert.notEqual(field, undefined);
    assert.deepEqual(withoutSpans(field?.typeExpr as TypeExprNode), {
      kind: 'array',
      readonly: false,
      spelling: 'suffix',
      element: { kind: 'named', name: 'string' },
    });
  });

  it('longform: type: "UserRole" quoted-string value resolves to a named type', () => {
    const source = 'dto UserDTO {\n  fields: {\n    role: {\n      type: "UserRole"\n    }\n  }\n}\n';
    const outcome = parser.parse(source);
    const dto = outcome.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    const field = dto?.fields.at(0);
    assert.deepEqual(withoutSpans(field?.typeExpr as TypeExprNode), { kind: 'named', name: 'UserRole' });
  });
});
