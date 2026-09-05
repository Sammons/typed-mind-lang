// RFC-TM-13 C-prime: check the semantic values behind every quoted token.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { before, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DtoNode } from '../ast/dto-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { RunParameterNode } from '../ast/run-parameter-node.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { parseTypeExprText } from '../pipeline/type-expr-from-text.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { honestTypeExprOf } from './honest-fields.ts';
import { quoteStringLiteral } from './quote-string-literal.ts';
import { SyntaxEmitter } from './syntax-emitter.ts';

const wasmPath = join(dirname(fileURLToPath(import.meta.url)), '../../grammar/grammar.wasm');
let parser: TypedMindParser;
const emitter = new SyntaxEmitter();
const value = 'a "quoted" phrase, \\ slash, unknown \\q, and trailing \\';
const quoted = quoteStringLiteral(value);

before(async () => {
  parser = await TypedMindParser.create({ wasmPath });
});

it('TM13 CP: both grammar string tokens accept escapes and reject unclosed strings', () => {
  const source = [
    `Example % ${quoted}`,
    `  - label: string ${quoted}`,
    'function choose {',
    `  signature: setMode ${quoted}`,
    '}',
    `dependency ${quoted} {`,
    `  purpose: ${quoted}`,
    '}',
    `@import ${quoted} as Imported`,
    '',
  ].join('\n');
  const outcome = parser.parse(source);
  assert.deepEqual(outcome.diagnostics, [], source);
  const dto = outcome.entities[0];
  assert.ok(dto instanceof DtoNode);
  assert.equal(dto.purpose, value);
  assert.equal(dto.fields[0]?.description, value);
  const fn = outcome.entities[1];
  assert.ok(fn instanceof FunctionNode);
  assert.equal(fn.signature, `setMode ${quoted}`);
  assert.equal(outcome.entities[2]?.name, value);
  const header = parser.parseCst(`dependency ${quoted} {\n}\n`).longformBlockChildren()[0].blockHeaderChildren()[0];
  assert.equal(header.headerName(), quoted.slice(1, -1));
  assert.equal(outcome.imports[0]?.path, value);

  for (const raw of ['"unclosed', '"odd\\"', '"physical\nnewline"', '"physical\rcarriage"', '"escaped\\\nnewline"']) {
    for (const malformed of [`Broken % ${raw}\n`, `function broken {\n  signature: mode ${raw}\n}\n`]) {
      assert.ok(
        parser.parse(malformed).diagnostics.some((diagnostic) => diagnostic.code.startsWith('syntax/')),
        malformed,
      );
    }
  }
  // A pre-existing unknown escape retains its literal backslash.
  const unknown = parser.parse(String.raw`Unknown % "\q\n"`);
  assert.equal((unknown.entities[0] as DtoNode).purpose, String.raw`\q\n`);
});

const literalValues = (node: TypeExprNode): string[] => {
  switch (node.kind) {
    case 'literal':
      return node.literalKind === 'string' ? [node.value] : [];
    case 'generic':
      return node.args.flatMap(literalValues);
    case 'array':
      return literalValues(node.element);
    case 'union':
    case 'intersection':
      return node.members.flatMap(literalValues);
    case 'named':
    case 'opaque':
      return [];
  }
};

it('TM13 CP: CST and text literal types decode the same value', () => {
  const typeTexts = [quoted, `${quoted} | "other"`, `Pick<Thing, ${quoted}>`, `(${quoted} | "other")[]`];
  for (const typeText of typeTexts) {
    const parsedText = parseTypeExprText(typeText);
    assert.equal(parsedText.remainder, '');
    const shortform = parser.parse(`Example = ${typeText}\n`);
    assert.deepEqual(shortform.diagnostics, [], typeText);
    const alias = shortform.entities[0];
    assert.ok(alias instanceof TypeDefNode && alias.aliasType !== undefined);
    assert.deepEqual(honestTypeExprOf(alias.aliasType), honestTypeExprOf(parsedText.typeExpr));
    assert.equal(literalValues(alias.aliasType)[0], value);
    const emitted = emitter.emitLongformWithDiagnostics(shortform);
    assert.deepEqual(emitted.diagnostics, []);
    const longform = parser.parse(emitted.text);
    assert.deepEqual(longform.diagnostics, [], emitted.text);
    const recovered = longform.entities[0];
    assert.ok(recovered instanceof TypeDefNode && recovered.aliasType !== undefined);
    assert.deepEqual(honestTypeExprOf(recovered.aliasType), honestTypeExprOf(alias.aliasType));

    const dtoSource = `Example %\n  - value: ${typeText}\n`;
    const dto = parser.parse(dtoSource);
    assert.deepEqual(dto.diagnostics, []);
    const dtoLongform = parser.parse(emitter.emitLongform(dto));
    assert.deepEqual(dtoLongform.diagnostics, []);
    const recoveredDto = dtoLongform.entities[0];
    assert.ok(recoveredDto instanceof DtoNode);
    assert.deepEqual(honestTypeExprOf(recoveredDto.fields[0].typeExpr), honestTypeExprOf(parsedText.typeExpr));
  }
});

it('TM13 CP: suppression reasons and descriptions survive two format cycles', () => {
  const source = [
    `Example % ${quoted}`,
    `  - label: string ${quoted}`,
    `Setting $env ${quoted}`,
    `  = ${quoted}`,
    'run :: () => void',
    `  ${quoted}`,
    `suppress Example checker/orphaned-entity ${quoted}`,
    '',
  ].join('\n');
  let outcome = parser.parse(source);
  assert.deepEqual(outcome.diagnostics, [], source);
  for (const forceForm of ['longform', 'shortform', 'longform'] as const) {
    const result = emitter.emitWithDiagnostics(outcome, { forceForm });
    assert.deepEqual(result.diagnostics, []);
    outcome = parser.parse(result.text);
    assert.deepEqual(outcome.diagnostics, [], result.text);
    const dto = outcome.entities[0];
    const parameter = outcome.entities[1];
    const fn = outcome.entities[2];
    assert.ok(dto instanceof DtoNode);
    assert.ok(parameter instanceof RunParameterNode);
    assert.ok(fn instanceof FunctionNode);
    assert.equal(dto.purpose, value);
    assert.equal(dto.fields[0]?.description, value);
    assert.equal(parameter.description, value);
    assert.equal(parameter.defaultValue, value);
    assert.equal(fn.description, value);
    assert.equal(outcome.suppressions[0]?.reason, value);
  }
});

it('TM13 CP: existing corpus parse and accepted emission remain stable', () => {
  // Stable controls complement the repository-wide grammar, round-trip and
  // golden gates. Literal-led aliases were the two #130 failure controls;
  // exact AST equality now proves the escaped wrapper closes that defect.
  for (const source of [
    'Simple % "unchanged description"\n  - label: string "unchanged field"\n',
    'Tuple = [string, number]\n',
    'PickSend = Pick<S3Client, "send">\n',
    'Status = "active" | "inactive"\n',
    'Only = "active"\n',
  ]) {
    const original = parser.parse(source);
    assert.deepEqual(original.diagnostics, []);
    const emitted = emitter.emitLongformWithDiagnostics(original);
    assert.deepEqual(emitted.diagnostics, []);
    const reparsed = parser.parse(emitted.text);
    assert.deepEqual(reparsed.diagnostics, [], emitted.text);
    const beforeAlias = original.entities[0];
    const afterAlias = reparsed.entities[0];
    if (beforeAlias instanceof TypeDefNode && beforeAlias.aliasType !== undefined) {
      assert.ok(afterAlias instanceof TypeDefNode && afterAlias.aliasType !== undefined);
      assert.deepEqual(honestTypeExprOf(afterAlias.aliasType), honestTypeExprOf(beforeAlias.aliasType));
    } else {
      assert.equal(emitter.emitShortform(reparsed), source.trim());
    }
  }
});
