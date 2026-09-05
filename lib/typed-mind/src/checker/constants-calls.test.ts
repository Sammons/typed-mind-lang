import assert from 'node:assert/strict';
import { it } from 'node:test';
import { ConstantsNode } from '../ast/constants-node.ts';
import { SyntaxEmitter } from '../emitter/syntax-emitter.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { AstValidator } from './ast-validator.ts';

const parserPromise = TypedMindParser.create();
const source = [
  'App -> Main',
  'Main @ main.ts:',
  '  -> [used, unused, Config]',
  '  <- [Config]',
  'used :: () => void',
  'unused :: () => void',
  'Config ! config.ts',
  '  ~> [used]',
].join('\n');

it('TM13 F: Constants calls survive both syntax forms and EOF continuation', async () => {
  const parser = await parserPromise;
  const emitter = new SyntaxEmitter();
  let outcome = parser.parse(source);
  for (const form of ['shortform', 'longform', 'shortform', 'longform'] as const) {
    assert.deepEqual(outcome.diagnostics, []);
    const constant = outcome.entities.find((entity) => entity instanceof ConstantsNode);
    assert.deepEqual(constant?.calls, ['used']);
    assert.equal(
      computeLinks(outcome.entities)
        .referencedBy('used')
        .some((reference) => reference.from === 'Config'),
      true,
    );
    outcome = parser.parse(emitter.emit(outcome, { forceForm: form }));
  }
});

it('TM13 F: initializer references preserve orphan negative controls', async () => {
  const parser = await parserPromise;
  const findings = (text: string) => {
    const outcome = parser.parse(text);
    return new AstValidator()
      .validate(outcome, computeLinks(outcome.entities))
      .findings.filter((finding) => finding.code === 'checker/orphaned-entity')
      .map((finding) => finding.message)
      .toSorted();
  };
  assert.deepEqual(findings(source), ["Orphaned entity 'unused'"]);
  assert.deepEqual(findings(source.replace('  ~> [used]', '')), ["Orphaned entity 'unused'", "Orphaned entity 'used'"]);
});

it('TM13 F: absent and wrong-kind Constants calls remain errors', async () => {
  const parser = await parserPromise;
  const outcome = parser.parse(source.replace('  ~> [used]', '  ~> [Missing, Main]'));
  const findings = new AstValidator().validate(outcome, computeLinks(outcome.entities)).findings;
  assert.equal(findings.filter((finding) => finding.code === 'checker/unknown-call-target').length, 1);
  assert.equal(findings.filter((finding) => finding.code === 'checker/reference-to-illegal').length, 1);
  const invalid = parser.parse('Data %\n  ~> [used]');
  assert.equal(invalid.diagnostics.length > 0, true);
});
