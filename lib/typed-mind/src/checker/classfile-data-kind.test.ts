// RFC-TM-13 burndown Q1 — ClassFile is a legal data-type kind. The converter
// fuses a single-class file into a ClassFile, so a DTO field (or a Constants
// schema) naming that class must resolve like a Class. Both enforcement
// points read DATA_TYPE_KINDS (data-type-kinds.ts); the controls pin that
// Function and Asset stay rejected and the Function-typed-field ban is intact.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { EntityKind } from '../ast/entity-kind.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { type AstValidationResult, AstValidator } from './ast-validator.ts';
import { DATA_TYPE_KINDS, isDataTypeKind } from './data-type-kinds.ts';
import { VALID_REFERENCES } from './valid-references.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const parserPromise = TypedMindParser.create({ wasmPath: join(testDir, '..', '..', 'grammar', 'grammar.wasm') });

const check = async (source: string) => {
  const parser = await parserPromise;
  const outcome = parser.parse(source);
  assert.deepEqual(outcome.diagnostics, []);
  return new AstValidator().validate(outcome, computeLinks(outcome.entities));
};

const byCode = (result: AstValidationResult, code: string) => {
  return result.findings.filter((finding) => finding.code === code).map(({ span, message }) => ({ span, message }));
};

describe('RFC-TM-13 Q1: ClassFile is a legal DTO field type', () => {
  it('a DTO field naming a ClassFile produces no dto-field finding', async () => {
    const result = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [Widget]',
        '  -> [build]',
        'Widget #: src/widget.ts',
        '  => [render]',
        'render :: () => void',
        'build :: () => Payload',
        'Payload %',
        '  - widget: Widget',
        '  - widgets: Widget[]',
        '  - maybe: Widget | null',
        '',
      ].join('\n'),
    );
    assert.deepEqual(byCode(result, 'checker/dto-field-non-data-type'), []);
    assert.deepEqual(byCode(result, 'checker/dto-field-unknown-type'), []);
  });

  it('control: Function and Asset field types still produce dto-field-non-data-type', async () => {
    const result = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  -> [build, Helper]',
        'Helper :: () => void',
        'Logo ~ "logo image"',
        'build :: () => Payload',
        'Payload %',
        '  - callback: Helper',
        '  - image: Logo',
        '',
      ].join('\n'),
    );
    assert.deepEqual(byCode(result, 'checker/dto-field-non-data-type'), [
      {
        span: { start: { line: 8, column: 15 }, end: { line: 8, column: 21 } },
        message: "DTO 'Payload' field 'callback' references 'Helper' which is a Function, not a DTO or Class",
      },
      {
        span: { start: { line: 9, column: 12 }, end: { line: 9, column: 16 } },
        message: "DTO 'Payload' field 'image' references 'Logo' which is a Asset, not a DTO or Class",
      },
    ]);
  });

  it('control: the Function-typed-field ban is unchanged', async () => {
    const result = await check(['Payload %', '  - callback: Function', ''].join('\n'));
    assert.deepEqual(
      byCode(result, 'checker/dto-field-function-type').map(({ message }) => message),
      ["DTO 'Payload' field 'callback' cannot have Function type"],
    );
  });
});

describe('RFC-TM-13 Q1: ClassFile is a legal Constants schema target', () => {
  it('a Constants schema naming a ClassFile produces no reference-to-illegal finding', async () => {
    const result = await check(
      ['Settings #: src/settings.ts', '  => [load]', 'load :: () => void', 'Config ! src/config.ts : Settings', ''].join('\n'),
    );
    assert.deepEqual(byCode(result, 'checker/reference-to-illegal'), []);
  });

  it('control: a Constants schema naming a Function is still reference-to-illegal', async () => {
    const result = await check(['load :: () => void', 'Config ! src/config.ts : load', ''].join('\n'));
    assert.equal(byCode(result, 'checker/reference-to-illegal').length, 1);
  });

  it('both enforcement points read the one DATA_TYPE_KINDS list', () => {
    assert.deepEqual([...DATA_TYPE_KINDS], ['DTO', 'Class', 'ClassFile', 'TypeDef']);
    assert.equal(VALID_REFERENCES.schema.to, DATA_TYPE_KINDS);
    for (const kind of DATA_TYPE_KINDS) {
      assert.equal(isDataTypeKind(kind), true, kind);
    }
    const rejected: EntityKind[] = ['Function', 'Asset', 'UIComponent', 'Constants', 'File', 'Program', 'RunParameter', 'Dependency'];
    for (const kind of rejected) {
      assert.equal(isDataTypeKind(kind), false, kind);
    }
  });
});
