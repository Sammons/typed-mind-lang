import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { CheckContext } from './check-context.ts';
import { checkDtoFieldTypes } from './check-dto-fields.ts';

const checkFields = async (source: string) => {
  const parser = await TypedMindParser.create({ wasmPath: join(import.meta.dirname, '../../grammar/grammar.wasm') });
  const outcome = parser.parse(source);
  assert.deepEqual(outcome.diagnostics, []);
  const context = new CheckContext({ entities: outcome.entities, links: computeLinks(outcome.entities), parseDiagnostics: [] });
  checkDtoFieldTypes(context);
  return context.findings;
};

it('TM13 B2: dependency exports satisfy absent local DTO field types', async () => {
  const findings = await checkFields(
    [
      'ExternalLib ^ "external package"',
      '  -> [Generated, ExternalThing]',
      'Account %',
      '  - id: Generated<string>',
      '  - nested: Generated<ReadonlyArray<ExternalThing | null>>',
      '',
    ].join('\n'),
  );
  assert.deepEqual(findings, []);
});

it('TM13 B2: local invalid kinds outrank dependency exports', async () => {
  const findings = await checkFields(
    [
      'ExternalLib ^ "external package"',
      '  -> [Collision, LocalData]',
      'Collision :: () => void',
      'LocalData %',
      '  - value: string',
      'Account %',
      '  - collision: Collision<string>',
      '  - missing: Missing',
      '  - local: LocalData',
      '',
    ].join('\n'),
  );
  assert.deepEqual(
    findings.map(({ code, span, message }) => ({ code, span, message })),
    [
      {
        code: 'checker/dto-field-non-data-type',
        span: { start: { line: 7, column: 16 }, end: { line: 7, column: 25 } },
        message: "DTO 'Account' field 'collision' references 'Collision' which is a Function, not a DTO or Class",
      },
      {
        code: 'checker/dto-field-unknown-type',
        span: { start: { line: 8, column: 14 }, end: { line: 8, column: 21 } },
        message: "DTO 'Account' field 'missing' references undefined type 'Missing'",
      },
    ],
  );
});
