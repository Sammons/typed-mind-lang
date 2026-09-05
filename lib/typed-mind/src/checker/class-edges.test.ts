// RFC-TM-14 §S3 (rfc-tm-14-diamond.md), leaf S3-lang (Quantum U3a) — Class and
// ClassFile carry `calls` / `consumes` with Function semantics: shortform
// `~> [...]` / `$< [...]` continuations, longform `calls:` / `consumes:` keys,
// orphan credit, reference legality, method-call checks, the consumes
// existence/kind checks with `${entity.kind}` wording, and the link index.
// The slot is per class ("a member body of this class calls X / reads Y");
// the converter emits nothing into it until U3b.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { honestFieldsAcrossToggleOf } from '../emitter/honest-fields.ts';
import { SyntaxEmitter } from '../emitter/syntax-emitter.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { AstValidator } from './ast-validator.ts';

const parserPromise = TypedMindParser.create();

const source = [
  'App -> Main',
  'Main @ main.ts:',
  '  <- [Service, Store]',
  '  -> [Service, Widget, helper, LIMIT]',
  'Store #: store.ts',
  '  => [load]',
  '  ~> [helper, Widget.render]',
  '  $< [LIMIT, PORT]',
  'Service <:',
  '  => [run]',
  '  ~> [helper, Widget.render]',
  '  $< [LIMIT, PORT]',
  'Widget <:',
  '  => [render]',
  'helper :: () => void',
  'LIMIT ! limits.ts',
  'PORT $env "port"',
].join('\n');

const classEdgesOf = (entities: readonly { name: string }[]) => {
  const service = entities.find((entity) => entity.name === 'Service');
  const store = entities.find((entity) => entity.name === 'Store');
  assert.ok(service instanceof ClassNode, 'Service is a Class');
  assert.ok(store instanceof ClassFileNode, 'Store is a ClassFile');
  return {
    service: { calls: service.calls, consumes: service.consumes },
    store: { calls: store.calls, consumes: store.consumes },
  };
};

const findingsOf = async (text: string) => {
  const parser = await parserPromise;
  const outcome = parser.parse(text);
  assert.deepEqual(outcome.diagnostics, [], text);
  return new AstValidator().validate(outcome, computeLinks(outcome.entities)).findings;
};

const codes = (findings: readonly { code: string }[], code: string) => findings.filter((finding) => finding.code === code);

// sourceForm legitimately flips with each forced form; every other honest
// field must survive the toggle (toggle-round-trip.test.ts's bar and its
// comment/free-text projection).
const honestAcrossForms = (entities: readonly EntityNode[]) =>
  entities.map((entity) => {
    const { sourceForm: _sourceForm, ...fields } = honestFieldsAcrossToggleOf(entity);
    return fields;
  });

it('TM14 U3: Class and ClassFile calls and consumes round-trip in both forms and are checked', async () => {
  const parser = await parserPromise;
  const emitter = new SyntaxEmitter();
  const expected = {
    service: { calls: ['helper', 'Widget.render'], consumes: ['LIMIT', 'PORT'] },
    store: { calls: ['helper', 'Widget.render'], consumes: ['LIMIT', 'PORT'] },
  };
  let outcome = parser.parse(source);
  const original = honestAcrossForms(outcome.entities);
  for (const form of ['longform', 'shortform', 'longform', 'shortform'] as const) {
    assert.deepEqual(outcome.diagnostics, []);
    assert.deepEqual(classEdgesOf(outcome.entities), expected);
    assert.deepEqual(honestAcrossForms(outcome.entities), original);
    const text = emitter.emit(outcome, { forceForm: form });
    if (form === 'longform') {
      assert.match(text, /class Service \{[\s\S]*calls: \[helper, Widget\.render\][\s\S]*consumes: \[LIMIT, PORT\][\s\S]*\}/);
      assert.match(text, /classfile Store \{[\s\S]*calls: \[helper, Widget\.render\][\s\S]*consumes: \[LIMIT, PORT\][\s\S]*\}/);
    } else {
      assert.ok(text.includes('Service <:\n  => [run]\n  ~> [helper, Widget.render]\n  $< [LIMIT, PORT]'), text);
      assert.ok(text.includes('Store #: store.ts\n  => [load]\n  ~> [helper, Widget.render]\n  $< [LIMIT, PORT]'), text);
    }
    outcome = parser.parse(text);
  }

  // Checked: the base document is clean, and every edge credits its target.
  const findings = new AstValidator().validate(outcome, computeLinks(outcome.entities)).findings;
  assert.deepEqual(findings, []);
  const links = computeLinks(outcome.entities);
  for (const target of ['helper', 'Widget', 'LIMIT', 'PORT']) {
    assert.deepEqual(
      links
        .referencedBy(target)
        .map((reference) => reference.from)
        .filter((from) => from === 'Service' || from === 'Store')
        .toSorted(),
      ['Service', 'Store'],
      `referencedBy(${target})`,
    );
  }
});

it('TM14 U3: a ClassFile with visible exports keeps exports after the calls and consumes lines', async () => {
  const parser = await parserPromise;
  const emitter = new SyntaxEmitter();
  const text = source.replace('Store #: store.ts\n  => [load]', 'Store #: store.ts\n  => [load]\n  -> [helper]');
  let outcome = parser.parse(text);
  for (const form of ['shortform', 'longform', 'shortform'] as const) {
    assert.deepEqual(outcome.diagnostics, []);
    const store = outcome.entities.find((entity) => entity.name === 'Store');
    assert.ok(store instanceof ClassFileNode);
    assert.deepEqual(
      { exports: store.exports, calls: store.calls, consumes: store.consumes },
      { exports: ['helper', 'Store'], calls: ['helper', 'Widget.render'], consumes: ['LIMIT', 'PORT'] },
    );
    const emitted = emitter.emit(outcome, { forceForm: form });
    if (form === 'shortform') {
      assert.ok(
        emitted.includes('Store #: store.ts\n  => [load]\n  ~> [helper, Widget.render]\n  $< [LIMIT, PORT]\n  -> [helper, Store]'),
        emitted,
      );
    }
    outcome = parser.parse(emitted);
  }
});

it('TM14 U3: removing a Class edge restores exactly that orphan', async () => {
  const orphans = async (text: string) =>
    codes(await findingsOf(text), 'checker/orphaned-entity')
      .map((finding) => finding.message)
      .toSorted();
  assert.deepEqual(await orphans(source), []);
  assert.deepEqual(await orphans(source.replaceAll('  ~> [helper, Widget.render]\n', '')), [
    "Orphaned entity 'Widget'",
    "Orphaned entity 'helper'",
  ]);
  assert.deepEqual(await orphans(source.replaceAll('  $< [LIMIT, PORT]\n', '')), ["Orphaned entity 'LIMIT'", "Orphaned entity 'PORT'"]);
});

it('TM14 U3: Class and ClassFile consumes are existence- and kind-checked with the owner kind named', async () => {
  const findings = await findingsOf(source.replaceAll('$< [LIMIT, PORT]', '$< [LIMIT, PORT, Typo, Main]'));
  assert.deepEqual(
    {
      unknown: codes(findings, 'checker/consumes-unknown').map((finding) => finding.message),
      wrongKind: codes(findings, 'checker/consumes-invalid-kind').map((finding) => [finding.message, finding.suggestion]),
    },
    {
      unknown: ["ClassFile 'Store' consumes unknown entity 'Typo'", "Class 'Service' consumes unknown entity 'Typo'"],
      wrongKind: [
        [
          "ClassFile 'Store' cannot consume 'Main' (it's a File)",
          'ClassFiles can only consume: RunParameter, Asset, Dependency, Constants',
        ],
        ["Class 'Service' cannot consume 'Main' (it's a File)", 'Classes can only consume: RunParameter, Asset, Dependency, Constants'],
      ],
    },
  );
  // Function wording is unchanged.
  const functionFindings = await findingsOf(source.replace('helper :: () => void', 'helper :: () => void\n  $< [Typo, Main]'));
  assert.deepEqual(
    codes(functionFindings, 'checker/consumes-invalid-kind').map((finding) => [finding.message, finding.suggestion]),
    [["Function 'helper' cannot consume 'Main' (it's a File)", 'Functions can only consume: RunParameter, Asset, Dependency, Constants']],
  );
});

it('TM14 U3: Class calls follow Function legality and method checks', async () => {
  // An illegal call target (a File) is rejected on the Class and the ClassFile alike.
  const illegal = await findingsOf(source.replaceAll('~> [helper, Widget.render]', '~> [helper, Main]'));
  assert.deepEqual(
    codes(illegal, 'checker/reference-to-illegal').map((finding) => finding.message),
    ["Cannot use 'calls' to reference File 'Main'", "Cannot use 'calls' to reference File 'Main'"],
  );
  // An unknown method on a known class is reported (check-method-calls parity).
  const unknownMethod = await findingsOf(source.replaceAll('Widget.render', 'Widget.nope'));
  assert.deepEqual(
    codes(unknownMethod, 'checker/unknown-method').map((finding) => finding.message),
    ["Method 'nope' not found on class 'Widget'", "Method 'nope' not found on class 'Widget'"],
  );
  // A bare unknown target is inert for Class callers, as it is for Functions
  // (the Constants-only `unknown-call-target` arm is unchanged).
  const bareUnknown = await findingsOf(source.replaceAll('~> [helper, Widget.render]', '~> [helper, Widget.render, nope]'));
  assert.deepEqual(codes(bareUnknown, 'checker/unknown-call-target'), []);
  assert.deepEqual(codes(bareUnknown, 'checker/reference-to-illegal'), []);
});

it('TM14 U3: scenario-32 `$< [NODE_ENV]` on a Class is a consumes edge, not an illegal continuation', async () => {
  // The single Class `~>`/`$<` continuation in the hand-authored corpus
  // (rfc-tm-14-diamond.md §S3 "Corpus verdict that moves"): the author's
  // intent was legal all along; the class now consumes NODE_ENV.
  const parser = await parserPromise;
  const text = readFileSync(join(import.meta.dirname, '../../../typed-mind-test-suite/scenarios/scenario-32-spa-react-app.tmd'), 'utf8');
  const outcome = parser.parse(text);
  const serviceWorker = outcome.entities.find((entity) => entity.name === 'serviceWorker');
  assert.ok(serviceWorker instanceof ClassNode);
  assert.deepEqual(serviceWorker.consumes, ['NODE_ENV']);
  // The Class `<- [...]` continuations in the same file stay illegal (the
  // F3 ruling, attachment-diagnostics.test.ts); only the consumes list moves.
  assert.deepEqual(
    outcome.diagnostics
      .filter((diagnostic) => diagnostic.code === 'semantics/illegal-continuation' && diagnostic.message.includes('Class entity'))
      .map((diagnostic) => diagnostic.message.slice(0, diagnostic.message.indexOf(')') + 1)),
    Array.from({ length: 5 }, () => 'This imports list (`<- [...]`)'),
  );
  const findings = new AstValidator().validate(outcome, computeLinks(outcome.entities)).findings;
  assert.deepEqual(
    findings.filter((finding) => finding.message === "Orphaned entity 'NODE_ENV'" || finding.message.includes("'serviceWorker' consumes")),
    [],
  );
});
